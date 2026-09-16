# OCR 数据模型与映射设计

> 基线：`@alibaba-group/open-code-review` v1.11.8。OCR 能力范围、实测命令和原始 JSON 契约见 [phase-0-findings.md](../phase-0/phase-0-findings.md)。
> 本文只定义 OCR 外部契约、PRviewer 目标领域模型及两者的字段映射。

## 1. OCR 外部契约

### 1.1 OCR 输出结构

```text
OCR ReviewRun
├── status
├── llm { provider, model }
├── message
├── summary
│   ├── files_reviewed
│   ├── comments
│   ├── total_tokens
│   ├── input_tokens
│   ├── output_tokens
│   ├── cache_read_tokens
│   └── elapsed
├── tool_calls { total, by_tool, failure, failure_details }
├── comments[]
│   ├── path
│   ├── content
│   ├── existing_code
│   ├── suggestion_code?
│   ├── start_line
│   ├── end_line
│   ├── category
│   ├── severity
│   └── thinking
├── groups[] { label, files[] }
├── session_id?
├── manifest
└── warnings?
```

该结构以一次 OCR 执行为中心。`comments[]` 是扁平的 Finding 列表；`summary` 是执行统计；`groups[]` 只提供分组标签和文件路径。原始结构只在解析/适配边界使用，不能直接作为 MongoDB 模型、REST API DTO 或 React 组件契约。

### 1.2 OCR Session

OCR Session 是一次 OCR review run 的执行容器。一次正常调用通常返回一个 `session_id`；`review --resume <session-id>` 恢复的是评审任务执行，不是打开聊天会话。

Session 的读取方式：

```text
ocr session list
ocr session show <session-id> --json
ocr session comments <session-id>
ocr session compare <first-session-id> <second-session-id>
ocr viewer
```

`session show --json` 返回 session metadata、`run_manifest` 和 per-file item。JSONL 事件默认保存在：

```text
%USERPROFILE%\.opencodereview\sessions\<repo-slug>\<session-id>.jsonl
```

OCR v1.11.8 没有提供 session 内继续对话或追问的命令。JSONL 可能保存历史 `llm_request.messages`，但 OCR 没有开放对话式 continuation 接口。

### 1.3 OCR Trace（JSONL）

一份 JSONL 以行为单位记录 Session 内的步骤事件。阶段 0 实测事件类型为：

```text
session_start
llm_request
llm_response
tool_call
review_item_done
session_end
```

其中：

- `session_start`、`session_end` 描述 Session 生命周期。
- `llm_request`、`llm_response`、`tool_call`、`review_item_done` 构成步骤级 Trace。
- 事件字段以 JSONL 行内字段为准，常见字段包括 `sessionId`、`timestamp`、`uuid`、`parentUuid`、`taskType`、`filePath`、`duration_ms`、`ok`、`usage`。
- `tool_call` 包含 `arguments`、`result`、`tool_name`、`filePath`、`duration_ms` 和 `ok` 等调用信息。
- `llm_response` 包含 `content`、`model`、`usage`、`tool_calls`，也可能包含 `native_payload` 和 `reasoning_content`。

JSONL 可能包含完整 messages、tool result、`native_payload` 和 `reasoning_content`，体积和敏感度都可能很高，不能未经裁剪直接暴露给前端。

## 2. 目标领域与 MongoDB 模型

目标关系：

```text
Review 1 ──── N Finding（MVP 嵌入 Review）
Review 1 ──── N ReviewSession 1 ──── N ReviewTraceEvent
```

正常评审通常只有 1 个 Session；允许 1:N 是为了容纳失败重试、重新评审和 resume 产生的多个执行记录。Finding 是评审结果，Session 和 Trace 是执行记录，三者职责不混用。

### 2.1 Review + Finding

```text
Review
├── userId
├── prId
├── engine
├── engineVersion
├── status
├── engineStatus
├── llm { provider, model }
├── message?
├── runSummary { filesReviewed, comments, totalTokens, inputTokens, outputTokens, cacheReadTokens, elapsed }
├── toolCalls?
├── findings[] (Finding)
├── groups[] { label, files[] }
├── sessionId?
├── ruleMatches[]?
├── warnings[]?
├── filteredFiles[]?
├── aiUsage?
├── errorMessage?
├── startedAt?
└── completedAt?

Finding
├── path
├── content
├── existingCode?
├── suggestionCode?
├── startLine
├── endLine
├── category
├── severity
├── rawCategory?
└── rawSeverity?
```

`Review` 是 PRviewer 的业务聚合，承载任务状态、业务关联、OCR 运行信息和 Session 关联。`Finding` 在 MVP 中随 `Review` 嵌入保存，承载 OCR `comments[]` 的路径、内容、行号、代码建议和归一化后的 category/severity。

`Finding` 不包含 `title`、文件级 `riskLevel/summary` 或 PR 总分。文件变更状态以 `PullRequest.files` 为准，不从 OCR `groups[]` 推断。

建议索引：

```text
{ userId: 1, createdAt: -1 }
{ prId: 1, createdAt: -1 }
{ status: 1, createdAt: -1 }
{ sessionId: 1 } sparse
```

### 2.2 ReviewSession

```text
ReviewSession
├── reviewId
├── sessionId
├── repoDir
├── gitBranch
├── reviewMode
├── diffFrom
├── diffTo
├── model
├── startTime
├── endTime
├── durationMs
├── selectedFiles
├── completedFiles
├── failedFiles
├── totalComments
├── llmFailures
├── aborted
├── runManifest
└── rawJsonlRef?
```

建议索引：

```text
{ sessionId: 1 } unique
{ reviewId: 1, startTime: -1 }
```

### 2.3 ReviewTraceEvent

完整 JSONL 不能作为单个字符串存入 MongoDB。目标模型按事件拆分：

```text
ReviewTraceEvent
├── reviewId
├── sessionId
├── sequence
├── type
├── timestamp
├── uuid
├── parentUuid
├── taskType
├── filePath
├── toolName
├── durationMs
├── ok
├── usage
└── payload
```

`sequence` 使用 JSONL 行顺序作为稳定排序键；`payload` 只保存经过裁剪、脱敏且对回放有价值的事件字段。建议索引：

```text
{ sessionId: 1, sequence: 1 } unique
{ reviewId: 1, timestamp: 1 }
{ sessionId: 1, type: 1 }
```

## 3. OCR 数据到目标模型的映射

### 3.1 OCR Review 输出 -> Review + Finding

| OCR 输出字段 | 目标字段 | 处理 |
|---|---|---|
| `status` | `Review.engineStatus` | 保留 OCR 返回的运行状态；不要覆盖由 PRviewer 任务状态机维护的 `Review.status` |
| `llm.provider` | `Review.llm.provider` | 直接映射 |
| `llm.model` | `Review.llm.model` / `AiUsage.model` | 两处引用同一个归一化值 |
| `message` | `Review.message?` | 作为运行说明保留 |
| `summary.files_reviewed` | `Review.runSummary.filesReviewed` | 直接映射 |
| `summary.comments` | `Review.runSummary.comments` | 直接映射 |
| `summary.total_tokens` | `Review.runSummary.totalTokens` / `AiUsage.totalTokens` | 映射 |
| `summary.input_tokens` | `Review.runSummary.inputTokens` / `AiUsage.promptTokens` | 映射 |
| `summary.output_tokens` | `Review.runSummary.outputTokens` / `AiUsage.completionTokens` | 映射 |
| `summary.cache_read_tokens` | `Review.runSummary.cacheReadTokens` | 映射 |
| `summary.elapsed` | `Review.runSummary.elapsed` | 保留 OCR 原始表示 |
| `tool_calls` | `Review.toolCalls?` | 只保存聚合统计；详细步骤来自 JSONL |
| `comments[]` | `Review.findings[]` | 按 3.2 映射 |
| `groups[]` | `Review.groups[]` | 只保留 label 与 files |
| `session_id?` | `Review.sessionId?` | 作为关联 `ReviewSession` 的键 |
| `manifest` | `ReviewSession.runManifest` | 与 `session show --json` 的 `run_manifest` 合并；后者更完整时以后者为准 |
| `warnings?` | `Review.warnings[]?` | 字段缺失时按空数组处理，不视为失败 |

`Review.engine` 和 `Review.engineVersion` 来自调用 OCR 的配置及实际版本；`Review.startedAt`、`Review.completedAt` 来自调用生命周期或 Session 边界事件。

### 3.2 OCR comments -> Finding

| OCR comment | Finding | 处理 |
|---|---|---|
| `path` | `path` | 直接映射 |
| `content` | `content` | 直接映射 |
| `existing_code` | `existingCode?` | 保留原始代码上下文 |
| `suggestion_code?` | `suggestionCode?` | 有值时映射 |
| `start_line` | `startLine` | 直接映射 |
| `end_line` | `endLine` | 直接映射 |
| `category` | `rawCategory?` + `category` | 保留原值，同时显式归一化 |
| `severity` | `rawSeverity?` + `severity` | 保留原值，同时显式归一化 |
| `thinking` | 不保存 | 丢弃，不落库、不返回前端 |

category 归一化：

| OCR category | Finding.category |
|---|---|
| `security` | `security` |
| `performance` | `performance` |
| `style` | `style` |
| `bug` | `logic` |
| `maintainability` | `maintainability` |

severity 归一化：

| OCR severity | Finding.severity |
|---|---|
| `critical` | `critical` |
| `high` | `major` |
| `medium` | `minor` |
| `low` | `nit` |

OCR 没有 Finding `title`。前端直接使用 `severity`、`category` 和 `content` 渲染，不生成占位 title。未知枚举值保留在 `rawCategory`/`rawSeverity`，并使用明确、可测试的降级规则。

### 3.3 OCR Session -> ReviewSession

| OCR 数据 | ReviewSession | 处理 |
|---|---|---|
| `session_id` | `sessionId` | 必填关联键；成功后建立唯一索引 |
| 调用时的工作目录 | `repoDir` | 保存 OCR 实际执行目录 |
| 调用时的分支与 diff 参数 | `gitBranch`、`reviewMode`、`diffFrom`、`diffTo` | 从实际调用参数映射 |
| `llm.model` | `model` | 与 Review 使用同一归一化值 |
| `session_start.timestamp` | `startTime` | 使用 JSONL 事件时间 |
| `session_end.timestamp` | `endTime` | 使用终态事件时间 |
| Session 边界时间 | `durationMs` | 优先使用 OCR 提供的 duration，否则由起止时间计算 |
| session metadata / per-file item | `selectedFiles`、`completedFiles`、`failedFiles` | 保留文件级执行状态 |
| `summary.comments` 或 Finding 数 | `totalComments` | 使用 OCR 统计，并允许通过 Finding 数校验 |
| Trace 中失败的 LLM 事件 | `llmFailures` | 按事件计数 |
| `session_end` 状态 | `aborted` | 映射中断/终止状态 |
| `session show.run_manifest` 或输出 `manifest` | `runManifest` | 保存执行清单，不保存完整 JSONL |
| 外部保存的原始 JSONL 地址 | `rawJsonlRef?` | 仅保存引用，不把 JSONL 内容塞入 Session |

### 3.4 OCR JSONL -> ReviewTraceEvent

| JSONL 事件 | 目标处理 |
|---|---|
| `session_start` | 创建或更新 `ReviewSession` |
| `session_end` | 更新 Session 终态和统计 |
| `review_item_done` | 保存文件完成摘要，并关联 Finding 数 |
| `tool_call` | 保存工具名、参数摘要、结果摘要、耗时和成功状态 |
| `llm_request` | 只保存模型、消息数量、摘要或 hash；不保存完整 messages |
| `llm_response` | 只保存 usage、耗时、输出摘要；不保存 `reasoning_content` 和 `native_payload` |

通用字段映射：

| JSONL 字段 | ReviewTraceEvent | 处理 |
|---|---|---|
| JSONL 行号 | `sequence` | 从 1 开始递增；与 `sessionId` 组成幂等键 |
| `type` | `type` | 直接映射 |
| `sessionId` | `sessionId` | 直接映射 |
| `timestamp` | `timestamp` | 转换为统一时间类型 |
| `uuid` | `uuid` | 直接映射 |
| `parentUuid` | `parentUuid` | 可选映射 |
| `taskType` | `taskType` | 可选映射 |
| `filePath` | `filePath` | 可选映射 |
| `tool_name` | `toolName` | snake_case 转 camelCase |
| `duration_ms` | `durationMs` | snake_case 转 camelCase |
| `ok` | `ok` | 可选映射 |
| `usage` | `usage` | 仅保留 token 和使用统计 |
| 事件专属字段 | `payload` | 只保存允许回放的裁剪字段 |

本项目的 `reviewId` 不属于 OCR JSONL 字段，而是在导入事件时由 `ReviewSession.reviewId` 补充。

### 3.5 通用字段处理

1. 字段命名统一从 OCR 的 snake_case 转为 PRviewer 的 camelCase。
2. `warnings`、`session_id`、`suggestion_code` 等条件字段按 optional 处理，不能将缺失键视为解析失败。
3. category/severity 在适配层显式归一化，并保留原始值用于诊断。
4. 不持久化或返回 `thinking`、完整 messages、`reasoning_content`、`native_payload` 等推理或高体积字段。
5. `payload` 需要设置大小上限、脱敏和保留期；不能因为当前样例 JSONL 较小就假设未来 Session 可以整体内嵌。
6. OCR JSON 只作为解析输入；JSONL 通过 `ReviewSession + ReviewTraceEvent` 规范化保存。如需完整回放，应将原始 JSONL 放入对象存储或 GridFS，并在 Session 中只保留引用。
7. 不为满足旧结构而伪造 OCR 不提供的 PR `riskLevel/score/overview/recommendations`、文件级 `riskLevel/summary` 或 Finding `title`。
8. OCR 只提供可靠的文件级规则集匹配，不提供 comment 到具体规则的稳定归因。`comments[]` 不能标记为 `deterministic`，也不能绑定具体 `ruleId`。
