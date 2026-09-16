# REST API 端点

## 通用约定

- 除 `/health` 与 `POST /auth/install` 外，均需请求头携带 JWT：`Authorization: Bearer <token>`。
- 错误统一返回 `{ "error": "..." }`。
- 列表接口统一返回 `{ data: [...], pagination: { page, limit, total, totalPages } }`。
- 全局限流：100 次 / 15 分钟；AI 相关限流：30 次 / 小时。

## 端点总览

| 方法 | 路径 | 认证 | 说明 |
|------|------|------|------|
| GET | `/health` | 否 | 健康检查 |
| POST | `/auth/install` | 否 | GitHub OAuth 登录 / 安装校验 |
| GET | `/auth/me` | 是 | 当前用户信息 |
| GET | `/pull-requests` | 是 | 已缓存 PR 列表（分页，不含 diff/commits/comments） |
| GET | `/pull-requests/:id` | 是 | 单个已缓存 PR 完整详情 |
| POST | `/pull-requests/fetch` | 是 | 按 PR URL 主动拉取并缓存 |
| POST | `/reviews` | 是（AI 限流） | 创建评审任务并异步分析 |
| GET | `/reviews` | 是 | 评审列表（状态过滤 + 分页） |
| GET | `/reviews/:id` | 是 | 评审详情（populate 用户与 PR） |

## 认证 Auth

### POST `/auth/install`
- Body：`{ "code": string }`（GitHub OAuth authorization code）
- 成功 200：`{ token, user: { id, login, avatarUrl } }`
- 失败：400（code 无效/过期）、409（未安装本 GitHub App）、500（认证失败）

> 注：实现中改为接收 `code`，并在后端查询该用户是否安装了本 App（早期设计文档中的 `installationId` 入参已不再使用）。

### GET `/auth/me`
- 成功 200：`{ id, githubId, login, avatarUrl, email? }`
- 失败：401 / 404 / 500

## GitHub PR

### GET `/pull-requests`
- Query：`page`（默认 1）、`limit`（默认 20）
- 返回 PR 列表，字段不含 `diff` / `commits` / `comments`

### GET `/pull-requests/:id`
- 返回完整 PullRequest 文档（含 files、diff、commits、comments）；comments 为 GitHub 行级 review comments（含 path/line）
- 404：PR 不存在

### POST `/pull-requests/fetch`
- Body：`{ "prUrl": string }`
- 成功 200：完整 PrData
- 失败：400（缺 prUrl / URL 非法）、401（token 过期需重新授权）、500

## 评审 Reviews

### POST `/reviews`
- Body：`{ "prUrl": string }`
- 成功 201：`{ id, status: "pending", prUrl }`（分析异步进行）
- 失败：400（缺 prUrl / URL 非法）、401、500

### GET `/reviews`
- Query：`status`（可选，pending/analyzing/completed/failed）、`page`、`limit`
- 返回：`{ data: Review[], pagination }`；列表项 populate PR 的标题/URL 等摘要字段，不含 fileAnalyses

### GET `/reviews/:id`
- 返回：完整 Review（populate `userId` 的 login/avatarUrl，以及 `prId` 的 title/url/owner/repo/pullNumber/state/files/diff/comments）
- 404：Review 不存在
