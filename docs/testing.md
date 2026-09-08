# 测试

## 工具与命令

| 端 | 工具 | 命令 | 说明 |
|----|------|------|------|
| 后端 | Jest 30 + ts-jest | `npm test`、`npm run test:watch`、`npm run test:coverage` | 环境 node，`testMatch: **/__tests__/**/*.test.ts`；配置为 CommonJS `jest.config.js` |
| 前端 | Vitest 4 | `npm test`、`npm run test:watch` | 环境 jsdom，globals 开启；`setupFiles` 引入 jest-dom 并 mock matchMedia/ResizeObserver |

## 测试文件清单

### 后端（7 套件 / 36 用例）
| 文件 | 覆盖内容 |
|------|----------|
| `modules/auth/__tests__/auth.test.ts` | generateToken / verifyToken（正常、缺 secret、非法 token） |
| `modules/auth/__tests__/auth.controller.test.ts` | `GET /auth/me` 200/401/404；`POST /auth/install` 缺 code 400、配置缺失 500 |
| `modules/github/__tests__/github.test.ts` | parsePrUrl（合法、无尾斜杠、非法域名、非 URL） |
| `modules/github/__tests__/github.controller.test.ts` | `GET /pull-requests` 200；`GET /pull-requests/:id` 200/404；`POST /pull-requests/fetch` 200/400/401 |
| `modules/analyzer/__tests__/analyzer.test.ts` | buildAnalyzerPrompt、parseAnalyzerResponse（真实模型形状（无 aiUsage）、Markdown 代码块、缺字段、非法 JSON） |
| `modules/pull-request/__tests__/review.test.ts` | createReview、getReviewById（存在/不存在） |
| `modules/pull-request/__tests__/review.controller.test.ts` | `POST /reviews` 201/400/500；`GET /reviews` 200/401；`GET /reviews/:id` 200/404/500 |

> 控制器层测试基于 `app`（supertest），通过 `jest.mock` 隔离 rateLimiter、authMiddleware、authService、githubService、reviewService 与 mongoose 模型，不发起真实网络/DB 请求。

### 前端（8 文件 / 27 用例）
| 文件 | 覆盖内容 |
|------|----------|
| `store/modules/__tests__/authSlice.test.ts` | 初始状态、setAuth、clearAuth、setUser 与 localStorage |
| `store/modules/__tests__/uiSlice.test.ts` | 初始状态、setSidebarExpanded、setCurrentReviewId（含 null） |
| `modules/review/__tests__/splitPatch.test.ts` | splitPatchIntoOldNew（空 patch、±/上下文行拆分、CRLF、added/removed、元信息与 no-newline 标记） |
| `modules/review/__tests__/FileTree.test.tsx` | 渲染文件名/增减行数/风险点、点击回调 |
| `modules/review/__tests__/SuggestionPopover.test.tsx` | severity/title/行号渲染、点击展开 Markdown 内容 |
| `modules/review/__tests__/ChangesTab.test.tsx` | mock DiffViewer 断言 oldCode/newCode 来自拆分后的 patch；按 path 过滤评论；无文件空态 |
| `modules/review/__tests__/ReviewComments.test.tsx` | 按 line 升序排序、无行号排最后、点击 Popover 展开作者/正文 |
| `modules/review/__tests__/DiffViewer.test.tsx` | mock react-diff-viewer，断言 oldValue/newValue/splitView 透传 |

## 当前结果（实测）

- 后端：`Test Suites: 7 passed`，`Tests: 36 passed`（无 jest.config 加载警告）。
- 前端：`Test Files 8 passed`，`Tests 27 passed`。

## 备注

- 后端原 `jest.config.ts` 使用 ESM 导入语法而 package.json 为 `"type": "commonjs"`，运行时会打印 ESM 加载警告；已改为 CommonJS `jest.config.js`（`module.exports`），警告消除。
- 后端测试通过 `jest.mock` 隔离 octokit、mongoose 模型等外部依赖；单元测试 + 控制器层测试已覆盖，真实 GitHub/OpenAI 网络集成测试暂未覆盖（可后续以 env 开关补充）。
- 前端组件测试依赖 `src/test/setup.ts`（jest-dom matchers + matchMedia/ResizeObserver mock）；组件内 Ant Design Popover 为真实渲染，交互通过 @testing-library/user-event 验证。
