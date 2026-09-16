# OCR Harness Roadmap：从 PR 评审工具到 Harness Agent

> 本文是主计划。背景调研与候选项目对比见 [agent-refactor.md](./achieved/agent-refactor.md)，OCR 能力范围见 [phase-0-findings.md](./phase-0/phase-0-findings.md)，目标数据模型与字段映射见 [ocr-integration.md](./phase-1/ocr-integration.md)。
> 核心结论：以 Open Code Review（下文称 OCR）为引擎底座，保留 React / Express / MongoDB 全栈骨架，但推翻旧 `AnalyzerResult` 领域模型，直接设计 `Review + Finding`；按 6 个阶段补齐 7 项 harness 特性。

## 1. 目标：最终交付什么

最终交付的不是“一个能评 PR 的网站”，而是一套**能跑评审 agent 的运行时**。判断标准即下面 7 项能力：

| # | 能力 | 一句话定义 | 当前状态 |
|---|---|---|---|
| 1 | 目标与计划 | agent 有明确 goal，并能被分解为可执行步骤 | ❌ 只有 prompt，无 plan |
| 2 | 工具调用循环 | model 决策 → 调工具 → 观察 → 再决策，直到终止条件 | ❌ 单次调用 |
| 3 | 工具注册表 | 工具可插拔、有 schema、可审计（读文件/搜代码/查 issue/跑测试/写评论） | ❌ 无工具抽象 |
| 4 | 状态机与持久化 | 步骤级状态可恢复、可重放 | ⚠️ 只有任务级 `pending/analyzing/completed/failed` |
| 5 | 确定性工程约束 | “不能错”的事交给代码：文件筛选、规则集匹配、行号校验 | ❌ 无 |
| 6 | 可观测性 | trace：每步工具调用、token、耗时、事件流 | ❌ 只存 `aiUsage` |
| 7 | 评测 harness | 用 ground truth 计算 Precision/Recall/F1/token/耗时，可回归 | ❌ 无 |

**目标终态**：7 项全部达到“有、可演示、可写进简历”的水平。

---

## 2. 为什么选 OCR，以及它替你解决什么

OCR 的价值在于它本身就是“确定性工程 × Agent 混合架构”的现成实现，能直接覆盖我们最难的 4 项：

- **能力 2 + 3（工具循环 + 工具注册）**：OCR 内置 `file_read`、`code_search` 等工具，并支持接外部 MCP 工具（stdio / Streamable HTTP）。
- **能力 5（确定性约束）**：五道文件过滤（二进制/大小/扩展名/符号链接/排除规则）、规则模板匹配、评论定位与反思模块，都是代码保证，不依赖 LLM。
- **能力 7（评测方法）**：OCR 官方提供 benchmark 思路（F1 / Precision / Recall / 平均耗时 / 平均 token），我们可以复用同一套口径做自己的评测。

我们自己的差异化工作则集中在：**全栈产品外壳、GitHub App OAuth、异步任务与步骤状态机、规则/追踪落库、自动回写 GitHub、评测集与报告**——这些才是简历里“属于你”的部分。

---

## 3. 目标集成架构

```text
┌──────────────────────────────────────────────────────────────┐
│                    PRviewer（保留全栈骨架）                    │
│  React 19：PRUrlInput / ReviewPage / ChangesTab / Trace       │
│  Express 5：auth / github / pull-request / review engine      │
│  MongoDB：Review + Finding / ReviewSession / ReviewTraceEvent │
└───────────────┬──────────────────────────────────────────────┘
                │ 很薄的 OCR 解析 / 适配层
                │ OCR JSON -> Review + Finding
                ▼
     ┌────────────────────────────────────┐
     │  ocr CLI（Go 二进制，npm 分发）      │
     │  review --from base --to head      │
     │  --format json --audience agent    │
     │  确定性 pipeline + Agent + MCP      │
     └───────────────┬────────────────────┘
                     │ child_process + --format json
                     ▼
     ┌────────────────────────────────────┐
     │  Git 仓库物化（shallow clone + PR ref）│
     │  workdir/{owner}/{repo}/pr-{n}/    │
     └────────────────────────────────────┘
```

关键边界：

- OCR JSON/JSONL 是外部契约，只在解析和适配边界使用。
- 数据库与 API 直接使用 `Review + Finding`，不再使用 `AnalyzerResult`、旧 `Summary`、旧 `FileAnalysis` 或旧 `Suggestion`。
- OCR 不提供的 riskLevel、score、overview、recommendations、title 不再伪造；产品后续确需风险聚合时单独定义为 derived 字段。
- Session 与步骤 trace 使用独立模型，不把完整 JSONL 塞进 Review。
- 如果保留 legacy 引擎做对比，它也必须适配到同一个 `Review + Finding`。

---

## 4. 开发先后顺序（6 个阶段）

原则：
1. 每个阶段结束都能独立交付、可回滚、有验收。
2. 先做“工作量小、简历可见”的；难点后置。
3. 阶段 0–3 决定“能不能叫 harness”，阶段 4–5 决定“简历亮不亮”。

| 阶段 | 内容 | 覆盖能力 | 预估 |
|---|---|---|---|
| 0 | 基线验证 OCR（spike） | 1/2/3/5 的可行性 | 0.5–1d |
| 1 | 仓库物化 + Review/Finding 重构 + OCR 适配层 | 2、3（引擎接入） | 2–3d |
| 2 | OCR 确定性元数据与结构化落库 | 5 | 2–3d |
| 3 | 步骤级状态机 + 可观测性 | 4、6 | 1–2d |
| 4 | 自动回写 GitHub inline comments | 权限/写能力（harness 加分项） | 2–3d |
| 5 | 评测 harness | 7 | 3–5d |
| 6 | 包装与文档 | 全部的可展示化 | 1–2d |

合计约 **11–19 个工作日**（兼职约 3 周）。

---

## 5. 各阶段详细设计与验收标准

### 阶段 0：OCR 基线验证（spike）

**目标**：确认 OCR 能在当前环境跑通，并拿到真实输出契约，再决定子进程 / MCP 两种接入方式的取舍。

要做的事：
1. 安装 `npm install -g @alibaba-group/open-code-review`，`ocr config provider/model` 配好一个 LLM。
2. 在 `D:\Q\frontEnd\PRviewer` 或一个测试仓库执行：
   - `ocr review --preview`：验证文件筛选的 keep/drop 与规则匹配（不花钱）。
   - `ocr review --from main --to <feature-branch> --format json`：拿到真实 JSON 顶层结构（`status/llm/message/summary/tool_calls/comments/groups/session_id/manifest`，`warnings` 为 optional）与每条 comment 的字段（`path/content/existing_code/suggestion_code/start_line/end_line/category/severity`）。
3. 验证 `ocr viewer` / `ocr session list`，确认 JSONL session 能否作为 trace 来源。
4. 结论写入 `docs/plan/phase-0/phase-0-findings.md`：锁 OCR 外部 JSON 契约、决定接入方式、确认 `Review + Finding` 领域模型并记录 Windows 下的坑。

**验收**：
- 同一仓库能稳定复现一次 JSON 输出。
- 明确映射边界：`comments[] -> Finding`、`summary -> Review 运行信息/AiUsage`、`tool_calls/JSONL -> ReviewSession/ReviewTraceEvent`。
- 决策记录：MVP 用 `child_process` 调 CLI（最简单）；MCP 留到阶段 3 做可观测时再评估。

---

### 阶段 1：仓库物化 + Review/Finding 重构 + OCR 适配层

**目标**：让 PRviewer 能把 GitHub PR URL 变成 OCR 可评审的本地仓库，并完成从旧 `AnalyzerResult` 到 OCR 驱动的 `Review + Finding` 的断代式领域模型重构。

要做的事：
1. 新增 `backEnd/src/modules/github/services/repoMaterializer.ts`：
   - 用 `pullNumber` 反查 base/head SHA 与 `refs/pull/{n}/head`。
   - shallow clone 到临时 workdir（`os.tmpdir()` 下按 `owner/repo/pr-{n}` 隔离），`git fetch origin pull/{n}/head` + base。
   - 支持 GitHub App installation token 作为 clone 凭证；完成后清理（保留一个 LRU 上限的缓存目录，评审完成再删）。
2. 新增 OCR 外部契约与解析层：
   - 定义 `OcrReviewOutput`、`OcrComment`、`OcrRunSummary` 等外部 DTO，只对应 v1.11.8 CLI JSON。
   - 使用 fixture 建立解析测试，显式覆盖 optional、失败输出、枚举异常和 `thinking` 过滤。
   - OCR JSON/JSONL 不直接进入 MongoDB、REST API 或 React。
3. 重构领域模型：
   - 删除旧 `AnalyzerResult`、`Summary`、`Recommendation`、旧 `FileAnalysis`、`Suggestion` 作为公共契约。
   - 建立 `Review + Finding` Mongo Schema、共享类型和 API DTO。
   - `Review` 承载业务关联、任务状态、OCR 运行信息、LLM/session 元数据；`Finding` 承载 path/content/line/code suggestion/category/severity。
4. 实现薄适配层：
   - `comments[] -> Finding[]`，完成 snake_case 到 camelCase、category/severity 归一化和敏感字段过滤。
   - `summary -> Review.runSummary / AiUsage`。
   - 不生成旧 `summary`、文件级 risk/summary 或 Finding title。
5. 把 `reviewService.processReview` 改为“物化仓库 → 调 OCR → 薄适配 → 写 `Review + Finding`”；不再兼容写旧 `summary/fileAnalyses/aiUsage` 结构。
6. 同步修改后端 API、前端列表/Dashboard/Review 详情/Diff Finding 展示。允许破坏旧前端字段假设，不要求保持前端无感。直接重构前端类型。

**验收**：
- 一个真实 PR 能从“克隆 → OCR 评审 → 薄适配 → `Review + Finding` 落库 → 新前端展示”全链路跑通。
- 数据库中不再出现 OCR 原始 JSON、`AnalyzerResult` 或旧 `summary/fileAnalyses` 结构。
- OCR 不提供的字段没有被伪造；`thinking` 不落库、不返回。
- 明确 base/head 解析失败、clone 失败、OCR 未安装、超时等错误的 HTTP 映射（不再统一落 500）。

---

### 阶段 2：OCR 确定性元数据与结构化落库

**目标**：在 `Review + Finding` 已经落地的基础上，补充 OCR 已确认的确定性执行信息（文件筛选、文件级规则集匹配、warnings、session 标识），这是能力 5 的实体化。当前不建立 Finding 与具体规则之间的伪精确关系。

要做的事：
1. 扩展 `Review` 模型：增加 optional `ruleMatches`、`warnings`、`filteredFiles`；`sessionId`、`engine`、`runSummary` 等基础运行字段在阶段 1 已进入新模型。
2. 在薄适配层解析 OCR JSON 时：
   - `warnings` 和文件过滤 keep/drop 写入 `Review`；
   - `comments` 只转换为 Finding，不改写为 `deterministic` finding，也不绑定 ruleId；
   - 按文件执行或采集 `rules check`，只保存文件级 `ruleMatches { source, pattern, ruleText }`。
3. 规则配置：先采用 OCR 内嵌系统规则 + 仓库根 `.opencodereview/rule.json` 的项目规则，不自己造规则引擎。
4. 规则元数据只用于后端诊断，不生成 Finding 到具体规则的来源字段或文案。

**验收**：
- 数据库一条 Review 能还原文件过滤 keep/drop、原因和每个已评审文件匹配到的规则集。
- 不得产生 Finding 到具体规则的来源字段。
- Finding 展示使用新模型，不依赖旧 `Suggestion` 兼容结构。

---

### 阶段 3：步骤级状态机 + 可观测性

**目标**：把任务级状态细化到步骤级，并让每次评审“可解释、可回放”。覆盖能力 4 和 6。

要做的事：
1. 定义步骤状态机：
   `queued → materializing → filtering → reviewing → reflecting → writing → completed`，失败进入 `failed`（带 `failedStep`）。
2. `processReview` 每进入一个步骤就写 `Review.steps[]`（`{ step, status, startedAt, finishedAt, meta }`）。
3. 可观测性：
   - 把 OCR 的 `tool_calls`、`warnings`、session/token 统计按 [OCR 数据模型与映射设计](./phase-1/ocr-integration.md) 落入 `ReviewSession` 和 `ReviewTraceEvent`。
   - 新增 `GET /reviews/:id/trace`，返回步骤 + 工具调用时间线。
   - 前端新增 `TracePanel`：展示步骤流转与每步耗时（`PollingIndicator` 改为读 `currentStep`）。
4. 可选：接入 OCR 的 `ocr viewer`（只读回放），或把 JSONL 规范化后拆分落入 MongoDB 做自己的轻量 trace 视图；禁止把完整 JSONL 原样塞进单个 `Review` 文档。

**验收**：
- 一个评审中断/失败时，能定位到 `failedStep` 并重试该步骤（至少失败信息不再只是笼统 `errorMessage`）。
- `GET /reviews/:id/trace` 能画出完整时间线。

---

### 阶段 4：自动回写 GitHub inline comments

**目标**：从“只读评审”变成“会写回 PR 的 agent”。这是最直观的 harness 证明，也是当前缺口里价值最高的一块。

要做的事：
1. 在 `githubService` 新增写接口（复用现有 `@octokit/auth-app`）：
   - `pulls.createReview`（一次提交多条行级评论）为主；
   - `pulls.createReviewComment`（单条评论）为兜底。
2. 行号映射：OCR 的 `start_line` 语义需与 GitHub 的 `line` / `commit_id` 对齐；优先回写通过位置校验且 `severity ≥ major` 的 Finding，降低误报。
3. 策略层：
   - 配置 `REVIEW_POST_MODE=off|draft|live`（默认 `off`）。
   - 前端“发布到 GitHub”按钮：`completed` 后用户确认再写（MVP 用人工确认，避免乱写）。
   - 去重：写前拉取已有 review comments，避免重复。
4. 权限边界：默认只读；写操作单独鉴权 + 二次确认 + 审计日志。

**验收**：
- 在测试 PR 上，点“发布”后能在 GitHub 看到结构化的 inline review comments + 汇总。
- `off` 模式下绝不产生任何写请求。

---

### 阶段 5：评测 harness

**目标**：用数据证明“OCR 引擎 vs 旧版单次调用”的效果差异，产出可放进简历的量化结论。覆盖能力 7。

要做的事：
1. 建 `eval/`：
   - `datasets/`：20–30 个真实 PR（优先公开仓库），每 PR 配 `issues.json` 人工标注 ground truth（file、line、category、severity）。
   - `runner.ts`：对每个 PR 跑 OCR；如保留 legacy，则两个引擎都必须适配并输出同一种 `Finding[]` 结构，便于统一评测。
   - `metrics.ts`：算 Precision / Recall / F1 / 平均 token / 平均耗时。
   - `report.md` 模板：生成对比表与案例截图。
2. 对齐 OCR 官方 benchmark 口径（F1/Precision/Recall/token/耗时），标注“我们采用同一口径”。
3. CI 加 `npm run eval`（数据量小则日常可跑；否则放 release 分支手动跑）。

**验收**：
- 能跑出一条可复现的命令，输出 `eval/results/latest.json` 与 `eval/report.md`。
- 报告里至少有一组“OCR vs legacy”的对比数字，可直接引用到简历。

---

### 阶段 6：包装与文档

**目标**：让仓库 10 分钟可被看懂，demo 3 分钟能打动面试官。

要做的事：
1. 根 `README` 补：目标架构图、Quickstart、demo GIF/截图、7 项能力清单、评测结果链接。
2. `docs/` 同步更新：`product/architecture.md`（新引擎层与 `Review + Finding`）、`product/backend.md`、`product/database.md`、`product/api.md`（Finding/trace/写接口）、`product/configuration.md`（OCR 相关环境变量）。
3. 许可证：OCR 为 Apache-2.0，在 `NOTICE` / README 标注依赖与署名。
4. 简历话术：按“二次开发 + 自研差异”撰写（见 agent-refactor.md 第 6 节）。
5. 录制一个 demo：粘贴 PR URL → 步骤流转 → AI 建议 → 一键回写 GitHub。

**验收**：
- 一个陌生人按 README 能跑起来并看到 demo。
- `docs/README.md` 索引新增 `plan/` 入口。

---

## 6. 各阶段与 7 项能力的映射

| 阶段 | 1 goal | 2 loop | 3 registry | 4 state | 5 guardrails | 6 obs | 7 eval |
|---|---|---|---|---|---|---|---|
| 0 spike | ✅验证 | ✅验证 | ✅验证 | | ✅验证 | | |
| 1 领域模型/适配层 | | ✅接入 | ✅接入 | | | | |
| 2 元数据层 | | | | | ✅✅ | | |
| 3 状态/观测 | | | | ✅✅ | | ✅✅ | |
| 4 回写 | ✅ | | ✅(写工具) | | | ✅审计 | |
| 5 评测 | | | | | | | ✅✅ |
| 6 包装 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |

> ✅=开始具备，✅✅=本阶段重点完成。目标终态：7 项全部为 ✅✅。

---

## 7. 依赖顺序与可并行项

**强依赖**（必须按序）：
`0 spike → 1 Review/Finding + 适配层 → 2 元数据层 → 3 状态/观测 → 4 回写`
（回写依赖行号校验和 Finding 分级，必须等 2；可观测要读取阶段 1 的 OCR 运行与 Finding 输出。）

**可并行**：
- 阶段 2 的规则元数据采集可与阶段 3 的 session/trace 持久化并行，二者写入不同数据。
- 阶段 5 评测集采集可以**从一开始就并行**：在阶段 0–3 推进时同步收集、标注 PR，不阻塞主链路。
- 阶段 6 文档可在每个阶段结束时顺手补，不必最后突击。

---

## 8. 关键风险与对策

| 风险 | 影响 | 对策 |
|---|---|---|
| OCR 是 Go 核心，npm 只是分发壳，Node 侧靠 `child_process`，跨进程 JSON 契约不稳定 | 接入成本上升 | 阶段 0 锁外部 JSON 契约；薄适配层隔离 OCR 版本差异；OCR 原始结构不进入数据库；legacy 如保留也必须适配 `Review + Finding` |
| 现有链路从不 clone 仓库，PR 大仓克隆慢/失败 | 阶段 1 卡壳 | shallow clone + PR ref + 临时目录 LRU；只保留评审所需文件；超时/清理策略 |
| OCR 输出行号与 GitHub diff 行号语义不一致 | 回写错行 | 阶段 4 只回写通过位置校验的高严重度 Finding；写前拉取已有评论去重；`draft` 模式先行 |
| Windows 下 CLI/子进程路径与 shell 差异 | 开发环境坑 | 阶段 0 专门验证 Windows；用 `spawn` 不用 `shell:true`；必要时走 Docker/WSL 兜底 |
| 自动回写造成误报刷屏 | 社区观感差、账号风险 | 默认 `off`；人工确认；只发高置信度；限流 |
| 评测集标注成本高 | 阶段 5 延期 | 先用 20 个 PR + 少量标注起步，逐步扩充；优先用公开仓库 PR |

---

## 9. 里程碑（供 tracking）

- **M1（引擎打通与领域模型重构）**：阶段 0+1 完成，OCR 从仓库物化到 `Review + Finding` 落库和前端展示全链路可跑。
- **M2（可解释）**：阶段 2+3 完成，单次评审有步骤 trace、文件级规则集元数据与失败步骤。
- **M3（会写回）**：阶段 4 完成，能一键把评论贴回 GitHub PR。
- **M4（可证明）**：阶段 5+6 完成，有评测报告、README、demo。

达到 M4，即达成“真正的 harness agent 项目”目标，且具备直接写进简历的量化证据。
