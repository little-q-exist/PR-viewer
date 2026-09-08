# 当前状态与已知问题

## 已实现功能

### 后端

- GitHub App OAuth 登录与安装校验、JWT 签发、用户 access token 自动刷新。
- PR URL 解析、PR 数据拉取（基础信息/files/commits/行级 review comments/diff）与三级缓存。
- 评审任务的创建、列表（状态过滤/分页）、详情，以及后台异步 AI 分析。
- AI 提示词构造、OpenAI 调用（支持自定义 `OPENAI_API_URL`）、JSON 响应解析。
- 全局限流与 AI 限流。

### 前端

- 登录页（GitHub 登录 + 安装引导）、OAuth 回调处理。
- Dashboard（统计卡片 + PR URL 输入 + 最近评审）。
- 评审历史列表（状态过滤、分页、风险/评分展示）。
- 分析页（总览 + 具体变更 Tab）、轮询、AI 建议展示、Markdown 渲染。
- 具体变更 Tab 基于 patch 拆分出 old/new 做真正前后代码对比，并展示 GitHub 行级评论。
- 暗黑毛玻璃科技风 UI。

## 测试现状

- 后端：7 套件 36 用例全部通过（auth/github/analyzer/review 单元测试 + auth/github/review 控制器层测试）。
- 前端：8 文件 27 用例全部通过（authSlice/uiSlice + review 模块组件/utils）。
- 详见 [testing.md](./testing.md)。

## 已知问题 / 待办（探索中发现）

### 1. AI 返回解析与提示词不一致（已修复）

根因：`aiUsage` 属于 API `usage` 元数据而非模型输出契约，旧校验却强制模型 JSON 含 `aiUsage`，真实调用必抛 “Missing required fields in AI response” 并置评审为 `failed`；旧单测因手工在输入里带 `aiUsage` 而未暴露。

已按方案 A 修复：`parseAnalyzerResponse` 只验收模型应输出的 `summary` / `fileAnalyses`；`aiUsage` 由 `analyzePullRequest` 在解析成功后从 `response.data.usage` 统一补齐。单测已改为真实模型形状（无 aiUsage）并新增缺字段用例。

### 2. PR 描述（body）未被抓取（已修复）

`fetchPrFromGitHub` 只保存了 `pr.title`、分支、文件等，未保存 `pr.body`；`processReview` 调用 `analyzePullRequest` 时 `prBody` 恒为 `null`，因此 AI 提示词里的 “PR Description” 始终是 “No description provided”。

修复：保存了 `pr.body` 字段，补全了下游链路。

### 3. 依赖声明但未在代码中使用

**暂时搁置，具体实现待讨论**

- `bcrypt`：在 package.json 与根 CLAUDE.md 中声明，源码未引用。
- `p-limit`：声明用于“控制并发/限流”，源码未引用（当前 GitHub 拉取用 `Promise.all`，AI 限流用 express-rate-limit）。
- `GITHUB_APP_PRIVATE_KEY`：在 `.env`/`.env.example` 中声明，源码未引用；

### 4. Diff 展示为“整段 patch 当新代码”（已修复）

`ChangesTab` 原先给 `DiffViewer` 传入 `oldCode=""`、`newCode={currentFile.patch}`，整段 unified diff 原文被当作“变更后”代码整段标绿。

修复：新增纯工具 `frontEnd/src/modules/review/utils/splitPatch.ts`（`splitPatchIntoOldNew`），把 per-file patch 拆成 oldCode/newCode：
- `+` 行 → newCode，`-` 行 → oldCode，上下文行两侧都保留；跳过 hunk 头、文件头、`diff --git`/index/mode/rename/Binary 等元信息。
- added 文件 oldCode 为空、removed 文件 newCode 为空。

`ChangesTab` 改为把拆分结果传给 `DiffViewer`；`DiffViewer` 维持 `splitView={false}` 统一视图与 `DiffMethod.WORDS`，仅修正数据来源。验收：diff 不再整段绿色，能区分增删与上下文。

### 5. GitHub 评论行级定位未落地（已修复）

`fetchPrFromGitHub` 原先拉取 issue comments，且映射时 `path` / `line` 恒为 `undefined`；前端行级评论展示只能由 AI 建议的 `lineStart` 驱动。

修复：
- 后端改用 `octokit.rest.pulls.listReviewComments` 拉取行级 review comments，映射 `path` 与 `line`（`line` 优先，缺失时回退旧 API 的 `position`）。
- `reviewService.getReviewById` 的 `prId` populate 增加 `comments`，使 `GET /reviews/:id` 返回评论。
- 前端新增 `ReviewComments` 组件：在 `ChangesTab` 的 DiffViewer 下方按 `path` 过滤渲染当前文件评论（按 `line` 升序、无 line 排最后），点击 Popover 展开作者/行号/Markdown 正文。
- 文档同步：`api.md`、`backend.md`、`frontend.md`。

### 6. Reviews 复合索引文档与实现不一致（已对齐）

`Review.ts` 已通过 `ReviewSchema.index({ userId: 1, createdAt: -1 })` 显式创建 `Reviews { userId, createdAt }` 复合索引，但 `database.md` 仍写“未显式创建”。

修复：`database.md` 索引总览补充 `Reviews { userId: 1, createdAt: -1 }` 行并删除旧说明；`Review.ts` 无需改动，文档与代码现保持一致。

### 7. 测试与工程杂项（已修复）

- 后端 `jest.config.ts` 使用 ESM 语法但 package.json 为 commonjs，运行时有加载警告 → 改为 `jest.config.js`（CommonJS `module.exports`，保留原 ts-jest 配置），警告消除，`test` 脚本不变。
- 新增 dev 依赖 `supertest` / `@types/supertest`，基于 `app` 写控制器层测试（mock rateLimiter、authMiddleware、authService、githubService、reviewService 与 mongoose 模型）：
  - auth：`GET /auth/me` 200/401/404；`POST /auth/install` 缺 code 400、配置缺失 500。
  - github：`GET /pull-requests` 200；`GET /pull-requests/:id` 200/404；`POST /pull-requests/fetch` 200/400/401。
  - pull-request：`POST /reviews` 201/400/500；`GET /reviews` 200/401；`GET /reviews/:id` 200/404/500。
- 前端新增 dev 依赖 `@testing-library/react` / `user-event` / `jest-dom` / `dom`；`vitest.config.ts` 增加 `setupFiles`（`src/test/setup.ts`：引入 jest-dom 并 mock `matchMedia`/`ResizeObserver`）。
- 前端补 review 模块测试：`splitPatchIntoOldNew` 纯函数、`FileTree`、`SuggestionPopover`、`ChangesTab`（mock DiffViewer 断言 old/new 来自拆分）、`ReviewComments`、`DiffViewer`。

## 建议的下一步（按优先级）

1. ~~修复 `parseAnalyzerResponse` 对 `aiUsage` 的强制校验~~ —— 已完成（见问题 1）。
2. ~~抓取并存储 `pr.body`，让 AI 分析使用真实 PR 描述。~~
3. 未使用依赖与配置（bcrypt、p-limit、GITHUB_APP_PRIVATE_KEY）需补齐对应实现。暂时搁置，等待用户确认。
4. ~~若需要真正的前后代码对比 diff，改造 DiffViewer 的数据来源（基于 patch 拆分 old/new）。~~ —— 已完成（见问题 4）。
5. ~~补充控制器层集成测试与前端 review 模块单测。~~ —— 已完成（见问题 7）。
6. （可选）真实 GitHub / OpenAI 网络集成测试：以环境变量开关形式补充，不在当前实现范围。
