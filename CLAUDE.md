# CLAUDE
## 项目背景
开发一个AI代码评审工具，帮助开发者提升Pull Request的Review效率与质量。

## 技术栈
### 前端
- React + TypeScript
- React Router（页面路由：PR列表/详情/报告页）
- Redux Toolkit（全局状态：用户信息、当前PR数据）
- TanStack React Query（服务端状态：PR变更、分析结果缓存）
- Axios（与后端API通信）
- Ant Design（快速搭建UI：表格、代码diff展示、评分卡片）
- Vite（构建）
- react-diff-viewer（展示代码diff和行级评审意见）
- marked + highlight.js（渲染Markdown格式的Review建议）

### 后端
- Express
- bcrypt
- jsonwebtoken
- mongoose（MongoDB存储用户、PR评审历史记录）
- octokit（GitHub REST API调用，获取PR的files、comments、commits）

- @octokit/auth-app（GitHub认证）

- axios（调用AI模型API）

- node-cache（缓存AI分析结果，避免重复调用）

- express-rate-limit（控制GitHub API和AI API的调用频率）

- p-limit（控制并发请求，避免被限流）

### 数据库
- MongoDB Atlas

### 测试
- 单元测试：Vitest（前端组件）、Jest（后端核心逻辑）

## 约定commit/分支名格式
commit message 使用中文，分支名使用英文。
在每个 commit message / 分支名 前必须使用以下后缀描述更改类型：
- feat
- refactor
- docs
- test
- fix
- chore  (依赖/构建/配置相关)
- style  (与逻辑无关的代码更改)
如果是 commit message 则前缀尾随半角冒号，分支名则尾随斜杠，例如：
feat:[commit message]
feat/[branch name]