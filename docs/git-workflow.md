# Git 提交规范与协作流程

## 最高原则

在合并入 main 之前，你必须停下来，征求用户的同意。

## 提交与分支命名

- 一个 commit 应当是一个 最小改动 的提交。
- commit message 使用中文，分支名使用英文。
- 前缀（commit 后跟半角冒号，分支后跟斜杠）：`feat`、`refactor`、`docs`、`test`、`fix`、`chore`、`style`。
- 示例：`feat: 增加可选的AI-API-URL` / `feat/ai-api-url`。

## 分支推送与 PR

- 本项目推荐使用 GitHub CLI（`gh`）完成分支推送与 PR 创建：

    ```bash
    git push -u origin <分支名>
    gh pr create --base main --head <分支名> --title "<PR 标题>" --body "<PR 描述>"
    ```

- PR 的 `base` 固定为 `main`，`head` 为当前分支。
- PR 描述（body）需要说明当前分支的改动，至少包含：背景 / 改动内容 / 验证方式，便于 reviewer 理解改动意图与影响范围。

## 改动必须通过 PR 合入 main

- `main` 分支受保护（仓库已配置 "Changes must be made through a pull request"），**禁止直接向 `main` 推送**。
- 所有改动必须走 PR：新建分支 → 本地提交 → 推送分支 → 创建 PR → 合入 `main` → 删除远程分支。
- 合入 `main` 统一使用 **rebase and merge**。

## 合并到 main

- PR 合入 `main` 使用 **rebase and merge**，保持提交历史线性、干净。
- 合并完成后删除远程分支（推荐在合并时一并删除本地与远程分支）：

    ```bash
    gh pr merge <PR 编号> --rebase --delete-branch
    ```
