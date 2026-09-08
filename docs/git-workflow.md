# Git 提交规范与协作流程

## 提交信息与分支命名

- commit message 使用中文，分支名使用英文。
- 前缀（commit 后跟半角冒号，分支后跟斜杠）：`feat`、`refactor`、`docs`、`test`、`fix`、`chore`、`style`。
- 示例：`feat: 增加可选的AI-API-URL` / `feat/ai-api-url`。

## 分支推送与 PR

- 本项目推荐使用 GitHub CLI（`gh`）推送分支并创建 PR：

  ```bash
  git push -u origin <分支名>
  gh pr create --base main --head <分支名> --title "<PR 标题>" --body "<PR 描述>"
  ```

- PR 描述（body）需要说明当前分支的改动，至少包含：背景 / 改动内容 / 验证方式，便于 reviewer 理解改动意图与影响范围。

## 合并策略

- 分支合并到 `main` 使用 **rebase and merge**，保持提交历史线性、干净。
- 合并完成后删除远程分支（推荐在合并时一并删除本地与远程分支）：

  ```bash
  gh pr merge <PR 编号> --rebase --delete-branch
  ```
