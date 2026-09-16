# 测试

## 测试脚本

| 端 | 命令 | 说明 |
|----|------|------|
| 根目录 | `npm run validate` | 依次执行前端 lint/test/build、后端 test/build，以及两端生产依赖审计 |
| 根目录 | `npm run validate:frontend` | 执行前端 lint、测试与构建 |
| 根目录 | `npm run validate:backend` | 执行后端测试与构建 |
| 根目录 | `npm run audit:prod` | 检查两端生产依赖中的 high/critical 漏洞 |
| 后端 | `npm test` | Jest 单次运行测试 |
| 后端 | `npm run test:watch` | Jest watch 模式 |
| 后端 | `npm run test:coverage` | 生成后端覆盖率报告 |
| 前端 | `npm test` | Vitest 单次运行全部测试 |
| 前端 | `npm run test:watch` | Vitest watch 模式 |
| 前端 | `npm run lint` | ESLint 检查 |

## 已覆盖范围

- 后端：认证、GitHub URL/控制器、分析器解析、评审服务与评审控制器的单元及控制器层测试，外部网络和数据库依赖通过 mock 隔离。
- 前端：认证/UI 状态、patch 拆分、评审文件树、DiffViewer 导出兼容、AI 建议弹层、GitHub 评论与 Markdown 安全渲染。
- Markdown 渲染：验证脚本、事件处理器和不安全链接协议会被 DOMPurify 清除。

## 尚未覆盖

- 真实 GitHub、MongoDB、OpenAI/兼容 LLM 的端到端集成与故障恢复。
- 私有仓库跨用户授权、真实 GitHub installation 权限边界和缓存命中后的权限复核。
- 异步分析任务的队列投递、超时、重试、租约和进程重启恢复。
- 浏览器级 E2E、生产环境 CSP、CORS 配置以及部署后的可观测性。
- 覆盖率阈值目前尚未设置，新增核心逻辑时应同步补充测试。
