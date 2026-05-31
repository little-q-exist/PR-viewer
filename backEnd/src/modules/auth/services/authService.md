# authService.ts
## getValidAccessToken()

### 核心逻辑

从 DB 查 user → token 还剩 >5分钟？
  ├── 是 → 直接返回 accessToken（无 I/O）
  └── 否 → 用 refreshToken 向 GitHub 换取新 token → 写回 DB → 返回

### 具体实现流程

getValidAccessToken(userId)
   ↓
User.findById → tokenExpiresAt 距现在 > 5min？
   ↓ YES: 直接返回（快速路径）
   ↓ NO:
   createOAuthUserAuth({ token, refreshToken, expiresAt })
        ↓
   auth({ type: 'refresh' }) → GitHub OAuth API
        ↓
   拿到新 { token, expiresAt, refreshToken } → save 回 DB
        ↓
   返回新 token
   （如果没 refreshToken → 抛异常让用户重新授权）