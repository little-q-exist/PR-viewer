# 前端实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 从零搭建 PR Viewer 前端 — React 19 + TypeScript 6 + Vite 8 的 AI 代码评审工具，含主页/PR列表/分析报告三个页面。

**Architecture:** Redux Toolkit 管理客户端状态（auth + UI），TanStack React Query 管理服务端状态（reviews + PR data）。Axios 实例统一 JWT 注入与 401 处理。Ant Design 6 暗黑主题 + 毛玻璃质感。模块化目录结构（modules/xxx/components, hooks, styles, services）。

**Tech Stack:** React 19, TypeScript 6, Vite 8, Ant Design 6 + @ant-design/icons 6.x, Redux Toolkit, TanStack React Query 5, React Router 7, Axios, react-diff-viewer, marked + highlight.js, Vitest 4

**Special Skills Required:** ant-design (组件选型/主题/图标), design-taste-frontend (视觉质感审核)

## 分支策略

每个 Phase 开始前从依赖的父分支最新 commit 创建新分支：

```
main (或当前基线)
  │
  └── chore/frontend-scaffold          ← Phase 0
        │
        └── feat/frontend-shared-infra  ← Phase 1
              │
              ├── feat/frontend-home       ← Phase 2
              ├── feat/frontend-pr-list    ← Phase 3
              └── feat/frontend-review     ← Phase 4
                    │  (Phase 2/3/4 全部完成后合并到 Phase 1 分支)
                    │
                    └── feat/frontend-integration  ← Phase 5
                          │
                          └── style/frontend-polish       ← Phase 6
```

**创建分支命令格式：**
```bash
# Phase 0: 从当前基线创建
git checkout -b chore/frontend-scaffold

# Phase 1: 从 Phase 0 最新 commit 创建
git checkout -b feat/frontend-shared-infra chore/frontend-scaffold

# Phase 2/3/4: 均从 Phase 1 最新 commit 创建（可并行）
git checkout -b feat/frontend-home feat/frontend-shared-infra
git checkout -b feat/frontend-pr-list feat/frontend-shared-infra
git checkout -b feat/frontend-review feat/frontend-shared-infra

# Phase 5: 在 Phase 2/3/4 全部合并回 Phase 1 后，从 Phase 1 创建
git checkout feat/frontend-shared-infra
git merge feat/frontend-home feat/frontend-pr-list feat/frontend-review
git checkout -b feat/frontend-integration feat/frontend-shared-infra

# Phase 6: 从 Phase 5 最新 commit 创建
git checkout -b style/frontend-polish feat/frontend-integration
```

---

## 文件结构总览

```
frontEnd/
├── index.html                          # Vite 入口 HTML
├── vite.config.ts                      # Vite 构建配置
├── tsconfig.json                       # TypeScript 配置
├── tsconfig.app.json                   # App TypeScript 配置
├── tsconfig.node.json                  # Node TypeScript 配置
├── vitest.config.ts                    # Vitest 测试配置
├── package.json                        # (已有, 需更新 scripts + type)
├── .env                                # 环境变量
└── src/
    ├── main.tsx
    ├── App.tsx
    ├── vite-env.d.ts
    ├── types/
    │   └── index.ts                    # 共享类型定义
    ├── store/
    │   ├── index.ts
    │   └── modules/
    │       ├── authSlice.ts
    │       └── uiSlice.ts
    ├── shared/
    │   ├── components/
    │   │   ├── AppLayout.tsx
    │   │   ├── Sidebar.tsx
    │   │   ├── ProtectedRoute.tsx
    │   │   └── LoadingSpinner.tsx
    │   ├── hooks/
    │   │   ├── useAuth.ts
    │   │   └── useReviews.ts           # React Query hooks
    │   ├── services/
    │   │   └── api.ts
    │   └── styles/
    │       └── global.css
    └── modules/
        ├── home/
        │   ├── components/
        │   │   ├── WelcomeHero.tsx
        │   │   ├── Dashboard.tsx
        │   │   ├── StatsCards.tsx
        │   │   ├── PRUrlInput.tsx
        │   │   └── RecentReviews.tsx
        │   ├── hooks/
        │   │   └── useDashboard.ts
        │   └── styles/
        │       └── home.css
        ├── pr-list/
        │   ├── components/
        │   │   ├── PRListPage.tsx
        │   │   ├── StatusFilter.tsx
        │   │   └── ReviewTable.tsx
        │   ├── hooks/
        │   │   └── usePRList.ts
        │   └── styles/
        │       └── pr-list.css
        └── review/
            ├── components/
            │   ├── ReviewPage.tsx
            │   ├── PRInfoBar.tsx
            │   ├── PollingIndicator.tsx
            │   ├── OverviewTab.tsx
            │   ├── CommitList.tsx
            │   ├── AISummary.tsx
            │   ├── ChangesTab.tsx
            │   ├── FileTree.tsx
            │   ├── DiffViewer.tsx
            │   └── SuggestionPopover.tsx
            ├── hooks/
            │   ├── useReviewDetail.ts
            │   └── usePolling.ts
            └── styles/
                └── review.css
```

---

## Phase 0: 项目脚手架

**父分支:** 当前基线 (main 或当前分支)

### Task 0.1: 更新 package.json 配置

**Files:**
- Modify: `frontEnd/package.json`

- [ ] **Step 0: 创建 Phase 0 分支**

```bash
git checkout -b chore/frontend-scaffold
```

- [ ] **Step 1: 修改 package.json 类型和脚本**

将 `"type": "commonjs"` 改为 `"module"`，添加 Vite/Vitest 脚本，添加 MSW 开发依赖。

```json
{
  "name": "frontend",
  "version": "1.0.0",
  "description": "PR Viewer - AI Code Review Frontend",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "preview": "vite preview",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "dependencies": {
    "@ant-design/icons": "^6.2.5",
    "@reduxjs/toolkit": "^2.12.0",
    "@tanstack/react-query": "^5.100.14",
    "antd": "^6.4.3",
    "axios": "^1.16.1",
    "highlight.js": "^11.11.1",
    "marked": "^18.0.4",
    "react": "^19.2.6",
    "react-diff-viewer": "^3.1.1",
    "react-dom": "^19.2.6",
    "react-redux": "^9.3.0",
    "react-router-dom": "^7.16.0"
  },
  "devDependencies": {
    "@types/react": "^19.2.15",
    "@types/react-dom": "^19.2.3",
    "@vitejs/plugin-react": "^6.0.2",
    "msw": "^2.12.7",
    "typescript": "^6.0.3",
    "vite": "^8.0.14",
    "vitest": "^4.1.7"
  }
}
```

- [ ] **Step 2: 安装依赖**

```bash
cd frontEnd && npm install
```

- [ ] **Step 3: Commit**

```bash
git add frontEnd/package.json frontEnd/package-lock.json
git commit -m "chore:配置Vite/TypeScript/Vitest/MWS开发环境"
```

---

### Task 0.2: Vite + TypeScript 配置文件

**Files:**
- Create: `frontEnd/index.html`
- Create: `frontEnd/vite.config.ts`
- Create: `frontEnd/tsconfig.json`
- Create: `frontEnd/tsconfig.app.json`
- Create: `frontEnd/tsconfig.node.json`
- Create: `frontEnd/vitest.config.ts`
- Create: `frontEnd/.env`
- Create: `frontEnd/src/vite-env.d.ts`

- [ ] **Step 1: 创建 index.html**

```html
<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>PR Viewer - AI 代码评审</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 2: 创建 vite.config.ts**

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },
});
```

- [ ] **Step 3: 创建 tsconfig.json**

```json
{
  "files": [],
  "references": [
    { "path": "./tsconfig.app.json" },
    { "path": "./tsconfig.node.json" }
  ]
}
```

- [ ] **Step 4: 创建 tsconfig.app.json**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "isolatedModules": true,
    "moduleDetection": "force",
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "forceConsistentCasingInFileNames": true,
    "paths": {
      "@/*": ["./src/*"]
    },
    "baseUrl": "."
  },
  "include": ["src"]
}
```

- [ ] **Step 5: 创建 tsconfig.node.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2023"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "isolatedModules": true,
    "moduleDetection": "force",
    "noEmit": true,
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "forceConsistentCasingInFileNames": true
  },
  "include": ["vite.config.ts", "vitest.config.ts"]
}
```

- [ ] **Step 6: 创建 vitest.config.ts**

```typescript
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: [],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
```

- [ ] **Step 7: 创建 .env**

```env
VITE_API_BASE=http://localhost:3000
VITE_GITHUB_APP_NAME=ai-pr-viewer
```

- [ ] **Step 8: 创建 src/vite-env.d.ts**

```typescript
/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE: string;
  readonly VITE_GITHUB_APP_NAME: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
```

- [ ] **Step 9: 验证构建**

```bash
cd frontEnd && npx tsc -b --noEmit
```

Expected: no errors (可能报缺少 src 文件，正常，下一步创建入口文件)

- [ ] **Step 10: Commit**

```bash
git add frontEnd/index.html frontEnd/vite.config.ts frontEnd/tsconfig.json \
    frontEnd/tsconfig.app.json frontEnd/tsconfig.node.json \
    frontEnd/vitest.config.ts frontEnd/.env frontEnd/src/vite-env.d.ts
git commit -m "chore:初始化Vite+TypeScript工程配置"
```

---

## Phase 1: 共享基础设施

**父分支:** `chore/frontend-scaffold` (Phase 0)

### Task 1.0: 创建分支

- [ ] **Step 0: 创建 Phase 1 分支**

```bash
git checkout -b feat/frontend-shared-infra chore/frontend-scaffold
```

---

### Task 1.1: 共享 TypeScript 类型定义

**Files:**
- Create: `frontEnd/src/types/index.ts`

- [ ] **Step 1: 创建类型文件**

```typescript
// ========== Auth ==========
export interface AuthUser {
  id: string;
  login: string;
  avatarUrl: string;
}

export interface AuthResponse {
  token: string;
  user: AuthUser;
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
  date: string;
}

export interface CommentInfo {
  id: number;
  body: string;
  author: { login: string };
  path?: string;
  line?: number;
  createdAt: string;
}

export interface PullRequest {
  _id: string;
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
  diff?: string;
  commits?: CommitInfo[];
  comments?: CommentInfo[];
  fetchedAt: string;
  createdAt: string;
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

export interface Review {
  _id: string;
  userId: string | AuthUser;
  prId: string | PullRequest;
  status: ReviewStatus;
  summary?: Summary;
  fileAnalyses?: FileAnalysis[];
  aiUsage?: AiUsage;
  errorMessage?: string | null;
  startedAt?: string;
  completedAt?: string;
  createdAt: string;
}

export interface ReviewListResponse {
  data: Review[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface PRListResponse {
  data: PullRequest[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface CreateReviewResponse {
  id: string;
  status: ReviewStatus;
  prUrl: string;
}

export interface ReviewFilters {
  status?: ReviewStatus;
  page?: number;
  limit?: number;
}
```

- [ ] **Step 2: Commit**

```bash
git add frontEnd/src/types/index.ts
git commit -m "feat:定义前端共享TypeScript类型"
```

---

### Task 1.2: Axios 实例 + JWT 拦截器

**Files:**
- Create: `frontEnd/src/shared/services/api.ts`

- [ ] **Step 1: 创建 API 服务文件**

```typescript
import axios from 'axios';
import type { AuthResponse, CreateReviewResponse, Review, ReviewFilters, ReviewListResponse } from '@/types';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE,
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
});

// 请求拦截器：自动附加 JWT
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// 响应拦截器：401 → 清除状态
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      // 不在此处 dispatch，避免循环依赖；调用方或 ProtectedRoute 处理
    }
    return Promise.reject(error);
  },
);

// ========== Auth API ==========
export const authAPI = {
  install: (installationId: number, code: string) =>
    api.post<AuthResponse>('/auth/install', { installationId, code }),

  me: () => api.get<{ id: string; githubId: number; login: string; avatarUrl: string; email?: string }>('/auth/me'),
};

// ========== Reviews API ==========
export const reviewsAPI = {
  list: (params?: ReviewFilters) =>
    api.get<ReviewListResponse>('/reviews', { params }),

  detail: (id: string) =>
    api.get<Review>(`/reviews/${id}`),

  create: (prUrl: string) =>
    api.post<CreateReviewResponse>('/reviews', { prUrl }),
};

export default api;
```

- [ ] **Step 2: Commit**

```bash
git add frontEnd/src/shared/services/api.ts
git commit -m "feat:封装Axios实例与JWT拦截器"
```

---

### Task 1.3: Redux Store — authSlice + uiSlice

**Files:**
- Create: `frontEnd/src/store/modules/authSlice.ts`
- Create: `frontEnd/src/store/modules/uiSlice.ts`
- Create: `frontEnd/src/store/index.ts`

- [ ] **Step 1: 创建 authSlice**

```typescript
import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { AuthUser } from '@/types';

interface AuthState {
  user: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
}

const initialState: AuthState = {
  user: null,
  token: localStorage.getItem('token'),
  isAuthenticated: !!localStorage.getItem('token'),
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setAuth(state, action: PayloadAction<{ user: AuthUser; token: string }>) {
      state.user = action.payload.user;
      state.token = action.payload.token;
      state.isAuthenticated = true;
      localStorage.setItem('token', action.payload.token);
    },
    clearAuth(state) {
      state.user = null;
      state.token = null;
      state.isAuthenticated = false;
      localStorage.removeItem('token');
    },
    setUser(state, action: PayloadAction<AuthUser>) {
      state.user = action.payload;
      state.isAuthenticated = true;
    },
  },
});

export const { setAuth, clearAuth, setUser } = authSlice.actions;
export default authSlice.reducer;
```

- [ ] **Step 2: 测试 authSlice**

```bash
cd frontEnd && npx vitest run --reporter=verbose 2>&1 | head -20
```

创建测试文件 `frontEnd/src/store/modules/__tests__/authSlice.test.ts`:

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import authReducer, { setAuth, clearAuth, setUser } from '../authSlice';

describe('authSlice', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('初始状态 token 从 localStorage 读取', () => {
    localStorage.setItem('token', 'existing-token');
    const state = authReducer(undefined, { type: '@@INIT' });
    expect(state.token).toBe('existing-token');
    expect(state.isAuthenticated).toBe(true);
  });

  it('setAuth 更新 user/token/isAuthenticated 并写入 localStorage', () => {
    const state = authReducer(
      { user: null, token: null, isAuthenticated: false },
      setAuth({ user: { id: '1', login: 'test', avatarUrl: 'https://a.com/1.png' }, token: 'jwt-abc' })
    );
    expect(state.user?.login).toBe('test');
    expect(state.token).toBe('jwt-abc');
    expect(state.isAuthenticated).toBe(true);
    expect(localStorage.getItem('token')).toBe('jwt-abc');
  });

  it('clearAuth 清除所有状态和 localStorage', () => {
    localStorage.setItem('token', 'existing');
    const state = authReducer(
      { user: { id: '1', login: 'test', avatarUrl: 'https://a.com/1.png' }, token: 'existing', isAuthenticated: true },
      clearAuth()
    );
    expect(state.user).toBeNull();
    expect(state.token).toBeNull();
    expect(state.isAuthenticated).toBe(false);
    expect(localStorage.getItem('token')).toBeNull();
  });

  it('setUser 仅更新用户信息但保持认证状态', () => {
    const state = authReducer(
      { user: null, token: null, isAuthenticated: false },
      setUser({ id: '2', login: 'newuser', avatarUrl: 'https://a.com/2.png' })
    );
    expect(state.user?.login).toBe('newuser');
    expect(state.isAuthenticated).toBe(true);
  });
});
```

Run: `cd frontEnd && npx vitest run src/store/modules/__tests__/authSlice.test.ts`
Expected: 4 tests PASS

- [ ] **Step 3: 创建 uiSlice**

```typescript
import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

interface UIState {
  sidebarExpanded: boolean;
  currentReviewId: string | null;
}

const initialState: UIState = {
  sidebarExpanded: false,
  currentReviewId: null,
};

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    setSidebarExpanded(state, action: PayloadAction<boolean>) {
      state.sidebarExpanded = action.payload;
    },
    setCurrentReviewId(state, action: PayloadAction<string | null>) {
      state.currentReviewId = action.payload;
    },
  },
});

export const { setSidebarExpanded, setCurrentReviewId } = uiSlice.actions;
export default uiSlice.reducer;
```

- [ ] **Step 4: 测试 uiSlice**

创建 `frontEnd/src/store/modules/__tests__/uiSlice.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import uiReducer, { setSidebarExpanded, setCurrentReviewId } from '../uiSlice';

describe('uiSlice', () => {
  it('初始状态 sidebarExpanded 为 false', () => {
    const state = uiReducer(undefined, { type: '@@INIT' });
    expect(state.sidebarExpanded).toBe(false);
    expect(state.currentReviewId).toBeNull();
  });

  it('setSidebarExpanded 切换侧边栏展开状态', () => {
    const state = uiReducer({ sidebarExpanded: false, currentReviewId: null }, setSidebarExpanded(true));
    expect(state.sidebarExpanded).toBe(true);
  });

  it('setCurrentReviewId 更新当前评审 ID', () => {
    const state = uiReducer({ sidebarExpanded: false, currentReviewId: null }, setCurrentReviewId('abc123'));
    expect(state.currentReviewId).toBe('abc123');
  });

  it('setCurrentReviewId 支持设为 null', () => {
    const state = uiReducer({ sidebarExpanded: false, currentReviewId: 'abc123' }, setCurrentReviewId(null));
    expect(state.currentReviewId).toBeNull();
  });
});
```

Run: `cd frontEnd && npx vitest run src/store/modules/__tests__/uiSlice.test.ts`
Expected: 4 tests PASS

- [ ] **Step 5: 创建 store/index.ts**

```typescript
import { configureStore } from '@reduxjs/toolkit';
import authReducer from './modules/authSlice';
import uiReducer from './modules/uiSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    ui: uiReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
```

- [ ] **Step 6: Commit**

```bash
git add frontEnd/src/store/ frontEnd/src/store/modules/__tests__/
git commit -m "feat:实现Redux authSlice+uiSlice及单元测试"
```

---

### Task 1.4: AppLayout + Sidebar + ProtectedRoute

**Files:**
- Create: `frontEnd/src/shared/components/Sidebar.tsx`
- Create: `frontEnd/src/shared/components/AppLayout.tsx`
- Create: `frontEnd/src/shared/components/ProtectedRoute.tsx`
- Create: `frontEnd/src/shared/components/LoadingSpinner.tsx`
- Create: `frontEnd/src/shared/hooks/useAuth.ts`

- [ ] **Step 1: 调用 ant-design 技能获取组件/图标选型指导**

```
Skill: ant-design
Task: 查询 Ant Design 6.x 暗黑主题 ConfigProvider 配置、玻璃态 token、Sidebar 可用的 Layout/Menu 组件、图标名称映射
```

- [ ] **Step 2: 创建 useAuth hook**

```typescript
import { useSelector } from 'react-redux';
import type { RootState } from '@/store';

export function useAuth() {
  const { user, token, isAuthenticated } = useSelector((state: RootState) => state.auth);
  return { user, token, isAuthenticated };
}
```

- [ ] **Step 3: 创建 Sidebar**

```typescript
import { useNavigate, useLocation } from 'react-router-dom';
import { Menu } from 'antd';
import {
  HomeOutlined,
  UnorderedListOutlined,
  GithubOutlined,
} from '@ant-design/icons';
import { useAuth } from '../hooks/useAuth';
import { useDispatch, useSelector } from 'react-redux';
import { setSidebarExpanded } from '@/store/modules/uiSlice';
import type { RootState } from '@/store';

export default function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated } = useAuth();
  const expanded = useSelector((state: RootState) => state.ui.sidebarExpanded);
  const dispatch = useDispatch();

  if (!isAuthenticated) return null;

  const menuItems = [
    { key: '/', icon: <HomeOutlined />, label: '主页' },
    { key: '/pr-list', icon: <UnorderedListOutlined />, label: 'PR 列表' },
  ];

  const selectedKey = menuItems.find((item) =>
    item.key === '/' ? location.pathname === '/' : location.pathname.startsWith(item.key)
  )?.key || '/';

  return (
    <div
      style={{
        position: 'fixed',
        left: 0,
        top: 0,
        bottom: 0,
        zIndex: 1000,
        width: expanded ? 200 : 64,
        transition: 'width 0.2s ease',
        background: 'rgba(20, 20, 30, 0.9)',
        backdropFilter: 'blur(12px)',
        borderRight: '1px solid rgba(255,255,255,0.06)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
      onMouseEnter={() => dispatch(setSidebarExpanded(true))}
      onMouseLeave={() => dispatch(setSidebarExpanded(false))}
    >
      <div style={{
        height: 64,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        color: '#fff',
      }}>
        <GithubOutlined style={{ fontSize: 24 }} />
        {expanded && <span style={{ marginLeft: 10, fontWeight: 600, whiteSpace: 'nowrap' }}>PR Viewer</span>}
      </div>
      <Menu
        mode="inline"
        selectedKeys={[selectedKey]}
        inlineCollapsed={!expanded}
        items={menuItems}
        onClick={({ key }) => navigate(key)}
        style={{
          background: 'transparent',
          borderInlineEnd: 'none',
          marginTop: 8,
        }}
        theme="dark"
      />
    </div>
  );
}
```

- [ ] **Step 4: 创建 AppLayout**

```typescript
import { Outlet } from 'react-router-dom';
import { Layout } from 'antd';
import Sidebar from './Sidebar';

const { Content } = Layout;

export default function AppLayout() {
  return (
    <Layout style={{ minHeight: '100vh', background: 'transparent' }}>
      <Sidebar />
      <Layout style={{ marginLeft: 64, background: 'transparent' }}>
        <Content style={{ padding: 24, minHeight: '100vh' }}>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
}
```

- [ ] **Step 5: 创建 ProtectedRoute**

```typescript
import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
```

- [ ] **Step 6: 创建 LoadingSpinner**

```typescript
import { Spin } from 'antd';

export default function LoadingSpinner({ tip = '加载中...' }: { tip?: string }) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 300,
    }}>
      <Spin size="large" tip={tip}>
        <div style={{ padding: 50 }} />
      </Spin>
    </div>
  );
}
```

- [ ] **Step 7: Commit**

```bash
git add frontEnd/src/shared/components/ frontEnd/src/shared/hooks/useAuth.ts
git commit -m "feat:实现AppLayout侧边栏布局与路由守卫"
```

---

### Task 1.5: React Query Provider + Hooks

**Files:**
- Create: `frontEnd/src/shared/hooks/useReviews.ts`

- [ ] **Step 1: 创建 React Query hooks**

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { reviewsAPI, authAPI } from '@/shared/services/api';
import type { ReviewFilters, CreateReviewResponse } from '@/types';
import { useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { setAuth, clearAuth } from '@/store/modules/authSlice';

// 获取评审列表
export function useReviewList(params?: ReviewFilters) {
  return useQuery({
    queryKey: ['reviews', params],
    queryFn: () => reviewsAPI.list(params).then((res) => res.data),
    staleTime: 30_000,
  });
}

// 获取评审详情（含轮询）
export function useReviewDetail(id: string | undefined) {
  return useQuery({
    queryKey: ['reviews', id],
    queryFn: () => reviewsAPI.detail(id!).then((res) => res.data),
    enabled: !!id,
    refetchInterval: (query) => {
      const data = query.state.data;
      if (!data) return 3000;
      if (data.status === 'completed' || data.status === 'failed') return false;
      return 3000;
    },
  });
}

// 创建评审
export function useCreateReview() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  return useMutation({
    mutationFn: (prUrl: string) => reviewsAPI.create(prUrl).then((res) => res.data),
    onSuccess: (data: CreateReviewResponse) => {
      queryClient.invalidateQueries({ queryKey: ['reviews'] });
      navigate(`/review/${data.id}`);
    },
  });
}

// 验证当前用户
export function useAuthUser() {
  const dispatch = useDispatch();

  return useQuery({
    queryKey: ['auth', 'me'],
    queryFn: () => authAPI.me().then((res) => res.data),
    staleTime: 5 * 60_000,
    retry: false,
    meta: {
      onSuccess: (data: { id: string; login: string; avatarUrl: string }) => {
        dispatch(setAuth({ user: data, token: localStorage.getItem('token') || '' }));
      },
      onError: () => {
        dispatch(clearAuth());
      },
    },
  });
}

// GitHub App 安装
export function useInstall() {
  const dispatch = useDispatch();

  return useMutation({
    mutationFn: ({ installationId, code }: { installationId: number; code: string }) =>
      authAPI.install(installationId, code).then((res) => res.data),
    onSuccess: (data) => {
      dispatch(setAuth({ user: data.user, token: data.token }));
    },
  });
}
```

- [ ] **Step 2: Commit**

```bash
git add frontEnd/src/shared/hooks/useReviews.ts
git commit -m "feat:实现React Query hooks含3s轮询逻辑"
```

---

## Phase 2: 主页模块

**父分支:** `feat/frontend-shared-infra` (Phase 1)

### Task 2.0: 创建分支

- [ ] **Step 0: 创建 Phase 2 分支**

```bash
git checkout -b feat/frontend-home feat/frontend-shared-infra
```

---

### Task 2.1: WelcomeHero 组件

**Files:**
- Create: `frontEnd/src/modules/home/components/WelcomeHero.tsx`
- Create: `frontEnd/src/modules/home/components/__tests__/WelcomeHero.test.tsx`

- [ ] **Step 1: 写测试**

```typescript
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import WelcomeHero from '../WelcomeHero';

// 需要先安装 @testing-library/react
```

实际测试先跳过（需先安装 testing-library），直接实现组件。

- [ ] **Step 2: 实现 WelcomeHero**

```typescript
import { Button, Typography } from 'antd';
import { GithubOutlined } from '@ant-design/icons';

const { Title, Paragraph } = Typography;

export default function WelcomeHero() {
  const handleLogin = () => {
    // GitHub App 安装 URL — 根据实际 GitHub App 配置调整
    const githubAppName = import.meta.env.VITE_GITHUB_APP_NAME || 'ai-pr-viewer';
    window.location.href = `https://github.com/apps/${githubAppName}/installations/new`;
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 'calc(100vh - 200px)',
      textAlign: 'center',
    }}>
      <Title level={1} style={{ fontSize: 48, marginBottom: 16, color: '#fff', letterSpacing: 2 }}>
        PR Viewer
      </Title>
      <Paragraph style={{ fontSize: 18, color: 'rgba(255,255,255,0.55)', marginBottom: 40, maxWidth: 480 }}>
        AI 驱动的代码评审工具 — 粘贴 PR 链接，即刻获取专业 Review 建议
      </Paragraph>
      <Button
        type="primary"
        size="large"
        icon={<GithubOutlined />}
        onClick={handleLogin}
        style={{ height: 48, paddingInline: 32, fontSize: 16, borderRadius: 8 }}
      >
        Login with GitHub
      </Button>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add frontEnd/src/modules/home/components/WelcomeHero.tsx
git commit -m "feat:实现WelcomeHero未登录欢迎页"
```

---

### Task 2.2: Dashboard + StatsCards + PRUrlInput + RecentReviews

**Files:**
- Create: `frontEnd/src/modules/home/components/Dashboard.tsx`
- Create: `frontEnd/src/modules/home/components/StatsCards.tsx`
- Create: `frontEnd/src/modules/home/components/PRUrlInput.tsx`
- Create: `frontEnd/src/modules/home/components/RecentReviews.tsx`
- Create: `frontEnd/src/modules/home/hooks/useDashboard.ts`
- Create: `frontEnd/src/modules/home/styles/home.css`

- [ ] **Step 1: 创建 useDashboard hook**

```typescript
import { useReviewList } from '@/shared/hooks/useReviews';

export function useDashboard() {
  const recentReviews = useReviewList({ page: 1, limit: 5 });
  const allReviews = useReviewList({ page: 1, limit: 1 });

  const totalCount = allReviews.data?.pagination.total ?? 0;
  const highRiskCount = recentReviews.data?.data.filter((r) => r.summary?.riskLevel === 'high').length ?? 0;
  const mediumRiskCount = recentReviews.data?.data.filter((r) => r.summary?.riskLevel === 'medium').length ?? 0;
  const lowRiskCount = recentReviews.data?.data.filter((r) => r.summary?.riskLevel === 'low').length ?? 0;

  return {
    totalCount,
    highRiskCount,
    mediumRiskCount,
    lowRiskCount,
    recentReviews: recentReviews.data?.data ?? [],
    isLoading: recentReviews.isLoading,
    error: recentReviews.error,
  };
}
```

- [ ] **Step 2: 创建 StatsCards**

```typescript
import { Card, Col, Row, Statistic, Skeleton } from 'antd';
import { AlertOutlined, SafetyCertificateOutlined, AuditOutlined, WarningOutlined } from '@ant-design/icons';

interface StatsCardsProps {
  totalCount: number;
  highRiskCount: number;
  mediumRiskCount: number;
  lowRiskCount: number;
  isLoading: boolean;
}

export default function StatsCards({ totalCount, highRiskCount, mediumRiskCount, lowRiskCount, isLoading }: StatsCardsProps) {
  if (isLoading) {
    return (
      <Row gutter={16} style={{ marginBottom: 24 }}>
        {[1, 2, 3, 4].map((i) => (
          <Col xs={12} sm={6} key={i}>
            <Card><Skeleton active paragraph={{ rows: 1 }} /></Card>
          </Col>
        ))}
      </Row>
    );
  }

  const stats = [
    { title: '总评审数', value: totalCount, icon: <AuditOutlined />, color: '#4fc3f7' },
    { title: '高风险', value: highRiskCount, icon: <AlertOutlined />, color: '#ff5252' },
    { title: '中风险', value: mediumRiskCount, icon: <WarningOutlined />, color: '#ff9800' },
    { title: '低风险', value: lowRiskCount, icon: <SafetyCertificateOutlined />, color: '#4caf50' },
  ];

  return (
    <Row gutter={16} style={{ marginBottom: 24 }}>
      {stats.map((s) => (
        <Col xs={12} sm={6} key={s.title}>
          <Card
            style={{
              background: 'rgba(255,255,255,0.04)',
              backdropFilter: 'blur(8px)',
              border: '1px solid rgba(255,255,255,0.06)',
              borderRadius: 10,
            }}
          >
            <Statistic
              title={<span style={{ color: 'rgba(255,255,255,0.55)', fontSize: 12 }}>{s.title}</span>}
              value={s.value}
              valueStyle={{ color: s.color, fontSize: 28, fontWeight: 700 }}
              prefix={s.icon}
            />
          </Card>
        </Col>
      ))}
    </Row>
  );
}
```

- [ ] **Step 3: 创建 PRUrlInput**

```typescript
import { useState } from 'react';
import { Input, Button, message } from 'antd';
import { SendOutlined, LinkOutlined } from '@ant-design/icons';
import { useCreateReview } from '@/shared/hooks/useReviews';

export default function PRUrlInput() {
  const [prUrl, setPrUrl] = useState('');
  const createReview = useCreateReview();

  const handleAnalyze = () => {
    const trimmed = prUrl.trim();
    if (!trimmed) {
      message.warning('请输入 GitHub PR URL');
      return;
    }
    if (!trimmed.match(/^https:\/\/github\.com\/[\w.-]+\/[\w.-]+\/pull\/\d+/)) {
      message.error('无效的 GitHub PR URL，格式: https://github.com/owner/repo/pull/123');
      return;
    }
    createReview.mutate(trimmed);
  };

  return (
    <Card
      style={{
        background: 'rgba(255,255,255,0.04)',
        backdropFilter: 'blur(8px)',
        border: '1px solid rgba(255,255,255,0.06)',
        borderRadius: 10,
        marginBottom: 24,
      }}
    >
      <div style={{ fontSize: 14, fontWeight: 600, color: 'rgba(255,255,255,0.85)', marginBottom: 12 }}>
        <LinkOutlined style={{ marginRight: 8 }} />
        开始新的代码评审
      </div>
      <Input.Group compact style={{ display: 'flex' }}>
        <Input
          style={{ flex: 1 }}
          size="large"
          placeholder="粘贴 GitHub PR URL，例如 https://github.com/owner/repo/pull/123"
          value={prUrl}
          onChange={(e) => setPrUrl(e.target.value)}
          onPressEnter={handleAnalyze}
        />
        <Button
          type="primary"
          size="large"
          icon={<SendOutlined />}
          onClick={handleAnalyze}
          loading={createReview.isPending}
          style={{ borderRadius: '0 8px 8px 0' }}
        >
          分析
        </Button>
      </Input.Group>
    </Card>
  );
}
```

注意：需要在 PRUrlInput.tsx 顶部添加 `import { Card } from 'antd';`

- [ ] **Step 4: 创建 RecentReviews**

```typescript
import { useNavigate } from 'react-router-dom';
import { List, Card, Tag, Typography, Empty, Skeleton } from 'antd';
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  LoadingOutlined,
  ClockCircleOutlined,
} from '@ant-design/icons';
import type { Review } from '@/types';

const { Text } = Typography;

const statusConfig: Record<string, { color: string; icon: React.ReactNode; label: string }> = {
  completed: { color: '#4caf50', icon: <CheckCircleOutlined />, label: '已完成' },
  failed: { color: '#ff5252', icon: <CloseCircleOutlined />, label: '失败' },
  analyzing: { color: '#ff9800', icon: <LoadingOutlined />, label: '分析中' },
  pending: { color: '#9e9e9e', icon: <ClockCircleOutlined />, label: '等待中' },
};

const riskConfig: Record<string, { color: string; label: string }> = {
  high: { color: '#ff5252', label: '高风险' },
  medium: { color: '#ff9800', label: '中风险' },
  low: { color: '#4caf50', label: '低风险' },
};

interface RecentReviewsProps {
  reviews: Review[];
  isLoading: boolean;
}

export default function RecentReviews({ reviews, isLoading }: RecentReviewsProps) {
  const navigate = useNavigate();

  if (isLoading) {
    return <Card style={{ background: 'rgba(255,255,255,0.04)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10 }}><Skeleton active paragraph={{ rows: 4 }} /></Card>;
  }

  return (
    <Card
      title={<span style={{ color: 'rgba(255,255,255,0.85)' }}>最近评审</span>}
      style={{
        background: 'rgba(255,255,255,0.04)',
        backdropFilter: 'blur(8px)',
        border: '1px solid rgba(255,255,255,0.06)',
        borderRadius: 10,
      }}
    >
      {reviews.length === 0 ? (
        <Empty description={<span style={{ color: 'rgba(255,255,255,0.45)' }}>暂无评审记录</span>} />
      ) : (
        <List
          dataSource={reviews}
          renderItem={(review) => {
            const pr = typeof review.prId === 'object' ? review.prId : null;
            const status = statusConfig[review.status] || statusConfig.pending;
            const risk = review.summary ? riskConfig[review.summary.riskLevel] : null;

            return (
              <List.Item
                style={{ cursor: 'pointer', padding: '12px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}
                onClick={() => navigate(`/review/${review._id}`)}
              >
                <List.Item.Meta
                  title={<Text style={{ color: '#e0e0e0' }}>{pr?.title || `PR #${pr?.pullNumber || '?'}`}</Text>}
                  description={
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 4 }}>
                      <Tag color={status.color} icon={status.icon}>{status.label}</Tag>
                      {risk && <Tag color={risk.color}>{risk.label}</Tag>}
                      {review.summary && (
                        <Text style={{ color: risk?.color, fontWeight: 700, fontSize: 13 }}>
                          {review.summary.score}/100
                        </Text>
                      )}
                    </div>
                  }
                />
              </List.Item>
            );
          }}
        />
      )}
    </Card>
  );
}
```

- [ ] **Step 5: 创建 Dashboard**

```typescript
import { Alert } from 'antd';
import { useAuth } from '@/shared/hooks/useAuth';
import { useDashboard } from '../hooks/useDashboard';
import StatsCards from './StatsCards';
import PRUrlInput from './PRUrlInput';
import RecentReviews from './RecentReviews';

export default function Dashboard() {
  const { user } = useAuth();
  const { totalCount, highRiskCount, mediumRiskCount, lowRiskCount, recentReviews, isLoading, error } = useDashboard();

  return (
    <div style={{ maxWidth: 960, margin: '0 auto' }}>
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ color: '#fff', margin: 0, fontSize: 24, fontWeight: 600 }}>
          欢迎回来{user ? `，${user.login}` : ''}
        </h2>
      </div>

      <StatsCards
        totalCount={totalCount}
        highRiskCount={highRiskCount}
        mediumRiskCount={mediumRiskCount}
        lowRiskCount={lowRiskCount}
        isLoading={isLoading}
      />

      <PRUrlInput />

      {error && (
        <Alert
          type="error"
          message="加载失败"
          description={(error as Error).message}
          style={{ marginBottom: 16 }}
          showIcon
        />
      )}

      <RecentReviews reviews={recentReviews} isLoading={isLoading} />
    </div>
  );
}
```

- [ ] **Step 6: Commit**

```bash
git add frontEnd/src/modules/home/
git commit -m "feat:实现主页Dashboard含统计卡片/PR输入/最近评审"
```

---

## Phase 3: PR 列表模块

**父分支:** `feat/frontend-shared-infra` (Phase 1)

### Task 3.0: 创建分支

- [ ] **Step 0: 创建 Phase 3 分支**

```bash
git checkout -b feat/frontend-pr-list feat/frontend-shared-infra
```

---

### Task 3.1: PRListPage + StatusFilter + ReviewTable

**Files:**
- Create: `frontEnd/src/modules/pr-list/components/PRListPage.tsx`
- Create: `frontEnd/src/modules/pr-list/components/StatusFilter.tsx`
- Create: `frontEnd/src/modules/pr-list/components/ReviewTable.tsx`
- Create: `frontEnd/src/modules/pr-list/hooks/usePRList.ts`
- Create: `frontEnd/src/modules/pr-list/styles/pr-list.css`

- [ ] **Step 1: 创建 usePRList hook**

```typescript
import { useState } from 'react';
import { useReviewList } from '@/shared/hooks/useReviews';
import type { ReviewStatus } from '@/types';

export function usePRList() {
  const [statusFilter, setStatusFilter] = useState<ReviewStatus | undefined>(undefined);
  const [page, setPage] = useState(1);

  const { data, isLoading, error } = useReviewList({
    status: statusFilter,
    page,
    limit: 20,
  });

  return {
    reviews: data?.data ?? [],
    pagination: data?.pagination ?? { page: 1, limit: 20, total: 0, totalPages: 0 },
    statusFilter,
    setStatusFilter: (status: ReviewStatus | undefined) => {
      setStatusFilter(status);
      setPage(1);
    },
    page,
    setPage,
    isLoading,
    error,
  };
}
```

- [ ] **Step 2: 创建 StatusFilter**

```typescript
import { Segmented } from 'antd';
import type { ReviewStatus } from '@/types';

interface StatusFilterProps {
  value: ReviewStatus | undefined;
  onChange: (status: ReviewStatus | undefined) => void;
}

export default function StatusFilter({ value, onChange }: StatusFilterProps) {
  return (
    <div style={{ marginBottom: 16 }}>
      <Segmented
        value={value ?? 'all'}
        onChange={(val) => onChange(val === 'all' ? undefined : (val as ReviewStatus))}
        options={[
          { value: 'all', label: '全部' },
          { value: 'pending', label: '等待中' },
          { value: 'analyzing', label: '分析中' },
          { value: 'completed', label: '已完成' },
          { value: 'failed', label: '失败' },
        ]}
        style={{
          background: 'rgba(255,255,255,0.05)',
        }}
      />
    </div>
  );
}
```

- [ ] **Step 3: 创建 ReviewTable**

```typescript
import { useNavigate } from 'react-router-dom';
import { Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  LoadingOutlined,
  ClockCircleOutlined,
} from '@ant-design/icons';
import type { Review } from '@/types';

const statusConfig: Record<string, { color: string; icon: React.ReactNode; label: string }> = {
  completed: { color: 'green', icon: <CheckCircleOutlined />, label: '已完成' },
  failed: { color: 'red', icon: <CloseCircleOutlined />, label: '失败' },
  analyzing: { color: 'orange', icon: <LoadingOutlined />, label: '分析中' },
  pending: { color: 'default', icon: <ClockCircleOutlined />, label: '等待中' },
};

const riskConfig: Record<string, { color: string; label: string }> = {
  high: { color: 'red', label: '高风险' },
  medium: { color: 'orange', label: '中风险' },
  low: { color: 'green', label: '低风险' },
};

interface ReviewTableProps {
  reviews: Review[];
  isLoading: boolean;
  page: number;
  total: number;
  onPageChange: (page: number) => void;
}

export default function ReviewTable({ reviews, isLoading, page, total, onPageChange }: ReviewTableProps) {
  const navigate = useNavigate();

  const columns: ColumnsType<Review> = [
    {
      title: 'PR 标题',
      dataIndex: 'prId',
      key: 'title',
      render: (prId: Review['prId']) => {
        if (typeof prId === 'object' && prId !== null) {
          return <span style={{ color: '#4fc3f7', cursor: 'pointer' }}>{prId.title}</span>;
        }
        return <span style={{ color: '#888' }}>—</span>;
      },
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: string) => {
        const cfg = statusConfig[status] || statusConfig.pending;
        return <Tag color={cfg.color} icon={cfg.icon}>{cfg.label}</Tag>;
      },
    },
    {
      title: '风险',
      key: 'risk',
      width: 90,
      render: (_, record: Review) => {
        if (!record.summary) return <span style={{ color: '#666' }}>—</span>;
        const cfg = riskConfig[record.summary.riskLevel];
        return <Tag color={cfg?.color}>{cfg?.label}</Tag>;
      },
    },
    {
      title: '评分',
      key: 'score',
      width: 80,
      render: (_, record: Review) => {
        if (!record.summary) return <span style={{ color: '#666' }}>—</span>;
        const color = record.summary.score >= 80 ? '#4caf50' : record.summary.score >= 60 ? '#ff9800' : '#ff5252';
        return <span style={{ color, fontWeight: 700, fontSize: 15 }}>{record.summary.score}</span>;
      },
    },
    {
      title: '时间',
      dataIndex: 'createdAt',
      key: 'time',
      width: 140,
      render: (val: string) => {
        const date = new Date(val);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffHrs = Math.floor(diffMs / 3600000);
        if (diffHrs < 1) return '刚刚';
        if (diffHrs < 24) return `${diffHrs}h 前`;
        return `${Math.floor(diffHrs / 24)}d 前`;
      },
    },
  ];

  return (
    <Table<Review>
      columns={columns}
      dataSource={reviews}
      rowKey="_id"
      loading={isLoading}
      pagination={{
        current: page,
        pageSize: 20,
        total,
        onChange: onPageChange,
        showSizeChanger: false,
      }}
      onRow={(record) => ({
        onClick: () => navigate(`/review/${record._id}`),
        style: { cursor: 'pointer' },
      })}
      locale={{ emptyText: '暂无评审记录' }}
    />
  );
}
```

- [ ] **Step 4: 创建 PRListPage**

```typescript
import { Alert } from 'antd';
import { usePRList } from '../hooks/usePRList';
import StatusFilter from './StatusFilter';
import ReviewTable from './ReviewTable';

export default function PRListPage() {
  const { reviews, pagination, statusFilter, setStatusFilter, page, setPage, isLoading, error } = usePRList();

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto' }}>
      <h2 style={{ color: '#fff', marginBottom: 24, fontSize: 24, fontWeight: 600 }}>PR 评审列表</h2>

      <StatusFilter value={statusFilter} onChange={setStatusFilter} />

      {error && (
        <Alert
          type="error"
          message="加载失败"
          description={(error as Error).message}
          style={{ marginBottom: 16 }}
          showIcon
        />
      )}

      <ReviewTable
        reviews={reviews}
        isLoading={isLoading}
        page={page}
        total={pagination.total}
        onPageChange={setPage}
      />
    </div>
  );
}
```

- [ ] **Step 5: Commit**

```bash
git add frontEnd/src/modules/pr-list/
git commit -m "feat:实现PR列表页含状态过滤和分页表格"
```

---

## Phase 4: 分析报告模块

**父分支:** `feat/frontend-shared-infra` (Phase 1)

### Task 4.0: 创建分支

- [ ] **Step 0: 创建 Phase 4 分支**

```bash
git checkout -b feat/frontend-review feat/frontend-shared-infra
```

---

### Task 4.1: usePolling + useReviewDetail hooks

**Files:**
- Create: `frontEnd/src/modules/review/hooks/usePolling.ts`
- Create: `frontEnd/src/modules/review/hooks/useReviewDetail.ts`

- [ ] **Step 1: 创建 usePolling**

```typescript
import { useEffect, useRef, useState } from 'react';

export function usePolling(startedAt?: string) {
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!startedAt) return;

    const start = new Date(startedAt).getTime();
    setElapsedSeconds(Math.floor((Date.now() - start) / 1000));

    intervalRef.current = setInterval(() => {
      setElapsedSeconds(Math.floor((Date.now() - start) / 1000));
    }, 1000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [startedAt]);

  const formatElapsed = () => {
    const mins = Math.floor(elapsedSeconds / 60);
    const secs = elapsedSeconds % 60;
    if (mins > 0) return `${mins} 分 ${secs} 秒`;
    return `${secs} 秒`;
  };

  return { elapsedSeconds, formattedElapsed: formatElapsed() };
}
```

- [ ] **Step 2: 创建 useReviewDetail (封装逻辑)**

```typescript
import { useParams } from 'react-router-dom';
import { useReviewDetail as useReviewDetailQuery } from '@/shared/hooks/useReviews';

export function useReviewDetailData() {
  const { id } = useParams<{ id: string }>();
  const query = useReviewDetailQuery(id);

  return {
    review: query.data ?? null,
    isLoading: query.isLoading,
    error: query.error,
    reviewId: id,
  };
}
```

- [ ] **Step 3: Commit**

```bash
git add frontEnd/src/modules/review/hooks/
git commit -m "feat:实现轮询hook和评审详情数据hook"
```

---

### Task 4.2: ReviewPage + PRInfoBar + PollingIndicator

**Files:**
- Create: `frontEnd/src/modules/review/components/ReviewPage.tsx`
- Create: `frontEnd/src/modules/review/components/PRInfoBar.tsx`
- Create: `frontEnd/src/modules/review/components/PollingIndicator.tsx`

- [ ] **Step 1: 创建 PRInfoBar**

```typescript
import { Avatar, Tag } from 'antd';
import { BranchesOutlined } from '@ant-design/icons';
import type { PullRequest } from '@/types';

interface PRInfoBarProps {
  pr?: PullRequest | null;
}

export default function PRInfoBar({ pr }: PRInfoBarProps) {
  if (!pr) return null;

  return (
    <div style={{
      background: 'rgba(255,255,255,0.04)',
      backdropFilter: 'blur(8px)',
      border: '1px solid rgba(255,255,255,0.06)',
      borderRadius: 10,
      padding: '14px 20px',
      marginBottom: 20,
      display: 'flex',
      alignItems: 'center',
      gap: 16,
    }}>
      <Avatar src={pr.author.avatarUrl} size={36} />
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 16, fontWeight: 600, color: '#e0e0e0', marginBottom: 4 }}>
          {pr.title}
        </div>
        <div style={{ display: 'flex', gap: 16, fontSize: 12, color: '#888' }}>
          <span>{pr.author.login}</span>
          <span>
            <BranchesOutlined style={{ marginRight: 4 }} />
            {pr.baseBranch} ← {pr.headBranch}
          </span>
        </div>
      </div>
      <Tag color={pr.state === 'open' ? 'green' : pr.state === 'merged' ? 'purple' : 'default'}>
        {pr.state}
      </Tag>
    </div>
  );
}
```

- [ ] **Step 2: 创建 PollingIndicator**

```typescript
import { Spin } from 'antd';
import { LoadingOutlined } from '@ant-design/icons';
import { usePolling } from '../hooks/usePolling';

interface PollingIndicatorProps {
  status: 'pending' | 'analyzing';
  startedAt?: string;
}

export default function PollingIndicator({ status, startedAt }: PollingIndicatorProps) {
  const { formattedElapsed } = usePolling(startedAt);

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 300,
      gap: 16,
    }}>
      <Spin indicator={<LoadingOutlined style={{ fontSize: 48 }} spin />} />
      <div style={{ color: 'rgba(255,255,255,0.85)', fontSize: 16, fontWeight: 500 }}>
        {status === 'pending' ? '排队中...' : 'AI 分析进行中...'}
      </div>
      <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: 13 }}>
        已等待 {formattedElapsed}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: 创建 ReviewPage**

```typescript
import { Tabs, Alert, Button, Result } from 'antd';
import { ReloadOutlined } from '@ant-design/icons';
import { useReviewDetailData } from '../hooks/useReviewDetail';
import PRInfoBar from './PRInfoBar';
import PollingIndicator from './PollingIndicator';
import OverviewTab from './OverviewTab';
import ChangesTab from './ChangesTab';

export default function ReviewPage() {
  const { review, isLoading, error } = useReviewDetailData();

  if (isLoading) {
    return (
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <PollingIndicator status="pending" />
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <Result
          status="error"
          title="加载失败"
          subTitle={(error as Error).message}
          extra={<Button icon={<ReloadOutlined />} onClick={() => window.location.reload()}>重试</Button>}
        />
      </div>
    );
  }

  if (!review) {
    return (
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <Result status="404" title="评审未找到" subTitle="该评审记录不存在或已被删除" />
      </div>
    );
  }

  const pr = typeof review.prId === 'object' ? review.prId : null;

  // pending / analyzing → 轮询中
  if (review.status === 'pending' || review.status === 'analyzing') {
    return (
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <PRInfoBar pr={pr} />
        <PollingIndicator status={review.status} startedAt={review.startedAt} />
      </div>
    );
  }

  // failed
  if (review.status === 'failed') {
    return (
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <PRInfoBar pr={pr} />
        <Result
          status="error"
          title="分析失败"
          subTitle={review.errorMessage || '未知错误'}
          extra={<Button type="primary" icon={<ReloadOutlined />}>重新分析</Button>}
        />
      </div>
    );
  }

  // completed
  const tabItems = [
    {
      key: 'overview',
      label: '总览',
      children: <OverviewTab review={review} />,
    },
    {
      key: 'changes',
      label: '具体变更',
      children: <ChangesTab review={review} />,
    },
  ];

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto' }}>
      <PRInfoBar pr={pr} />
      <Tabs
        defaultActiveKey="overview"
        items={tabItems}
        style={{ color: '#e0e0e0' }}
      />
    </div>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add frontEnd/src/modules/review/components/ReviewPage.tsx \
    frontEnd/src/modules/review/components/PRInfoBar.tsx \
    frontEnd/src/modules/review/components/PollingIndicator.tsx
git commit -m "feat:实现分析页主框架含轮询状态处理"
```

---

### Task 4.3: OverviewTab — CommitList + AISummary

**Files:**
- Create: `frontEnd/src/modules/review/components/OverviewTab.tsx`
- Create: `frontEnd/src/modules/review/components/CommitList.tsx`
- Create: `frontEnd/src/modules/review/components/AISummary.tsx`

- [ ] **Step 1: 创建 CommitList**

```typescript
import { Timeline, Typography, Empty } from 'antd';
import { CommitInfo } from '@/types';

const { Text } = Typography;

interface CommitListProps {
  commits?: CommitInfo[];
}

export default function CommitList({ commits }: CommitListProps) {
  if (!commits || commits.length === 0) {
    return <Empty description="暂无 commit 数据" />;
  }

  return (
    <div style={{ padding: 8 }}>
      <Timeline
        items={commits.map((commit, index) => ({
          color: index === 0 ? '#4fc3f7' : 'gray',
          children: (
            <div>
              <div style={{ color: index === 0 ? '#e0e0e0' : '#999', fontSize: 13, marginBottom: 4 }}>
                {commit.message}
              </div>
              <Text style={{ fontSize: 11, color: '#666' }}>
                {commit.sha.slice(0, 7)} · {commit.author.login}
              </Text>
            </div>
          ),
        }))}
      />
    </div>
  );
}
```

- [ ] **Step 2: 创建 AISummary**

```typescript
import { Badge, Card, Tag, Typography, List } from 'antd';
import type { Summary, Recommendation } from '@/types';
import { marked } from 'marked';
import hljs from 'highlight.js';

const { Text } = Typography;

// 配置 marked
marked.setOptions({
  highlight: (code, lang) => {
    if (lang && hljs.getLanguage(lang)) {
      return hljs.highlight(code, { language: lang }).value;
    }
    return hljs.highlightAuto(code).value;
  },
});

const riskConfig: Record<string, { color: string; label: string; badge: 'success' | 'warning' | 'error' }> = {
  high: { color: '#ff5252', label: '高风险', badge: 'error' },
  medium: { color: '#ff9800', label: '中风险', badge: 'warning' },
  low: { color: '#4caf50', label: '低风险', badge: 'success' },
};

const priorityConfig: Record<string, { color: string; label: string }> = {
  high: { color: '#ff5252', label: '高' },
  medium: { color: '#ff9800', label: '中' },
  low: { color: '#4caf50', label: '低' },
};

interface AISummaryProps {
  summary: Summary;
}

function MarkdownContent({ content }: { content: string }) {
  return (
    <div
      className="markdown-body"
      style={{ color: 'rgba(255,255,255,0.85)', lineHeight: 1.7 }}
      dangerouslySetInnerHTML={{ __html: marked.parse(content) as string }}
    />
  );
}

export default function AISummary({ summary }: AISummaryProps) {
  const risk = riskConfig[summary.riskLevel] || riskConfig.medium;

  return (
    <div>
      {/* 风险等级 + 评分 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
        <Badge status={risk.badge} text={<span style={{ color: risk.color, fontSize: 16, fontWeight: 600 }}>{risk.label}</span>} />
        <div style={{ fontSize: 40, fontWeight: 800, color: risk.color, lineHeight: 1 }}>
          {summary.score}
          <span style={{ fontSize: 16, color: '#666', fontWeight: 400 }}>/100</span>
        </div>
      </div>

      {/* 总体评价 */}
      <Card
        size="small"
        title="总体评价"
        style={{
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.06)',
          borderRadius: 8,
          marginBottom: 16,
        }}
      >
        <MarkdownContent content={summary.overview} />
      </Card>

      {/* 建议列表 */}
      <Card
        size="small"
        title={`建议 (${summary.recommendations.length})`}
        style={{
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.06)',
          borderRadius: 8,
        }}
      >
        <List
          dataSource={summary.recommendations}
          renderItem={(rec: Recommendation) => {
            const pri = priorityConfig[rec.priority];
            return (
              <List.Item style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                <List.Item.Meta
                  avatar={<Tag color={pri.color}>{pri.label}</Tag>}
                  title={<Text style={{ color: '#e0e0e0' }}>{rec.title}</Text>}
                  description={
                    <div>
                      <Tag style={{ marginBottom: 6 }}>{rec.category}</Tag>
                      <MarkdownContent content={rec.description} />
                    </div>
                  }
                />
              </List.Item>
            );
          }}
        />
      </Card>
    </div>
  );
}
```

- [ ] **Step 3: 创建 OverviewTab**

```typescript
import { Col, Row } from 'antd';
import type { Review, CommitInfo } from '@/types';
import CommitList from './CommitList';
import AISummary from './AISummary';

interface OverviewTabProps {
  review: Review;
}

export default function OverviewTab({ review }: OverviewTabProps) {
  const pr = typeof review.prId === 'object' ? review.prId : null;
  const commits: CommitInfo[] = pr?.commits || [];

  return (
    <Row gutter={20}>
      <Col flex="260px">
        <div style={{
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.06)',
          borderRadius: 8,
          padding: 12,
          minHeight: 300,
        }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#aaa', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.5 }}>
            Commits ({commits.length})
          </div>
          <CommitList commits={commits} />
        </div>
      </Col>
      <Col flex="auto">
        {review.summary ? (
          <AISummary summary={review.summary} />
        ) : (
          <div style={{ color: '#888', textAlign: 'center', padding: 60 }}>暂无 AI 分析结果</div>
        )}
      </Col>
    </Row>
  );
}
```

- [ ] **Step 5: Commit**

```bash
git add frontEnd/src/modules/review/components/OverviewTab.tsx \
    frontEnd/src/modules/review/components/CommitList.tsx \
    frontEnd/src/modules/review/components/AISummary.tsx
git commit -m "feat:实现总览Tab含Commit时间线和AI总结"
```

---

### Task 4.4: ChangesTab — FileTree + DiffViewer + SuggestionPopover

**Files:**
- Create: `frontEnd/src/modules/review/components/ChangesTab.tsx`
- Create: `frontEnd/src/modules/review/components/FileTree.tsx`
- Create: `frontEnd/src/modules/review/components/DiffViewer.tsx`
- Create: `frontEnd/src/modules/review/components/SuggestionPopover.tsx`

- [ ] **Step 1: 创建 FileTree**

```typescript
import { List, Badge } from 'antd';
import { FileAddOutlined, FileTextOutlined, DeleteOutlined } from '@ant-design/icons';
import type { FileInfo, FileAnalysis } from '@/types';

interface FileTreeProps {
  files: FileInfo[];
  fileAnalyses: FileAnalysis[];
  selectedFile: string | null;
  onSelectFile: (filename: string) => void;
}

const statusIcon: Record<string, React.ReactNode> = {
  added: <FileAddOutlined style={{ color: '#4caf50' }} />,
  modified: <FileTextOutlined style={{ color: '#ff9800' }} />,
  removed: <DeleteOutlined style={{ color: '#ff5252' }} />,
};

export default function FileTree({ files, fileAnalyses, selectedFile, onSelectFile }: FileTreeProps) {
  const getRiskColor = (filename: string) => {
    const analysis = fileAnalyses.find((fa) => fa.filename === filename);
    if (!analysis) return undefined;
    if (analysis.riskLevel === 'high') return '#ff5252';
    if (analysis.riskLevel === 'medium') return '#ff9800';
    return '#4caf50';
  };

  return (
    <div style={{ height: '100%', overflow: 'auto' }}>
      <div style={{ display: 'flex', gap: 6, marginBottom: 10, padding: '0 4px' }}>
        <Badge count={files.filter((f) => f.status === 'added').length} color="#4caf50" overflowCount={99}>
          <span style={{ fontSize: 10, color: '#888' }}>新增</span>
        </Badge>
        <Badge count={files.filter((f) => f.status === 'modified').length} color="#ff9800" overflowCount={99}>
          <span style={{ fontSize: 10, color: '#888' }}>修改</span>
        </Badge>
        <Badge count={files.filter((f) => f.status === 'removed').length} color="#ff5252" overflowCount={99}>
          <span style={{ fontSize: 10, color: '#888' }}>删除</span>
        </Badge>
      </div>
      <List
        size="small"
        dataSource={files}
        renderItem={(file) => (
          <List.Item
            onClick={() => onSelectFile(file.filename)}
            style={{
              cursor: 'pointer',
              padding: '6px 8px',
              borderRadius: 4,
              background: selectedFile === file.filename ? 'rgba(79,195,247,0.12)' : 'transparent',
              border: 'none',
              marginBottom: 2,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%' }}>
              {statusIcon[file.status]}
              <span style={{
                flex: 1,
                fontSize: 12,
                fontFamily: 'monospace',
                color: selectedFile === file.filename ? '#4fc3f7' : '#ccc',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}>
                {file.filename}
              </span>
              <span style={{ fontSize: 10, color: '#4caf50' }}>+{file.additions}</span>
              <span style={{ fontSize: 10, color: '#ff5252' }}>-{file.deletions}</span>
              {getRiskColor(file.filename) && (
                <span style={{
                  width: 6, height: 6, borderRadius: '50%',
                  backgroundColor: getRiskColor(file.filename),
                  flexShrink: 0,
                }} />
              )}
            </div>
          </List.Item>
        )}
      />
    </div>
  );
}
```

- [ ] **Step 2: 创建 SuggestionPopover**

```typescript
import { Popover, Tag, Typography } from 'antd';
import { MessageOutlined } from '@ant-design/icons';
import type { Suggestion } from '@/types';
import { marked } from 'marked';

const { Text } = Typography;

const severityConfig: Record<string, { color: string; label: string }> = {
  critical: { color: '#ff5252', label: '严重' },
  major: { color: '#ff9800', label: '重要' },
  minor: { color: '#ffc107', label: '轻微' },
  nit: { color: '#9e9e9e', label: '建议' },
};

interface SuggestionPopoverProps {
  suggestion: Suggestion;
}

export default function SuggestionPopover({ suggestion }: SuggestionPopoverProps) {
  const sev = severityConfig[suggestion.severity] || severityConfig.nit;

  const content = (
    <div style={{ maxWidth: 400 }}>
      <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
        <Tag color={sev.color}>{sev.label}</Tag>
        <Tag>{suggestion.category}</Tag>
      </div>
      <Text strong style={{ color: '#e0e0e0', display: 'block', marginBottom: 8 }}>
        {suggestion.title}
      </Text>
      <div
        style={{ color: 'rgba(255,255,255,0.75)', fontSize: 13, lineHeight: 1.6 }}
        dangerouslySetInnerHTML={{ __html: marked.parse(suggestion.description) as string }}
      />
      {suggestion.suggestionCode && (
        <pre style={{
          background: 'rgba(0,0,0,0.3)',
          borderRadius: 6,
          padding: 10,
          marginTop: 10,
          fontSize: 12,
          overflow: 'auto',
          color: '#a5d6a7',
          fontFamily: 'monospace',
        }}>
          {suggestion.suggestionCode}
        </pre>
      )}
    </div>
  );

  return (
    <Popover
      content={content}
      trigger="click"
      placement="left"
      overlayStyle={{ maxWidth: 440 }}
      overlayInnerStyle={{
        background: 'rgba(30,30,40,0.95)',
        backdropFilter: 'blur(12px)',
        border: '1px solid rgba(255,255,255,0.12)',
        borderRadius: 10,
        padding: 14,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', width: '100%' }}>
        <MessageOutlined style={{ color: '#ff9800', fontSize: 14, flexShrink: 0 }} />
        <div>
          <div style={{ color: '#e0e0e0', fontSize: 13, fontWeight: 500 }}>
            <Tag color={sev.color} style={{ marginRight: 6 }}>{sev.label}</Tag>
            {suggestion.title}
          </div>
          <div style={{ color: '#888', fontSize: 11, marginTop: 2 }}>
            第 {suggestion.lineStart}{suggestion.lineEnd ? `-${suggestion.lineEnd}` : ''} 行 · {suggestion.category}
          </div>
        </div>
      </div>
    </Popover>
  );
}
```

- [ ] **Step 3: 创建 DiffViewer 封装**

```typescript
import ReactDiffViewerComponent, { DiffMethod } from 'react-diff-viewer';
import { List } from 'antd';
import type { FileAnalysis, Suggestion } from '@/types';
import SuggestionPopover from './SuggestionPopover';

interface DiffViewerProps {
  oldCode: string;
  newCode: string;
  fileAnalysis?: FileAnalysis;
}

export default function DiffViewer({ oldCode, newCode, fileAnalysis }: DiffViewerProps) {
  return (
    <div>
      <ReactDiffViewerComponent
        oldValue={oldCode}
        newValue={newCode}
        splitView={false}
        compareMethod={DiffMethod.WORDS}
        useDarkTheme={true}
        leftTitle="原代码"
        rightTitle="变更后"
        styles={{
          diffContainer: {
            background: 'transparent',
            borderRadius: 8,
            overflow: 'hidden',
            maxHeight: 'calc(100vh - 400px)',
            overflowY: 'auto',
          },
          line: {
            wordBreak: 'break-all',
            fontSize: 12,
          },
        }}
      />
      {fileAnalysis && fileAnalysis.suggestions.length > 0 && (
        <div style={{
          marginTop: 16,
          background: 'rgba(255,255,255,0.03)',
          borderRadius: 8,
          border: '1px solid rgba(255,255,255,0.06)',
          padding: 12,
        }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#aaa', marginBottom: 10 }}>
            💡 AI 建议 ({fileAnalysis.suggestions.length})
          </div>
          <List
            size="small"
            dataSource={fileAnalysis.suggestions}
            renderItem={(suggestion: Suggestion) => (
              <List.Item style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', padding: '8px 0' }}>
                <SuggestionPopover suggestion={suggestion} />
              </List.Item>
            )}
          />
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 4: 创建 ChangesTab**

```typescript
import { useState } from 'react';
import { Col, Row, Empty } from 'antd';
import type { Review, FileInfo, FileAnalysis } from '@/types';
import FileTree from './FileTree';
import DiffViewer from './DiffViewer';

interface ChangesTabProps {
  review: Review;
}

export default function ChangesTab({ review }: ChangesTabProps) {
  const pr = typeof review.prId === 'object' ? review.prId : null;
  const files: FileInfo[] = pr?.files || [];
  const fileAnalyses: FileAnalysis[] = review.fileAnalyses || [];
  const [selectedFile, setSelectedFile] = useState<string | null>(files[0]?.filename || null);

  const currentFile = files.find((f) => f.filename === selectedFile);
  const currentAnalysis = fileAnalyses.find((fa) => fa.filename === selectedFile);

  return (
    <Row gutter={20}>
      <Col flex="240px">
        <div style={{
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.06)',
          borderRadius: 8,
          padding: 10,
          height: 'calc(100vh - 250px)',
          overflow: 'auto',
        }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#aaa', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 }}>
            变更文件 ({files.length})
          </div>
          <FileTree
            files={files}
            fileAnalyses={fileAnalyses}
            selectedFile={selectedFile}
            onSelectFile={setSelectedFile}
          />
        </div>
      </Col>
      <Col flex="auto">
        <div style={{
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.06)',
          borderRadius: 8,
          padding: 16,
          minHeight: 500,
        }}>
          {currentFile ? (
            <>
              <div style={{ color: '#888', fontSize: 12, marginBottom: 12, fontFamily: 'monospace' }}>
                📄 {currentFile.filename}
              </div>
              <DiffViewer
                oldCode=""
                newCode={currentFile.patch || ''}
                fileAnalysis={currentAnalysis}
              />
            </>
          ) : (
            <Empty description="选择一个文件查看变更" />
          )}
        </div>
      </Col>
    </Row>
  );
}
```

- [ ] **Step 5: Commit**

```bash
git add frontEnd/src/modules/review/components/
git commit -m "feat:实现变更Tab含文件树/Diff查看器/Popover建议"
```

---

## Phase 5: 集成与路由

**父分支:** `feat/frontend-shared-infra` (Phase 2/3/4 全部合并后)

### Task 5.0: 合并 Phase 2/3/4 并创建分支

- [ ] **Step 0: 切回 Phase 1 并合并 Phase 2/3/4**

```bash
git checkout feat/frontend-shared-infra
git merge feat/frontend-home feat/frontend-pr-list feat/frontend-review
```

处理可能的合并冲突（同一文件不同区域修改通常自动合并）。

- [ ] **Step 0b: 创建 Phase 5 分支**

```bash
git checkout -b feat/frontend-integration feat/frontend-shared-infra
```

---

### Task 5.1: 入口文件 + App 路由 + 全局样式

**Files:**
- Create: `frontEnd/src/main.tsx`
- Create: `frontEnd/src/App.tsx`
- Create: `frontEnd/src/shared/styles/global.css`

- [ ] **Step 1: 创建 main.tsx**

```typescript
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ConfigProvider, theme } from 'antd';
import { BrowserRouter } from 'react-router-dom';
import { store } from './store';
import App from './App';
import './shared/styles/global.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Provider store={store}>
      <QueryClientProvider client={queryClient}>
        <ConfigProvider
          theme={{
            algorithm: theme.darkAlgorithm,
            token: {
              colorPrimary: '#4fc3f7',
              borderRadius: 6,
              colorBgContainer: 'rgba(255,255,255,0.04)',
              colorBgElevated: 'rgba(30,30,40,0.95)',
            },
          }}
        >
          <BrowserRouter>
            <App />
          </BrowserRouter>
        </ConfigProvider>
      </QueryClientProvider>
    </Provider>
  </StrictMode>
);
```

- [ ] **Step 2: 创建 App.tsx**

```typescript
import { Routes, Route } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import AppLayout from './shared/components/AppLayout';
import ProtectedRoute from './shared/components/ProtectedRoute';
import LoadingSpinner from './shared/components/LoadingSpinner';
import HomePage from './modules/home/components/HomePage';

// 懒加载
const PRListPage = lazy(() => import('./modules/pr-list/components/PRListPage'));
const ReviewPage = lazy(() => import('./modules/review/components/ReviewPage'));

export default function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<HomePage />} />
        <Route
          path="pr-list"
          element={
            <ProtectedRoute>
              <Suspense fallback={<LoadingSpinner />}>
                <PRListPage />
              </Suspense>
            </ProtectedRoute>
          }
        />
        <Route
          path="review/:id"
          element={
            <ProtectedRoute>
              <Suspense fallback={<LoadingSpinner />}>
                <ReviewPage />
              </Suspense>
            </ProtectedRoute>
          }
        />
      </Route>
    </Routes>
  );
}
```

- [ ] **Step 3: 创建 HomePage 入口（组合 WelcomeHero + Dashboard）**

```typescript
import { useAuth } from '@/shared/hooks/useAuth';
import WelcomeHero from './WelcomeHero';
import Dashboard from './Dashboard';

export default function HomePage() {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <WelcomeHero />;
  }

  return <Dashboard />;
}
```

- [ ] **Step 4: 创建 global.css**

```css
/* 全局暗黑基础样式 */
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

html, body, #root {
  height: 100%;
  background: #0d0d14;
  color: rgba(255, 255, 255, 0.85);
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
}

/* 滚动条暗黑风格 */
::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}

::-webkit-scrollbar-track {
  background: transparent;
}

::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.12);
  border-radius: 3px;
}

::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.2);
}

/* 毛玻璃卡片通用类 */
.glass-card {
  background: rgba(255, 255, 255, 0.04);
  backdrop-filter: blur(8px);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 10px;
}

/* Markdown 渲染内容样式 */
.markdown-body {
  font-size: 14px;
  line-height: 1.7;
}

.markdown-body h1, .markdown-body h2, .markdown-body h3 {
  color: rgba(255, 255, 255, 0.9);
  margin-top: 16px;
  margin-bottom: 8px;
}

.markdown-body p {
  margin-bottom: 8px;
}

.markdown-body code {
  background: rgba(255, 255, 255, 0.08);
  padding: 2px 6px;
  border-radius: 4px;
  font-family: 'Fira Code', monospace;
  font-size: 13px;
}

.markdown-body pre {
  background: rgba(0, 0, 0, 0.3);
  border-radius: 8px;
  padding: 14px;
  overflow: auto;
  margin: 8px 0;
}

.markdown-body pre code {
  background: none;
  padding: 0;
}

.markdown-body ul, .markdown-body ol {
  padding-left: 20px;
  margin-bottom: 8px;
}

/* Ant Design 暗黑覆盖 */
.ant-table {
  background: transparent !important;
}

.ant-table-thead > tr > th {
  background: rgba(255, 255, 255, 0.04) !important;
  color: rgba(255, 255, 255, 0.55) !important;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06) !important;
}

.ant-table-tbody > tr > td {
  border-bottom: 1px solid rgba(255, 255, 255, 0.04) !important;
  color: rgba(255, 255, 255, 0.75);
}

.ant-table-tbody > tr:hover > td {
  background: rgba(255, 255, 255, 0.04) !important;
}

.ant-tabs-tab {
  color: rgba(255, 255, 255, 0.55) !important;
}

.ant-tabs-tab-active .ant-tabs-tab-btn {
  color: #4fc3f7 !important;
}

.ant-tabs-ink-bar {
  background: #4fc3f7 !important;
}
```

- [ ] **Step 5: 验证构建**

```bash
cd frontEnd && npx tsc -b --noEmit
```

修复任何类型错误。

- [ ] **Step 6: 验证开发服务器启动**

```bash
cd frontEnd && npx vite --host 127.0.0.1
```

确认无编译错误（无需打开浏览器验证功能）。

- [ ] **Step 7: Commit**

```bash
git add frontEnd/src/main.tsx frontEnd/src/App.tsx \
    frontEnd/src/shared/styles/global.css \
    frontEnd/src/modules/home/components/HomePage.tsx
git commit -m "feat:集成路由/全局样式/入口文件"
```

---

## Phase 6: 视觉打磨

**父分支:** `feat/frontend-integration` (Phase 5)

### Task 6.0: 创建分支

- [ ] **Step 0: 创建 Phase 6 分支**

```bash
git checkout -b style/frontend-polish feat/frontend-integration
```

---

### Task 6.1: 调用 design-taste-frontend 技能审核

- [ ] **Step 1: 启动开发服务器**

```bash
cd frontEnd && npx vite --host 127.0.0.1 &
```

- [ ] **Step 2: 调用 design-taste-frontend 技能**

```
Skill: design-taste-frontend
Task: 审核 PR Viewer 前端的暗黑科技风 + 毛玻璃质感实现：
- homepage: 统计卡片毛玻璃效果、PR 输入区、最近评审列表
- analysis page: commit 时间线、AI 总结卡片、文件 diff 查看器、Popover 建议卡
- sidebar: 收起/展开过渡动画
- 全局: 色彩对比度、间距一致性、硬件加速
重点关注: glassmorphism 细节（blur 值、透明度、边框）、暗黑背景层次、亮色点缀克制使用
```

- [ ] **Step 3: 根据审核结果调整样式**

修改 `global.css` 和各组件内联 style，应用 optimizations。

- [ ] **Step 4: Commit**

```bash
git add frontEnd/src/
git commit -m "style:design-taste-frontend视觉审核后调整毛玻璃和暗黑主题细节"
```

---

### Task 6.2: 最终验证

- [ ] **Step 1: TypeScript 编译检查**

```bash
cd frontEnd && npx tsc -b --noEmit
```
Expected: 无错误

- [ ] **Step 2: 运行测试**

```bash
cd frontEnd && npx vitest run
```
Expected: 全部 PASS

- [ ] **Step 3: 构建验证**

```bash
cd frontEnd && npx vite build
```
Expected: 构建成功

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "style:最终验证通过"
```

---

## 附录：依赖顺序图

```
Phase 0 (Scaffold) ──► Phase 1 (Shared Infra) ──┬──► Phase 2 (Home)
                                                  ├──► Phase 3 (PR List)
                                                  └──► Phase 4 (Review)
                                                        │
Phase 0 ──► Phase 1 ──► Phase 2/3/4 ──► Phase 5 (Integration) ──► Phase 6 (Polish)
```

> Phase 2/3/4 可并行（独立模块），但 Phase 5 须等待所有模块完成。
