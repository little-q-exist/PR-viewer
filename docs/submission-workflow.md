# 提交代码流程

项目的分支、commit message、PR 和合并规则必须遵循 [git-workflow.md](./git-workflow.md)。本页只补充提交前的本地验证和 CI 要求。

## 提交前检查

1. 从最新的 `main` 创建符合规范的英文分支。
2. 安装锁文件依赖，不要手工修改 `package-lock.json`。
3. 完成代码和文档改动后，在仓库根目录执行完整验证。
4. 只有所有命令通过后，才允许创建 commit。

```bash
npm ci
npm --prefix frontEnd ci --legacy-peer-deps
npm --prefix backEnd ci
npm run validate
git diff --check
```

`npm run validate` 必须通过以下验证：

- 前端 ESLint。
- 前端 Vitest、TypeScript 与 Vite 构建。
- 后端 Jest、TypeScript 构建。
- 前后端生产依赖审计；存在 high/critical 漏洞时阻断。

## CI 流程

PR 指向 `main` 时会触发 `.github/workflows/ci.yml`，并执行两个独立任务：

- `frontend`：`npm ci --legacy-peer-deps` → lint → test → build → production audit。
- `backend`：`npm ci` → test → build → production audit。

`main` 分支保护要求 `frontend` 和 `backend` 两个状态检查通过，且分支必须与最新 `main` 保持同步。任一任务失败都不允许合并；推送新 commit 后必须等待 CI 重新通过，不得绕过失败检查。

## 提交与 PR

commit message、分支命名、PR 描述和推送命令按 [git-workflow.md](./git-workflow.md) 执行。创建 PR 前再次确认本地 `npm run validate` 与 CI 使用相同的验证项。

合并 `main` 前必须取得用户同意，并严格按 [git-workflow.md](./git-workflow.md) 规定的 rebase and merge 流程执行。
