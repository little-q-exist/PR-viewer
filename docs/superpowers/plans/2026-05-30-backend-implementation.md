# 后端实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 从零搭建 PR Viewer 后端完整骨架 — MongoDB 模型、REST API 端点、GitHub 集成、OpenAI 分析、JWT 认证、缓存与限流。

**Architecture:** Express 5 + TypeScript 6 + Mongoose 9，模块化目录结构 `modules/[name]/{models,controllers,services,routes}`，共享层 `shared/` 放中间件和工具。Node-cache 做 GitHub API 热缓存，MongoDB 做主存储。TDD 驱动 — 先写失败测试，再实现，后提交。

**Tech Stack:** Express 5, TypeScript 6, Mongoose 9, octokit, axios, node-cache, express-rate-limit, p-limit, jsonwebtoken, bcrypt, Jest 30, ts-jest

---

## File Structure

```
backEnd/
  tsconfig.json
  jest.config.ts
  .env.example
  src/
    server.ts                          # 入口：连接 DB 后启动 HTTP
    app.ts                             # Express 实例、中间件注册、路由挂载
    shared/
      db.ts                            # Mongoose 连接管理
      cache.ts                         # NodeCache 封装
      types/
        index.ts                       # 共享类型定义
      middleware/
        auth.ts                        # JWT 认证中间件
        rateLimiter.ts                 # express-rate-limit 配置
    modules/
      auth/
        models/User.ts
        services/authService.ts
        controllers/authController.ts
        routes.ts
        __tests__/
          auth.test.ts
      github/
        models/PullRequest.ts
        services/githubService.ts
        controllers/githubController.ts
        routes.ts
        __tests__/
          github.test.ts
      analyzer/
        services/analyzerService.ts
        __tests__/
          analyzer.test.ts
      pull-request/
        models/Review.ts
        services/reviewService.ts
        controllers/reviewController.ts
        routes.ts
        __tests__/
          review.test.ts
```

**Responsibilities:**
- `server.ts` — 连接 MongoDB，启动 HTTP 服务器
- `app.ts` — Express 实例创建、全局中间件、路由挂载、错误处理
- `shared/db.ts` — `connectDB()` / `disconnectDB()`，读取环境变量
- `shared/cache.ts` — `getOrSet(key, ttl, fetchFn)` 缓存模式
- `shared/types/index.ts` — 所有接口定义，各模块的 service 返回类型
- `auth/` — GitHub App 安装认证，签发 JWT
- `github/` — PR 数据拉取与缓存，三级回退 (cache → MongoDB → GitHub API)
- `analyzer/` — OpenAI 调用，发送 diff+files，解析 JSON 回复
- `pull-request/` — Review CRUD，编排 github + analyzer 服务

---

### Task 1: 项目基础设施

**Files:**
- Create: `backEnd/tsconfig.json`
- Create: `backEnd/jest.config.ts`
- Create: `backEnd/.env.example`
- Create: `backEnd/src/shared/db.ts`
- Create: `backEnd/src/shared/cache.ts`
- Create: `backEnd/src/shared/types/index.ts`

- [ ] **Step 1: 创建 tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "commonjs",
    "lib": ["ES2022"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "**/__tests__/**"]
}
```

- [ ] **Step 2: 创建 jest.config.ts**

```typescript
import type { Config } from 'jest';

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.test.ts'],
  moduleFileExtensions: ['ts', 'js', 'json'],
  collectCoverageFrom: ['src/**/*.ts', '!src/**/__tests__/**'],
};

export default config;
```

- [ ] **Step 3: 创建 .env.example**

```
# MongoDB
MONGODB_URI=mongodb+srv://<user>:<password>@cluster.mongodb.net/prviewer

# GitHub App
GITHUB_APP_ID=your_app_id
GITHUB_APP_PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----\n...\n-----END RSA PRIVATE KEY-----"
GITHUB_CLIENT_ID=your_client_id
GITHUB_CLIENT_SECRET=your_client_secret

# OpenAI
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4o

# JWT
JWT_SECRET=your_jwt_secret
JWT_EXPIRES_IN=7d
```

- [ ] **Step 4: 创建 shared/types/index.ts**

```typescript
// ========== Auth ==========
export interface GitHubUser {
  githubId: number;
  login: string;
  avatarUrl: string;
  email?: string;
}

export interface JwtPayload {
  userId: string;
  githubId: number;
}

// ========== GitHub / PullRequest ==========
export interface FileInfo {
  sha: string;
  filename: string;
  status: 'added' | 'modified' | 'removed';
  additions: number;
  deletions: number;
  changes: number;
  patch?: string;
}

export interface CommitInfo {
  sha: string;
  message: string;
  author: { login: string; avatarUrl: string };
  date: Date;
}

export interface CommentInfo {
  id: number;
  body: string;
  author: { login: string };
  path?: string;
  line?: number;
  createdAt: Date;
}

export interface PrData {
  url: string;
  owner: string;
  repo: string;
  pullNumber: number;
  title: string;
  state: 'open' | 'closed' | 'merged';
  author: { login: string; avatarUrl: string };
  baseBranch: string;
  headBranch: string;
  files: FileInfo[];
  diff: string;
  commits: CommitInfo[];
  comments: CommentInfo[];
}

export interface ParsedPrUrl {
  owner: string;
  repo: string;
  pullNumber: number;
}

// ========== Review / AI Analysis ==========
export type ReviewStatus = 'pending' | 'analyzing' | 'completed' | 'failed';
export type RiskLevel = 'low' | 'medium' | 'high';
export type Category = 'security' | 'performance' | 'style' | 'logic' | 'maintainability';
export type Severity = 'critical' | 'major' | 'minor' | 'nit';
export type Priority = 'high' | 'medium' | 'low';

export interface Recommendation {
  priority: Priority;
  category: Category;
  title: string;
  description: string;
}

export interface Summary {
  riskLevel: RiskLevel;
  score: number;
  overview: string;
  recommendations: Recommendation[];
}

export interface Suggestion {
  lineStart: number;
  lineEnd?: number;
  category: Category;
  severity: Severity;
  title: string;
  description: string;
  suggestionCode?: string;
}

export interface FileAnalysis {
  filename: string;
  status: 'added' | 'modified' | 'removed';
  riskLevel: RiskLevel;
  summary: string;
  suggestions: Suggestion[];
}

export interface AiUsage {
  model: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  cost?: number;
}

export interface AnalyzerResult {
  summary: Summary;
  fileAnalyses: FileAnalysis[];
  aiUsage: AiUsage;
}
```

- [ ] **Step 5: 创建 shared/db.ts**

```typescript
import mongoose from 'mongoose';

export async function connectDB(): Promise<void> {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error('MONGODB_URI environment variable is not set');
  }
  await mongoose.connect(uri);
  console.log('Connected to MongoDB');
}

export async function disconnectDB(): Promise<void> {
  await mongoose.disconnect();
  console.log('Disconnected from MongoDB');
}
```

- [ ] **Step 6: 创建 shared/cache.ts**

```typescript
import NodeCache from 'node-cache';

const cache = new NodeCache({
  stdTTL: 900,           // 15 minutes default
  checkperiod: 120,      // cleanup every 2 minutes
  useClones: false,
});

export async function getOrSet<T>(
  key: string,
  ttlSeconds: number,
  fetchFn: () => Promise<T>,
): Promise<T> {
  const cached = cache.get<T>(key);
  if (cached !== undefined) {
    return cached;
  }
  const data = await fetchFn();
  cache.set(key, data, ttlSeconds);
  return data;
}

export function invalidate(key: string): void {
  cache.del(key);
}

export function flushAll(): void {
  cache.flushAll();
}

export default cache;
```

- [ ] **Step 7: 验证 TypeScript 编译**

Run: `cd backEnd && npx tsc --noEmit`
Expected: 无错误

- [ ] **Step 8: 提交**

```bash
git add backEnd/tsconfig.json backEnd/jest.config.ts backEnd/.env.example backEnd/src/shared/
git commit -m "chore: 添加项目基础设施 - TS配置、Jest配置、DB连接、缓存、类型定义"
```

---

### Task 2: Mongoose 模型 — User, PullRequest, Review

**Files:**
- Create: `backEnd/src/modules/auth/models/User.ts`
- Create: `backEnd/src/modules/github/models/PullRequest.ts`
- Create: `backEnd/src/modules/pull-request/models/Review.ts`

- [ ] **Step 1: 创建 User 模型**

```typescript
import mongoose, { Document, Schema } from 'mongoose';

export interface IUser extends Document {
  githubId: number;
  login: string;
  avatarUrl: string;
  email?: string;
  installationId: number;
  accessToken: string;
  tokenExpiresAt: Date;
  refreshToken?: string;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    githubId: { type: Number, required: true, unique: true, index: true },
    login: { type: String, required: true },
    avatarUrl: { type: String, required: true },
    email: { type: String },
    installationId: { type: Number, required: true, index: true },
    accessToken: { type: String, required: true },
    tokenExpiresAt: { type: Date, required: true },
    refreshToken: { type: String },
  },
  { timestamps: true },
);

export const User = mongoose.model<IUser>('User', UserSchema);
```

- [ ] **Step 2: 创建 PullRequest 模型**

```typescript
import mongoose, { Document, Schema } from 'mongoose';
import type { FileInfo, CommitInfo, CommentInfo } from '../../../shared/types';

export interface IPullRequest extends Document {
  url: string;
  owner: string;
  repo: string;
  pullNumber: number;
  title: string;
  state: 'open' | 'closed' | 'merged';
  author: { login: string; avatarUrl: string };
  baseBranch: string;
  headBranch: string;
  files: FileInfo[];
  diff: string;
  commits: CommitInfo[];
  comments: CommentInfo[];
  fetchedAt: Date;
  createdAt: Date;
}

const PullRequestSchema = new Schema<IPullRequest>(
  {
    url: { type: String, required: true, unique: true, index: true },
    owner: { type: String, required: true },
    repo: { type: String, required: true },
    pullNumber: { type: Number, required: true },
    title: { type: String, required: true },
    state: { type: String, enum: ['open', 'closed', 'merged'], required: true },
    author: {
      login: { type: String, required: true },
      avatarUrl: { type: String, required: true },
    },
    baseBranch: { type: String, required: true },
    headBranch: { type: String, required: true },
    files: [
      {
        sha: String,
        filename: String,
        status: { type: String, enum: ['added', 'modified', 'removed'] },
        additions: Number,
        deletions: Number,
        changes: Number,
        patch: String,
      },
    ],
    diff: { type: String, required: true },
    commits: [
      {
        sha: String,
        message: String,
        author: {
          login: String,
          avatarUrl: String,
        },
        date: Date,
      },
    ],
    comments: [
      {
        id: Number,
        body: String,
        author: { login: String },
        path: String,
        line: Number,
        createdAt: Date,
      },
    ],
    fetchedAt: { type: Date, required: true, index: true },
  },
  { timestamps: true },
);

PullRequestSchema.index({ owner: 1, repo: 1, pullNumber: 1 }, { unique: true });

export const PullRequest = mongoose.model<IPullRequest>('PullRequest', PullRequestSchema);
```

- [ ] **Step 3: 创建 Review 模型**

```typescript
import mongoose, { Document, Schema, Types } from 'mongoose';
import type { ReviewStatus, Summary, FileAnalysis, AiUsage } from '../../../shared/types';

export interface IReview extends Document {
  userId: Types.ObjectId;
  prId: Types.ObjectId;
  status: ReviewStatus;
  summary?: Summary;
  fileAnalyses: FileAnalysis[];
  aiUsage?: AiUsage;
  errorMessage?: string;
  startedAt?: Date;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const ReviewSchema = new Schema<IReview>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    prId: { type: Schema.Types.ObjectId, ref: 'PullRequest', required: true, index: true },
    status: {
      type: String,
      enum: ['pending', 'analyzing', 'completed', 'failed'],
      default: 'pending',
      index: true,
    },
    summary: {
      riskLevel: { type: String, enum: ['low', 'medium', 'high'] },
      score: { type: Number, min: 0, max: 100 },
      overview: String,
      recommendations: [
        {
          priority: { type: String, enum: ['high', 'medium', 'low'] },
          category: { type: String, enum: ['security', 'performance', 'style', 'logic', 'maintainability'] },
          title: String,
          description: String,
        },
      ],
    },
    fileAnalyses: [
      {
        filename: String,
        status: { type: String, enum: ['added', 'modified', 'removed'] },
        riskLevel: { type: String, enum: ['low', 'medium', 'high'] },
        summary: String,
        suggestions: [
          {
            lineStart: Number,
            lineEnd: Number,
            category: { type: String, enum: ['security', 'performance', 'style', 'logic', 'maintainability'] },
            severity: { type: String, enum: ['critical', 'major', 'minor', 'nit'] },
            title: String,
            description: String,
            suggestionCode: String,
          },
        ],
      },
    ],
    aiUsage: {
      model: String,
      promptTokens: Number,
      completionTokens: Number,
      totalTokens: Number,
      cost: Number,
    },
    errorMessage: String,
    startedAt: Date,
    completedAt: Date,
  },
  { timestamps: true },
);

ReviewSchema.index({ userId: 1, createdAt: -1 });

export const Review = mongoose.model<IReview>('Review', ReviewSchema);
```

- [ ] **Step 4: 验证编译**

Run: `cd backEnd && npx tsc --noEmit`
Expected: 无错误

- [ ] **Step 5: 提交**

```bash
git add backEnd/src/modules/auth/models/ backEnd/src/modules/github/models/ backEnd/src/modules/pull-request/models/
git commit -m "feat: 添加 Mongoose 模型 - User, PullRequest, Review"
```

---

### Task 3: 共享中间件 — JWT 认证 & 限流

**Files:**
- Create: `backEnd/src/shared/middleware/auth.ts`
- Create: `backEnd/src/shared/middleware/rateLimiter.ts`

- [ ] **Step 1: 创建 JWT 认证中间件**

```typescript
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import type { JwtPayload } from '../types';

// 扩展 Express Request 类型
declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

export function authMiddleware(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing or invalid Authorization header' });
    return;
  }

  const token = authHeader.split(' ')[1];
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    res.status(500).json({ error: 'JWT secret not configured' });
    return;
  }

  try {
    const payload = jwt.verify(token, secret) as JwtPayload;
    req.user = payload;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}
```

- [ ] **Step 2: 创建限流中间件**

```typescript
import rateLimit from 'express-rate-limit';

export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later' },
});

export const aiLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'AI analysis rate limit exceeded, please try again later' },
});
```

- [ ] **Step 3: 验证编译**

Run: `cd backEnd && npx tsc --noEmit`
Expected: 无错误

- [ ] **Step 4: 提交**

```bash
git add backEnd/src/shared/middleware/
git commit -m "feat: 添加共享中间件 - JWT认证、API限流"
```

---

### Task 4: Auth 模块 — GitHub App 安装认证

**Files:**
- Create: `backEnd/src/modules/auth/services/authService.ts`
- Create: `backEnd/src/modules/auth/controllers/authController.ts`
- Create: `backEnd/src/modules/auth/routes.ts`

- [ ] **Step 1: 编写 Auth 模块测试**

```typescript
// backEnd/src/modules/auth/__tests__/auth.test.ts

import jwt from 'jsonwebtoken';
import { generateToken, verifyToken } from '../services/authService';

describe('AuthService', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv, JWT_SECRET: 'test-secret', JWT_EXPIRES_IN: '1h' };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('generateToken', () => {
    it('should generate a valid JWT with userId and githubId', () => {
      const token = generateToken('65a0b2c3d4e5f6a7b8c9d0e1', 12345);

      expect(typeof token).toBe('string');

      const decoded = jwt.verify(token, 'test-secret') as { userId: string; githubId: number };
      expect(decoded.userId).toBe('65a0b2c3d4e5f6a7b8c9d0e1');
      expect(decoded.githubId).toBe(12345);
    });

    it('should throw if JWT_SECRET is not set', () => {
      delete process.env.JWT_SECRET;
      expect(() => generateToken('user-id', 12345)).toThrow('JWT_SECRET is not configured');
    });
  });

  describe('verifyToken', () => {
    it('should decode a valid token', () => {
      const token = generateToken('user-id', 99999);
      const payload = verifyToken(token);
      expect(payload.userId).toBe('user-id');
      expect(payload.githubId).toBe(99999);
    });

    it('should return null for an invalid token', () => {
      const result = verifyToken('invalid-token');
      expect(result).toBeNull();
    });
  });
});
```

- [ ] **Step 2: 运行测试验证失败**

Run: `cd backEnd && npx jest src/modules/auth/__tests__/auth.test.ts`
Expected: FAIL — 模块不存在

- [ ] **Step 3: 创建 authService.ts**

```typescript
import jwt from 'jsonwebtoken';
import type { JwtPayload } from '../../../shared/types';

export function generateToken(userId: string, githubId: number): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET is not configured');
  }
  const expiresIn = process.env.JWT_EXPIRES_IN || '7d';

  return jwt.sign({ userId, githubId } as JwtPayload, secret, { expiresIn });
}

export function verifyToken(token: string): JwtPayload | null {
  const secret = process.env.JWT_SECRET;
  if (!secret) return null;

  try {
    return jwt.verify(token, secret) as JwtPayload;
  } catch {
    return null;
  }
}
```

- [ ] **Step 4: 运行测试验证通过**

Run: `cd backEnd && npx jest src/modules/auth/__tests__/auth.test.ts`
Expected: 4 tests PASS

- [ ] **Step 5: 创建 authController.ts**

```typescript
import { Request, Response } from 'express';
import { User } from '../models/User';
import { generateToken } from '../services/authService';

export async function install(req: Request, res: Response): Promise<void> {
  try {
    const { installationId, code } = req.body;

    if (!installationId || !code) {
      res.status(400).json({ error: 'installationId and code are required' });
      return;
    }

    // TODO: Exchange code for GitHub access token via @octokit/oauth-app
    // For now, create/update user with provided data
    const githubUser = {
      githubId: 0, // will be filled by real GitHub API response
      login: '',   // will be filled by real GitHub API response
      avatarUrl: '',
    };

    const user = await User.findOneAndUpdate(
      { githubId: githubUser.githubId },
      {
        ...githubUser,
        installationId,
        accessToken: 'placeholder-token', // will be real token from GitHub
        tokenExpiresAt: new Date(Date.now() + 8 * 60 * 60 * 1000), // 8h
      },
      { upsert: true, new: true },
    );

    const token = generateToken(user._id.toString(), user.githubId);

    res.status(200).json({
      token,
      user: {
        id: user._id,
        login: user.login,
        avatarUrl: user.avatarUrl,
      },
    });
  } catch (error) {
    res.status(500).json({ error: 'Authentication failed' });
  }
}

export async function getMe(req: Request, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const user = await User.findById(req.user.userId).select('-accessToken -refreshToken');

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    res.status(200).json({
      id: user._id,
      githubId: user.githubId,
      login: user.login,
      avatarUrl: user.avatarUrl,
      email: user.email,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch user' });
  }
}
```

- [ ] **Step 6: 创建 routes.ts**

```typescript
import { Router } from 'express';
import { install, getMe } from './controllers/authController';
import { authMiddleware } from '../../shared/middleware/auth';

const router = Router();

router.post('/install', install);
router.get('/me', authMiddleware, getMe);

export default router;
```

- [ ] **Step 7: 验证编译**

Run: `cd backEnd && npx tsc --noEmit`
Expected: 无错误

- [ ] **Step 8: 提交**

```bash
git add backEnd/src/modules/auth/
git commit -m "feat: 添加Auth模块 - GitHub App安装认证、JWT签发与验证"
```

---

### Task 5: GitHub 模块 — PR 数据拉取与缓存

**Files:**
- Create: `backEnd/src/modules/github/services/githubService.ts`
- Create: `backEnd/src/modules/github/controllers/githubController.ts`
- Create: `backEnd/src/modules/github/routes.ts`

- [ ] **Step 1: 编写 githubService 测试**

```typescript
// backEnd/src/modules/github/__tests__/github.test.ts

import { parsePrUrl } from '../services/githubService';

describe('githubService', () => {
  describe('parsePrUrl', () => {
    it('should parse a valid GitHub PR URL', () => {
      const result = parsePrUrl('https://github.com/facebook/react/pull/25540');
      expect(result).toEqual({ owner: 'facebook', repo: 'react', pullNumber: 25540 });
    });

    it('should handle URL without trailing slash', () => {
      const result = parsePrUrl('https://github.com/vercel/next.js/pull/512');
      expect(result).toEqual({ owner: 'vercel', repo: 'next.js', pullNumber: 512 });
    });

    it('should throw for invalid URL format', () => {
      expect(() => parsePrUrl('https://example.com/not/a/pr')).toThrow('Invalid GitHub PR URL');
    });

    it('should throw for non-URL strings', () => {
      expect(() => parsePrUrl('not-a-url')).toThrow('Invalid GitHub PR URL');
    });
  });
});
```

- [ ] **Step 2: 运行测试验证失败**

Run: `cd backEnd && npx jest src/modules/github/__tests__/github.test.ts`
Expected: FAIL

- [ ] **Step 3: 创建 githubService.ts**

```typescript
import { Octokit } from 'octokit';
import { getOrSet } from '../../../shared/cache';
import { PullRequest } from '../models/PullRequest';
import type { PrData, ParsedPrUrl } from '../../../shared/types';

const PR_CACHE_TTL = 900; // 15 minutes

export function parsePrUrl(url: string): ParsedPrUrl {
  try {
    const parsed = new URL(url);
    if (parsed.hostname !== 'github.com') {
      throw new Error('Invalid GitHub PR URL');
    }

    const parts = parsed.pathname.split('/').filter(Boolean);
    // Expected: /owner/repo/pull/number
    if (parts.length < 4 || parts[2] !== 'pull') {
      throw new Error('Invalid GitHub PR URL');
    }

    const pullNumber = parseInt(parts[3], 10);
    if (isNaN(pullNumber)) {
      throw new Error('Invalid GitHub PR URL');
    }

    return { owner: parts[0], repo: parts[1], pullNumber };
  } catch (error) {
    if (error instanceof Error && error.message === 'Invalid GitHub PR URL') {
      throw error;
    }
    throw new Error('Invalid GitHub PR URL');
  }
}

function createOctokit(token: string): Octokit {
  return new Octokit({ auth: token });
}

export async function fetchPrFromGitHub(
  owner: string,
  repo: string,
  pullNumber: number,
  accessToken: string,
): Promise<PrData> {
  const octokit = createOctokit(accessToken);

  const [{ data: pr }, { data: files }, { data: commits }, { data: comments }] =
    await Promise.all([
      octokit.rest.pulls.get({ owner, repo, pull_number: pullNumber }),
      octokit.rest.pulls.listFiles({ owner, repo, pull_number: pullNumber, per_page: 100 }),
      octokit.rest.pulls.listCommits({ owner, repo, pull_number: pullNumber, per_page: 100 }),
      octokit.rest.issues.listComments({ owner, repo, issue_number: pullNumber, per_page: 100 }),
    ]);

  const diffResponse = await octokit.request(
    'GET /repos/{owner}/{repo}/pulls/{pull_number}',
    {
      owner,
      repo,
      pull_number: pullNumber,
      headers: { accept: 'application/vnd.github.v3.diff' },
    },
  );

  const diff = typeof diffResponse.data === 'string' ? diffResponse.data : '';

  return {
    url: pr.html_url,
    owner,
    repo,
    pullNumber,
    title: pr.title,
    state: pr.state as 'open' | 'closed' | 'merged',
    author: {
      login: pr.user?.login ?? 'unknown',
      avatarUrl: pr.user?.avatar_url ?? '',
    },
    baseBranch: pr.base.ref,
    headBranch: pr.head.ref,
    files: files.map((f) => ({
      sha: f.sha,
      filename: f.filename,
      status: f.status as 'added' | 'modified' | 'removed',
      additions: f.additions,
      deletions: f.deletions,
      changes: f.changes,
      patch: f.patch,
    })),
    diff,
    commits: commits.map((c) => ({
      sha: c.sha,
      message: c.commit.message,
      author: {
        login: c.author?.login ?? 'unknown',
        avatarUrl: c.author?.avatar_url ?? '',
      },
      date: new Date(c.commit.author?.date ?? Date.now()),
    })),
    comments: comments.map((c) => ({
      id: c.id,
      body: c.body ?? '',
      author: { login: c.user?.login ?? 'unknown' },
      path: undefined,
      line: undefined,
      createdAt: new Date(c.created_at),
    })),
  };
}

export async function getOrFetchPr(
  prUrl: string,
  accessToken: string,
): Promise<PrData> {
  const { owner, repo, pullNumber } = parsePrUrl(prUrl);

  // 1. Check memory cache
  const cacheKey = `pr:${owner}:${repo}:${pullNumber}`;
  const memoryCached = await getOrSet(cacheKey, PR_CACHE_TTL, async () => {
    // 2. Check MongoDB
    const existing = await PullRequest.findOne({ owner, repo, pullNumber });
    if (existing) {
      return existing.toObject() as unknown as PrData;
    }

    // 3. Fetch from GitHub API
    const prData = await fetchPrFromGitHub(owner, repo, pullNumber, accessToken);

    // Persist to MongoDB
    await PullRequest.findOneAndUpdate(
      { owner, repo, pullNumber },
      { ...prData, fetchedAt: new Date() },
      { upsert: true, new: true },
    );

    return prData;
  });

  return memoryCached;
}
```

- [ ] **Step 4: 运行测试验证 parsePrUrl 通过**

Run: `cd backEnd && npx jest src/modules/github/__tests__/github.test.ts`
Expected: 4 tests PASS

- [ ] **Step 5: 创建 githubController.ts**

```typescript
import { Request, Response } from 'express';
import { PullRequest } from '../models/PullRequest';
import { getOrFetchPr, parsePrUrl } from '../services/githubService';

export async function listPullRequests(req: Request, res: Response): Promise<void> {
  try {
    const { page = '1', limit = '20' } = req.query;
    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);

    const [prs, total] = await Promise.all([
      PullRequest.find()
        .sort({ createdAt: -1 })
        .skip((pageNum - 1) * limitNum)
        .limit(limitNum)
        .select('-diff -commits -comments')
        .lean(),
      PullRequest.countDocuments(),
    ]);

    res.status(200).json({
      data: prs,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch pull requests' });
  }
}

export async function getPullRequest(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const pr = await PullRequest.findById(id).lean();

    if (!pr) {
      res.status(404).json({ error: 'Pull request not found' });
      return;
    }

    res.status(200).json(pr);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch pull request' });
  }
}

export async function fetchAndCachePr(req: Request, res: Response): Promise<void> {
  try {
    const { prUrl } = req.body;

    if (!prUrl) {
      res.status(400).json({ error: 'prUrl is required' });
      return;
    }

    parsePrUrl(prUrl); // validate URL format early

    // Requires user auth for GitHub API access
    const accessToken = 'placeholder'; // TODO: get from authenticated user's stored token
    const prData = await getOrFetchPr(prUrl, accessToken);

    res.status(200).json(prData);
  } catch (error) {
    if (error instanceof Error && error.message === 'Invalid GitHub PR URL') {
      res.status(400).json({ error: 'Invalid GitHub PR URL' });
      return;
    }
    res.status(500).json({ error: 'Failed to fetch PR data' });
  }
}
```

- [ ] **Step 6: 创建 routes.ts**

```typescript
import { Router } from 'express';
import { listPullRequests, getPullRequest, fetchAndCachePr } from './controllers/githubController';
import { authMiddleware } from '../../shared/middleware/auth';

const router = Router();

router.get('/', authMiddleware, listPullRequests);
router.get('/:id', authMiddleware, getPullRequest);
router.post('/fetch', authMiddleware, fetchAndCachePr);

export default router;
```

- [ ] **Step 7: 验证编译**

Run: `cd backEnd && npx tsc --noEmit`
Expected: 无错误

- [ ] **Step 8: 提交**

```bash
git add backEnd/src/modules/github/
git commit -m "feat: 添加GitHub模块 - PR数据拉取、三级缓存、URL解析"
```

---

### Task 6: Analyzer 模块 — OpenAI 评审分析

**Files:**
- Create: `backEnd/src/modules/analyzer/services/analyzerService.ts`

- [ ] **Step 1: 编写 analyzerService 测试**

```typescript
// backEnd/src/modules/analyzer/__tests__/analyzer.test.ts

import { buildAnalyzerPrompt, parseAnalyzerResponse } from '../services/analyzerService';
import type { FileInfo } from '../../../shared/types';

describe('analyzerService', () => {
  describe('buildAnalyzerPrompt', () => {
    it('should build a prompt containing PR title and file list', () => {
      const prTitle = 'Fix login bug';
      const prBody = 'This fixes the login redirect issue';
      const files: FileInfo[] = [
        {
          sha: 'abc123',
          filename: 'src/login.ts',
          status: 'modified',
          additions: 10,
          deletions: 5,
          changes: 15,
          patch: '@@ -1,5 +1,10 @@\n+function login() {}',
        },
      ];
      const diff = 'diff --git a/src/login.ts b/src/login.ts\n...';

      const prompt = buildAnalyzerPrompt(prTitle, prBody, files, diff);

      expect(prompt).toContain('Fix login bug');
      expect(prompt).toContain('src/login.ts');
      expect(prompt).toContain('JSON');
      // Should include instruction to return JSON
      expect(prompt).toMatch(/json|JSON/);
    });
  });

  describe('parseAnalyzerResponse', () => {
    it('should parse valid JSON response', () => {
      const jsonResponse = JSON.stringify({
        summary: {
          riskLevel: 'medium',
          score: 75,
          overview: 'Good changes overall',
          recommendations: [
            {
              priority: 'high',
              category: 'security',
              title: 'XSS vulnerability',
              description: 'Unsanitized user input',
            },
          ],
        },
        fileAnalyses: [
          {
            filename: 'src/login.ts',
            status: 'modified',
            riskLevel: 'medium',
            summary: 'Login logic looks good',
            suggestions: [
              {
                lineStart: 5,
                category: 'security',
                severity: 'major',
                title: 'Validate input',
                description: 'Add input validation',
              },
            ],
          },
        ],
        aiUsage: {
          model: 'gpt-4o',
          promptTokens: 500,
          completionTokens: 200,
          totalTokens: 700,
        },
      });

      const result = parseAnalyzerResponse(jsonResponse);

      expect(result.summary.riskLevel).toBe('medium');
      expect(result.summary.score).toBe(75);
      expect(result.fileAnalyses).toHaveLength(1);
      expect(result.fileAnalyses[0].filename).toBe('src/login.ts');
      expect(result.fileAnalyses[0].suggestions).toHaveLength(1);
    });

    it('should handle JSON wrapped in markdown code blocks', () => {
      const markdownResponse = '```json\n' + JSON.stringify({
        summary: { riskLevel: 'low', score: 90, overview: 'LGTM', recommendations: [] },
        fileAnalyses: [],
        aiUsage: { model: 'gpt-4o', promptTokens: 100, completionTokens: 50, totalTokens: 150 },
      }) + '\n```';

      const result = parseAnalyzerResponse(markdownResponse);
      expect(result.summary.riskLevel).toBe('low');
    });

    it('should throw for unparseable response', () => {
      expect(() => parseAnalyzerResponse('not valid json at all'))
        .toThrow('Failed to parse AI response');
    });
  });
});
```

- [ ] **Step 2: 运行测试验证失败**

Run: `cd backEnd && npx jest src/modules/analyzer/__tests__/analyzer.test.ts`
Expected: FAIL

- [ ] **Step 3: 创建 analyzerService.ts**

```typescript
import axios from 'axios';
import type { FileInfo, AnalyzerResult } from '../../../shared/types';

export function buildAnalyzerPrompt(
  prTitle: string,
  prBody: string | null,
  files: FileInfo[],
  diff: string,
): string {
  const fileList = files
    .map((f) => `- ${f.filename} (${f.status}, +${f.additions}/-${f.deletions})`)
    .join('\n');

  return `You are a senior code reviewer. Analyze the following Pull Request and produce a structured JSON review.

## PR Title
${prTitle}

## PR Description
${prBody || 'No description provided'}

## Changed Files
${fileList}

## Full Diff
\`\`\`diff
${diff.slice(0, 80000)}
\`\`\`

## Instructions

Return ONLY a JSON object (no markdown, no other text) with this structure:

{
  "summary": {
    "riskLevel": "low" | "medium" | "high",
    "score": <0-100>,
    "overview": "<Markdown summary of the PR>",
    "recommendations": [
      {
        "priority": "high" | "medium" | "low",
        "category": "security" | "performance" | "style" | "logic" | "maintainability",
        "title": "<short title>",
        "description": "<detailed explanation in Markdown>"
      }
    ]
  },
  "fileAnalyses": [
    {
      "filename": "<path>",
      "status": "added" | "modified" | "removed",
      "riskLevel": "low" | "medium" | "high",
      "summary": "<brief assessment of this file>",
      "suggestions": [
        {
          "lineStart": <line number>,
          "lineEnd": <optional line number>,
          "category": "security" | "performance" | "style" | "logic" | "maintainability",
          "severity": "critical" | "major" | "minor" | "nit",
          "title": "<short title>",
          "description": "<detailed suggestion in Markdown>",
          "suggestionCode": "<optional code fix>"
        }
      ]
    }
  ]
}

For each changed file, analyze it. Focus on:
- Security vulnerabilities
- Performance issues
- Logic errors
- Code style and maintainability
- Edge cases and error handling

Be specific — reference exact line numbers from the diff.`;
}

export function parseAnalyzerResponse(response: string): AnalyzerResult {
  let cleaned = response.trim();

  // Strip markdown code fences if present
  const jsonMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (jsonMatch) {
    cleaned = jsonMatch[1].trim();
  }

  try {
    const parsed = JSON.parse(cleaned);

    // Validate required structure
    if (!parsed.summary || !parsed.fileAnalyses || !parsed.aiUsage) {
      throw new Error('Missing required fields in AI response');
    }

    return parsed as AnalyzerResult;
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error('Failed to parse AI response: invalid JSON');
    }
    throw error;
  }
}

export async function analyzePullRequest(
  prTitle: string,
  prBody: string | null,
  files: FileInfo[],
  diff: string,
): Promise<AnalyzerResult> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is not configured');
  }

  const model = process.env.OPENAI_MODEL || 'gpt-4o';
  const prompt = buildAnalyzerPrompt(prTitle, prBody, files, diff);

  const response = await axios.post(
    'https://api.openai.com/v1/chat/completions',
    {
      model,
      messages: [
        {
          role: 'system',
          content: 'You are a code review expert. Always respond with valid JSON only.',
        },
        { role: 'user', content: prompt },
      ],
      temperature: 0.3,
      max_tokens: 8000,
    },
    {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
    },
  );

  const content = response.data.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error('Empty response from OpenAI');
  }

  const result = parseAnalyzerResponse(content);

  // Override aiUsage with actual token counts from API
  result.aiUsage = {
    model,
    promptTokens: response.data.usage?.prompt_tokens ?? 0,
    completionTokens: response.data.usage?.completion_tokens ?? 0,
    totalTokens: response.data.usage?.total_tokens ?? 0,
  };

  return result;
}
```

- [ ] **Step 4: 运行测试验证通过**

Run: `cd backEnd && npx jest src/modules/analyzer/__tests__/analyzer.test.ts`
Expected: 4 tests PASS (测试 prompt 构建和 JSON 解析，不调用实际 API)

- [ ] **Step 5: 验证编译**

Run: `cd backEnd && npx tsc --noEmit`
Expected: 无错误

- [ ] **Step 6: 提交**

```bash
git add backEnd/src/modules/analyzer/
git commit -m "feat: 添加Analyzer模块 - OpenAI调用、Prompt构建、JSON响应解析"
```

---

### Task 7: PullRequest 模块 — Review CRUD 与编排

**Files:**
- Create: `backEnd/src/modules/pull-request/services/reviewService.ts`
- Create: `backEnd/src/modules/pull-request/controllers/reviewController.ts`
- Create: `backEnd/src/modules/pull-request/routes.ts`

- [ ] **Step 1: 编写 reviewService 测试**

```typescript
// backEnd/src/modules/pull-request/__tests__/review.test.ts

// Note: These tests use mocks since they depend on DB and external services.

import { Review } from '../models/Review';
import { createReview, getReviewById, listReviews, processReview } from '../services/reviewService';

// Mock external dependencies
jest.mock('../models/Review');
jest.mock('../../github/services/githubService');
jest.mock('../../analyzer/services/analyzerService');

describe('reviewService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createReview', () => {
    it('should create a review with pending status', async () => {
      const mockReview = {
        _id: 'review-123',
        userId: 'user-1',
        prId: 'pr-1',
        status: 'pending',
        fileAnalyses: [],
      };

      (Review.create as jest.Mock).mockResolvedValue(mockReview);

      const result = await createReview('user-1', 'pr-1');
      expect(result.status).toBe('pending');
      expect(Review.create).toHaveBeenCalledWith({
        userId: 'user-1',
        prId: 'pr-1',
        status: 'pending',
        fileAnalyses: [],
      });
    });
  });

  describe('getReviewById', () => {
    it('should return review with populated fields', async () => {
      const mockReview = {
        _id: 'review-123',
        status: 'completed',
        summary: { riskLevel: 'low', score: 90 },
      };

      (Review.findById as jest.Mock).mockReturnValue({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockReturnValue({
            lean: jest.fn().mockResolvedValue(mockReview),
          }),
        }),
      });

      const result = await getReviewById('review-123');
      expect(result).toBeDefined();
    });

    it('should throw for non-existent review', async () => {
      (Review.findById as jest.Mock).mockReturnValue({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockReturnValue({
            lean: jest.fn().mockResolvedValue(null),
          }),
        }),
      });

      await expect(getReviewById('nonexistent')).rejects.toThrow('Review not found');
    });
  });
});
```

- [ ] **Step 2: 运行测试验证失败**

Run: `cd backEnd && npx jest src/modules/pull-request/__tests__/review.test.ts`
Expected: FAIL

- [ ] **Step 3: 创建 reviewService.ts**

```typescript
import { Review } from '../models/Review';
import { PullRequest } from '../../github/models/PullRequest';
import { getOrFetchPr } from '../../github/services/githubService';
import { analyzePullRequest } from '../../analyzer/services/analyzerService';
import type { IReview } from '../models/Review';
import type { AnalyzerResult } from '../../../shared/types';

export async function createReview(userId: string, prId: string): Promise<IReview> {
  const review = await Review.create({
    userId,
    prId,
    status: 'pending' as const,
    fileAnalyses: [],
  });
  return review;
}

export async function getReviewById(reviewId: string): Promise<Record<string, unknown>> {
  const review = await Review.findById(reviewId)
    .populate('userId', 'login avatarUrl')
    .populate('prId', 'title url owner repo pullNumber state files diff')
    .lean();

  if (!review) {
    throw new Error('Review not found');
  }

  return review as unknown as Record<string, unknown>;
}

export async function listReviews(
  userId: string,
  options: { status?: string; page?: number; limit?: number } = {},
): Promise<{ data: unknown[]; pagination: Record<string, number> }> {
  const { status, page = 1, limit = 20 } = options;
  const query: Record<string, unknown> = { userId };
  if (status) {
    query.status = status;
  }

  const [reviews, total] = await Promise.all([
    Review.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('prId', 'title url owner repo pullNumber state')
      .select('-fileAnalyses')
      .lean(),
    Review.countDocuments(query),
  ]);

  return {
    data: reviews,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
}

export async function processReview(reviewId: string, accessToken: string): Promise<void> {
  const review = await Review.findById(reviewId).populate('prId');
  if (!review) {
    throw new Error('Review not found');
  }

  try {
    review.status = 'analyzing';
    review.startedAt = new Date();
    await review.save();

    const pr = await PullRequest.findById(review.prId);
    if (!pr) {
      throw new Error('Pull request not found');
    }

    const result: AnalyzerResult = await analyzePullRequest(
      pr.title,
      null, // PR body not stored in current schema, can extend
      pr.files,
      pr.diff,
    );

    review.summary = result.summary;
    review.fileAnalyses = result.fileAnalyses;
    review.aiUsage = result.aiUsage;
    review.status = 'completed';
    review.completedAt = new Date();
    await review.save();
  } catch (error) {
    review.status = 'failed';
    review.errorMessage = error instanceof Error ? error.message : 'Unknown error';
    review.completedAt = new Date();
    await review.save();
  }
}
```

- [ ] **Step 4: 运行测试验证通过**

Run: `cd backEnd && npx jest src/modules/pull-request/__tests__/review.test.ts`
Expected: 3 tests PASS

- [ ] **Step 5: 创建 reviewController.ts**

```typescript
import { Request, Response } from 'express';
import { createReview, getReviewById, listReviews, processReview } from '../services/reviewService';
import { parsePrUrl, getOrFetchPr } from '../../github/services/githubService';

export async function create(req: Request, res: Response): Promise<void> {
  try {
    const { prUrl } = req.body;

    if (!prUrl) {
      res.status(400).json({ error: 'prUrl is required' });
      return;
    }

    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    // Validate URL
    parsePrUrl(prUrl);

    // Fetch/cache PR data first, then create review
    const accessToken = 'placeholder'; // TODO: get from user's stored token
    const prData = await getOrFetchPr(prUrl, accessToken);

    // Find the persisted PullRequest document
    const { default: mongoose } = await import('mongoose');
    const PullRequest = mongoose.model('PullRequest');
    const prDoc = await PullRequest.findOne({
      owner: prData.owner,
      repo: prData.repo,
      pullNumber: prData.pullNumber,
    });

    if (!prDoc) {
      res.status(500).json({ error: 'Failed to cache PR data' });
      return;
    }

    const review = await createReview(req.user.userId, prDoc._id.toString());

    // Start async analysis — don't block the response
    processReview(review._id.toString(), accessToken).catch((err) => {
      console.error('Review processing failed:', err);
    });

    res.status(201).json({
      id: review._id,
      status: review.status,
      prUrl: prData.url,
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'Invalid GitHub PR URL') {
      res.status(400).json({ error: 'Invalid GitHub PR URL' });
      return;
    }
    res.status(500).json({ error: 'Failed to create review' });
  }
}

export async function getById(req: Request, res: Response): Promise<void> {
  try {
    const review = await getReviewById(req.params.id);
    res.status(200).json(review);
  } catch (error) {
    if (error instanceof Error && error.message === 'Review not found') {
      res.status(404).json({ error: 'Review not found' });
      return;
    }
    res.status(500).json({ error: 'Failed to fetch review' });
  }
}

export async function list(req: Request, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const { status, page, limit } = req.query;
    const result = await listReviews(req.user.userId, {
      status: status as string | undefined,
      page: page ? parseInt(page as string, 10) : undefined,
      limit: limit ? parseInt(limit as string, 10) : undefined,
    });

    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch reviews' });
  }
}
```

- [ ] **Step 6: 创建 routes.ts**

```typescript
import { Router } from 'express';
import { create, getById, list } from './controllers/reviewController';
import { authMiddleware } from '../../shared/middleware/auth';
import { aiLimiter } from '../../shared/middleware/rateLimiter';

const router = Router();

router.post('/', authMiddleware, aiLimiter, create);
router.get('/', authMiddleware, list);
router.get('/:id', authMiddleware, getById);

export default router;
```

- [ ] **Step 7: 验证编译**

Run: `cd backEnd && npx tsc --noEmit`
Expected: 无错误

- [ ] **Step 8: 提交**

```bash
git add backEnd/src/modules/pull-request/
git commit -m "feat: 添加PR模块 - Review创建、列表查询、异步AI分析编排"
```

---

### Task 8: Express App 组装 & 入口文件

**Files:**
- Create: `backEnd/src/app.ts`
- Create: `backEnd/src/server.ts`

- [ ] **Step 1: 创建 app.ts**

```typescript
import express from 'express';
import cors from 'cors';
import { apiLimiter } from './shared/middleware/rateLimiter';
import authRoutes from './modules/auth/routes';
import githubRoutes from './modules/github/routes';
import reviewRoutes from './modules/pull-request/routes';

const app = express();

// Global middleware
app.use(cors());
app.use(express.json());
app.use(apiLimiter);

// Health check
app.get('/health', (_req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Routes
app.use('/auth', authRoutes);
app.use('/pull-requests', githubRoutes);
app.use('/reviews', reviewRoutes);

// 404 handler
app.use((_req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Global error handler
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

export default app;
```

- [ ] **Step 2: 创建 server.ts**

```typescript
import dotenv from 'dotenv';
dotenv.config();

import app from './app';
import { connectDB } from './shared/db';

const PORT = process.env.PORT || 3000;

async function start(): Promise<void> {
  try {
    await connectDB();
    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

start();
```

- [ ] **Step 3: 安装 dotenv 依赖**

Run: `cd backEnd && npm install dotenv && npm install -D @types/cors`
(如果尚未安装 cors: `npm install cors`)

- [ ] **Step 4: 验证编译**

Run: `cd backEnd && npx tsc --noEmit`
Expected: 无错误

- [ ] **Step 5: 运行全部测试**

Run: `cd backEnd && npx jest`
Expected: 全部测试 PASS

- [ ] **Step 6: 提交**

```bash
git add backEnd/src/app.ts backEnd/src/server.ts backEnd/package.json backEnd/package-lock.json
git commit -m "feat: 组装Express应用入口 - 路由注册、全局中间件、错误处理"
```

---

### Task 9: 集成验证 & 最终清理

**Files:**
- Create: `backEnd/.env`
- Modify: `backEnd/package.json` (更新 scripts)

- [ ] **Step 1: 更新 package.json scripts**

```json
{
  "scripts": {
    "dev": "ts-node src/server.ts",
    "build": "tsc",
    "start": "node dist/server.js",
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage"
  }
}
```

- [ ] **Step 2: 验证项目能完整编译**

Run: `cd backEnd && npx tsc`
Expected: 编译成功，`dist/` 目录生成

- [ ] **Step 3: 运行全部测试并确认通过**

Run: `cd backEnd && npx jest --verbose`
Expected: 所有测试 PASS，无失败

- [ ] **Step 4: 运行测试覆盖率**

Run: `cd backEnd && npx jest --coverage`
Expected: 覆盖率报告生成

- [ ] **Step 5: 提交**

```bash
git add backEnd/
git commit -m "chore: 更新scripts、添加.env配置、编译验证"
```

---

## Summary

| Task | 内容 | 测试 |
|------|------|------|
| 1 | 项目基础设施 (tsconfig, jest, types, db, cache) | tsc 编译 |
| 2 | Mongoose 模型 (User, PullRequest, Review) | tsc 编译 |
| 3 | 共享中间件 (JWT auth, rate limiter) | tsc 编译 |
| 4 | Auth 模块 (install, JWT) | 4 tests |
| 5 | GitHub 模块 (PR拉取, 缓存, URL解析) | 4 tests |
| 6 | Analyzer 模块 (OpenAI, prompt, 解析) | 4 tests |
| 7 | PullRequest 模块 (Review CRUD, 编排) | 3 tests |
| 8 | Express 组装 (app, server, 路由) | 全量回归 |
| 9 | 集成验证 & 清理 | 编译 + 全量测试 |
