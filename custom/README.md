# 内部定制开发指南

## 📋 定制策略

**核心原则**：目录隔离 + 最小修改 + 清晰标记

- ✅ 新功能 → `custom/` 目录
- ✅ 修改核心 → 添加 `// CUSTOM:` 标记
- ✅ 定期同步上游更新

---

## 🌲 Git 分支策略

```
main (纯净分支，与上游同步)
  └── dev (所有定制开发都在这里)
```

**初始设置**：
```bash
# 添加上游仓库
git remote add upstream https://github.com/Wei-Shaw/claude-relay-service.git

# 创建开发分支
git checkout -b dev
```

**定期同步上游**：
```bash
# 1. 更新 main 分支
git checkout main
git fetch upstream
git merge upstream/main
git push origin main

# 2. 合并到 dev 分支
git checkout dev
git merge main
# 解决冲突（如有）

# 3. 推送
git push origin dev
```

---

## 📁 代码组织

### 目录结构
```
claude-relay-service/
├── src/              # 原项目代码（尽量少改）
├── custom/           # 定制扩展代码（完全自由）
│   ├── services/     # 自定义服务
│   ├── routes/       # 自定义路由
│   ├── middleware/   # 自定义中间件
│   ├── utils/        # 自定义工具
│   └── docs/         # 定制功能文档
└── config/
    └── config.js     # 配置文件（需修改）
```

### 代码规范

#### 1. 新增功能 → custom/ 目录

```javascript
// custom/services/myService.js
const logger = require('../../src/utils/logger')

module.exports = {
  async doSomething() {
    // 你的业务逻辑
  }
}
```

在原项目中引用：
```javascript
// src/services/someService.js
const myService = require('../../custom/services/myService')

async function existingFunction() {
  // 原有逻辑...

  // 调用定制服务
  await myService.doSomething()
}
```

#### 2. 修改现有代码 → 添加 CUSTOM 标记

```javascript
// src/services/apiKeyService.js

// ===== CUSTOM: 集成内部计费系统 =====
const internalBilling = require('../../custom/services/internalBillingService')

async function updateUsage(keyId, usage) {
  // 原有逻辑...

  // ===== CUSTOM: 记录到内部系统 =====
  await internalBilling.recordCost(keyId, cost)
  // ===== CUSTOM END =====
}
// ===== CUSTOM END =====
```

**标记格式**：
- 文件级修改：在文件顶部和底部添加 `// ===== CUSTOM: 说明 =====`
- 代码块修改：在代码块前后添加 `// ===== CUSTOM: 说明 =====` 和 `// ===== CUSTOM END =====`

**搜索定制代码**：
```bash
grep -rn "CUSTOM:" src/
```

---

## ⚙️ 配置管理

### config/config.js
```javascript
module.exports = {
  // 原有配置
  ...require('./config.example.js'),

  // ===== CUSTOM: 内部定制配置 =====
  internal: {
    billingAPI: process.env.INTERNAL_BILLING_API,
    authProvider: process.env.INTERNAL_AUTH_PROVIDER,
    webhooks: {
      notify: process.env.INTERNAL_NOTIFY_WEBHOOK,
    },
  },
  // ===== CUSTOM END =====
}
```

### .env
```bash
# 原有配置...

# ===== 内部定制配置 =====
INTERNAL_BILLING_API=https://internal.company.com/api
INTERNAL_AUTH_PROVIDER=ldap
INTERNAL_NOTIFY_WEBHOOK=https://internal.company.com/webhook
```

---

## 🔧 冲突处理

### 冲突处理优先级

| 文件类型 | 处理策略 | 说明 |
|---------|---------|------|
| `custom/*` | 不会冲突 | 你的独立代码 |
| `config/config.js` | 手动合并 | 保留定制配置，接受上游新增 |
| `src/*` 有 `CUSTOM:` 标记 | 保留标记内代码 | 其他部分接受上游改动 |
| `src/*` 无标记 | 接受上游改动 | 优先采用上游代码 |
| `package.json` | 接受上游 + 添加依赖 | 先接受上游，再添加定制依赖 |

### 冲突解决步骤

```bash
# 1. 查看冲突文件
git status

# 2. 搜索定制代码位置
grep -rn "CUSTOM:" src/

# 3. 编辑冲突文件
vim <冲突文件>
# - 保留 CUSTOM 标记内的代码
# - 接受上游对其他部分的改动
# - 解决冲突标记 (<<<<, ====, >>>>)

# 4. 标记已解决
git add <已解决的文件>

# 5. 完成合并
git commit -m "Merge upstream updates, resolve conflicts"

# 6. 推送
git push origin dev
```

---

## 📝 开发工作流

### 日常开发
```bash
# 1. 确保在 dev 分支
git checkout dev

# 2. 开发新功能
# - 新建服务: custom/services/xxx.js
# - 修改核心: 添加 CUSTOM 标记

# 3. 提交代码
git add .
git commit -m "Add: 功能描述"
git push origin dev
```

### 定期同步（建议每月一次）
```bash
# 使用脚本
bash scripts/sync-upstream.sh

# 或手动执行
git checkout main && git pull upstream main && git push origin main
git checkout dev && git merge main
# 解决冲突（如有）
git push origin dev
```

### 部署
```bash
git checkout dev
npm install
npm run build:web  # 如果有前端改动
docker-compose up -d
```

---

## 🛠️ 实用命令

```bash
# 搜索所有定制代码
grep -rn "CUSTOM:" src/

# 查看定制改动统计
git diff main dev --stat

# 查看某个文件的改动
git diff main dev -- src/services/apiKeyService.js

# 列出所有定制文件
ls -la custom/services/
ls -la custom/routes/

# 查看上游最新提交
git log --oneline --graph --decorate -10 upstream/main
```

---

## 📚 文档维护

### 必须维护的文档

1. **本文档** (`custom/README.md`) - 开发指南
2. **改造记录** (`custom/CHANGELOG.md`) - 记录每次定制
3. **`.env` 注释** - 说明定制环境变量

### 改造记录模板

```markdown
## [2024-XX-XX] 功能名称

**文件**：
- 新增：`custom/services/xxx.js`
- 修改：`src/services/yyy.js` (L123-125)

**说明**：
简要描述改动内容和原因

**配置**：
SOME_ENV_VAR=value

**测试**：
- [ ] 功能正常
- [ ] 原有功能不受影响
```

---

## ⚠️ 注意事项

### 开发规范
1. ✅ 新功能优先放在 `custom/` 目录
2. ✅ 修改核心代码时必须添加 `CUSTOM:` 标记
3. ✅ 所有定制配置添加 `CUSTOM` 注释
4. ✅ 提交前搜索确认标记完整：`grep -rn "CUSTOM:" src/`

### 同步规范
1. ✅ 定期同步上游（建议每月）
2. ✅ 合并前备份当前分支：`git branch backup-$(date +%Y%m%d)`
3. ✅ 解决冲突后完整测试
4. ✅ 记录冲突处理过程到 `custom/CHANGELOG.md`

### 团队协作
1. ✅ 修改核心文件前先与团队沟通
2. ✅ 定制功能添加注释说明
3. ✅ 重要改动更新 `custom/CHANGELOG.md`

---

## 🚀 快速参考

### 一次性设置
```bash
# 1. 添加上游
git remote add upstream https://github.com/Wei-Shaw/claude-relay-service.git

# 2. 创建 dev 分支
git checkout -b dev

# 3. 配置环境
cp .env.example .env
vim .env  # 添加定制配置
```

### 日常使用
```bash
# 开发
git checkout dev
# 编写代码...
git add . && git commit -m "xxx" && git push

# 同步
bash scripts/sync-upstream.sh

# 部署
git checkout dev && docker-compose up -d
```

---

**维护者**: [团队名称]
**最后更新**: 2024-11-27
**基于上游版本**: 1.1.211
