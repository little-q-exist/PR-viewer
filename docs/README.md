# PR Viewer 项目文档

> AI 驱动的 Pull Request 代码评审工具。粘贴 GitHub PR 链接，自动拉取 PR 数据，以 Open Code Review（OCR）作为项目内评审引擎依赖，生成风险评分与逐文件评审建议。

## 仓库结构

```
PRviewer/
├── backEnd/                 # Express + TypeScript + MongoDB 后端
│   ├── package.json        # 后端依赖（含 OCR 评审引擎）
│   └── src/
│       ├── app.ts           # Express 应用与路由挂载
│       ├── server.ts        # 服务入口（连接 DB 并监听）
│       ├── modules/
│       │   ├── auth/        # GitHub OAuth 登录、JWT、用户
│       │   ├── github/      # PR 数据解析/拉取/缓存
│       │   ├── pull-request/ # 评审任务（创建/查询/异步分析）
│       │   └── analyzer/    # 调用 LLM 生成评审结果
│       └── shared/          # db、cache、中间件、共享类型
├── frontEnd/                # React + TypeScript + Vite 前端
│   └── src/
│       ├── modules/         # home / pr-list / review 三个业务模块
│       ├── shared/          # api、hooks、通用组件、全局样式
│       ├── store/           # Redux Toolkit（auth / ui）
│       └── types/           # 前端类型定义
├── docs/                    # 项目文档（本目录）
├── AGENTS.md                # 项目级约定（入口：先阅读 docs/README.md）
└── package.json             # 根目录：concurrently 并行启动前后端
```

## 文档索引

| 文档 | 内容 |
|------|------|
| [architecture.md](./architecture.md) | 总体架构、技术栈、数据流、缓存策略 |
| [backend.md](./backend.md) | 后端结构、模块职责、关键实现 |
| [frontend.md](./frontend.md) | 前端结构、路由、状态管理、页面 |
| [api.md](./api.md) | REST API 端点说明 |
| [database.md](./database.md) | 数据模型、索引、ER 关系 |
| [testing.md](./testing.md) | 测试脚本、覆盖范围与尚未覆盖的场景 |
| [submission-workflow.md](./submission-workflow.md) | 提交前验证、CI 流程与 PR 要求 |
| [configuration.md](./configuration.md) | 环境变量、脚本、工具链 |
| [git-workflow.md](./git-workflow.md) | 代码提交规范：commit 信息、分支命名、gh CLI 推送、PR 与合并流程 |
| [current-status.md](./current-status.md) | 当前进度、已知问题与待办 |
| [plan/README.md](./plan/README.md) | 升级为 harness agent 的开发计划（OCR 路线） |
| [plan/phase-0-findings.md](./plan/phase-0-findings.md) | OCR 基线验证结果、JSON 契约与接入决策 |
| [product/flow.md](./product/flow.md) | PR 输入 → AI 建议 的端到端业务流程 |

## 快速开始

```bash
# 安装三个 package 的锁文件依赖
npm ci
npm --prefix frontEnd ci --legacy-peer-deps
npm --prefix backEnd ci

# 根目录：并行启动前后端（需先配置各端 .env）
npm run dev
```

- 后端：`http://localhost:3000`（Express，`npm --prefix backEnd run dev`）
- 前端：`http://localhost:5173`（Vite，`npm --prefix frontEnd run dev`，`/api` 代理到后端）

## OCR 评审引擎依赖

项目已在后端引入 [`@alibaba-group/open-code-review`](https://github.com/alibaba/open-code-review)：

| 项目 | 说明 |
|------|------|
| 依赖声明 | `backEnd/package.json` |
| 版本 | `^1.11.8` |
| 许可证 | Apache-2.0 |
| 本地入口 | `backEnd/node_modules/@alibaba-group/open-code-review/bin/ocr.js` |
| 平台二进制 | 由 OCR 包的 `optionalDependencies` 自动安装，无需额外安装 Go |
| 用户配置 | `~/.opencodereview/config.json` |

安装依赖后，可通过后端本地依赖运行 CLI：

```bash
npm --prefix backEnd exec ocr -- --version
npm --prefix backEnd exec ocr -- config provider
npm --prefix backEnd exec ocr -- config model
```

检查某次变更会评审哪些文件：

```bash
npm --prefix backEnd exec ocr -- review --preview --from main --to <branch>
```

后端调用 OCR 时不直接执行 `ocr` / `ocr.cmd`，而是使用：

```ts
spawn(process.execPath, [ocrEntry, ...args], {
    shell: false,
    windowsHide: true,
});
```

Windows 下必须保证 `%USERPROFILE%\.opencodereview` 可写，否则 OCR 会话持久化会失败。完整 JSON 契约、session/trace 结构与子进程验证结论见 [phase-0-findings.md](./plan/phase-0-findings.md)。
