# 阶段 0：OCR 基线验证结论

> 验收日期：2026-09-11
> 验证环境：Windows / Node v24.20.0 / npm 12.0.2
> OCR：`@alibaba-group/open-code-review` v1.11.8（`b523997b54`，windows/amd64）
> 验证仓库：`D:\Q\frontEnd\PRviewer`
> 验证范围：`main..feat/ai-api-url`
> 模型：DeepSeek OpenAI-compatible endpoint，`deepseek-v4-flash`

## 1. 结论摘要

阶段 0 验收通过。OCR 已在 Windows 上完成安装、配置、文件预览、真实 LLM 评审、JSON 输出、session 持久化和 Web viewer 验证。

真实评审结果：`status=complete`，1 个文件、2 条 comments、12 次 tool calls、61,434 tokens、耗时 32 秒，命令退出码为 0。

需要特别说明：路线图中列出的部分 JSON 字段与 v1.11.8 实际输出不一致。后续适配层必须以本文记录的实际契约为准，不能直接按路线图中的示例字段编码。

## 2. 已复现的命令与结果

### 2.1 文件筛选预览

源码分支预览：

```powershell
ocr review --preview --from main --to feat/ai-api-url --color never
```

结果：

```text
Preview: 1 file(s) changed  |  +74  -69

Will review (1):
  [M]  backEnd/src/modules/analyzer/services/analyzerService.ts +74   -69
```

文档分支预览：

```powershell
ocr review --preview --from main --to docs/security-authorization-audit --color never
```

结果：

```text
Preview: 1 file(s) changed  |  +59  -69

Excluded from review (1):
  [M]  docs/current-status.md (unsupported_ext)
```

结论：`--preview` 可以在不调用 LLM 的情况下确认 keep/drop；keep/drop 原因可稳定获得。

### 2.2 规则匹配

```powershell
ocr rules check backEnd/src/modules/analyzer/services/analyzerService.ts --color never
```

结果：命中系统内置 TypeScript/JavaScript 规则，pattern 为：

```text
**/*.{ts,js,tsx,jsx,mjs,cjs}
```

`package.json` 也能命中专用规则：

```text
**/package.json
```

结论：OCR 的规则选择由文件路径/pattern 确定，适配层后续可以采集 `Source` 和 `Pattern` 作为规则来源信息。

### 2.3 真实 JSON 评审

```powershell
ocr review `
  --from main `
  --to feat/ai-api-url `
  --format json `
  --audience agent `
  --effort low `
  --max-tokens-budget 60000 `
  --timeout 5 `
  --output "$env:TEMP\prviewer-ocr-stage0-result.json" `
  --color never
```

结果：退出码 0，输出 18,403 bytes，`status=complete`。

关键统计：

| 字段 | 实测值 |
|---|---:|
| `summary.files_reviewed` | 1 |
| `summary.comments` | 2 |
| `summary.total_tokens` | 61,434 |
| `summary.input_tokens` | 55,430 |
| `summary.output_tokens` | 6,004 |
| `summary.cache_read_tokens` | 39,424 |
| `summary.elapsed` | `32s` |
| `tool_calls.total` | 12 |
| `tool_calls.failure` | 0 |

`tool_calls.by_tool` 实测：

```json
{
  "code_comment": 1,
  "code_search": 6,
  "file_find": 1,
  "file_read": 4
}
```

同一命令第一次以 30,000 token 预算执行时，在 dispatch 前即被拒绝：单文件 prompt 估算为 32,444 tokens。第二次将预算提高到 60,000 后才进入 LLM。因此后续不宜设置过低的硬预算。

### 2.4 Session 与 Viewer

```powershell
ocr session list --color never
ocr session show <session-id> --json --color never
ocr viewer --open=never --addr 127.0.0.1:5483 --color never
```

验证结果：

- `session list` 能按 repo 列出 range、文件数、comments 数、状态和开始时间。
- `session show --json` 返回 session metadata、`run_manifest` 和 per-file item。
- viewer 启动后 `http://127.0.0.1:5483` 返回 HTTP 200，页面标题为 `Repositories - Open Code Review Viewer`。
- session JSONL 保存在：

```text
%USERPROFILE%\.opencodereview\sessions\<repo-slug>\<session-id>.jsonl
```

本次单文件评审的 JSONL 大小为 258,652 bytes，共 31 行事件：

| 事件类型 | 数量 |
|---|---:|
| `session_start` | 1 |
| `llm_request` | 8 |
| `llm_response` | 8 |
| `tool_call` | 12 |
| `review_item_done` | 1 |
| `session_end` | 1 |

`tool_call` 事件包含：

```text
arguments, duration_ms, filePath, ok, parentUuid, result,
sessionId, taskType, timestamp, tool_name, type, uuid
```

`llm_response` 事件包含：

```text
content, duration_ms, filePath, model, native_payload, parentUuid,
reasoning_content, sessionId, taskType, timestamp, tool_calls,
usage, uuid
```

结论：JSONL 可以作为步骤级 trace 来源，但文件可能很大，且包含 `reasoning_content`、tool result 等敏感/高体积内容。阶段 3 落库时需要裁剪、脱敏或只保存必要事件。

## 3. 锁定的 JSON 契约（v1.11.8）

### 3.1 顶层结构

真实成功输出观察到以下顶层字段：

```json
{
  "status": "complete",
  "llm": {
    "provider": "custom-provider",
    "model": "model-name"
  },
  "message": "Review complete: 2 finding(s) across 1 selected item(s).",
  "summary": {
    "files_reviewed": 1,
    "comments": 2,
    "total_tokens": 61434,
    "input_tokens": 55430,
    "output_tokens": 6004,
    "cache_read_tokens": 39424,
    "elapsed": "32s"
  },
  "tool_calls": {
    "total": 12,
    "by_tool": {},
    "failure": 0,
    "failure_by_tool": {},
    "failure_details": []
  },
  "comments": [],
  "groups": [],
  "session_id": "uuid",
  "manifest": {}
}
```

重要差异：

- 实际存在 `llm`、`message`、`groups`、`session_id`、`manifest`。
- 路线图中预期的 `project_summary` 在 v1.11.8 成功输出中不存在。
- `warnings` 只有在存在 warning 时才出现；稳定成功输出中没有该键。
- `summary` 是执行统计，不是 PR 风险摘要，不能直接填充当前 PRviewer 的 `Summary`。
- `groups` 只提供 `label` 和 `files[]`，没有文件状态、风险等级或文件级摘要。

### 3.2 Comment 结构

实测 comment 字段：

| 字段 | 类型 | 说明 |
|---|---|---|
| `path` | string | 仓库相对路径 |
| `content` | string | Markdown finding 内容 |
| `suggestion_code` | string，条件存在 | 无代码建议时整个字段省略 |
| `existing_code` | string | 被替换的原始代码 |
| `start_line` | number | 起始行 |
| `end_line` | number | 结束行 |
| `thinking` | string | 模型推理文本，可能很长 |
| `category` | string | 实测有 `bug`、`maintainability` |
| `severity` | string | 实测有 `medium`、`low` |

注意：

- 实际 comment 没有 `title` 字段。
- `suggestion_code` 不是固定存在的 null 字段，而是 optional。
- `thinking` 不在路线图的 mapping 字段中，但实际输出存在；默认不得写入 MongoDB 或直接返回给前端。
- 路线图中注释的 `end_line` 等字段本次均已确认。

## 4. 三个映射点

### 4.1 `comments[] -> fileAnalyses[].suggestions`

按 `comments[].path` 分组生成 `FileAnalysis`，每组建议映射如下：

| OCR comment | PRviewer Suggestion | 处理 |
|---|---|---|
| `path` | 所属 `FileAnalysis.filename` | 直接使用并分组 |
| `content` | `description` | 直接使用 |
| `suggestion_code` | `suggestionCode` | 有值时传入，省略时保持 undefined |
| `existing_code` | 不进入当前 Suggestion | 可用于前端 diff/代码上下文，需扩展类型后再存 |
| `start_line` | `lineStart` | 直接映射 |
| `end_line` | `lineEnd` | 直接映射 |
| `category` | `category` | 需要枚举转换 |
| `severity` | `severity` | 需要枚举转换 |
| `thinking` | 不落库、不返回 | 明确丢弃 |

建议的枚举转换：

| OCR category | PRviewer Category |
|---|---|
| `security` | `security` |
| `performance` | `performance` |
| `style` | `style` |
| `bug` | `logic` |
| `maintainability` | `maintainability` |

| OCR severity | PRviewer Severity |
|---|---|
| `critical` | `critical` |
| `high` | `major` |
| `medium` | `minor` |
| `low` | `nit` |

OCR 没有 `title`。阶段 1 必须固定一个无语义损失的生成规则，例如使用分类/severity 的简短标签，或扩展 `Suggestion` 类型后直接保存 `content`。不要从模型再额外请求一次 title。

`FileAnalysis.status` 也不在 OCR comment/group 中。阶段 1 应使用现有 `PrData.files[].filename/status` 按路径补齐；无法匹配时再回退为 `modified`。

`FileAnalysis.riskLevel` 和 `FileAnalysis.summary` 应基于该文件的 comments 确定性派生，例如取最高 severity 并使用 `"N finding(s)"`，不依赖额外 LLM 调用。

### 4.2 OCR `summary -> PRviewer Summary / AiUsage`

现有 `AnalyzerResult.summary` 需要 4 个字段：

```text
riskLevel, score, overview, recommendations
```

OCR 的顶层 `summary` 只有 token、耗时和数量统计，没有这些内容。因此不能写成字段同名直拷，必须分成两部分：

| OCR 字段 | PRviewer 字段 | 处理 |
|---|---|---|
| `message` | `summary.overview` | 直接作为基础摘要 |
| comments 的最高 severity | `summary.riskLevel` | 确定性派生 |
| comments 的 severity 数量 | `summary.score` | 阶段 1 固定公式并写测试 |
| 高等级 comments | `summary.recommendations` | 确定性派生，不额外调用 LLM |
| `summary.input_tokens` | `aiUsage.promptTokens` | 直接映射 |
| `summary.output_tokens` | `aiUsage.completionTokens` | 直接映射 |
| `summary.total_tokens` | `aiUsage.totalTokens` | 直接映射 |
| `llm.model` | `aiUsage.model` | 直接映射 |
| `summary.cache_read_tokens` | 当前类型无字段 | 可扩展 `AiUsage` 或写入 trace |

风险分数必须在阶段 1 固定为确定性函数，例如按 severity 扣分并 clamp 到 0–100；不要在适配层让模型自由生成，否则无法回归和解释。

### 4.3 `tool_calls -> trace`

顶层 `tool_calls` 只是聚合统计，不能提供每一步的输入、输出、耗时和调用顺序。

映射策略：

- 顶层 `tool_calls` 保存为 trace 汇总。
- `session_id` 作为关联 JSONL session 的键。
- 详细步骤从 `%USERPROFILE%\.opencodereview\sessions\...\<session-id>.jsonl` 读取。
- `tool_call`、`llm_request`、`llm_response`、`review_item_done`、`session_end` 可映射为阶段 3 的步骤事件。

阶段 1 先保存 `session_id` 和 `tool_calls` 汇总；阶段 3 再做完整 JSONL trace 落库和前端展示。

## 5. Windows 与子进程接入结论

### 5.1 `spawn` 实测矩阵

| 调用方式 | `shell` | 结果 |
|---|---|---|
| `spawn('ocr', ['--version'])` | `false` | `ENOENT` |
| `spawn('ocr.cmd', ['--version'])` | `false` | `EINVAL` |
| `spawn(process.execPath, [ocrJsPath, '--version'])` | `false` | exit 0，正常输出版本 |

Windows 上 npm 提供的是 `ocr.cmd` / `ocr.ps1` 启动壳，Node 不能按 Unix 可执行文件语义直接 spawn。`shell:true` 会引入引号、注入和路径歧义，不采用。

推荐 MVP 调用方式：

```ts
spawn(
  process.execPath,
  [
    ocrJsPath,
    'review',
    '--from', baseRef,
    '--to', headRef,
    '--format', 'json',
    '--audience', 'agent',
    '--output', outputPath,
    '--color', 'never',
  ],
  {
    cwd: repoDir,
    shell: false,
    windowsHide: true,
  },
);
```

全局 npm 安装时入口为：

```text
%APPDATA%\npm\node_modules\@alibaba-group\open-code-review\bin\ocr.js
```

阶段 1 需要先解决入口解析策略，优先级建议：

1. 将 OCR 包作为后端本地依赖，使用 `require.resolve` 解析 `bin/ocr.js`。
2. 或提供显式 `OCR_CLI_ENTRY` 环境变量。
3. 最后才用 `npm root -g` 探测全局安装。

### 5.2 其他 Windows 坑

- OCR 必须能写 `%USERPROFILE%\.opencodereview\sessions`。首次执行时该目录不可写，OCR 虽然生成了 JSON，但最终以 `create session dir: Access is denied` 失败并返回退出码 1。
- OCR update-check 也会使用 `%USERPROFILE%\.opencodereview`；只读用户目录需要处理权限或关闭更新检查。
- 输出文件必须按 UTF-8 读取。
- `--max-tokens-budget` 使用 dispatch 前估算。本次单文件估算 32,444 tokens，实际总 tokens 61,434；预算不是精确的 token 上限，不能依赖它做严格成本控制。
- OCR 在没有 warning 时省略 `warnings` 键，解析器不能把该字段当作必需字段。
- 失败时 JSON 文件仍可能成功生成；子进程退出码和 `status`/`message` 都要检查。

## 6. 接入方式决策

MVP 使用 `child_process` 调用 OCR CLI。

原因：

- CLI 已能输出完整结构化 JSON，满足阶段 1 的适配层需求。
- `spawn(process.execPath, [ocrJsPath, ...], { shell: false })` 已在 Windows 实测可用。
- MCP 不解决当前 JSON 映射、规则展示和持久化问题，反而增加进程生命周期与协议调试成本。
- 阶段 3 需要更细粒度 trace 时，再评估 MCP；当前 JSONL session 已足够支撑首版 trace。

## 7. 验收清单

| 验收项 | 结果 | 证据 |
|---|---|---|
| OCR 可在当前环境运行 | 通过 | v1.11.8 `--version` 正常 |
| `--preview` 可验证 keep/drop | 通过 | 1 个源码文件 keep，1 个文档文件 unsupported_ext drop |
| 规则匹配可验证 | 通过 | `ocr rules check` 命中 TypeScript 与 package.json pattern |
| 同仓库稳定生成一次 JSON | 通过 | `main..feat/ai-api-url` 退出码 0，`status=complete` |
| comments 实际字段已确认 | 通过 | 2 条 comments，含 path/content/line/category/severity 等 |
| comments -> suggestions 映射已明确 | 通过 | 见 4.1，需处理 category/severity/title/status 差异 |
| summary -> Summary/AiUsage 映射已明确 | 通过 | 见 4.2，必须确定性派生而非直接复制 |
| tool_calls -> trace 映射已明确 | 通过 | 顶层为汇总，详细事件来自 JSONL |
| session list / viewer 可用 | 通过 | list/show 正常，viewer HTTP 200 |
| Windows 子进程方案已实测 | 通过 | 禁止直接 spawn `ocr`/`ocr.cmd`，使用 Node 入口 |
| MVP 接入方式已决策 | 通过 | 使用 child_process CLI；MCP 延后到阶段 3 |

## 8. 阶段 1 必须遵守的契约

1. 按 v1.11.8 实际 JSON 解析，不依赖 `project_summary`。
2. `warnings`、`session_id`、`suggestion_code` 等字段按 optional 处理。
3. 不持久化或返回 `thinking`。
4. 显式做 category/severity 枚举转换。
5. 文件状态从 `PrData.files` 补齐，不从 OCR groups 猜测。
6. `Summary` 的 riskLevel/score/recommendations 使用确定性规则派生。
7. Windows 使用 `process.execPath + ocr.js`，保持 `shell: false`。
8. 调用前确保 OCR session 目录可写，并将该错误映射为可诊断的系统错误。
9. 阶段 1 只保存 `session_id` 和 `tool_calls` 汇总，完整 trace 在阶段 3 落地。
