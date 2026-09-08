# 前端说明

## 入口与启动

- `main.tsx`：初始化 Redux `Provider`、React Query `QueryClientProvider`、Ant Design `ConfigProvider`（暗黑主题）、`BrowserRouter`。
- `vite.config.ts`：端口 5173，`@` 别名指向 `src`，`/api` 代理到 `http://localhost:3000` 并去掉 `/api` 前缀。
- `App.tsx`：路由表；`pr-list` 与 `review/:id` 懒加载并用 `ProtectedRoute` 保护。

## 目录结构

```
frontEnd/src/
├── App.tsx
├── main.tsx
├── modules/
│   ├── home/          # 首页 = 登录页 + 登录后 Dashboard
│   ├── pr-list/       # 评审历史列表页
│   └── review/        # 分析页（总览 / 具体变更：DiffViewer、ReviewComments、SuggestionPopover）
├── shared/
│   ├── components/    # AppLayout、Sidebar、ProtectedRoute、LoadingSpinner
│   ├── hooks/         # useAuth、useReviews
│   ├── services/      # axios 封装（api.ts）
│   └── styles/        # global.css（暗黑毛玻璃）
├── store/
│   ├── index.ts
│   └── modules/       # authSlice、uiSlice（含单测）
└── types/index.ts     # 前端类型定义
```

## 状态管理

### Redux Toolkit（全局状态）
- `authSlice`：`user`、`token`、`isAuthenticated`；初始 token 从 `localStorage` 读取；`setAuth` / `clearAuth` / `setUser`。
- `uiSlice`：`sidebarExpanded`、`currentReviewId`；`setSidebarExpanded` / `setCurrentReviewId` / `resetUI`。

### TanStack React Query（服务端状态）
- `useReviewList`：评审列表（staleTime 30s）。
- `useReviewDetail`：评审详情，未完成时 `refetchInterval` 3s 轮询。
- `useCreateReview`：创建评审，成功后失效列表并跳转 `/review/:id`。
- `useAuthUser`：`GET /auth/me`。
- `useInstall`：`POST /auth/install` 成功后写入 Redux。

## 路由与页面

| 路由 | 页面 | 说明 |
|------|------|------|
| `/` | HomePage | 未登录显示 WelcomeHero（登录/安装），登录后显示 Dashboard |
| `/pr-list` | PRListPage | 评审历史列表（状态过滤 + 分页） |
| `/review/:id` | ReviewPage | 按状态渲染排队/失败/完成界面 |

### 首页（home）
- `WelcomeHero`：标题 + “Login with GitHub” + 安装 App 入口；用 `crypto.randomUUID()` 生成 OAuth state。
- `HomePage`：处理 OAuth 回调（校验 state、消费 code），根据登录态切换 WelcomeHero / Dashboard。
- `Dashboard`：欢迎语、`StatsCards`（总数/高/中/低风险）、`PRUrlInput`（输入 PR URL 发起分析）、`RecentReviews`（最近评审列表）。
- `useDashboard`：聚合列表总数与最近 5 条的风险分布。

### 评审列表页（pr-list）
- `StatusFilter`：Segmented 按 pending/analyzing/completed/failed 过滤。
- `ReviewTable`：展示 PR 标题、状态、风险、评分、时间，点击行跳转详情。
- `usePRList`：本地维护状态过滤与页码。

### 分析页（review）
- `ReviewPage`：根据状态展示 `PollingIndicator`、失败 `Result`，或完成后两个 Tab。
- 总览 Tab（`OverviewTab`）：左侧 `CommitList`，右侧 `AISummary`（风险标签、评分、总体评价、建议列表，Markdown 渲染）。
- 具体变更 Tab（`ChangesTab`）：左侧 `FileTree`（文件状态/增减行数/风险点）；右侧把当前文件 patch 经 `utils/splitPatch.ts` 的 `splitPatchIntoOldNew` 拆成 oldCode/newCode 交给 `DiffViewer`（统一视图 + WORDS 对比），`DiffViewer` 内含 `SuggestionPopover` AI 建议列表。
- `ChangesTab` 在 `DiffViewer` 下方渲染 `ReviewComments`：展示当前文件的 GitHub 行级评论（按行号升序，点击 Popover 展开作者/行号/Markdown 正文），数据来自 `pr.comments`（按 `path` 过滤）。
- `PRInfoBar`：PR 标题、作者、base ← head 分支、状态。
- `usePolling`：排队/分析中的计时显示。

## 样式体系

- 暗黑科技风 + 毛玻璃质感；主色 `#4fc3f7`。
- `global.css`：全局暗黑背景、`.glass-card` 毛玻璃卡片、自定义滚动条、`.markdown-body` Markdown 样式、Ant Design 暗黑覆盖。
- 组件内大量内联样式实现玻璃卡片（`rgba(255,255,255,0.04)` + `backdropFilter: blur(8px)`）。

## 关键实现细节

- **OAuth 回调防重放**：`state` 存 sessionStorage，`loginStarted` ref 防止 StrictMode 下重复提交一次性 code。
- **401 处理**：axios 响应拦截器在 401 时移除 localStorage token；`ProtectedRoute` 未登录重定向首页。
- **Markdown 渲染**：`marked` 配置 gfm/breaks，用 `dangerouslySetInnerHTML` 渲染 AI 返回的 overview/description。
