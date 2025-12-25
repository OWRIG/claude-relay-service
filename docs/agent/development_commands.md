# 开发命令参考

## 开发与运行

```bash
npm run dev                    # 开发模式（热重载，使用 nodemon）
npm start                      # 生产模式（先 lint 后启动）
npm run setup                  # 初始化配置和管理员账户
```

## 服务管理

```bash
npm run service:start:daemon   # 后台启动（推荐）
npm run service:stop           # 停止服务
npm run service:restart:daemon # 后台重启
npm run service:status         # 查看服务状态
npm run service:logs           # 查看日志
npm run service:logs:follow    # 实时跟踪日志
npm run status                 # 统一状态脚本
npm run status:detail          # 详细状态
npm run monitor                # 增强监控
```

## 测试

```bash
npm test                       # 运行所有测试（Jest）
npm run lint                   # ESLint 检查并自动修复
npm run lint:check             # ESLint 仅检查
npm run format                 # Prettier 格式化
npm run format:check           # Prettier 检查
```

## 前端构建

```bash
npm run install:web            # 安装前端依赖
npm run build:web              # 构建前端（生成 dist）
```

## Docker 部署

```bash
npm run docker:build           # 构建镜像
npm run docker:up              # 启动容器
npm run docker:down            # 停止容器
docker-compose up -d           # 推荐方式
```

## 数据管理

```bash
npm run data:export            # 导出 Redis 数据
npm run data:import            # 导入数据
npm run data:export:sanitized  # 导出脱敏数据
npm run data:export:enhanced   # 增强导出（含解密）
npm run data:debug             # 调试 Redis 键
```

## 迁移与修复

```bash
npm run migrate:apikey-expiry      # API Key 过期迁移
npm run migrate:apikey-expiry:dry  # 干跑模式
npm run migrate:fix-usage-stats    # 修复使用统计
npm run init:costs                 # 初始化成本数据
npm run update:pricing             # 更新模型价格
```

## CLI 工具

```bash
npm run cli                    # CLI 入口
npm run cli keys list          # 列出 API Keys
npm run cli accounts list      # 列出账户
npm run cli admin list         # 列出管理员
```
