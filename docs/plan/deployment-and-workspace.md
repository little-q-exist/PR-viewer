# 部署与工作区设计：临时 clone 放哪、谁访问它

> 本文是对 [ocr-harness-roadmap.md](./ocr-harness-roadmap.md) 阶段 1「仓库物化」的补充说明，
> 回答两个问题：
> 1. 评审用的临时 Git 工作区保存在哪里？
> 2. 未来部署上线后，如何把仓库拉到后端进程所在的机器，并兼顾前端展示、后端与 OCR 访问？

## 1. 核心结论

- **临时工作区是“本地磁盘上的 ephemeral 源码副本”**：只存在于执行评审的机器/容器上，用完即删。
- **前端从不直接访问仓库文件系统**：前端只通过 REST API 拿 JSON/HTML，因此“前端要看”与“后端/OCR 要读文件”走两条路径，不冲突。
- **评审结果持久化到 MongoDB**：这是共享状态，前端无论命中哪个后端副本都能读到；临时源码树不是共享状态。

## 2. 临时工作区：位置与生命周期

### 2.1 默认位置

- 默认：操作系统临时目录。Windows 下即 `%TEMP%`，通常是 `C:\Users\<user>\AppData\Local\Temp`。
- 推荐：配置专用目录，便于清理和限额：

| 配置 | 建议值 |
|---|---|
| 环境变量 | `PRVIEWER_WORKDIR` |
| 默认值 | `%LOCALAPPDATA%\PRviewer\repos`（用户级缓存区）或 `os.tmpdir()/prviewer-repos` |
| 目录结构 | `{workdir}/{owner}/{repo}/pr-{number}/` |

### 2.2 为什么必须在本地磁盘

OCR 引擎是本机 CLI，后端通过 `spawn('ocr', ...)` 调用它。OCR 需要一个真实的 `.git` 工作树才能执行：

- `git diff` 生成变更
- `file_read` 读完整文件
- `code_search` 搜代码库
- 规则引擎读取规则文件

因此该目录必须能被“后端进程”和“OCR 子进程”同时访问，也就是同一台机器的本地文件系统。它不能放 MongoDB（OCR 读不了），也不适合每次从远程对象存储拉取。

### 2.3 生命周期

```
评审开始
  ├─ 创建临时目录
  ├─ shallow clone + fetch PR ref（refs/pull/{n}/head）与 base
  ├─ 调 ocr review --from <base> --to <head> --format json
  ├─ 评审结果 → 写回 MongoDB（Review 集合）
  └─ 删除临时目录（或放入有上限的 LRU 缓存，稍后清理）
```

### 2.4 三类存储的边界

| 数据 | 存哪里 | 保留时间 |
|---|---|---|
| PR 原始数据 | MongoDB（PullRequest） | 长期 |
| 评审结果 / trace | MongoDB（Review） | 长期 |
| 前端展示缓存 | 浏览器内存（React Query） | 会话级 |
| **clone 出来的源码工作区** | **本地临时目录** | **一次性，用完删** |

### 2.5 安全与资源约束

1. **凭证不落盘**：clone 用 GitHub App installation token，通过 `git -c http.extraHeader=...` 在内存传递，不写入 `~/.git-credentials` 或仓库 URL。
2. **磁盘限额**：大仓库 shallow clone 也可能数百 MB。设置 LRU 上限（例如最多保留 5 个、总大小 1GB），评审完成即删。
3. **启动清理**：后端/worker 启动时清理一次历史残留目录，防止磁盘泄漏。

## 3. 部署上线后：仓库拉到哪里、谁访问

### 3.1 三类访问者分离

| 角色 | 需要什么 | 怎么拿到 |
|---|---|---|
| 前端浏览器 | diff、文件树、AI 建议、trace | 只调后端 REST API 拿 JSON，从不碰文件系统 |
| 后端 API 服务 | 任务管理、结果读写 | 读 MongoDB；把“要评审哪个 PR”交给队列 |
| OCR + 工作区 | 真实 `.git` 源码树 | 在**执行评审的那台机器/容器本地磁盘**上 clone |

### 3.2 部署形态 A：单机 / 单容器（最简单，先做这个）

```
浏览器 ──► 后端 Express（同一台机器/容器）
              │ spawn ocr
              ▼
         ocr CLI ──► 本地临时目录 clone 仓库
```

- 后端与 OCR 是父子进程，天然共享同一文件系统，无协调成本。
- 工作区为该容器/机器上的临时目录（挂足够大的 disk / ephemeral volume）。
- 前端通过 `GET /reviews/:id` 取结果，结果来自 MongoDB，不依赖这台机器的目录。

### 3.3 部署形态 B：多实例 / 后端与 worker 拆开（用户量上来后）

当部署平台不保证本地磁盘持久（多副本、自动伸缩、serverless）时，引入任务队列 + 独立 worker：

```
浏览器 ──► 前端静态资源（CDN）
              │
              ▼
        后端 Web API（无状态，多副本）
              │ 创建 Review(status=queued) + 投递任务
              ▼
         任务队列（Redis + BullMQ）
              │
              ▼
         Review Worker（有状态，独享/挂载磁盘）
              ├─ clone 仓库到 worker 本地磁盘
              ├─ spawn ocr 做评审
              ├─ 结果写回 MongoDB
              └─（可选）回写 GitHub PR
```

- Web API 无状态、可水平扩展：只负责登录、建任务、查结果。
- Worker 有状态、有磁盘：专门做“clone + 跑 OCR”。
- 前后端读到的都是 MongoDB 里的共享结果，与 worker 本地目录无关。

> 关键原则：**计算状态（源码树）留在 worker 本地临时盘；业务状态（评审结果）放进 MongoDB。**

### 3.4 OCR 与后端必须拆成两个进程/容器时

- 两个容器挂同一个 volume 到相同路径（如 `/workspace/repos`），保证看到同一份文件树。
- Docker Compose / K8s 可用 `emptyDir` 或 PVC。
- 更简单、更推荐的方案：**OCR 继续作为 worker 的 `child_process` 子进程**，共享文件系统自动成立，少一层运维。

## 4. 演进路线

| 阶段 | 部署方式 | 工作区在哪 |
|---|---|---|
| 现在（开发） | 本机跑后端 | `D:` 盘上的临时目录 |
| 第一次上线 | 单容器/单机 | 容器内临时目录 + 挂载 volume |
| 用户多了 | Web API 多副本 + 1 个 worker | worker 容器本地磁盘/PVC |
| 需要并发评审 | worker 队列 + 并发上限（信号量 / BullMQ concurrency） | 每个 worker 自己的磁盘，队列控制并发 |

## 5. 上线前必做的三项

1. **磁盘配额与清理**：worker 本地盘能装下 shallow clone 与并行任务临时树；设总大小上限和清理策略。
2. **凭证安全**：GitHub App installation token 通过 `git -c http.extraHeader` 在内存传，不落盘。
3. **触发方式升级**：从“用户手动粘贴 URL”升级为 **GitHub App webhook**，PR 打开/更新时自动入队评审。当前已有 GitHub App 与 OAuth 基础，做 webhook 是顺水推舟。

## 6. 与 roadmap 的关系

- 本文是 **阶段 1「仓库物化 + Analyzer 适配层」** 的设计依据。
- 阶段 1 先按“单机 + 本地临时目录”实现；阶段 4（回写 GitHub）与阶段 5（评测）都复用该工作区。
- 任务队列 / worker 拆分属于上线优化，不在 3 周 MVP 强制范围内，但接口设计要预留：`processReview` 的入口应可被队列 worker 复用。
