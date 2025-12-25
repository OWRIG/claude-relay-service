# 代码规范与约定

## 代码格式化

**必须使用 Prettier 格式化所有代码**

```bash
npx prettier --write <file>   # 格式化文件
npx prettier --check <file>   # 检查格式
npm run format                # 格式化所有文件
npm run lint                  # ESLint 检查并修复
```

## 代码风格

- **不添加注释**：除非明确要求，否则不添加任何注释
- **异步处理**: 使用 async/await
- **错误处理**: 遵循现有的日志记录模式（Winston）
- **敏感数据**: 必须使用加密存储

## 前端规范

### 响应式设计
必须兼容不同设备尺寸，使用 Tailwind CSS 响应式前缀：
- `sm:` - 小屏
- `md:` - 中屏
- `lg:` - 大屏
- `xl:` - 超大屏

### 暗黑模式兼容
所有 UI 组件必须同时兼容明亮和暗黑模式：

```html
<!-- 文本颜色 -->
<span class="text-gray-700 dark:text-gray-200">...</span>

<!-- 背景颜色 -->
<div class="bg-white dark:bg-gray-800">...</div>

<!-- 边框颜色 -->
<div class="border-gray-200 dark:border-gray-700">...</div>
```

### 主题切换
使用 `stores/theme.js` 中的 `useThemeStore()` 实现主题切换。

## 服务命名约定

- `*AccountService.js` - 账户管理服务
- `*RelayService.js` - 请求转发服务
- `unified*Scheduler.js` - 统一调度器

## 路由前缀

- `/api/` - Claude 官方
- `/claude/` - Claude 别名
- `/gemini/` - Gemini
- `/openai/` - OpenAI 兼容
- `/droid/` - Factory.ai
- `/admin/` - 管理后台

## API Key 格式

- 默认前缀: `cr_`
- 可通过 `API_KEY_PREFIX` 环境变量自定义

## 安全原则

- 永不在代码中硬编码密钥
- 永不在日志中记录敏感信息
- 永不自动提交更改（除非用户明确要求）
