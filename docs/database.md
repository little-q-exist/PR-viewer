# 数据模型与数据库

数据库：MongoDB Atlas，通过 mongoose 9 访问，共三个集合：`User`、`PullRequest`、`Review`。

## ER 关系

```
Users (1) ────► (N) Reviews (N) ◄──── (1) PullRequests
                       │
                       ├── summary (embedded)
                       ├── fileAnalyses[] (embedded)
                       └── aiUsage (embedded)
```

## Users 集合

对应 `modules/auth/models/User.ts`。

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `githubId` | Number | 是 | GitHub 用户 ID，唯一索引 |
| `login` | String | 是 | GitHub 用户名 |
| `avatarUrl` | String | 是 | 头像 |
| `email` | String | 否 | 邮箱 |
| `installationId` | Number | 是 | GitHub App 安装 ID，普通索引 |
| `accessToken` | String | 是 | GitHub 用户 access token |
| `tokenExpiresAt` | Date | 是 | token 过期时间 |
| `refreshToken` | String | 否 | 刷新令牌 |
| `createdAt` / `updatedAt` | Date | 是 | 时间戳 |

## PullRequests 集合

对应 `modules/github/models/PullRequest.ts`。

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `url` | String | 是 | PR URL，唯一索引 |
| `owner` / `repo` / `pullNumber` | String/String/Number | 是 | 联合唯一索引 |
| `title` | String | 是 | PR 标题 |
| `state` | String | 是 | open / closed / merged |
| `author` | { login, avatarUrl } | 是 | 作者 |
| `baseBranch` / `headBranch` | String | 是 | 目标/源分支 |
| `files` | [FileInfo] | 是 | 变更文件列表 |
| `diff` | String | 是 | 完整 diff |
| `commits` | [CommitInfo] | 是 | commit 列表 |
| `comments` | [CommentInfo] | 否 | GitHub 行级 review comments（含 path/line） |
| `fetchedAt` | Date | 是 | 拉取时间，普通索引 |
| `createdAt` | Date | 是 | |

子结构 `FileInfo`：sha、filename、status（added/modified/removed）、additions、deletions、changes、patch?。
子结构 `CommitInfo`：sha、message、author{login, avatarUrl}、date。
子结构 `CommentInfo`：id、body、author{login}、path?、line?、createdAt。

## Reviews 集合

对应 `modules/pull-request/models/Review.ts`。

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `userId` | ObjectId | 是 | 关联 User |
| `prId` | ObjectId | 是 | 关联 PullRequest，普通索引 |
| `status` | String | 是 | pending → analyzing → completed / failed，普通索引 |
| `summary` | Summary | 否 | 整体结论（riskLevel、score 0-100、overview、recommendations[]） |
| `fileAnalyses` | [FileAnalysis] | 否 | 逐文件分析 |
| `aiUsage` | AiUsage | 否 | 模型与 token 用量 |
| `errorMessage` | String | 否 | 失败原因 |
| `startedAt` / `completedAt` | Date | 否 | 分析起止时间 |
| `createdAt` / `updatedAt` | Date | 是 | |

子结构：
- `Summary`：riskLevel（low/medium/high）、score、overview（Markdown）、recommendations[]（priority、category、title、description）。
- `FileAnalysis`：filename、status、riskLevel、summary、suggestions[]（lineStart、lineEnd?、category、severity（critical/major/minor/nit）、title、description、suggestionCode?）。
- `AiUsage`：model、promptTokens、completionTokens、totalTokens、cost?。

## 索引总览

| 集合 | 索引 | 类型 | 用途 |
|------|------|------|------|
| Users | `githubId` | 唯一 | 登录查找 |
| Users | `installationId` | 普通 | 安装维度查询 |
| PullRequests | `{ owner, repo, pullNumber }` | 联合唯一 | PR 去重 |
| PullRequests | `url` | 唯一 | URL 查找 |
| PullRequests | `fetchedAt` | 普通 | 缓存新鲜度 |
| Reviews | `prId` | 普通 | PR 的评审历史 |
| Reviews | `status` | 普通 | 进行中任务 |
| Reviews | `{ userId, createdAt }` | 普通 | 用户评审列表按时间倒序 |

> 说明：`Reviews { userId, createdAt }` 复合索引已在 `Review.ts` 中通过 `ReviewSchema.index({ userId: 1, createdAt: -1 })` 显式创建，本文档与实现保持一致。
