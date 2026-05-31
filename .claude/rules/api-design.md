# API设计

## 设计原则

遵循 RESTful API 风格。所有端点（除 `/auth/install` 与 `/health` 外）需在请求头携带 JWT：
```
Authorization: Bearer <token>
```

## 端点设计

### Auth 模块（挂载于 `/auth`）

- **POST /auth/install**
  接收 GitHub App installation code，创建或更新用户，返回 JWT。
  Request Body:
    | 字段 | 类型 | 必填 | 说明 |
    |------|------|------|------|
    | `installationId` | number | 是 | GitHub App installation ID |
    | `code` | string | 是 | GitHub OAuth authorization code |

  Response:
    status code: 200 (成功)
    body:
    ```json
    {
      "token": "<jwt string>",
      "user": {
        "id": "<user ObjectId>",
        "login": "<github username>",
        "avatarUrl": "<avatar url>"
      }
    }
    ```

    status code: 400 (缺少参数)
    body:
    ```json
    { "error": "installationId and code are required" }
    ```

    status code: 500 (服务端错误)
    body:
    ```json
    { "error": "Authentication failed" }
    ```

- **GET /auth/me**
  获取当前登录用户信息。需认证。
  Parameters: 无

  Response:
    status code: 200 (成功)
    body:
    ```json
    {
      "id": "<user ObjectId>",
      "githubId": 123456,
      "login": "<github username>",
      "avatarUrl": "<avatar url>",
      "email": "<email or null>"
    }
    ```

    status code: 401 (未认证)
    body:
    ```json
    { "error": "Not authenticated" }
    ```

    status code: 404 (用户不存在)
    body:
    ```json
    { "error": "User not found" }
    ```

    status code: 500 (服务端错误)
    body:
    ```json
    { "error": "Failed to fetch user" }
    ```

### GitHub 模块（挂载于 `/pull-requests`）

- **GET /pull-requests**
  获取已缓存的 PR 列表，支持分页。需认证。返回数据不包含 `diff`、`commits`、`comments` 字段。
  Parameters:
    | 参数 | 类型 | 默认值 | 说明 |
    |------|------|--------|------|
    | `page` | number | 1 | 页码 |
    | `limit` | number | 20 | 每页条数 |

  Response:
    status code: 200 (成功)
    body:
    ```json
    {
      "data": [
        {
          "_id": "<pr ObjectId>",
          "url": "https://github.com/<owner>/<repo>/pull/<number>",
          "owner": "<owner>",
          "repo": "<repo>",
          "pullNumber": 123,
          "title": "<PR title>",
          "state": "open | closed | merged",
          "author": { "login": "<username>", "avatarUrl": "<url>" },
          "baseBranch": "<branch>",
          "headBranch": "<branch>",
          "files": [{ "sha": "...", "filename": "...", "status": "added|modified|removed", "additions": 0, "deletions": 0, "changes": 0, "patch": "..." }],
          "fetchedAt": "<ISO date>",
          "createdAt": "<ISO date>"
        }
      ],
      "pagination": {
        "page": 1,
        "limit": 20,
        "total": 42,
        "totalPages": 3
      }
    }
    ```

    status code: 500 (服务端错误)
    body:
    ```json
    { "error": "Failed to fetch pull requests" }
    ```

- **GET /pull-requests/:id**
  获取特定已缓存 PR 的完整详情（含 diff、commits、comments）。需认证。
  Parameters:
    | 参数 | 类型 | 说明 |
    |------|------|------|
    | `id` | path (ObjectId) | PR 缓存的 MongoDB _id |

  Response:
    status code: 200 (成功)
    body: 完整 PullRequest 对象（含 `diff`、`commits[]`、`comments[]` 等所有字段）

    status code: 404 (未找到)
    body:
    ```json
    { "error": "Pull request not found" }
    ```

    status code: 500 (服务端错误)
    body:
    ```json
    { "error": "Failed to fetch pull request" }
    ```

- **POST /pull-requests/fetch**
  根据 GitHub PR URL 主动拉取并缓存 PR 数据（三级缓存：node-cache → MongoDB → GitHub API）。需认证。
  Request Body:
    | 字段 | 类型 | 必填 | 说明 |
    |------|------|------|------|
    | `prUrl` | string | 是 | GitHub PR URL，如 `https://github.com/owner/repo/pull/123` |

  Response:
    status code: 200 (成功)
    body: 完整 PrData 对象（含所有字段）

    status code: 400 (缺少参数)
    body:
    ```json
    { "error": "prUrl is required" }
    ```

    status code: 400 (无效 URL)
    body:
    ```json
    { "error": "Invalid GitHub PR URL" }
    ```

    status code: 500 (服务端错误)
    body:
    ```json
    { "error": "Failed to fetch PR data" }
    ```

### PR 模块（挂载于 `/reviews`）

- **POST /reviews**
  创建评审任务。接收 PR URL，自动拉取/缓存 PR 数据后创建 Review，并异步启动 AI 分析。需认证，受 AI 限流控制（30 次/小时）。
  Request Body:
    | 字段 | 类型 | 必填 | 说明 |
    |------|------|------|------|
    | `prUrl` | string | 是 | GitHub PR URL |

  Response:
    status code: 201 (创建成功，分析异步进行中)
    body:
    ```json
    {
      "id": "<review ObjectId>",
      "status": "pending",
      "prUrl": "https://github.com/<owner>/<repo>/pull/<number>"
    }
    ```

    status code: 400 (缺少参数)
    body:
    ```json
    { "error": "prUrl is required" }
    ```

    status code: 400 (无效 PR URL)
    body:
    ```json
    { "error": "Invalid GitHub PR URL" }
    ```

    status code: 401 (未认证)
    body:
    ```json
    { "error": "Not authenticated" }
    ```

    status code: 500 (服务端错误)
    body:
    ```json
    { "error": "Failed to create review" }
    ```

- **GET /reviews/:id**
  获取单个评审的完整结果（含 PR 摘要、逐文件分析和关联的 PR 信息）。需认证。
  Parameters:
    | 参数 | 类型 | 说明 |
    |------|------|------|
    | `id` | path (ObjectId) | Review 的 MongoDB _id |

  Response:
    status code: 200 (成功)
    body: 完整 Review 对象，`userId` 和 `prId` 已 populate 为关联文档。核心结构：
    ```json
    {
      "_id": "<review ObjectId>",
      "userId": { "_id": "...", "login": "...", "avatarUrl": "..." },
      "prId": { "_id": "...", "title": "...", "url": "...", "owner": "...", "repo": "...", "pullNumber": 123, "state": "...", "files": [...], "diff": "..." },
      "status": "pending | analyzing | completed | failed",
      "summary": {
        "riskLevel": "low | medium | high",
        "score": 75,
        "overview": "<Markdown summary>",
        "recommendations": [{ "priority": "high|medium|low", "category": "security|performance|style|logic|maintainability", "title": "...", "description": "<Markdown>" }]
      },
      "fileAnalyses": [{
        "filename": "src/foo.ts",
        "status": "added | modified | removed",
        "riskLevel": "low | medium | high",
        "summary": "<string>",
        "suggestions": [{ "lineStart": 42, "lineEnd": 45, "category": "...", "severity": "critical|major|minor|nit", "title": "...", "description": "<Markdown>", "suggestionCode": "..." }]
      }],
      "aiUsage": { "model": "gpt-4o", "promptTokens": 5000, "completionTokens": 2000, "totalTokens": 7000, "cost": 0.21 },
      "errorMessage": "<error message if failed>",
      "startedAt": "<ISO date>",
      "completedAt": "<ISO date>",
      "createdAt": "<ISO date>"
    }
    ```

    status code: 404 (未找到)
    body:
    ```json
    { "error": "Review not found" }
    ```

    status code: 500 (服务端错误)
    body:
    ```json
    { "error": "Failed to fetch review" }
    ```

- **GET /reviews**
  获取当前用户的所有评审任务列表，支持按状态过滤和分页。需认证。
  Parameters:
    | 参数 | 类型 | 默认值 | 说明 |
    |------|------|--------|------|
    | `status` | string | — | 过滤状态：`pending` / `analyzing` / `completed` / `failed` |
    | `page` | number | 1 | 页码 |
    | `limit` | number | 20 | 每页条数 |

  Response:
    status code: 200 (成功)
    body: 列表不包含 `fileAnalyses` 字段以减少响应体积：
    ```json
    {
      "data": [
        {
          "_id": "<review ObjectId>",
          "userId": "<user ObjectId>",
          "prId": { "_id": "...", "title": "...", "url": "...", "owner": "...", "repo": "...", "pullNumber": 123, "state": "..." },
          "status": "completed",
          "summary": { "riskLevel": "low", "score": 90, "overview": "...", "recommendations": [...] },
          "aiUsage": { "model": "gpt-4o", "promptTokens": 5000, "completionTokens": 2000, "totalTokens": 7000 },
          "errorMessage": null,
          "startedAt": "<ISO date>",
          "completedAt": "<ISO date>",
          "createdAt": "<ISO date>"
        }
      ],
      "pagination": {
        "page": 1,
        "limit": 20,
        "total": 10,
        "totalPages": 1
      }
    }
    ```

    status code: 401 (未认证)
    body:
    ```json
    { "error": "Not authenticated" }
    ```

    status code: 500 (服务端错误)
    body:
    ```json
    { "error": "Failed to fetch reviews" }
    ```

### 系统

- **GET /health**
  健康检查端点，无需认证。
  Parameters: 无

  Response:
    status code: 200
    body:
    ```json
    { "status": "ok", "timestamp": "<ISO date>" }
    ```
