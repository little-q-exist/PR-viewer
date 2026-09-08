# 后端说明

## 入口与启动

- `server.ts`：加载 dotenv，调用 `connectDB()`，在 `PORT`（默认 3000）监听。
- `app.ts`：创建 Express 应用，挂载中间件与路由。
  - 全局：`cors()`、`express.json()`、`apiLimiter`
  - 健康检查：`GET /health`
  - 路由：`/auth`、`/pull-requests`、`/reviews`
  - 404 兜底与全局错误处理

## 目录结构

```
backEnd/src/
├── app.ts
├── server.ts
├── modules/
│   ├── auth/
│   │   ├── routes.ts
│   │   ├── controllers/authController.ts
│   │   ├── models/User.ts
│   │   ├── services/authService.ts
│   │   └── __tests__/auth.test.ts
│   ├── github/
│   │   ├── routes.ts
│   │   ├── controllers/githubController.ts
│   │   ├── models/PullRequest.ts
│   │   ├── services/githubService.ts
│   │   └── __tests__/github.test.ts
│   ├── pull-request/
│   │   ├── routes.ts
│   │   ├── controllers/reviewController.ts
│   │   ├── models/Review.ts
│   │   ├── services/reviewService.ts
│   │   └── __tests__/review.test.ts
│   └── analyzer/
│       ├── services/analyzerService.ts
│       └── __tests__/analyzer.test.ts
└── shared/
    ├── cache.ts
    ├── db.ts
    ├── middleware/auth.ts
    ├── middleware/rateLimiter.ts
    └── types/index.ts
```

## 模块职责

### auth —— 认证与用户
- `User` 模型：githubId（唯一）、login、avatarUrl、email、installationId、accessToken、tokenExpiresAt、refreshToken。
- `authController.install`：`code` 换 access token → 校验安装 → upsert 用户 → 签发 JWT。
- `authController.getMe`：返回当前登录用户（剔除 access/refresh token）。
- `authService`：
  - `generateToken` / `verifyToken`：JWT 签发与校验。
  - `getValidAccessToken`：token 有效期 >5 分钟直接返回；否则用 refreshToken 向 GitHub 刷新并写回 DB。

### github —— PR 数据
- `githubService.parsePrUrl`：解析 `https://github.com/{owner}/{repo}/pull/{number}`。
- `githubService.fetchPrFromGitHub`：并发拉取 PR 基础信息、files、commits、issue comments，并单独以 `application/vnd.github.v3.diff` 请求完整 diff。
- `githubService.getOrFetchPr`：`node-cache → MongoDB → GitHub API` 三级缓存。
- `githubController`：列表（不含 diff/commits/comments）、详情、主动 fetch。

### pull-request —— 评审任务
- `Review` 模型：userId、prId、status（pending/analyzing/completed/failed）、summary、fileAnalyses、aiUsage、errorMessage、时间戳。
- `reviewController.create`：校验并缓存 PR → 创建 Review → 异步启动分析 → 返回 `201`。
- `reviewController.list` / `getById`：分页列表（按状态过滤）与详情（populate 用户与 PR）。
- `reviewService.processReview`：置为 `analyzing` → 调 LLM → 写入结果并置 `completed`；异常置 `failed`。

### analyzer —— AI 分析
- `buildAnalyzerPrompt`：构造“资深代码评审”提示词，要求返回 JSON（summary + fileAnalyses），diff 截断到 80,000 字符。
- `analyzePullRequest`：调用 OpenAI Chat Completions（可用 `OPENAI_API_URL` 覆盖默认地址），temperature 0.3、max_tokens 8000。
- `parseAnalyzerResponse`：剥离 Markdown 代码块后 `JSON.parse`，校验模型应输出的 summary/fileAnalyses（aiUsage 由调用方在解析后从 API usage 元数据补齐）。

## shared 公共设施

| 文件 | 说明 |
|------|------|
| `db.ts` | `connectDB` / `disconnectDB`（mongoose） |
| `cache.ts` | `getOrSet` / `invalidate` / `flushAll`（node-cache，默认 TTL 900s） |
| `middleware/auth.ts` | JWT Bearer 校验中间件，扩展 `req.user` |
| `middleware/rateLimiter.ts` | `apiLimiter`（100 次/15 分钟）、`aiLimiter`（30 次/小时） |
| `types/index.ts` | 前后端共享类型（PrData、Review、Summary、FileAnalysis 等） |

## 关键实现细节

- **OAuth 安装校验**：OAuth 回调不含 installationId，改为登录后用 `listInstallationsForAuthenticatedUser` 查询，并匹配本 App 的 `app_id`；未安装返回 `409`。
- **Token 自动刷新**：`getValidAccessToken` 在剩余不足 5 分钟时用 refreshToken 刷新，无 refreshToken 则抛出“需要重新授权”。
- **异步分析**：`POST /reviews` 不等待 AI 结果，先返回任务 id，由 `processReview` 在后台完成。
