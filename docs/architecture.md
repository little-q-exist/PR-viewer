# 架构与技术栈

## 总体架构

```
┌─────────────────────────────┐        ┌──────────────────────────────────────┐
│        frontEnd (Vite)       │  /api  │           backEnd (Express)          │
│  React 19 + TS + Ant Design │ ─────► │  REST API + JWT 认证                 │
│  Redux Toolkit + React Query │        │  ┌─────────┐ ┌─────────┐ ┌────────┐ │
└─────────────────────────────┘        │  │ auth    │ │ github  │ │ analyzer│ │
                                        │  │ pull-request │    │         │ │
                                        │  └────────────────────────────────┘ │
                                        └───────┬──────────────┬──────────────┘
                                                │              │
                                         MongoDB Atlas      GitHub API / OpenAI
                                        (User/PullRequest/Review)
```

## 技术栈

### 前端
| 领域 | 选型 |
|------|------|
| 框架 | React 19 + TypeScript 6 |
| 构建 | Vite 8 |
| 路由 | React Router 7（列表/详情/报告页） |
| 全局状态 | Redux Toolkit 2（用户信息、当前 PR、UI 状态） |
| 服务端状态 | TanStack React Query 5（PR 变更、分析结果缓存与轮询） |
| HTTP | Axios |
| UI 组件 | Ant Design 6（表格、Tabs、评分卡片） |
| Diff 展示 | react-diff-viewer 3 |
| Markdown 渲染 | marked 18 + highlight.js 11 |

### 后端
| 领域 | 选型 |
|------|------|
| 框架 | Express 5 + TypeScript 6 |
| 数据库 | MongoDB Atlas（mongoose 9） |
| GitHub API | octokit 5 + @octokit/auth-app 8 |
| 认证 | jsonwebtoken 9 |
| AI 调用 | axios（OpenAI Chat Completions） |
| 缓存 | node-cache 5（内存缓存） |
| 限流 | express-rate-limit 8 |
| 配置 | dotenv |

### 数据库
- MongoDB Atlas（User、PullRequest、Review 三个集合）

### 测试
- 后端：Jest 30 + ts-jest
- 前端：Vitest 4（jsdom 环境）

## 核心数据流

### 1. GitHub App OAuth 登录
1. 前端 `WelcomeHero` 跳转到 GitHub 授权页（携带 `client_id`、`redirect_uri`、随机 `state`）。
2. 回调回首页后，`HomePage` 校验 `state`，用 `code` 调 `POST /auth/install`。
3. 后端用 `@octokit/auth-app` 的 `createOAuthUserAuth` 将 `code` 换成用户 access token，再查询该用户是否安装了本 GitHub App。
4. 找到安装后 upsert 用户（保存 access/refresh token），签发 JWT 返回前端。
5. 前端 `authSlice` 将 token 写入 `localStorage`，后续请求经 axios 拦截器自动带 `Authorization: Bearer <token>`。

### 2. 创建评审与异步分析
1. 登录用户粘贴 PR URL，前端 `useCreateReview` 调 `POST /reviews`。
2. 后端解析 URL → 获取有效 GitHub token → `getOrFetchPr` 拉取/缓存 PR 数据。
3. 创建 `Review`（状态 `pending`），立即返回 `201 {id, status}`，并异步触发 `processReview`（不阻塞响应）。
4. `processReview` 将状态置为 `analyzing`，调用 `analyzePullRequest` 请求 LLM，解析 JSON 后写入 `summary`、`fileAnalyses`、`aiUsage`，状态置为 `completed`；失败则置为 `failed` 并记录 `errorMessage`。
5. 前端跳转到 `/review/:id`，React Query 以 3 秒间隔轮询 `GET /reviews/:id`，直到状态为 `completed` / `failed`。

### 3. PR 数据三级缓存
`githubService.getOrFetchPr` 的查找顺序：
1. `node-cache` 内存缓存（TTL 15 分钟）
2. MongoDB `PullRequest` 集合
3. GitHub REST API（拉取后 upsert 到 MongoDB）

## 目录职责划分

- **auth**：GitHub OAuth 登录、JWT 签发/校验、用户 access token 的自动刷新。
- **github**：PR URL 解析、PR 数据拉取（基础信息/files/commits/comments/diff）、三级缓存。
- **pull-request**：评审任务的生命周期管理（创建、查询、异步分析）。
- **analyzer**：构造 LLM 提示词、调用 OpenAI、将返回解析为结构化 JSON。
- **shared**：数据库连接、缓存封装、JWT 中间件、限流器、前后端共享类型定义。
