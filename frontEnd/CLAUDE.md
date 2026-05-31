# 前端
## 样式风格
科技感，暗黑色为主色，毛玻璃质感。

## 项目结构

```
frontEnd/
    modules/
        [module-name]/
            components/
            hooks/
            styles/
            services/  # 封装的axios方法
    shared/
```

## 模块
### 主页(与登录页合并)
居中展示项目名。
如果未登录，展示“登录github”按钮，反之展示输入框与“分析”按钮。

#### 预期状态管理
- PRUrl

### PR列表页（历史评审）
展示当前用户的所有评审记录列表，以卡片形式呈现。每个卡片显示：
- PR 标题、作者、状态（open/closed/merged）
- 评审风险等级（low/medium/high）与评分
- 评审完成时间

支持按状态过滤（pending/analyzing/completed/failed）和分页。点击卡片跳转到分析页查看详情。

#### 预期状态管理
- reviewList: Review[]
- filterStatus: string | undefined
- pagination: { page, limit, total, totalPages }

### 分析页
顶端显示PR标题与PR作者，下方Tab切换总览和具体变更显示：
- 总览
    顶端显示目标分支与原分支。左侧栏显示commit列表，主区域显示AI总结文本
- 具体变更
    左侧栏展示本次PR的变更文件，主区域展示当前选择文件的diff。在comment对应行数右侧空白区域，显示Popover卡片，展示comment具体内容。

#### 预期状态管理
- tabDisplay: "overview" | "changes"
- reviewStatus: "pending" | "analyzing" | "completed" | "failed"

#### AI分析流程
1. 当用户点击分析PR后，前端向后端发送`POST /reviews`请求，分析会在后端进行。
2. 前端需要不断轮询，直到`GET /reviews/:id`端口有数据返回为止，或者"reviewStatus"为"completed" | "failed"为止。
3. 如果遇到非200响应码，直接将reviewStatus设置为"failed"，停止轮询。
4. 根据`GET /reviews/:id`端口返回的"status"字段，判断"reviewStatus"的值，渲染对应反馈组件。
