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

### 1.1 最终领域模型结论（已确认）

阶段 0 完成后已明确调整实现方向：不再以兼容现有 `AnalyzerResult`、`Summary`、`Recommendation`、`FileAnalysis` 和 `Suggestion` 为目标。当前仍处于测试阶段且没有需要保留的历史 Review 数据，因此项目明确推翻旧领域模型，直接围绕 OCR 设计新的 `Review + Finding`。

- `Review` 是 PRviewer 的持久化业务聚合，承载一次评审任务、业务关联、任务状态、OCR 运行信息、LLM 统计和 session 关联，不等同于 OCR 原始 JSON。
- `Finding` 是 OCR `comments[]` 解析后的持久化领域对象，承载路径、内容、行号、代码建议以及归一化后的 category/severity 等稳定信息。
- 保留一个很薄的 OCR 解析/适配层，只负责把 OCR 原始 JSON 转换为 `Review + Finding`，包括字段命名转换、optional 处理、枚举归一化和敏感字段过滤；适配层不负责伪造 OCR 不提供的业务字段。
- OCR 原始 JSON/JSONL 是外部契约，只在解析边界使用，不作为 MongoDB Schema、REST API DTO 或 React 组件契约。
- 不为兼容旧结构而强制生成 OCR 不提供的 PR riskLevel/score/overview/recommendations、文件级 riskLevel/summary 或 Suggestion title。若产品确需风险聚合，应作为独立、可选且明确标记为 derived 的领域字段。
- 如果未来仍保留 legacy 引擎，也应适配到新的 `Review + Finding`，不再让旧 `AnalyzerResult` 充当跨层公共契约。

## 2. OCR 能力范围

### 2.1 已验证能力

| 能力           | 阶段 0 证据                                                         | 对 PRviewer 的价值                       |
| -------------- | ------------------------------------------------------------------- | ---------------------------------------- |
| 文件筛选       | `review --preview` 返回 keep/drop 及 `unsupported_ext` 等原因       | 在调用 LLM 前展示或记录过滤结果          |
| 规则集匹配     | `rules check` 返回 `Source`、`Pattern`、`Rule`                      | 可保存文件级规则集元数据，用于解释和调试 |
| 工具调用循环   | 单文件实测 8 次 LLM 请求/响应、12 次 tool calls                     | 替代原有一次 LLM + 截断 diff 的评审方式  |
| 代码检索工具   | `file_read`、`file_search`、`file_find`、`code_search`              | 支持跨文件上下文检索                     |
| 行级评审结果   | `comments[]` 返回 path、content、start/end line、category、severity | 转换为目标 `Finding`                     |
| Session 持久化 | `session list/show` 可读取运行元数据和文件项                        | 关联 OCR 运行与业务 Review               |
| 步骤级 Trace   | JSONL 记录 LLM、tool call、文件完成和结束事件                       | 支撑失败定位、耗时分析和可回放时间线     |
| Viewer         | `ocr viewer` 提供只读 Web UI                                        | 运维调试和 Session 回放参考              |
| 任务恢复/比较  | `review --resume`、`session compare`                                | 恢复中断任务、比较两次评审变化           |

### 2.2 不纳入目标领域模型的能力

以下内容属于旧 `AnalyzerResult` 兼容契约，不是 OCR 原生输出，也不会进入目标 `Review + Finding` 模型：

- PR 整体 `riskLevel`、`score`、`overview`、`recommendations`。
- 文件级 `status`、`riskLevel`、`summary`。
- Suggestion/Finding 的 `title`。
- comment 到具体 OCR 规则的稳定归因。（非当前目标）
- 与用户的 Session 对话或追问。（非当前目标）
- 本项目采用的 CLI JSON 集成不会自动完成 GitHub inline comment 回写。
- 对 token 成本的严格硬上限。`--max-tokens-budget` 在 dispatch 前估算，不是精确上限。

不会为了满足旧 Schema 而伪造上述字段。若产品后续确实需要 PR 风险或评分，应新增独立、可选且明确标记为 `derived` 的聚合字段，并说明它不是 OCR 原生结论。

### 2.3 规则匹配边界

`ocr rules check <file>` 返回的是：

```text
File:    文件路径
Source:  规则来源，例如 System built-in
Pattern: 匹配路径的 glob，例如 **/*.{ts,js,tsx,jsx,mjs,cjs}
Rule:    给模型使用的自然语言审查清单
```

因此可以确定：

```text
文件 -> 匹配了哪个规则集
```

不能确定：

```text
comment -> 命中了哪一条具体规则
```

原因是 `comments[]` 不返回 `ruleId`、`Source` 或 `Pattern`，而且一份规则包含多条自然语言检查项。一条 comment 可能同时覆盖多条规则，也可能来自模型未显式列出的通用判断；没有 comment 也不代表规则未执行。

当前决策：

- 后端可以保存文件级 `ruleMatches`，字段只表达“该文件使用了哪个规则集”。
- 不把 `category/severity` 当成规则 ID，也不把 comment 标成 `deterministic=true`。
- 不把 Finding 展示为确定性的“规则命中”；Finding 仍是 OCR/LLM 的评审 Finding。
- 未来若接入独立确定性规则引擎，必须让 Finding 自带稳定 `ruleId`，再建立 Finding 级来源关系。

## 3. 已复现的命令与结果

### 3.1 文件筛选预览

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

### 3.2 规则匹配

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

结论：OCR 的规则选择由文件路径/pattern 确定，适配层后续可以采集 `Source` 和 `Pattern` 作为文件级规则来源信息。

边界：`rules check` 只回答“该文件匹配了哪个规则集”，`comments[]` 不包含稳定的 `ruleId`/`Source`/`Pattern`。规则内容是自然语言检查清单，一条 comment 可能覆盖多条规则，也可能来自规则外的通用判断，因此不能可靠推导 comment 与具体规则的一一对应关系。

### 3.3 真实 JSON 评审

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

| 字段                        | 实测值 |
| --------------------------- | -----: |
| `summary.files_reviewed`    |      1 |
| `summary.comments`          |      2 |
| `summary.total_tokens`      | 61,434 |
| `summary.input_tokens`      | 55,430 |
| `summary.output_tokens`     |  6,004 |
| `summary.cache_read_tokens` | 39,424 |
| `summary.elapsed`           |  `32s` |
| `tool_calls.total`          |     12 |
| `tool_calls.failure`        |      0 |

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

### 3.4 Session 与 Viewer

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

| 事件类型           | 数量 |
| ------------------ | ---: |
| `session_start`    |    1 |
| `llm_request`      |    8 |
| `llm_response`     |    8 |
| `tool_call`        |   12 |
| `review_item_done` |    1 |
| `session_end`      |    1 |

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

## 4. 锁定的 JSON 契约（v1.11.8）

### 4.1 顶层结构

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

### 4.2 Comment 结构

实测 comment 字段：

| 字段              | 类型             | 说明                            |
| ----------------- | ---------------- | ------------------------------- |
| `path`            | string           | 仓库相对路径                    |
| `content`         | string           | Markdown finding 内容           |
| `suggestion_code` | string，条件存在 | 无代码建议时整个字段省略        |
| `existing_code`   | string           | 被替换的原始代码                |
| `start_line`      | number           | 起始行                          |
| `end_line`        | number           | 结束行                          |
| `thinking`        | string           | 模型推理文本，可能很长          |
| `category`        | string           | 实测有 `bug`、`maintainability` |
| `severity`        | string           | 实测有 `medium`、`low`          |

注意：

- 实际 comment 没有 `title` 字段。
- `suggestion_code` 不是固定存在的 null 字段，而是 optional。
- `thinking` 不在路线图的 mapping 字段中，但实际输出存在；默认不得写入 MongoDB 或直接返回给前端。
- 路线图中注释的 `end_line` 等字段本次均已确认。

## 5. Windows 与子进程接入结论

### 5.1 `spawn` 实测矩阵

| 调用方式                                            | `shell` | 结果                 |
| --------------------------------------------------- | ------- | -------------------- |
| `spawn('ocr', ['--version'])`                       | `false` | `ENOENT`             |
| `spawn('ocr.cmd', ['--version'])`                   | `false` | `EINVAL`             |
| `spawn(process.execPath, [ocrJsPath, '--version'])` | `false` | exit 0，正常输出版本 |

Windows 上 npm 提供的是 `ocr.cmd` / `ocr.ps1` 启动壳，Node 不能按 Unix 可执行文件语义直接 spawn。`shell:true` 会引入引号、注入和路径歧义，不采用。

推荐 MVP 调用方式：

```ts
spawn(
    process.execPath,
    [
        ocrJsPath,
        'review',
        '--from',
        baseRef,
        '--to',
        headRef,
        '--format',
        'json',
        '--audience',
        'agent',
        '--output',
        outputPath,
        '--color',
        'never',
    ],
    {
        cwd: repoDir,
        shell: false,
        windowsHide: true,
    },
);
```

当前项目依赖入口为：

```text
backEnd\node_modules\@alibaba-group\open-code-review\bin\ocr.js
```

阶段 1 通过本地依赖解析入口：

1. 使用 `require.resolve('@alibaba-group/open-code-review/bin/ocr.js')` 解析本地入口。
2. 允许 `OCR_CLI_ENTRY` 作为部署环境覆盖，便于容器或全局安装。
3. 仅在显式配置缺失时，才回退到 `npm root -g` 探测全局安装。

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
- MCP 不解决当前 JSON 映射、文件级规则元数据落库和持久化问题，反而增加进程生命周期与协议调试成本。
- 阶段 3 需要更细粒度 trace 时，再评估 MCP；当前 JSONL session 已足够支撑首版 trace。

## 7. 验收清单

| 验收项                                            | 结果 | 证据                                                      |
| ------------------------------------------------- | ---- | --------------------------------------------------------- |
| OCR 可在当前环境运行                              | 通过 | v1.11.8 `--version` 正常                                  |
| `--preview` 可验证 keep/drop                      | 通过 | 1 个源码文件 keep，1 个文档文件 unsupported_ext drop      |
| 规则匹配可验证                                    | 通过 | `ocr rules check` 命中 TypeScript 与 package.json pattern |
| 同仓库稳定生成一次 JSON                           | 通过 | `main..feat/ai-api-url` 退出码 0，`status=complete`       |
| comments 实际字段已确认                           | 通过 | 2 条 comments，含 path/content/line/category/severity 等  |
| comments -> Finding 映射已明确                    | 通过 | OCR comment 字段和枚举差异已确认；最终结构见第 8 节       |
| OCR summary -> Review 运行统计/AiUsage 映射已明确 | 通过 | 执行统计进入新 Review 运行元数据，不再生成旧 Summary      |
| tool_calls -> trace 映射已明确                    | 通过 | 顶层为汇总，详细事件来自 JSONL                            |
| session list / viewer 可用                        | 通过 | list/show 正常，viewer HTTP 200                           |
| Windows 子进程方案已实测                          | 通过 | 禁止直接 spawn `ocr`/`ocr.cmd`，使用 Node 入口            |
| MVP 接入方式已决策                                | 通过 | 使用 child_process CLI；MCP 延后到阶段 3                  |

## 8. 阶段 1 必须遵守的契约（最终）

1. 明确推翻旧领域模型：`AnalyzerResult`、`Summary`、`Recommendation`、现有 `FileAnalysis` 和 `Suggestion` 不再作为 OCR 阶段的公共契约或目标数据库结构。
2. 持久化领域模型直接围绕 OCR 设计为 `Review + Finding`：`Review` 承载业务关联、任务状态、OCR 运行信息和 session 关联；`Finding` 承载 OCR `comments[]` 的路径、内容、行号、代码建议和归一化后的 category/severity。
3. 保留一个很薄的 OCR 解析/适配层，只负责把 OCR 原始 JSON 转换为 `Review + Finding`，包括字段命名转换、optional 处理、枚举归一化和敏感字段过滤。
4. OCR 原始 JSON/JSONL 仅作为外部契约存在于解析边界，不能直接作为 MongoDB Schema、REST API DTO 或 React 组件契约，也不能原样落入 `Review`。
5. 按 v1.11.8 实际 JSON 解析，不依赖不存在的 `project_summary`。
6. `warnings`、`session_id`、`suggestion_code` 等字段按 optional 处理。
7. 不持久化、不返回 `thinking`、完整 messages、`reasoning_content`、`native_payload` 等推理或高体积字段。
8. 在适配层显式完成 category/severity 枚举归一化，并允许保留原始值用于诊断。
9. 不为满足旧模型而伪造 OCR 不提供的 PR riskLevel/score/overview/recommendations、文件级 riskLevel/summary 或 Suggestion title。若产品需要风险聚合，应作为独立、可选、明确标注为 derived 的领域字段。
10. 文件变更状态继续以 `PrData.files` 为准，不从 OCR groups 猜测。
11. Windows 使用 `process.execPath + ocr.js`，保持 `shell: false`。
12. 调用前确保 OCR session 目录可写，并将该错误映射为可诊断的系统错误。
13. session/trace 进入 MongoDB 时必须使用独立、可裁剪的模型，不能将完整 JSONL 原样塞进单个 `Review` 文档。
14. `comments[]` 不得被标记为 `deterministic` 或绑定具体 `ruleId`；OCR 当前只能可靠提供文件级规则集匹配。
15. 如果未来仍保留 legacy 引擎，也应适配到同一个 `Review + Finding` 领域模型，不得恢复旧 `AnalyzerResult` 作为跨层契约。
