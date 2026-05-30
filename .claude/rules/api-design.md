# API设计
## 设计原则
遵循 RESTful API 风格

## 端点设计
### 用户模块
- POST /auth/login: 用户登录，获取访问令牌

### Github模块
- GET /pull-requests: 获取所有PR列表
- GET /pull-requests/{id}: 获取特定PR详情

### PR模块
- POST /reviews: 创建评审任务
- GET /reviews/{id}: 获取评审结果
- GET /reviews: 获取所有评审任务列表
