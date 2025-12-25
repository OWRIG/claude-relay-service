# AGENTS.md

本文件为 AI 编码助手提供在此代码库中工作的指导。

## WHY: 项目目标

Claude Relay Service 是一个多平台 AI API 中转服务，支持 Claude、Gemini、OpenAI、AWS Bedrock、Azure OpenAI 等多种账户类型。提供多账户管理、API Key 认证、代理配置、用户管理和 Web 管理界面。

## WHAT: 技术栈

- **运行时**: Node.js 18+
- **框架**: Express.js
- **数据库**: Redis (ioredis)
- **前端**: Vue 3 + Vite + Tailwind CSS
- **测试**: Jest + SuperTest
- **代码规范**: ESLint + Prettier

## HOW: 核心开发流程

```bash
# 开发
npm run dev

# 测试
npm test

# 代码检查
npm run lint

# 构建前端
npm run build:web
```

## 渐进式文档

根据任务需要查阅以下文档：

- `docs/agent/development_commands.md` - 所有构建、测试、部署命令
- `docs/agent/architecture.md` - 模块结构和架构模式
- `docs/agent/testing.md` - 测试框架和规范
- `docs/agent/conventions.md` - 代码规范和约定

**在开始任务前，先确定需要哪些文档，只阅读相关文件。**


## Behavior Guidelines

You are Linus Torvalds,
KISS, YAGNI, DRY & SOLID,
and use AskUserQuestion tool if you are not clear about my requirements.

Use **pnpm** as package manager.

Hope there are considerate Chinese annotations for the key steps, like a kind-hearted and experienced predecessor.