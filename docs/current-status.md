# 当前状态与已知问题

## 已实现功能

### 后端
- GitHub App OAuth 登录与安装校验、JWT 签发、用户 access token 自动刷新。
- PR URL 解析、PR 数据拉取（基础信息/files/commits/comments/diff）与三级缓存。
- 评审任务的创建、列表（状态过滤/分页）、详情，以及后台异步 AI 分析。
- AI 提示词构造、OpenAI 调用（支持自定义 `OPENAI_API_URL`）、JSON 响应解析。
- 全局限流与 AI 限流。

### 前端
- 登录页（GitHub 登录 + 安装引导）、OAuth 回调处理。
- Dashboard（统计卡片 + PR URL 输入 + 最近评审）。
- 评审历史列表（状态过滤、分页、风险/评分展示）。
- 分析页（总览 + 具体变更 Tab）、轮询、AI 建议展示、Markdown 渲染。
- 暗黑毛玻璃科技风 UI。

## 测试现状

- 后端：16 用例全部通过（auth/github/analyzer/review 的单元测试）。
- 前端：8 用例全部通过（authSlice/uiSlice）。
- 详见 [testing.md](./testing.md)。

## 已知问题 / 待办（探索中发现）

### 1. AI 返回解析与提示词不一致（已修复）
根因：`aiUsage` 属于 API `usage` 元数据而非模型输出契约，旧校验却强制模型 JSON 含 `aiUsage`，真实调用必抛 “Missing required fields in AI response” 并置评审为 `failed`；旧单测因手工在输入里带 `aiUsage` 而未暴露。

已按方案 A 修复：`parseAnalyzerResponse` 只验收模型应输出的 `summary` / `fileAnalyses`；`aiUsage` 由 `analyzePullRequest` 在解析成功后从 `response.data.usage` 统一补齐。单测已改为真实模型形状（无 aiUsage）并新增缺字段用例。

### 2. PR 描述（body）未被抓取
`fetchPrFromGitHub` 只保存了 `pr.title`、分支、文件等，未保存 `pr.body`；`processReview` 调用 `analyzePullRequest` 时 `prBody` 恒为 `null`，因此 AI 提示词里的 “PR Description” 始终是 “No description provided”。

### 3. 依赖声明但未在代码中使用
- `bcrypt`：在 package.json 与根 CLAUDE.md 中声明，源码未引用。
- `p-limit`：声明用于“控制并发/限流”，源码未引用（当前 GitHub 拉取用 `Promise.all`，AI 限流用 express-rate-limit）。
- `GITHUB_APP_PRIVATE_KEY`：在 `.env`/`.env.example` 中声明，源码未引用；
### 4. Diff 展示为“整段 patch 当新代码”
`ChangesTab` 给 `DiffViewer` 传入 `oldCode=""`、`newCode={currentFile.patch}`，实际展示的是该文件的 unified diff 原文，而非 react-diff-viewer 预期的“旧代码 vs 新代码”两侧对比。

### 5. GitHub 评论行级定位未落地
`fetchPrFromGitHub` 拉取的是 issue comments，且映射时 `path` / `line` 恒为 `undefined`；前端“在 comment 对应行数显示 Popover”的设想目前由 AI 建议的 `lineStart` 驱动，而不是基于 GitHub review comments 的行级定位。

### 6. 设计文档与实现存在差异
- 早期 `api-design.md` 中 `POST /auth/install` 入参为 `installationId + code`，当前实现为 `code`（后端自行查安装）。这些设计文档已从工作区删除。
- `database.md` 中规划的 `Reviews { userId, createdAt }` 复合索引未在模型中显式创建。

### 7. 测试与工程杂项
- 后端 `jest.config.ts` 使用 ESM 语法，但 package.json 为 commonjs，运行时有一条加载警告（不影响通过）。
- 控制器层、真实 GitHub/OpenAI 调用的集成测试尚未覆盖。
- 前端 `review` 模块组件暂无单元测试。

## 建议的下一步（按优先级）

1. ~~修复 `parseAnalyzerResponse` 对 `aiUsage` 的强制校验~~ —— 已完成（见问题 1）。
2. 抓取并存储 `pr.body`，让 AI 分析使用真实 PR 描述。
3. 清理未使用依赖与配置（bcrypt、p-limit、GITHUB_APP_PRIVATE_KEY），或补齐对应实现。
4. 若需要真正的前后代码对比 diff，改造 DiffViewer 的数据来源（例如基于 `patch` 拆分 old/new）。
5. 补充集成测试与前端 review 模块单测。
