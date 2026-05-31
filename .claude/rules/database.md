# 数据库设计

## 概述

AI 代码评审工具（PR Viewer）的 MongoDB 数据库设计。采用混合式（Hybrid）方案：PullRequest 独立存储以实现跨 Review 复用，FileAnalysis 嵌入 Review 避免不必要的联表查询。

**决策依据：**
- 认证模式：GitHub App 安装认证（无密码哈希）
- 评审粒度：PR 整体总结 + 逐文件分析
- AI 服务：OpenAI（GPT-4o）
- 缓存策略：MongoDB 主存储 + node-cache 热缓存（PR 数据 TTL 15min）
- 用户流程：粘贴 PR URL → 即刻分析

---

## 集合

### 1. Users

存储 GitHub App 安装用户身份和认证凭据。

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `_id` | ObjectId | 是 | MongoDB 自动生成 |
| `githubId` | Number | 是 | GitHub 用户唯一 ID |
| `login` | String | 是 | GitHub 用户名 |
| `avatarUrl` | String | 是 | 头像 URL |
| `email` | String | 否 | GitHub 公开邮箱 |
| `installationId` | Number | 是 | GitHub App installation ID |
| `accessToken` | String | 是 | 加密存储的 GitHub access token |
| `tokenExpiresAt` | Date | 是 | Token 过期时间 |
| `refreshToken` | String | 否 | 加密存储的 refresh token |
| `createdAt` | Date | 是 | 创建时间 |
| `updatedAt` | Date | 是 | 更新时间 |

**索引：**
- `githubId`: 唯一索引（登录时查找）
- `installationId`: 普通索引（查询同安装下的用户）

**认证流程：** 用户安装 GitHub App → 前端传 installation code → 后端用 octokit 换取 token → 查询 GitHub 用户信息 → 存入/更新 Users → 签发 JWT（payload: `userId`, `githubId`）

---

### 2. PullRequests

缓存从 GitHub API 拉取的 PR 数据。按 `owner/repo/pullNumber` 唯一标识，多次评审同一 PR 复用一条记录。

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `_id` | ObjectId | 是 | |
| `url` | String | 是 | 原始 PR URL |
| `owner` | String | 是 | 仓库 owner |
| `repo` | String | 是 | 仓库名 |
| `pullNumber` | Number | 是 | PR 编号 |
| `title` | String | 是 | PR 标题 |
| `state` | String | 是 | `open` / `closed` / `merged` |
| `author` | { login, avatarUrl } | 是 | PR 作者（嵌入子对象） |
| `baseBranch` | String | 是 | 目标分支 |
| `headBranch` | String | 是 | 源分支 |
| `files` | [FileInfo] | 是 | 变更文件列表 |
| `diff` | String | 是 | 完整 diff 文本 |
| `commits` | [CommitInfo] | 是 | Commit 列表 |
| `comments` | [CommentInfo] | 否 | PR 已有评论 |
| `fetchedAt` | Date | 是 | 数据拉取时间（判断缓存新鲜度） |
| `createdAt` | Date | 是 | |

**子结构：**

```typescript
FileInfo: {
  sha: string
  filename: string
  status: 'added' | 'modified' | 'removed'
  additions: number
  deletions: number
  changes: number
  patch?: string          // 文件级 diff 片段，可选
}

CommitInfo: {
  sha: string
  message: string
  author: { login: string, avatarUrl: string }
  date: Date
}

CommentInfo: {
  id: number               // GitHub comment ID
  body: string
  author: { login: string }
  path?: string            // 关联文件路径
  line?: number            // 关联行号
  createdAt: Date
}
```

**索引：**
- `{ owner, repo, pullNumber }`: 联合唯一索引（查询和去重）
- `url`: 唯一索引（按 URL 查找）
- `fetchedAt`: 普通索引（缓存失效查询）

**缓存策略：** 查询时 node-cache（TTL 15min）→ MongoDB → GitHub API 三级回退。

---

### 3. Reviews

评审任务，关联 User 和 PullRequest，嵌入整体总结和逐文件分析结果。

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `_id` | ObjectId | 是 | |
| `userId` | ObjectId | 是 | 关联 Users 集合 |
| `prId` | ObjectId | 是 | 关联 PullRequests 集合 |
| `status` | String | 是 | `pending` → `analyzing` → `completed` → `failed` |
| `summary` | Summary | 否 | 整体评审结论（完成后填充） |
| `fileAnalyses` | [FileAnalysis] | 否 | 逐文件分析结果 |
| `aiUsage` | AiUsage | 否 | AI 调用用量统计 |
| `errorMessage` | String | 否 | 失败时的错误信息 |
| `startedAt` | Date | 否 | 开始分析时间 |
| `completedAt` | Date | 否 | 完成时间 |
| `createdAt` | Date | 是 | 创建时间 |

**子结构：**

```typescript
Summary: {
  riskLevel: 'low' | 'medium' | 'high'
  score: number            // 0-100
  overview: string         // Markdown 格式的总体评价
  recommendations: [{
    priority: 'high' | 'medium' | 'low'
    category: 'security' | 'performance' | 'style' | 'logic' | 'maintainability'
    title: string
    description: string    // Markdown 格式
  }]
}

FileAnalysis: {
  filename: string
  status: 'added' | 'modified' | 'removed'
  riskLevel: 'low' | 'medium' | 'high'
  summary: string          // 该文件的简短评估
  suggestions: [{
    lineStart: number
    lineEnd?: number
    category: 'security' | 'performance' | 'style' | 'logic' | 'maintainability'
    severity: 'critical' | 'major' | 'minor' | 'nit'
    title: string
    description: string    // Markdown 格式
    suggestionCode?: string // 建议的修复代码
  }]
}

AiUsage: {
  model: string            // e.g. 'gpt-4o'
  promptTokens: number
  completionTokens: number
  totalTokens: number
  cost?: number            // 估算费用（可选）
}
```

**索引：**
- `{ userId, createdAt }`: 复合索引（用户评审列表按时间排序）
- `prId`: 普通索引（查某个 PR 的所有评审）
- `status`: 普通索引（查询进行中的任务）

**生命周期：**
1. `pending` — 用户 POST `/reviews`，记录创建
2. `analyzing` — 后端开始调 OpenAI
3. `completed` / `failed` — 分析结束

---

## ER 关系

```
Users (1) ────→ (N) Reviews (N) ←──── (1) PullRequests
                       │
                       ├── summary (embedded)
                       ├── fileAnalyses[] (embedded)
                       └── aiUsage (embedded)
```

---

## 索引总览

| 集合 | 索引 | 类型 | 用途 |
|------|------|------|------|
| Users | `githubId` | 唯一 | 登录查找 |
| Users | `installationId` | 普通 | 安装维度查询 |
| PullRequests | `{ owner, repo, pullNumber }` | 联合唯一 | PR 去重 |
| PullRequests | `url` | 唯一 | URL 查找 |
| PullRequests | `fetchedAt` | 普通 | 缓存失效 |
| Reviews | `{ userId, createdAt }` | 复合 | 用户评审列表 |
| Reviews | `prId` | 普通 | PR 的评审历史 |
| Reviews | `status` | 普通 | 进行中任务 |

---

## 模块映射

对应后端 `modules/` 结构：

```
modules/
  auth/
    models/User.ts          → Users 集合
    controllers/authController.ts
    services/authService.ts
  github/
    models/PullRequest.ts   → PullRequests 集合
    controllers/githubController.ts
    services/githubService.ts
  pull-request/
    models/Review.ts        → Reviews 集合
    controllers/reviewController.ts
    services/reviewService.ts
  analyzer/
    services/analyzerService.ts  → 调用 OpenAI + 解析响应
  shared/
    middleware/auth.ts      → JWT 验证中间件
    middleware/rateLimiter.ts → express-rate-limit 配置
```
