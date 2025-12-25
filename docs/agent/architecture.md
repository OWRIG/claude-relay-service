# 架构概述

## 项目结构

```
src/
├── app.js                 # 应用入口
├── routes/                # 路由层
│   ├── admin/             # 管理后台路由
│   ├── api.js             # Claude API 路由
│   ├── geminiRoutes.js    # Gemini 路由
│   ├── openaiRoutes.js    # OpenAI 路由
│   └── droidRoutes.js     # Droid 路由
├── services/              # 业务逻辑层（30+ 服务）
│   ├── *AccountService.js # 各平台账户管理
│   ├── *RelayService.js   # 各平台请求转发
│   ├── unified*Scheduler.js # 统一调度器
│   └── apiKeyService.js   # API Key 管理
├── middleware/            # 中间件
│   └── auth.js            # API Key 认证
├── models/                # 数据层
│   └── redis.js           # Redis 连接
├── utils/                 # 工具函数
└── validators/            # 请求验证
```

## 核心架构概念

### 统一调度系统
- `unifiedClaudeScheduler` - Claude 多账户类型调度
- `unifiedGeminiScheduler` - Gemini 账户调度
- `unifiedOpenAIScheduler` - OpenAI 兼容调度
- `droidScheduler` - Droid 账户调度

### 认证流程
1. 客户端使用 API Key（`cr_` 前缀）发送请求
2. `authenticateApiKey` 中间件验证权限、限流、客户端限制
3. 统一调度器选择最优账户
4. 检查并刷新 OAuth token
5. 转发请求到目标 API
6. 记录使用统计和成本

### 多账户类型支持
- `claude-official` - Claude 官方 OAuth
- `claude-console` - Claude Console
- `bedrock` - AWS Bedrock
- `ccr` - CCR 凭据
- `gemini` - Google Gemini
- `openai-responses` - OpenAI Responses
- `azure-openai` - Azure OpenAI
- `droid` - Factory.ai

### 数据加密
敏感数据（refreshToken、accessToken、credentials）使用 AES 加密存储在 Redis。

### 粘性会话
基于请求内容 hash 的会话绑定，同一会话始终使用同一账户，支持自动续期。

## Redis 数据结构

关键键前缀：
- `api_key:{id}` - API Key 详情
- `api_key_hash:{hash}` - 哈希到 ID 映射
- `claude_account:{id}` - Claude 账户
- `gemini_account:{id}` - Gemini 账户
- `sticky_session:{hash}` - 粘性会话
- `concurrency:{accountId}` - 并发计数

## 前端架构

```
web/admin-spa/
├── src/
│   ├── views/             # 页面组件
│   ├── components/        # 可复用组件
│   ├── stores/            # Pinia 状态管理
│   ├── router/            # Vue Router
│   └── config/            # 配置
```

- **UI 框架**: Tailwind CSS
- **状态管理**: Pinia
- **图表**: 使用 composables/useChartConfig.js
