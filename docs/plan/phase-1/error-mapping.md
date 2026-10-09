# OCR 评审错误映射设计

> 本文只定义 OCR 接入后的同步/异步错误边界、公共错误契约，以及错误到 HTTP 和 Review 的映射。
>
> OCR CLI Runner 的内部接口与错误来源见 [ocr-cli-runner.md](./ocr-cli-runner.md)。
> `processReview` 的完整编排顺序已经记录在
> [ocr-harness-roadmap.md](../ocr-harness-roadmap.md) 与
> [ocr-integration.md](./ocr-integration.md)，本文不重复。

## 1. 当前同步/异步边界

现有创建评审接口分成两个阶段：

### 1.1 POST 内同步阶段

`POST /reviews` 在返回响应前同步完成：

- 校验 `prUrl`；
- 校验用户身份；
- 获取有效 GitHub access token；
- 解析并拉取/缓存 Pull Request；
- 查找 PullRequest 文档；
- 创建 Review 记录。

这些错误发生在响应发出前，可以直接映射为本次 POST 的 HTTP 状态码和结构化错误体。

### 1.2 响应后的异步阶段

Review 创建成功后，`POST /reviews` 立即返回。后续 `processReview` 异步执行：

- 物化仓库；
- 执行 OCR CLI；
- 解析 OCR JSON；
- 转换并持久化 Review/Finding。

这些错误发生时 POST 响应已经发出，不能再改变这次 POST 的状态码。错误必须写入 Review，
由前端轮询 `GET /reviews/:id` 获取。

## 2. HTTP 错误契约

同步 HTTP 错误统一为：

```ts
export interface ApiErrorResponse {
    error: {
        code: string;
        message: string;
    };
}
```

示例：

```json
{
    "error": {
        "code": "INVALID_PR_URL",
        "message": "Invalid GitHub PR URL"
    }
}
```

约束：

- `code` 是稳定、机器可读的错误码；
- `message` 是稳定、用户可读的安全文本；
- 阶段 1 不返回 `details`、堆栈、SQL/Mongo 错误、Git 原始错误或 OCR stderr；
- 原始异常只写服务端日志；
- 修改响应结构是 breaking change，后端、前端和测试必须在同一次实现中同步更新。

## 3. Review 错误字段

`Review` 增加三个可选字段：

```ts
export type ReviewErrorStage =
    | 'materialize_repo'
    | 'run_ocr'
    | 'parse_ocr'
    | 'persist_review'
    | 'unknown';

export interface ReviewErrorFields {
    errorCode?: string;
    errorStage?: ReviewErrorStage;
    errorMessage?: string;
}
```

现有 `errorMessage` 继续保留，用于兼容旧记录。新增字段均为 optional，不需要数据库迁移。

生命周期规则：

- 创建 Review 时三个字段均不设置；
- 开始异步处理时清空三个字段；
- 处理成功后三个字段保持为空；
- 处理失败时设置 `errorCode`、`errorStage` 和安全 `errorMessage`；
- `review.status` 统一写为 `failed`；
- 记录 `completedAt`；
- 原始异常写入日志，不写入 `errorMessage`。

如果失败状态的保存本身失败，无法保证错误已持久化，只记录服务端日志。

## 4. 同步错误到 HTTP 的映射

| 错误码 | HTTP | 触发条件 | 用户消息 |
|--------|------|----------|----------|
| `INVALID_REQUEST` | 400 | 缺少 `prUrl` 或请求体格式错误 | `Invalid review request` |
| `INVALID_PR_URL` | 400 | PR URL 无法解析 | `Invalid GitHub PR URL` |
| `AUTH_REQUIRED` | 401 | 请求没有登录用户 | `Not authenticated` |
| `GITHUB_AUTH_EXPIRED` | 401 | GitHub 授权失效，需要重新认证 | `GitHub authorization expired. Please re-authenticate.` |
| `PR_NOT_FOUND` | 404 | GitHub 返回 403/404，或用户无权访问 PR | `Pull request not found` |
| `REVIEW_NOT_FOUND` | 404 | 查询 Review 时不存在或不属于当前用户 | `Review not found` |
| `PR_CACHE_FAILED` | 500 | PR 已拉取但无法写入/读取本地缓存 | `Failed to cache PR data` |
| `REVIEW_CREATE_FAILED` | 500 | Review 记录创建失败 | `Failed to create review` |
| `INTERNAL_ERROR` | 500 | 未分类的同步异常 | `Failed to create review` |

`PR_NOT_FOUND` 用于覆盖 GitHub 的 403 和 404，避免向无权限用户泄露 PR 是否存在。

## 5. 异步错误到 Review 的映射

异步错误不改变 POST 返回的 `201`。表中的“规范 HTTP”是后续同步接口或状态接口若直接暴露
同一错误时应使用的状态码，不代表当前 `POST /reviews` 会等待并返回该状态码。

| 公共错误码 | `errorStage` | 触发来源 | 规范 HTTP | 安全 `errorMessage` |
|------------|--------------|----------|-----------|---------------------|
| `REPO_INVALID_INPUT` | `materialize_repo` | owner/repo/PR 参数或工作目录非法 | 400 | `Invalid repository materialization input` |
| `REPO_GITHUB_API_FAILED` | `materialize_repo` | 获取 installation token 或查询 base/head 失败 | 502 | `Failed to resolve pull request revisions` |
| `REPO_GIT_FAILED` | `materialize_repo` | `git init/fetch/checkout` 失败 | 502 | `Failed to prepare repository for review` |
| `REPO_VERIFY_FAILED` | `materialize_repo` | checkout 后 SHA 校验失败 | 500 | `Repository verification failed` |
| `OCR_INVALID_INPUT` | `run_ocr` | Runner 输入校验失败 | 400 | `Invalid OCR runner input` |
| `OCR_CLI_NOT_FOUND` | `run_ocr` | OCR 入口不存在或不可读 | 503 | `OCR review engine is unavailable` |
| `OCR_SPAWN_FAILED` | `run_ocr` | OCR 进程启动失败 | 500 | `Failed to start OCR review engine` |
| `OCR_TIMEOUT` | `run_ocr` | OCR 超过进程级超时 | 504 | `OCR review timed out` |
| `OCR_EXECUTION_FAILED` | `run_ocr` | OCR 退出码非 0 | 502 | `OCR review failed` |
| `OCR_OUTPUT_MISSING` | `run_ocr` | OCR 退出码为 0 但没有输出 | 502 | `OCR review did not produce output` |
| `OCR_OUTPUT_READ_FAILED` | `run_ocr` | 输出文件无法读取 | 500 | `Failed to read OCR review output` |
| `OCR_OUTPUT_INVALID` | `parse_ocr` | JSON 非法、契约校验失败 | 502 | `OCR returned invalid review output` |
| `REVIEW_PERSIST_FAILED` | `persist_review` | 保存 Review/Finding 失败 | 500 | `Failed to save review result` |
| `INTERNAL_ERROR` | `unknown` | 未分类异常 | 500 | `Review processing failed` |

## 6. 异常到公共错误的转换

转换规则：

- `RepoMaterializationError.code` 映射为对应的 `REPO_*` 错误；
- `OcrRunnerError.code` 保留为同名 `OCR_*` 错误；
- `OcrContractError` 映射为 `OCR_OUTPUT_INVALID`；
- Review/Finding 持久化失败映射为 `REVIEW_PERSIST_FAILED`；
- 其他异常统一映射为 `INTERNAL_ERROR` 和 `unknown`；
- `errorCode` 与 `errorStage` 必须成对写入；
- `errorMessage` 不允许直接使用任意 `Error.message`。

映射函数应在服务层集中实现，控制器不根据异常文本做字符串匹配。

## 7. API 行为

- 同步创建成功仍返回 `201`；
- 同步校验失败返回对应的 4xx/5xx 结构化错误体；
- 异步失败不影响已发送的 `201`；
- `GET /reviews/:id` 对失败的 Review 仍返回 HTTP `200`，因为读取资源本身成功；
- 响应中的 `status` 为 `failed`，并包含 `errorCode`、`errorStage`、`errorMessage`；
- 阶段 1 不增加自动重试、重试接口或独立状态事件接口。

前端行为：

- POST 失败时读取 `error.code` 和 `error.message`；
- 轮询 Review 时以 `status === 'failed'` 作为终态；
- 优先展示 `errorMessage`；
- `errorCode` 用于后续定制提示或恢复动作；
- 不使用 HTTP 500 判断异步 OCR 失败。

## 8. 测试矩阵

同步映射测试：

- 每个同步错误码返回正确 HTTP 状态；
- 响应体严格符合 `{ error: { code, message } }`；
- 缺少 `prUrl`、非法 URL、未登录、授权失效、PR 无权限分别命中正确错误；
- 响应中不包含堆栈、原始 GitHub 错误或内部文件路径。

异步映射测试：

- 每个 `RepoMaterializationError.code` 映射到正确 `errorCode/errorStage`；
- 每个 `OcrRunnerError.code` 映射到正确 `errorCode/errorStage`；
- `OcrContractError` 映射为 `OCR_OUTPUT_INVALID/parse_ocr`；
- 持久化失败映射为 `REVIEW_PERSIST_FAILED/persist_review`；
- 未知异常映射为 `INTERNAL_ERROR/unknown`；
- 失败时 Review 状态为 `failed`，三个错误字段均存在；
- 原始异常只进入日志，不进入 Review 响应。

生命周期测试：

- 新 Review 没有错误字段；
- 开始处理时清空旧错误字段；
- 成功后错误字段保持为空；
- `GET /reviews/:id` 对失败 Review 返回 HTTP 200；
- 失败 Review 返回稳定、安全的用户消息。

## 9. 默认决策

- 阶段 1 保持 POST 异步创建和前端轮询；
- Review 错误字段均为 optional，不需要数据库迁移；
- `errorCode` 与 `errorStage` 是新的公共字段，需要同步更新后端共享类型和前端类型；
- HTTP `{ error: string }` 到 `{ error: { code, message } }` 是 breaking change，前后端必须同一提交内迁移；
- 阶段 1 不定义自动重试策略。
