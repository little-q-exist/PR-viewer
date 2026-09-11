# 配置、脚本与工具链

## 环境变量

### 后端 `backEnd/.env`
| 变量 | 说明 |
|------|------|
| `MONGODB_URI` | MongoDB Atlas 连接串 |
| `GITHUB_APP_ID` | GitHub App ID |
| `GITHUB_APP_PRIVATE_KEY` | App 私钥（当前代码未引用，见 current-status） |
| `GITHUB_APP_CLIENT_ID` | OAuth client ID |
| `GITHUB_APP_CLIENT_SECRET` | OAuth client secret |
| `OPENAI_API_URL` | OpenAI 兼容 API 地址（可选，默认 `https://api.openai.com/v1/chat/completions`） |
| `OPENAI_API_KEY` | OpenAI API Key |
| `OPENAI_MODEL` | 模型名，如 `gpt-4o` |
| `JWT_SECRET` | JWT 签名密钥 |
| `JWT_EXPIRES_IN` | JWT 有效期，如 `7d` |

### 前端 `frontEnd/.env`
| 变量 | 说明 |
|------|------|
| `VITE_API_BASE` | 后端 API 地址 |
| `VITE_GITHUB_APP_NAME` | GitHub App 名称（用于安装链接） |
| `VITE_GITHUB_APP_CLIENT_ID` | OAuth client ID（用于跳转授权） |

## 脚本

### 根目录
| 命令 | 说明 |
|------|------|
| `npm run dev` | concurrently 并行启动后端与前端 |
| `npm start` | 同 dev |
| `npm run validate` | 执行提交前完整验证：lint、测试、构建与生产依赖审计 |
| `npm run validate:frontend` | 前端 lint、测试与构建 |
| `npm run validate:backend` | 后端测试与构建 |
| `npm run audit:prod` | 前后端生产依赖 high/critical 审计 |

### 后端
| 命令 | 说明 |
|------|------|
| `npm run dev` | ts-node 启动 server.ts |
| `npm run build` | tsc 编译到 dist |
| `npm start` | node dist/server.js |
| `npm test` / `test:watch` / `test:coverage` | Jest |

### 前端
| 命令 | 说明 |
|------|------|
| `npm run dev` | Vite 开发服务器 |
| `npm run build` | tsc -b && vite build |
| `npm run preview` | 预览构建产物 |
| `npm test` / `test:watch` | Vitest |
| `npm run lint` | eslint |

## 工具链

- **Prettier**（根 `.prettierrc.json`）：semi、CRLF、printWidth 80、tabWidth 4、singleQuote、trailingComma all、arrowParens always。
- **ESLint**（`frontEnd/eslint.config.js`）：flat config，集成 `@eslint/js`、`typescript-eslint`、`react-hooks`、`@tanstack/eslint-plugin-query`。
- **TypeScript**：后端 `commonjs` + ES2022 + strict；前端 `ESNext` + bundler 模块解析 + strict + noUnusedLocals/Parameters。

## Git 提交与分支规范

代码提交规范（commit 信息、分支命名、gh CLI 推送、PR 与合并流程）已独立成文：[git-workflow.md](./git-workflow.md)。

提交前的本地验证与 CI 流程见 [submission-workflow.md](./submission-workflow.md)。
