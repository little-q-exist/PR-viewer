# OCR Harness Roadmap：从 PR 评审工具到 Harness Agent

> 本文是主计划。背景调研与候选项目对比见 [agent-refactor.md](./agent-refactor.md)。
> 核心结论：以 Open Code Review（下文称 OCR）为引擎底座，保留现有全栈骨架，按 6 个阶段补齐 7 项 harness 特性。

## 1. 目标：最终交付什么

最终交付的不是“一个能评 PR 的网站”，而是一套**能跑评审 agent 的运行时**。判断标准即下面 7 项能力：

| # | 能力 | 一句话定义 | 当前状态 |
|---|---|---|---|
| 1 | 目标与计划 | agent 有明确 goal，并能被分解为可执行步骤 | ❌ 只有 prompt，无 plan |
| 2 | 工具调用循环 | model 决策 → 调工具 → 观察 → 再决策，直到终止条件 | ❌ 单次调用 |
| 3 | 工具注册表 | 工具可插拔、有 schema、可审计（读文件/搜代码/查 issue/跑测试/写评论） | ❌ 无工具抽象 |
| 4 | 状态机与持久化 | 步骤级状态可恢复、可重放 | ⚠️ 只有任务级 `pending/analyzing/completed/failed` |
| 5 | 确定性工程约束 | “不能错”的事交给代码：规则引擎、行号校验、文件筛选 | ❌ 无 |
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

```
┌──────────────────────────────────────────────────────────────┐
│                        PRviewer（保留）                        │
│  React 19 前端：PRUrlInput / ReviewPage / ChangesTab / Trace  │
│  Express 5 后端：auth / github / pull-request / analyzer      │
└───────────────┬──────────────────────────────────────────────┘
                │  AnalyzerEngine 接口（新增适配层）
                │  analyze(pr, opts) => AnalyzerResult + Trace
        ┌───────┴────────┐
        │ OpenCodeReview │  LegacyOpenAI
        │     Engine     │  Engine（回退/A-B）
        └───────┬────────┘
                │  child_process + --format json
                ▼
     ┌────────────────────────────────────┐
     │  ocr CLI（Go 二进制，npm 分发）      │
     │  review --from base --to head      │
     │  --format json --audience agent    │
     │  确定性 pipeline + Agent + MCP      │
     └────────────────────────────────────┘
                │ 读取
                ▼
     ┌────────────────────────────────────┐
     │  Git 仓库物化（shallow clone + PR ref）│
     │  workdir/{owner}/{repo}/pr-{n}/    │
     └────────────────────────────────────┘
```

关键变化：OCR 工作在**本地 Git 仓库**上，而我们现在的链路只通过 GitHub API 拉数据、从未 clone 仓库。因此必须新增“仓库物化”能力（见阶段 1）。

---

## 4. 开发先后顺序（6 个阶段）

原则：
1. 每个阶段结束都能独立交付、可回滚、有验收。
2. 先做“工作量小、简历可见”的；难点后置。
3. 阶段 0–3 决定“能不能叫 harness”，阶段 4–5 决定“简历亮不亮”。

| 阶段 | 内容 | 覆盖能力 | 预估 |
|---|---|---|---|
| 0 | 基线验证 OCR（spike） | 1/2/3/5 的可行性 | 0.5–1d |
| 1 | 仓库物化 + Analyzer 适配层 | 2、3（引擎接入） | 1–2d |
| 2 | 确定性规则层与结构化落库 | 5 | 2–3d |
| 3 | 步骤级状态机 + 可观测性 | 4、6 | 1–2d |
| 4 | 自动回写 GitHub inline comments | 权限/写能力（harness 加分项） | 2–3d |
| 5 | 评测 harness | 7 | 3–5d |
| 6 | 包装与文档 | 全部的可展示化 | 1–2d |

合计约 **10–18 个工作日**（兼职约 3 周）。

---

## 5. 各阶段详细设计与验收标准

### 阶段 0：OCR 基线验证（spike）

**目标**：确认 OCR 能在当前环境跑通，并拿到真实输出契约，再决定子进程 / MCP 两种接入方式的取舍。

要做的事：
1. 安装 `npm install -g @alibaba-group/open-code-review`，`ocr config provider/model` 配好一个 LLM。
2. 在 `D:\Q\frontEnd\PRviewer` 或一个测试仓库执行：
   - `ocr review --preview`：验证文件筛选的 keep/drop 与规则匹配（不花钱）。
   - `ocr review --from main --to <feature-branch> --format json`：拿到真实 JSON 顶层结构（`status/summary/tool_calls/comments/warnings/project_summary`）与每条 comment 的字段（`path/content/existing_code/suggestion_code/start_line/category/severity`）。
3. 验证 `ocr viewer` / `ocr session list`，确认 JSONL session 能否作为 trace 来源。
4. 结论写入 `docs/plan/phase-0-findings.md`：锁 JSON 契约、决定接入方式、记录 Windows 下的坑。

**验收**：
- 同一仓库能稳定复现一次 JSON 输出。
- 明确 3 个映射点：`comments[] -> fileAnalyses[].suggestions`、`summary -> summary`、`tool_calls -> trace`。
- 决策记录：MVP 用 `child_process` 调 CLI（最简单）；MCP 留到阶段 3 做可观测时再评估。

---

### 阶段 1：仓库物化 + Analyzer 适配层

**目标**：让 PRviewer 能把“GitHub PR URL”变成 OCR 能评审的本地仓库 + base/head ref，并引入可切换的引擎接口。

要做的事：
1. 新增 `backEnd/src/modules/github/services/repoMaterializer.ts`：
   - 用 `pullNumber` 反查 base/head SHA 与 `refs/pull/{n}/head`。
   - shallow clone 到临时 workdir（`os.tmpdir()` 下按 `owner/repo/pr-{n}` 隔离），`git fetch origin pull/{n}/head` + base。
   - 支持 GitHub App installation token 作为 clone 凭证；完成后清理（保留一个 LRU 上限的缓存目录，评审完成再删）。
2. 新增 `backEnd/src/modules/analyzer/engines/`：
   - `types.ts`：定义 `AnalyzerEngine` 接口（`analyze(ctx): Promise<{ result: AnalyzerResult; trace: unknown }>`）。
   - `openCodeReviewEngine.ts`：`spawn('ocr', ['review','--from',base,'--to',head,'--format','json','--audience','agent'])`，解析 stdout JSON。
   - `legacyOpenAIEngine.ts`：把现有 `analyzePullRequest` 包成同一接口，作为回退 / A-B。
   - `index.ts`：读 `ANALYZER_ENGINE=ocr|legacy` 做选择，缺省 `legacy`，保证现有功能不回归。
3. 把 `reviewService.processReview` 改为调用 `analyzerEngine.analyze(...)`；成功时仍写 `summary/fileAnalyses/aiUsage`，并把 `trace`/`engine` 暂存（先加字段，UI 不动）。
4. 保持现有前端无感：`analyzerEngine` 输出的 `AnalyzerResult` 结构必须兼容现有 `frontEnd` 展示。

**验收**：
- 配置 `ANALYZER_ENGINE=ocr` 后，一个真实 PR 能从“克隆 → OCR 评审 → 落库 → 前端展示”全链路跑通。
- `ANALYZER_ENGINE=legacy` 时 36+27 测试仍全部通过。
- 明确 base/head 解析失败、clone 失败、ocr 未安装、超时等错误的 HTTP 映射（不再落 500）。

---

### 阶段 2：确定性规则层与结构化落库

**目标**：把 OCR 的确定性输出（规则命中、文件过滤原因、反思修正）显式落库并区分展示，这是能力 5 的实体化。

要做的事：
1. 扩展 `Review` 模型：新增 `engine`、`sessionId`、`ruleHits`、`warnings`、`filteredFiles`、`steps`。
2. 在引擎适配层解析 OCR JSON 时：
   - `comments` 中带 `category/severity` 与规则来源的，标 `deterministic=true` 或 `ruleId`；
   - `warnings`、`project_summary`、文件过滤 keep/drop 写入 `Review`。
3. 前端 `SuggestionPopover` / `ChangesTab` 对 `deterministic` 与 LLM 建议做不同徽标（如“规则命中” vs “AI 建议”）。
4. 规则配置：先采用 OCR 内嵌系统规则 + 仓库根 `.opencodereview/rule.json` 的项目规则，不自己造规则引擎；后续再决定是否抽出轻量自研规则层。

**验收**：
- 数据库一条 review 能还原出“哪些是规则命中、哪些是 LLM 建议、哪些文件被过滤及原因”。
- 前端能肉眼区分两类 finding。

---

### 阶段 3：步骤级状态机 + 可观测性

**目标**：把任务级状态细化到步骤级，并让每次评审“可解释、可回放”。覆盖能力 4 和 6。

要做的事：
1. 定义步骤状态机：
   `queued → materializing → filtering → reviewing → reflecting → writing → completed`，失败进入 `failed`（带 `failedStep`）。
2. `processReview` 每进入一个步骤就写 `Review.steps[]`（`{step, status, startedAt, finishedAt, meta}`）。
3. 可观测性：
   - 把 OCR 的 `tool_calls`、`warnings`、`sessionId`、token 统计落库。
   - 新增 `GET /reviews/:id/trace`，返回步骤 + 工具调用时间线。
   - 前端新增 `TracePanel`：展示步骤流转与每步耗时（`PollingIndicator` 改为读 `currentStep`）。
4. 可选：接入 OCR 的 `ocr viewer`（只读回放），或先把 JSONL 复制进 Mongo，做自己的轻量 trace 视图。

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
2. 行号映射：OCR 的 `start_line` 语义需与 GitHub 的 `line` / `commit_id` 对齐；优先回写“确定性规则命中”和 `severity ≥ major` 的 finding，降低误报。
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
   - `runner.ts`：对每个 PR 跑 `legacy` 与 `ocr` 两引擎，输出结构化结果。
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
2. `docs/` 同步更新：`architecture.md`（新引擎层）、`backend.md`、`database.md`、`api.md`（trace/写接口）、`configuration.md`（OCR 相关环境变量）。
3. 许可证：OCR 为 Apache-2.0，在 `NOTICE` / README 标注依赖与署名。
4. 简历话术：按“二次开发 + 自研差异”撰写（见 agent-refactor.md 第 6 节）。
5. 录制一个 demo：粘贴 PR URL → 步骤流转 → 规则命中 + AI 建议 → 一键回写 GitHub。

**验收**：
- 一个陌生人按 README 能跑起来并看到 demo。
- `docs/README.md` 索引新增 `plan/` 入口。

---

## 6. 各阶段与 7 项能力的映射

| 阶段 | 1 goal | 2 loop | 3 registry | 4 state | 5 guardrails | 6 obs | 7 eval |
|---|---|---|---|---|---|---|---|
| 0 spike | ✅验证 | ✅验证 | ✅验证 | | ✅验证 | | |
| 1 适配层 | | ✅接入 | ✅接入 | | | | |
| 2 规则层 | | | | | ✅✅ | | |
| 3 状态/观测 | | | | ✅✅ | | ✅✅ | |
| 4 回写 | ✅ | | ✅(写工具) | | | ✅审计 | |
| 5 评测 | | | | | | | ✅✅ |
| 6 包装 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |

> ✅=开始具备，✅✅=本阶段重点完成。目标终态：7 项全部为 ✅✅。

---

## 7. 依赖顺序与可并行项

**强依赖**（必须按序）：
`0 spike → 1 适配层 → 2 规则层 → 3 状态/观测 → 4 回写`
（回写依赖行号与规则命中，必须等 2；可观测要读 1 的引擎输出。）

**可并行**：
- 阶段 2 的“前端徽标”可与阶段 3 的“TracePanel”并行（不同组件）。
- 阶段 5 评测集采集可以**从一开始就并行**：在阶段 0–3 推进时同步收集、标注 PR，不阻塞主链路。
- 阶段 6 文档可在每个阶段结束时顺手补，不必最后突击。

---

## 8. 关键风险与对策

| 风险 | 影响 | 对策 |
|---|---|---|
| OCR 是 Go 核心，npm 只是分发壳，Node 侧靠 `child_process`，跨进程契约不稳定 | 接入成本上升 | 阶段 0 锁 JSON 契约；封装 `OpenCodeReviewEngine` 独立可替换；保留 legacy 引擎回退 |
| 现有链路从不 clone 仓库，PR 大仓克隆慢/失败 | 阶段 1 卡壳 | shallow clone + PR ref + 临时目录 LRU；只保留评审所需文件；超时/清理策略 |
| OCR 输出行号与 GitHub diff 行号语义不一致 | 回写错行 | 阶段 4 只回写规则命中/高严重度；写前拉取已有评论去重；`draft` 模式先行 |
| Windows 下 CLI/子进程路径与 shell 差异 | 开发环境坑 | 阶段 0 专门验证 Windows；用 `spawn` 不用 `shell:true`；必要时走 Docker/WSL 兜底 |
| 自动回写造成误报刷屏 | 社区观感差、账号风险 | 默认 `off`；人工确认；只发高置信度；限流 |
| 评测集标注成本高 | 阶段 5 延期 | 先用 20 个 PR + 少量标注起步，逐步扩充；优先用公开仓库 PR |

---

## 9. 里程碑（供 tracking）

- **M1（引擎打通）**：阶段 0+1 完成，`ANALYZER_ENGINE=ocr` 全链路可跑。
- **M2（可解释）**：阶段 2+3 完成，单次评审有步骤 trace、规则命中与失败步骤。
- **M3（会写回）**：阶段 4 完成，能一键把评论贴回 GitHub PR。
- **M4（可证明）**：阶段 5+6 完成，有评测报告、README、demo。

达到 M4，即达成“真正的 harness agent 项目”目标，且具备直接写进简历的量化证据。
