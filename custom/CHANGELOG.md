# 定制改造记录

记录所有对原项目的定制化改造，便于追踪和维护。

---

## 改造列表

### [2024-11-27] 初始化定制开发环境

**文件**：
- 新增：`custom/README.md` - 开发指南
- 新增：`custom/CHANGELOG.md` - 本文档
- 新增：`scripts/sync-upstream.sh` - 上游同步脚本

**说明**：
初始化定制开发框架，建立与上游同步机制

**Git 分支**：
- `main` - 与上游同步
- `dev` - 定制开发分支

**基于上游版本**: 1.1.211

---

## 改造记录模板

### [YYYY-MM-DD] 功能名称

**类型**：新增功能 / 修改功能 / Bug 修复 / 优化

**文件**：
- 新增：`custom/services/xxx.js`
- 修改：`src/services/yyy.js` (L123-125, L200-210)
- 删除：`src/utils/zzz.js`

**说明**：
详细描述改动内容、原因和影响范围

**配置**（如有）：
```bash
NEW_ENV_VAR=value
ANOTHER_VAR=value
```

**依赖变更**（如有）：
```bash
npm install some-package
```

**测试清单**：
- [ ] 新功能正常工作
- [ ] 原有功能不受影响
- [ ] API 响应正常
- [ ] Web 界面正常

**备注**：
其他需要注意的事项

---

## 上游同步记录

### [YYYY-MM-DD] 同步上游 vX.X.X

**上游版本**：vX.X.X
**同步前版本**：vX.X.X
**冲突文件**：
- `src/services/apiKeyService.js` - 已解决
- `config/config.js` - 已解决

**冲突处理**：
- `src/services/apiKeyService.js` (L123-125)
  - 保留定制的计费集成代码
  - 接受上游其他改动

**耗时**：约 X 分钟

**测试结果**：✅ 通过

---

## 统计信息

**定制文件数量**：
- Services: 0
- Routes: 0
- Middleware: 0
- Utils: 0

**核心文件修改**：
- `src/` 目录修改文件数: 0

**最后同步日期**：2024-11-27
**当前基于上游版本**：1.1.211

---

**维护者**: [团队名称]
**最后更新**: 2024-11-27
