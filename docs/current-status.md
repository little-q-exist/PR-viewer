# 当前状态与已知问题

## 安全审计：跨用户越权与私有数据泄露（P0，已确认）

审计基线：`main` @ `63e9d63`。检查范围为 `backEnd/src` 的全部路由，以及 `frontEnd/src` 的实际 API 调用。

结论：原报告属实，且影响面比“`GET /reviews/:id` 缺少 `userId`”更大。除直接读取他人 Review 外，`POST /reviews` 还可通过命中共用的 PR 缓存，间接读取其他用户缓存过的私有 PR 数据。

### 接口与调用链确认

| 接口 | 当前校验 | 实际数据路径 | 结论 | 前端业务调用 |
|------|----------|--------------|------|--------------|
| `GET /reviews/:id` | 仅 `authMiddleware` | `Review.findById(reviewId)`，没有 `userId` 条件 | 确认：知道 Review ID 即可读取他人评审、私有 PR 的 files/diff/comments | 是，评审详情 |
| `GET /pull-requests` | 仅 `authMiddleware` | `PullRequest.find()` 全库分页 | 确认：返回所有用户的共享缓存 PR 摘要 | 否，暂未接入 |
| `GET /pull-requests/:id` | 仅 `authMiddleware` | `PullRequest.findById(id)`，没有所有权或 GitHub 权限校验 | 确认：读取任意缓存 PR 的完整 files/diff/comments | 否，暂未接入 |
| `POST /pull-requests/fetch` | `authMiddleware` + 当前用户 GitHub token | `getOrFetchPr()` 命中内存或 MongoDB 缓存后直接返回 | 确认：不验证当前用户是否有权访问该 PR | 否，暂未接入 |
| `POST /reviews` | `authMiddleware` + 当前用户 GitHub token | `getOrFetchPr()` 命中共享缓存后直接用于创建 Review 和 AI 分析 | 确认：即使直接读取接口被修复，仍可通过创建评审间接触发同类泄露 | 是，创建评审 |
| `GET /reviews` | `authMiddleware` + `listReviews(userId)` | 查询条件包含当前 `userId` | 未发现跨用户读取问题 | 是，列表/首页 |
| `GET /auth/me` | `authMiddleware` + 当前 `userId` | 按当前用户 ID 查询 | 未发现跨用户读取问题 | 是 |

共享缓存是根因之一：

- `githubService.ts` 的内存 key 仅为 `pr:${owner}:${repo}:${pullNumber}`，见 `getOrFetchPr()`。
- MongoDB 的 `PullRequest` 也仅按 `{ owner, repo, pullNumber }` 全局去重。
- `PullRequest` 当前没有 `userId`、`installationId` 或已授权用户列表，缓存命中后不会再次调用 GitHub 验证请求者权限。
- 因此，问题不仅是三个 `/pull-requests` 接口；凡是复用 `getOrFetchPr()` 的 `POST /reviews` 和 `POST /pull-requests/fetch` 都受影响。

### 上下游影响

后端受影响链路：

- 评审详情：`reviewController.getById()` -> `reviewService.getReviewById()` -> `Review.findById()`。
- 创建评审：`reviewController.create()` -> `getValidAccessToken()` -> `githubService.getOrFetchPr()` -> `PullRequest` 内存/MongoDB 缓存。
- PR 接口：`githubController` 的 list/detail/fetch 三个处理函数。
- 数据模型：`Review.userId` 已存在，可直接用于详情授权；`PullRequest` 没有访问主体，无法直接按用户过滤。

前端影响：

- 前端只封装并调用 `/reviews` 的 list、detail、create，见 `frontEnd/src/shared/services/api.ts`。
- 前端没有 `/pull-requests` 的业务调用；三个路由目前属于预留/未完成接口。
- 修复 Review 详情和共享缓存授权不需要修改前端；删除/禁用 `/pull-requests` 也不影响当前前端，但按当前决策暂不删除。

数据库与 breaking change：

- 最小方案只在缓存命中时用当前用户 token 做 GitHub 实时授权检查，不需要数据库迁移。
- 若后续要高效支持“只列出用户可访问的缓存 PR”，需要给 `PullRequest` 增加访问主体/授权记录并处理历史数据，改动会大于实时检查方案。
- `GET /reviews/:id` 修复后，合法用户的响应不变；无权限用户应由原来的 `200` 变为 `404`，这是有意的安全行为变更。
- `/pull-requests` 三个接口当前暂不删除、暂不接入前端。本次最小修复不改变其接口契约，但必须把它们记录为残余 P0；在补齐授权前不应对外公开或投入业务使用。

### 最小改动方案

前提：保留 `/pull-requests` 路由，暂不删除。

1. 修复 Review 详情直接越权
   - 将 `getReviewById(reviewId)` 改为 `getReviewById(reviewId, userId)`。
   - 查询由 `Review.findById(reviewId)` 改为 `Review.findOne({ _id: reviewId, userId })`，保留现有 populate。
   - `reviewController.getById()` 传入 `req.user.userId`；查不到时继续返回 `404`，避免泄露资源是否存在。
   - 预计后端改动约 5-10 行，另补服务/控制器权限测试；前端无改动，无数据库迁移。

2. 修复共享 PR 缓存的命中授权
   - 在 `getOrFetchPr()` 中，内存缓存或 MongoDB 缓存命中后，返回数据前使用当前请求者的 access token 调用 GitHub `pulls.get({ owner, repo, pull_number })` 进行访问校验。
   - GitHub 返回 `403/404` 时不得返回缓存内容；`POST /reviews` 应返回安全的 `404`（或统一的无权限错误），`POST /pull-requests/fetch` 采用相同策略。
   - 缓存 miss 时现有完整拉取已经证明当前用户有权限，无需额外增加一次检查。
   - 这是保留现有缓存、无数据库迁移的最小安全改法。代价是每次缓存命中多一次 GitHub PR 基础信息请求；files/commits/diff/comments 仍可复用缓存。
   - 不建议只比较 `installationId` 后放行：同一 installation 不代表用户仍保有具体仓库/PR 权限，而且当前 `User` 只保存一个 installationId。

3. `/pull-requests` 暂缓项
   - `POST /pull-requests/fetch` 会随第 2 项获得缓存命中保护。
   - `GET /pull-requests/:id` 仍需在业务实现前补同样的实时 GitHub 权限校验，否则仍可直接读取他人的完整缓存。
   - `GET /pull-requests` 无法仅靠给 `PullRequest` 查询追加 `userId` 修复，因为模型没有用户关联。后续应选择：增加授权主体/授权记录后按当前用户过滤，或在该业务未实现前临时返回禁用状态。当前决策为先不动并保留风险记录。

### 验收与测试

- 用户 A 创建的 Review 和完整 PR 数据，用户 B 请求 `GET /reviews/:id` 必须得到 `404`。
- 用户 A 缓存私有 PR 后，用户 B 调用 `POST /reviews` 不得命中缓存并创建可读的 Review；GitHub 校验失败时应终止创建。
- 用户 B 若确实有 GitHub 访问权限，缓存命中校验通过后仍可正常使用，验证缓存不会被直接废弃。
- GitHub `403` 与 `404` 均不能回退为缓存响应。
- `/pull-requests` 暂不删除、不改接口契约，但其残余越权风险继续保留在本文件中，直到业务接入前完成授权设计。

### 改动规模结论

- 现有 `/reviews` 可用链路的最小 P0 修复：后端 2-4 个文件（controller/service/tests，可能含 githubService 与错误映射），约几十行，无前端改动、无数据库迁移。
- `/pull-requests`：本次按决策暂不处理；若要让整个后端不存在该 P0，必须额外处理两个 GET 接口。列表接口需要新增授权模型，属于中等改动；详情/fetch 可采用实时 GitHub 校验，属于小改动。
