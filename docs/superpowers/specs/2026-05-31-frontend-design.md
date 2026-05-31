# 前端架构设计

> 2026-05-31 · PR Viewer AI 代码评审工具

## 一、概述

### 技术栈
- **框架**: React 19 + TypeScript 6
- **构建**: Vite 8
- **路由**: React Router 7
- **UI 库**: Ant Design 6
- **客户端状态**: Redux Toolkit
- **服务端状态**: TanStack React Query 5
- **HTTP**: Axios（含 JWT 拦截器）
- **Diff 展示**: react-diff-viewer
- **Markdown 渲染**: marked + highlight.js
- **测试**: Vitest 4

### 视觉风格
暗黑科技风 + 毛玻璃质感（glassmorphism）。背景深色，卡片半透明 + backdrop-filter blur，亮色点缀用于风险等级和评分。

---

## 二、路由结构

| 路径 | 页面 | 认证要求 | 说明 |
|------|------|----------|------|
| `/` | 主页（Dashboard） | 否（但内容不同） | 未登录显示登录入口，已登录显示工作台 |
| `/pr-list` | PR 列表页 | 是 | 历史评审记录表格 |
| `/review/:id` | 分析报告页 | 是 | AI 分析结果，含总览与变更两个 Tab |

**路由守卫**: `ProtectedRoute` 组件包裹 `/pr-list` 和 `/review/:id`，未认证重定向 `/`。

---

## 三、页面设计

### 3.1 主页 `/`

**未登录状态**:
- 居中显示项目名 "PR Viewer"
- "Login with GitHub" 按钮 → 跳转 GitHub OAuth/App 安装

**已登录状态（Dashboard）**:
- 顶部统计卡片行：总评审数、各风险等级分布
- PR URL 输入区：Input + "分析" 按钮 → POST /reviews → 跳转 `/review/:id`
- 最近评审迷你卡片列表（最多 5 条），点击跳转对应分析页
- 侧边栏入口（全局）

### 3.2 PR 列表页 `/pr-list`

- **状态过滤**: Pill Tabs（全部 / pending / analyzing / completed / failed）
- **Ant Design Table**，列定义：
  - PR 标题（可点击 → 分析页）
  - 评审状态（Tag 组件）
  - 风险等级（Badge）
  - 评分（数字 0-100）
  - 完成时间（相对时间）
- **分页**: 后端分页，每页 20 条

### 3.3 分析报告页 `/review/:id`

**顶部 PR 信息栏**（所有 Tab 共享）:
- PR 标题、作者头像+用户名
- 分支流向：`baseBranch ← headBranch`

**轮询机制**:
- 页面挂载时 `useReviewDetail(id)` 开始轮询
- `status === 'pending' || 'analyzing'` → 每 3s 请求 `GET /reviews/:id`
- `status === 'completed' || 'failed'` → 停止轮询
- HTTP 非 200 → 直接设 `failed`，停止轮询

**Tab 1 — 总览**:
- 左侧（260px）：Commit 列表时间线，高亮当前选中 commit
- 右侧：AI 总结
  - 风险等级 Badge + 评分大数字
  - Markdown 渲染的 overview 文本
  - 建议列表（recommendations），按优先级排序

**Tab 2 — 具体变更**:
- 左侧（240px）：文件树列表
  - 每个文件显示 status 图标（✨ added / 📝 modified / 🗑 removed）
  - 增/删行数统计徽标
- 右侧：react-diff-viewer 展示当前选中文件的 diff
  - AI 建议行标注 💬 图标
  - 点击 💬 → Popover 卡片（毛玻璃背景），展示建议详情
  - Popover 内容：严重等级标签、分类、Markdown 描述、建议代码

---

## 四、状态管理

### Redux Toolkit — 客户端状态

```typescript
// authSlice
interface AuthState {
  user: { id: string; login: string; avatarUrl: string } | null;
  token: string | null;
  isAuthenticated: boolean;
}

// uiSlice
interface UIState {
  sidebarExpanded: boolean;      // 鼠标悬停时展开
  currentReviewId: string | null;
}
```

### TanStack React Query — 服务端状态

| Hook | API | 使用位置 | 配置 |
|------|-----|----------|------|
| `useReviews(filters, pagination)` | `GET /reviews` | PR 列表页 | staleTime: 30s |
| `useReviewDetail(id)` | `GET /reviews/:id` | 分析页 | refetchInterval: 3s（条件停止） |
| `useCreateReview()` | `POST /reviews` | 主页"分析"按钮 | mutation → 跳转 |
| `useAuthUser()` | `GET /auth/me` | App 初始化 | 验证 token 有效性 |
| `useInstall()` | `POST /auth/install` | 登录回调 | mutation |

### 边界约定

| | Redux | React Query |
|---|---|---|
| 管理内容 | 客户端状态（auth, UI） | 服务端数据（reviews, PR） |
| 读取方式 | `useSelector` | `useQuery` / `useMutation` |
| 不进入 | API 响应数据 | 表单输入、UI 开关 |

---

## 五、数据流

### 5.1 认证流程

```
用户点击 "Login with GitHub"
  → 跳转 GitHub OAuth / App 安装
  → 回调 URL 携带 installationId + code
  → POST /auth/install → { token, user }
  → Redux dispatch(authSlice.setAuth({ token, user }))
  → Axios interceptor 自动附加 Authorization: Bearer <token>
```

### 5.2 分析流程

```
用户粘贴 PR URL → 点击"分析"
  → POST /reviews { prUrl } → { id, status: 'pending' }
  → navigate(`/review/${id}`)
  → useReviewDetail(id) 开始 3s 轮询
  → status === 'completed' → 停止轮询，渲染结果
  → status === 'failed'    → 停止轮询，显示 errorMessage
```

### 5.3 Axios 配置

```typescript
// 请求拦截器: 自动附加 JWT
// 响应拦截器: 401 → 清除 auth state → 重定向到 /
// baseURL: 后端地址（环境变量 VITE_API_BASE）
```

---

## 六、目录结构

```
frontEnd/
├── index.html
├── vite.config.ts
├── tsconfig.json
├── package.json
└── src/
    ├── main.tsx                    # 入口：Provider 嵌套
    ├── App.tsx                     # 路由配置
    ├── vite-env.d.ts
    │
    ├── store/                      # Redux
    │   ├── index.ts                # configureStore
    │   └── modules/
    │       ├── authSlice.ts
    │       └── uiSlice.ts
    │
    ├── shared/                     # 通用组件/工具
    │   ├── components/
    │   │   ├── AppLayout.tsx       # 侧边栏 + Outlet
    │   │   ├── Sidebar.tsx
    │   │   ├── ProtectedRoute.tsx
    │   │   └── LoadingSpinner.tsx
    │   ├── hooks/
    │   │   ├── useAuth.ts          # 封装 auth selector
    │   │   └── useReviews.ts       # React Query hooks
    │   ├── services/
    │   │   └── api.ts              # Axios 实例 + 拦截器
    │   └── styles/
    │       └── global.css
    │
    └── modules/
        ├── home/                   # 主页模块
        │   ├── components/
        │   │   ├── WelcomeHero.tsx      # 未登录欢迎
        │   │   ├── Dashboard.tsx        # 已登录工作台
        │   │   ├── StatsCards.tsx       # 统计卡片
        │   │   ├── PRUrlInput.tsx       # PR URL 输入框
        │   │   └── RecentReviews.tsx    # 最近评审列表
        │   ├── hooks/
        │   │   └── useDashboard.ts
        │   └── styles/
        │       └── home.css
        │
        ├── pr-list/                # PR 列表模块
        │   ├── components/
        │   │   ├── PRListPage.tsx       # 页面入口
        │   │   ├── StatusFilter.tsx     # 状态过滤
        │   │   └── ReviewTable.tsx      # 评审表格
        │   ├── hooks/
        │   │   └── usePRList.ts
        │   └── styles/
        │       └── pr-list.css
        │
        └── review/                 # 分析报告模块
            ├── components/
            │   ├── ReviewPage.tsx       # 页面入口（含轮询）
            │   ├── PRInfoBar.tsx        # 顶部 PR 信息
            │   ├── PollingIndicator.tsx # 分析中动画
            │   ├── OverviewTab.tsx      # 总览 Tab
            │   ├── CommitList.tsx       # Commit 时间线
            │   ├── AISummary.tsx        # AI 总结（Markdown）
            │   ├── ChangesTab.tsx       # 变更 Tab
            │   ├── FileTree.tsx         # 文件树列表
            │   ├── DiffViewer.tsx       # Diff 查看器封装
            │   └── SuggestionPopover.tsx# 行级建议 Popover
            ├── hooks/
            │   ├── useReviewDetail.ts   # 轮询逻辑
            │   └── usePolling.ts        # 通用轮询 hook
            └── styles/
                └── review.css
```

---

## 七、关键状态覆盖

每个数据展示区域必须处理三种状态：

| 状态 | 表现 |
|------|------|
| **Loading** | Skeleton / Spin 占位 |
| **Empty** | Ant Empty 组件 + 引导文案 |
| **Error** | Alert 组件 + 重试按钮 |

分析页特有状态：
- **pending** → 等待后端开始分析，显示 "排队中..."
- **analyzing** → 显示 PollingIndicator（动画 + 已等待时间）
- **completed** → 正常渲染 AI 结果
- **failed** → 显示 errorMessage + "重新分析"按钮

---

## 八、测试策略

| 层级 | 工具 | 范围 |
|------|------|------|
| 单元测试 | Vitest | 组件渲染、hook 逻辑、Redux reducer |
| 集成测试 | Vitest + MSW | API mock 下的完整页面流程 |
| 覆盖重点 | — | 认证流程、分析轮询、状态转换、边界情况 |

---

## 九、环境变量

```env
VITE_API_BASE=http://localhost:3000    # 后端 API 地址
VITE_GITHUB_APP_NAME=ai-pr-viewer     # GitHub App 名称
```
