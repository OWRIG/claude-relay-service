# 测试指南

## 测试框架

- **框架**: Jest
- **HTTP 测试**: SuperTest
- **配置**: 项目根目录默认 Jest 配置

## 测试文件位置

```
tests/
├── concurrencyQueue.test.js           # 并发队列单元测试
├── concurrencyQueue.integration.test.js # 并发队列集成测试
└── userMessageQueue.test.js           # 用户消息队列测试
```

## 运行测试

```bash
npm test                  # 运行所有测试
npx jest <file>           # 运行单个测试文件
npx jest --watch          # 监听模式
npx jest --coverage       # 生成覆盖率报告
```

## 测试脚本

项目包含多个专用测试脚本：

```bash
node scripts/test-pricing-fallback.js  # 测试价格回退
node scripts/test-gemini-refresh.js    # 测试 Gemini token 刷新
node scripts/test-model-mapping.js     # 测试模型映射
node scripts/test-api-response.js      # 测试 API 响应
node scripts/test-bedrock-models.js    # 测试 Bedrock 模型
```

## 测试模式

现有测试主要覆盖：
- 并发请求排队机制
- 用户消息队列逻辑
- Redis 操作

编写新测试时参考 `tests/` 目录下的现有测试模式。
