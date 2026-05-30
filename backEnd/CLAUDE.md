# 后端
## 项目结构

```
backEnd/
    modules/
        [module-name]/
            models/  # 数据库模型
            controllers/  # 端点
            services/  # 服务层
    shared/
```

## 模块
### 用户模块 Auth
处理用户授权与认证相关的逻辑，例如 OAuth 第三方(Github)登录，处理授权码与访问令牌；签发 JWT token。 

### Github模块 Github
从 Github 中获取用户PR信息。
- 根据 PR URL 解析 owner/repo/pullNumber。

- 获取 PR 基本信息、变更文件列表。

- 获取 PR 的 diff、commits、comments。

### AI分析模块 Analyzer
处理与LLM交互的逻辑，负责生成代码评审建议，包括以下功能：
- 调用LLM API
- 总结变更
- 分析代码风险
- 生成建议
- 缓存LLM回复
- 将回复解析为JSON

### PR模块 PullRequest
创建与查询评审任务。关联 Github 模块中的PR，存储 Analyzer 模块生成的结果。

## API设计
请参照 `.claude/rules/api-design.md`

## 数据库设计
请参照 `.claude/rules/database.md`