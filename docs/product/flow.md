# PR 输入 → AI 建议 业务流程（代码探索结论）

> 本文档依据**当前工作区代码**整理（含未提交的改动），以代码为根本事实来源。
> 适用路径：用户在首页粘贴 GitHub PR URL，到前端展示 AI 评审总评与逐文件建议。

## 1. 端到端流程

```
用户登录 (GitHub App OAuth) —— 前置条件
  │
用户输入 PR URL (PRUrlInput)
  │  POST /reviews { prUrl }         (useCreateReview → api.ts, 带 Bearer JWT)
  ▼
[后端] reviewController.create          POST /reviews (authMiddleware + aiLimiter 30次/小时)
  ├─ parsePrUrl 校验 github.com/{owner}/{repo}/pull/{n}
  ├─ getValidAccessToken 取/刷新 GitHub token
  ├─ getOrFetchPr 三级缓存拉 PR 数据
  │     node-cache(15min) → MongoDB PullRequest → GitHub REST API(拉后 upsert)
  │     （PR 基础信息 / files / commits / 行级 review comments / 完整 diff）
  ├─ 创建 Review 记录 (status=pending)  → 返回 201 {id, status, prUrl}
  └─ fire-and-forget: processReview(reviewId, accessToken)   ← 不阻塞响应
        ├─ status=analyzing, startedAt
        ├─ analyzePullRequest(pr.title, pr.body, pr.files, pr.diff)
        │     buildAnalyzerPrompt(提示词, diff 截断 80,000 字符)
        │       → OpenAI Chat Completions (temp 0.3, max_tokens 8000)
        │       → parseAnalyzerResponse → summary + fileAnalyses
        ├─ 写库: summary / fileAnalyses / aiUsage → status=completed
        └─ 异常 → status=failed + errorMessage
  ▼
前端跳转 /review/:id → useReviewDetail 每 3s 轮询 GET /reviews/:id
  └─ completed → 总览 AISummary + 具体变更 FileTree/DiffViewer/SuggestionPopover
```

## 2. 分步说明（含代码位置）

### 2.1 前置：登录与安装（不影响分析链路，但为必要条件）
- 前端 `WelcomeHero` 跳 GitHub 授权页（client_id + state），回调后 `HomePage` 校验 state 并调 `POST /auth/install` 换 token、校验 GitHub App 安装，后端 upsert User 并签发 JWT（`backEnd/src/modules/auth/controllers/authController.ts`）。
- 后续请求由 axios 拦截器自动附加 `Authorization: Bearer <token>`（`frontEnd/src/shared/services/api.ts`）；后端 `authMiddleware` 校验 JWT（`backEnd/src/shared/middleware/auth.ts`）。

### 2.2 前端输入与创建请求
- `frontEnd/src/modules/home/components/PRUrlInput.tsx`：`handleAnalyze` 正则校验 `^https://github.com/{owner}/{repo}/pull/\d+`，随后 `createReview.mutate(trimmed)`。
- `frontEnd/src/shared/hooks/useReviews.ts`（`useCreateReview`）：调 `reviewsAPI.create(prUrl)`；成功后失效 `['reviews']` 列表缓存并跳转 `/review/{id}`（路由见 `frontEnd/src/App.tsx`）。

### 2.3 后端创建评审（同步段）
路由：`backEnd/src/modules/pull-request/routes.ts`；控制器：`backEnd/src/modules/pull-request/controllers/reviewController.ts` 的 `create`。
1. 读取 `prUrl`，要求已登录。
2. `parsePrUrl`（`backEnd/src/modules/github/services/githubService.ts`）：校验 hostname 与 pathname 结构，非法抛 `Invalid GitHub PR URL` → HTTP 400。
3. `getValidAccessToken(userId)`（`backEnd/src/modules/auth/services/authService.ts`）：token 剩余 >5 分钟直接返回；否则用 refreshToken 自动刷新并写回 User。
4. `getOrFetchPr`（githubService）：内存缓存 → PullRequest 集合 → GitHub API 三级取数；GitHub 侧 `fetchPrFromGitHub` 并发拉取 `pulls.get / listFiles / listCommits / listReviewComments`，并单独以 `application/vnd.github.v3.diff` 请求完整 diff，随后 `findOneAndUpdate(upsert)` 写 PullRequest 集合。
5. `createReview(userId, prDoc._id)`：新建 Review（`status=pending`，`fileAnalyses=[]`）。
6. **不等待 AI**：`processReview(reviewId, accessToken).catch(...)` 后台执行，接口立即返回 `201 {id, status:'pending', prUrl}`。

### 2.4 后端异步分析
- `backEnd/src/modules/pull-request/services/reviewService.ts` 的 `processReview`：
  1. `status=analyzing`、写 `startedAt`；
  2. 调 `analyzePullRequest(pr.title, pr.body ?? null, pr.files, pr.diff)`；**输入只有 title/body/files/diff，commits 与 comments 不入 AI**；
  3. 成功：写 `summary / fileAnalyses / aiUsage`，`status=completed`；失败：`status=failed` + `errorMessage`。
- `backEnd/src/modules/analyzer/services/analyzerService.ts`：
  - `buildAnalyzerPrompt`：构造「资深 code reviewer」提示词，要求仅返回结构化 JSON（summary + fileAnalyses），diff 截断到 80,000 字符。
  - `analyzePullRequest`：需配置 `OPENAI_API_KEY` / `OPENAI_MODEL`，请求 `OPENAI_API_URL`（默认 OpenAI chat/completions），temperature 0.3、max_tokens 8000。
  - `parseAnalyzerResponse`：剥离可选 ```json 围栏后 `JSON.parse`，校验必须含 `summary` 与 `fileAnalyses`（不校验 aiUsage，aiUsage 由调用方从响应 usage 补齐）。

### 2.5 前端轮询与展示
- `frontEnd/src/shared/hooks/useReviews.ts`（`useReviewDetail`）：`GET /reviews/:id`，无数据或 `pending/analyzing` 时每 3 秒 `refetchInterval` 轮询，`completed/failed` 后停止。
- 详情接口 `getById` → `getReviewById`：populate `userId`(login/avatarUrl) 与 `prId`(title/url/owner/repo/pullNumber/state/files/diff/comments)。
- `frontEnd/src/modules/review/components/ReviewPage.tsx` 按状态分派：
  - `pending/analyzing`：`PRInfoBar` + `PollingIndicator`（排队中/AI 分析进行中 + 已等待时长）；
  - `failed`：展示 `errorMessage` 与「重新分析」按钮（**注意：按钮当前无 onClick，UI 无法真正重试**）；
  - `completed`：总览 Tab → `AISummary`（风险 Tag + score/100 + overview Markdown + recommendations）；具体变更 Tab → `FileTree`（文件风险圆点）+ `DiffViewer`（patch 拆分 old/new 后渲染，下方列出该文件 `fileAnalyses.suggestions`），每条建议点开 `SuggestionPopover` 看 severity/category/行号/description/suggestionCode。

### 2.6 历史记录复用同一链路
- 首页「最近评审」`RecentReviews.tsx`、评审列表页 `ReviewTable.tsx` 点击行均 `navigate('/review/{_id}')`，走 2.5 同一详情/轮询链路（列表数据来自 `GET /reviews`，见 `usePRList.ts`）。

## 3. 结果落点现状：数据库 / 缓存 / GitHub

| 落点 | 是否写入 | 说明 |
|------|---------|------|
| MongoDB `Review` 集合 | ✅ 是 | `processReview` 成功分支 `save()` 写入 `summary` / `fileAnalyses` / `aiUsage`，并置 `completed`；失败写 `failed` + `errorMessage`。字段 schema 见 `backEnd/src/modules/pull-request/models/Review.ts` |
| MongoDB `PullRequest` 集合 | ✅ 是（仅 PR 数据） | 存 PR 原始数据（files/diff/commits/comments 等），**不含 AI 结果**，见 `backEnd/src/modules/github/models/PullRequest.ts` |
| 后端 node-cache 内存缓存 | ❌ 否 | `shared/cache.ts` 的 `getOrSet` 仅被 `githubService.getOrFetchPr` 用于缓存 PR 数据（key `pr:{owner}:{repo}:{number}`，TTL 15 分钟）；**AI summary/建议无后端缓存**，每次详情直查 Mongo |
| 前端 React Query | ✅ 会话级内存缓存 | 详情 queryKey `['reviews', id]` 缓存于浏览器内存（刷新即失）；列表 `staleTime: 30s`；创建成功后 `invalidateQueries(['reviews'])` |
| GitHub（PR 评论回写） | ❌ 否 | 全仓无任何写 GitHub 的调用（无 `pulls.createReviewComment` / `pulls.createReview` / `issues.createComment`）；所有 GitHub 调用均为只读拉取。AI 结果仅前端展示，不提交回 GitHub |

**结论**：生成的 review summary 与逐文件建议 → **持久化到 MongoDB**、前端有**会话级缓存**、**不回写 GitHub**；后端没有针对 AI 结果的专用缓存。

## 4. 当前实现的边界与缺口（代码事实）

1. **不回写 GitHub**：AI 建议不提交为 PR 评论（无写接口）；若需回写，可在 `processReview` 成功分支用现有 `accessToken` 调 `pulls.createReviewComment`/`createReview`，注意 AI 的 `lineStart` 基于 diff 行号，需换算到具体 commit sha 上的行位置。
2. **AI 输入不含 commits/comments**：虽然拉取并存库，但提示词只用 title/body/files/diff。
3. **diff 有截断**：送入 AI 的 diff 截断到 80,000 字符。
4. **失败页「重新分析」按钮无行为**：`ReviewPage.tsx` 中该按钮没有 onClick，无法真正重试。
5. **错误映射不全**：`POST /reviews` 仅对 `Invalid GitHub PR URL` 返回 400；token 过期等其它错误落到通用 500（同文件 `fetchAndCachePr` 反而做了 401 映射）。
6. **`/pull-requests` REST 端点未被前端调用**：`GET/POST /pull-requests*` 存在且文档记载，但当前前端只走 `/reviews`；github 模块实际以 service 形式被 `/reviews` 链路复用。
7. **在途改动（未提交）**：`githubService.ts` 改为拉取行级 review comments（`pulls.listReviewComments`，含 path/line）、`GET /reviews/:id` 多 populate `comments`、前端新增 `ReviewComments.tsx` 展示 GitHub 已有评论——是「读取/展示已有评论」，不是「AI 结果回写 GitHub」。

## 5. 关键文件索引

- 前端入口：`frontEnd/src/modules/home/components/PRUrlInput.tsx`、`frontEnd/src/shared/hooks/useReviews.ts`、`frontEnd/src/shared/services/api.ts`
- 前端展示：`frontEnd/src/modules/review/components/ReviewPage.tsx`、`AISummary.tsx`、`ChangesTab.tsx`、`DiffViewer.tsx`、`SuggestionPopover.tsx`
- 后端路由/控制器：`backEnd/src/modules/pull-request/routes.ts`、`controllers/reviewController.ts`
- 后端任务服务：`backEnd/src/modules/pull-request/services/reviewService.ts`（processReview 落库点）
- GitHub 取数：`backEnd/src/modules/github/services/githubService.ts`
- AI 分析：`backEnd/src/modules/analyzer/services/analyzerService.ts`
- 模型：`backEnd/src/modules/pull-request/models/Review.ts`、`backEnd/src/modules/github/models/PullRequest.ts`
- 缓存：`backEnd/src/shared/cache.ts`
- 文档索引：`docs/README.md`（快速开始/结构）、`docs/architecture.md`（数据流）、`docs/backend.md`（模块职责）
