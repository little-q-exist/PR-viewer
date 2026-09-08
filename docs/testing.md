# 测试

## 工具与命令

| 端 | 工具 | 命令 | 说明 |
|----|------|------|------|
| 后端 | Jest 30 + ts-jest | `npm test`、`npm run test:watch`、`npm run test:coverage` | 环境 node，`testMatch: **/__tests__/**/*.test.ts` |
| 前端 | Vitest 4 | `npm test`、`npm run test:watch` | 环境 jsdom，globals 开启 |

## 测试文件清单

### 后端（4 套件 / 16 用例）
| 文件 | 覆盖内容 |
|------|----------|
| `modules/auth/__tests__/auth.test.ts` | generateToken / verifyToken（正常、缺 secret、非法 token） |
| `modules/github/__tests__/github.test.ts` | parsePrUrl（合法、无尾斜杠、非法域名、非 URL） |
| `modules/analyzer/__tests__/analyzer.test.ts` | buildAnalyzerPrompt、parseAnalyzerResponse（真实模型形状（无 aiUsage）、Markdown 代码块、缺字段、非法 JSON） |
| `modules/pull-request/__tests__/review.test.ts` | createReview、getReviewById（存在/不存在） |

### 前端（2 文件 / 8 用例）
| 文件 | 覆盖内容 |
|------|----------|
| `store/modules/__tests__/authSlice.test.ts` | 初始状态、setAuth、clearAuth、setUser 与 localStorage |
| `store/modules/__tests__/uiSlice.test.ts` | 初始状态、setSidebarExpanded、setCurrentReviewId（含 null） |

## 当前结果（实测）

- 后端：`Test Suites: 4 passed`，`Tests: 16 passed`。
- 前端：`Test Files 2 passed`，`Tests 8 passed`。

## 备注

- 后端 `jest.config.ts` 使用 ESM 导入语法，而 `backEnd/package.json` 为 `"type": "commonjs"`，运行时会打印一条 `Failed to load the ES module ... jest.config.ts` 警告，但不影响测试执行。
- 后端测试通过 `jest.mock` 隔离了 octokit、mongoose 模型等外部依赖，当前以单元测试为主；控制器层与真实 GitHub/OpenAI 调用的集成测试尚未覆盖。
