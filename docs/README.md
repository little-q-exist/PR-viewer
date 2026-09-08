# PR Viewer 项目文档

> AI 驱动的 Pull Request 代码评审工具。粘贴 GitHub PR 链接，自动拉取 PR 数据，调用 LLM 生成风险评分与逐文件评审建议。

## 仓库结构

```
PRviewer/
├── backEnd/                 # Express + TypeScript + MongoDB 后端
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
├── CLAUDE.md                # 项目级约定（背景/技术栈/提交规范）
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
| [testing.md](./testing.md) | 测试方案与当前结果 |
| [configuration.md](./configuration.md) | 环境变量、脚本、工具链、提交规范 |
| [current-status.md](./current-status.md) | 当前进度、已知问题与待办 |

## 快速开始

```bash
# 根目录：并行启动前后端（需先配置各端 .env）
npm run dev
```

- 后端：`http://localhost:3000`（Express，`npm --prefix backEnd run dev`）
- 前端：`http://localhost:5173`（Vite，`npm --prefix frontEnd run dev`，`/api` 代理到后端）

