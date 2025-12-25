# 使用统计与审计系统设计

## 背景

当前系统使用 Redis 存储使用统计，存在以下限制：
- 请求详情只保留最近 200 条，无法做长期分析
- 不记录请求内容，无法审计工作流程
- 日数据 32 天后过期，无法生成季度/年度报表
- 按部门（tag）聚合需要实时计算，性能不佳

## 目标

1. **统计指标**：保留 1 年，支持热力图、趋势分析
2. **请求日志**：保留 2 个月，记录精简后的输入内容
3. **多维度查询**：按人、按 tag（部门）、按日期聚合
4. **低侵入性**：不影响现有 Redis 逻辑，SQLite 作为补充

## 技术选型

| 方案 | 优点 | 缺点 |
|------|------|------|
| **SQLite** ✅ | 零配置、单文件、嵌入式 | 并发写入有限（够用） |
| PostgreSQL | 功能强大、并发好 | 需要额外部署和维护 |
| 文件日志 | 最简单 | 查询困难 |

**选择 SQLite**：内部 100 人团队，写入 QPS < 100，SQLite 完全胜任。

## 数据库设计

### 表结构

```sql
-- 每日统计（按 API Key + 日期聚合，保留 1 年）
CREATE TABLE daily_stats (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    api_key_id TEXT NOT NULL,          -- API Key ID
    api_key_name TEXT,                  -- API Key 名称（冗余，便于查询）
    tags TEXT,                          -- JSON 数组，如 ["研发部", "后端组"]
    date TEXT NOT NULL,                 -- 日期 YYYY-MM-DD
    
    -- 请求统计
    requests INTEGER DEFAULT 0,         -- 请求次数
    
    -- Token 统计
    input_tokens INTEGER DEFAULT 0,
    output_tokens INTEGER DEFAULT 0,
    cache_create_tokens INTEGER DEFAULT 0,
    cache_read_tokens INTEGER DEFAULT 0,
    total_tokens INTEGER DEFAULT 0,
    
    -- 费用统计（单位：美元）
    cost REAL DEFAULT 0,
    
    -- 模型分布（JSON，如 {"claude-sonnet-4": 100, "claude-opus-4": 20}）
    model_distribution TEXT,
    
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(api_key_id, date)
);

-- 索引优化查询
CREATE INDEX idx_daily_stats_date ON daily_stats(date);
CREATE INDEX idx_daily_stats_api_key ON daily_stats(api_key_id);
CREATE INDEX idx_daily_stats_api_key_date ON daily_stats(api_key_id, date);

-- 请求日志（保留 2 个月）
CREATE TABLE request_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    api_key_id TEXT NOT NULL,           -- API Key ID
    api_key_name TEXT,                  -- API Key 名称
    tags TEXT,                          -- JSON 数组
    
    timestamp TEXT NOT NULL,            -- ISO 时间戳
    date TEXT NOT NULL,                 -- 日期（便于按天清理）
    
    -- 请求信息
    model TEXT,                         -- 使用的模型
    input_tokens INTEGER DEFAULT 0,
    output_tokens INTEGER DEFAULT 0,
    total_tokens INTEGER DEFAULT 0,
    cost REAL DEFAULT 0,
    
    -- 请求内容（智能提取后的精简结构，JSON 格式）
    request_summary TEXT,               -- 精简后的请求摘要（见提取策略）
    
    -- 快速筛选字段（从 request_summary 冗余提取）
    available_tools TEXT,               -- 工具名称列表，逗号分隔
    user_input_preview TEXT,            -- 第一条用户输入的前 200 字符
    tool_calls_count INTEGER DEFAULT 0, -- 工具调用次数
    
    -- 元信息
    account_id TEXT,                    -- 使用的账户 ID
    account_type TEXT,                  -- 账户类型
    session_hash TEXT,                  -- 会话 hash（可选）
    
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- 索引优化查询
CREATE INDEX idx_request_logs_date ON request_logs(date);
CREATE INDEX idx_request_logs_api_key ON request_logs(api_key_id);
CREATE INDEX idx_request_logs_api_key_date ON request_logs(api_key_id, date);
CREATE INDEX idx_request_logs_timestamp ON request_logs(timestamp);

-- 月度汇总（预聚合，提升查询性能）
CREATE TABLE monthly_stats (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    api_key_id TEXT NOT NULL,
    api_key_name TEXT,
    tags TEXT,
    month TEXT NOT NULL,                -- YYYY-MM
    
    requests INTEGER DEFAULT 0,
    input_tokens INTEGER DEFAULT 0,
    output_tokens INTEGER DEFAULT 0,
    total_tokens INTEGER DEFAULT 0,
    cost REAL DEFAULT 0,
    
    -- 活跃天数（用于计算日均）
    active_days INTEGER DEFAULT 0,
    
    model_distribution TEXT,
    
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(api_key_id, month)
);

CREATE INDEX idx_monthly_stats_month ON monthly_stats(month);
CREATE INDEX idx_monthly_stats_api_key ON monthly_stats(api_key_id);
```

### 数据保留策略

| 表 | 保留时长 | 清理方式 |
|-----|----------|----------|
| daily_stats | 365 天 | 每日定时任务删除过期数据 |
| request_logs | 60 天 | 每日定时任务删除过期数据 |
| monthly_stats | 永久 | 不删除（数据量小） |

### 存储估算

```
daily_stats:
  - 100 keys × 365 天 = 36,500 行
  - 每行约 500 字节 → 约 18 MB

request_logs（60天）:
  - 100 人 × 50 次/天 × 60 天 = 300,000 行
  - 每行约 2 KB（含 input_summary）→ 约 600 MB

月度汇总:
  - 100 keys × 12 月 × N 年 → 可忽略

总计：< 1 GB
```

## 模块设计

### 目录结构

```
src/
├── models/
│   ├── redis.js          # 现有 Redis 层（不变）
│   └── sqlite.js         # 新增 SQLite 层
├── services/
│   ├── apiKeyService.js  # 修改：写入时同步到 SQLite
│   └── analyticsService.js # 新增：统计查询服务
├── routes/
│   └── admin/
│       └── analytics.js  # 新增：统计 API 路由
└── tasks/
    └── cleanupSqlite.js  # 新增：定时清理任务
```

### 核心模块

#### 1. SQLite 数据层 (`src/models/sqlite.js`)

```javascript
// 主要方法
class SqliteClient {
  async connect()                    // 初始化数据库和表
  async disconnect()                 // 关闭连接
  
  // 写入
  async upsertDailyStats(data)       // 更新每日统计（UPSERT）
  async insertRequestLog(data)       // 插入请求日志
  async upsertMonthlyStats(data)     // 更新月度统计
  
  // 查询
  async getDailyStatsByApiKey(keyId, startDate, endDate)
  async getDailyStatsByTag(tag, startDate, endDate)
  async getRequestLogs(keyId, startDate, endDate, limit)
  async getHeatmapData(startDate, endDate, groupBy)
  async getTrendData(keyId, period, startDate, endDate)
  
  // 清理
  async cleanupOldData(retentionDays)
}
```

#### 2. 统计服务 (`src/services/analyticsService.js`)

```javascript
// 主要方法
class AnalyticsService {
  // 热力图数据（按人/按天的请求次数矩阵）
  async getHeatmapData(options)
  
  // 趋势数据（日/周/月聚合）
  async getTrendData(options)
  
  // 按 tag 聚合统计
  async getStatsByTag(tag, startDate, endDate)
  
  // 个人统计详情
  async getPersonStats(apiKeyId, startDate, endDate)
  
  // 请求日志查询
  async getRequestLogs(apiKeyId, options)
}
```

#### 3. API 路由 (`src/routes/admin/analytics.js`)

```
GET /admin/analytics/heatmap
    ?start_date=2025-01-01
    &end_date=2025-03-31
    &group_by=api_key|tag
    
GET /admin/analytics/trend
    ?api_key_id=xxx
    &period=day|week|month
    &start_date=2025-01-01
    &end_date=2025-03-31

GET /admin/analytics/by-tag/:tag
    ?start_date=2025-01-01
    &end_date=2025-03-31

GET /admin/analytics/person/:api_key_id
    ?start_date=2025-01-01
    &end_date=2025-03-31

GET /admin/analytics/request-logs/:api_key_id
    ?start_date=2025-01-01
    &end_date=2025-01-31
    &limit=100
```

## 数据写入流程

### 修改点：`apiKeyService.recordUsageWithDetails()`

```javascript
// 现有逻辑（保持不变）
await redis.incrementTokenUsage(...)
await redis.addUsageRecord(...)

// 新增：同步写入 SQLite（异步非阻塞）
const requestSummary = extractRequestSummary(requestBody)

sqliteClient.upsertDailyStats({
  apiKeyId,
  apiKeyName: keyData.name,
  tags: keyData.tags,
  date: today,
  requests: 1,
  inputTokens,
  outputTokens,
  cost,
  model
}).catch(err => logger.warn('SQLite daily stats write failed:', err))

sqliteClient.insertRequestLog({
  apiKeyId,
  apiKeyName: keyData.name,
  tags: keyData.tags,
  timestamp: new Date().toISOString(),
  model,
  inputTokens,
  outputTokens,
  cost,
  requestSummary: JSON.stringify(requestSummary),
  availableTools: requestSummary.available_tools.join(','),
  userInputPreview: getFirstUserInput(requestSummary, 200),
  toolCallsCount: requestSummary.interactions.filter(i => i.type === 'tool_call').length,
  accountId,
  accountType,
  sessionHash
}).catch(err => logger.warn('SQLite request log write failed:', err))
```

### 辅助函数

```javascript
function getFirstUserInput(summary, maxLength = 200) {
  const firstInput = summary.interactions.find(i => i.type === 'user_input')
  if (!firstInput) return ''
  const text = firstInput.text || ''
  return text.length > maxLength ? text.substring(0, maxLength) + '...' : text
}
```

### 输入内容智能提取策略

Claude Code 请求体结构复杂，包含大量重复/冗余信息。我们只提取**关键信息**：

#### Claude Code 请求体结构分析

```javascript
{
  model: "claude-sonnet-4-20250514",
  max_tokens: 16000,
  system: "...(系统提示，通常很长且重复)...",
  tools: [                              // 工具定义（重复，只需记录名称）
    { name: "Read", description: "..." },
    { name: "Write", description: "..." },
    { name: "Bash", description: "..." },
    // ...
  ],
  messages: [
    {
      role: "user",
      content: [
        { type: "text", text: "<system-reminder>...</system-reminder>" },  // 系统注入（忽略）
        { type: "text", text: "用户的实际输入" }                            // ✅ 保留
      ]
    },
    {
      role: "assistant",
      content: [
        { type: "text", text: "我来帮你..." },
        { type: "tool_use", id: "xxx", name: "Read", input: { file_path: "/src/app.js" } }  // ✅ 工具调用
      ]
    },
    {
      role: "user",
      content: [
        { type: "tool_result", tool_use_id: "xxx", content: "...文件内容（很长）..." }  // ⚠️ 只记录长度
      ]
    }
  ]
}
```

#### 提取规则

| 内容类型 | 处理方式 | 原因 |
|----------|----------|------|
| `system` | ❌ 忽略 | 每次请求重复，无审计价值 |
| `tools` 定义 | ✅ 只记录名称列表 | 知道有哪些工具即可 |
| `<system-reminder>` | ❌ 忽略 | 系统注入内容 |
| 用户 `text` | ✅ 完整保留 | 核心审计目标 |
| `tool_use` (assistant) | ✅ 记录工具名+输入摘要 | 知道调用了什么工具 |
| `tool_result` (user) | ⚠️ 只记录长度 | 文件内容太长，无需完整保存 |
| assistant `text` | ❌ 忽略 | 只关注输入，不关注返回 |

#### 提取后的精简结构

```javascript
{
  model: "claude-sonnet-4-20250514",
  available_tools: ["Read", "Write", "Bash", "Glob", "Grep"],  // 工具名称列表
  interactions: [
    {
      type: "user_input",
      text: "帮我重构一下 src/app.js 文件"
    },
    {
      type: "tool_call",
      tool: "Read",
      input: { file_path: "/src/app.js" }  // 工具输入通常很短
    },
    {
      type: "tool_result_ref",
      tool_use_id: "xxx",
      content_length: 15234  // 只记录长度
    },
    {
      type: "user_input",
      text: "把 handleRequest 函数拆分成两个"
    },
    {
      type: "tool_call",
      tool: "Edit",
      input: { file_path: "/src/app.js", old_string: "...", new_string: "..." }
    }
  ]
}
```

#### 实现代码

```javascript
function extractRequestSummary(requestBody) {
  const summary = {
    model: requestBody.model,
    available_tools: [],
    interactions: []
  }
  
  // 1. 提取工具名称列表
  if (Array.isArray(requestBody.tools)) {
    summary.available_tools = requestBody.tools.map(t => t.name).filter(Boolean)
  }
  
  // 2. 遍历 messages，提取关键信息
  const messages = requestBody.messages || []
  
  for (const msg of messages) {
    const content = msg.content
    
    // 处理 content 数组
    if (Array.isArray(content)) {
      for (const block of content) {
        // 用户文本输入（排除 system-reminder）
        if (block.type === 'text' && msg.role === 'user') {
          const text = block.text || ''
          if (!text.trimStart().startsWith('<system-reminder>')) {
            summary.interactions.push({
              type: 'user_input',
              text: text
            })
          }
        }
        
        // 工具调用（assistant 发起）
        if (block.type === 'tool_use') {
          summary.interactions.push({
            type: 'tool_call',
            tool: block.name,
            input: summarizeToolInput(block.input)  // 可能需要进一步精简
          })
        }
        
        // 工具结果（只记录长度）
        if (block.type === 'tool_result') {
          const contentStr = typeof block.content === 'string' 
            ? block.content 
            : JSON.stringify(block.content)
          summary.interactions.push({
            type: 'tool_result_ref',
            tool_use_id: block.tool_use_id,
            content_length: contentStr.length
          })
        }
      }
    }
    
    // 处理 content 为字符串的情况
    if (typeof content === 'string' && msg.role === 'user') {
      summary.interactions.push({
        type: 'user_input',
        text: content
      })
    }
  }
  
  return summary
}

// 工具输入精简（某些工具输入可能很大）
function summarizeToolInput(input) {
  if (!input) return input
  
  // Edit 工具的 old_string/new_string 可能很长，截断
  if (input.old_string && input.old_string.length > 500) {
    input.old_string = input.old_string.substring(0, 500) + '...[truncated]'
  }
  if (input.new_string && input.new_string.length > 500) {
    input.new_string = input.new_string.substring(0, 500) + '...[truncated]'
  }
  
  // Write 工具的 content 可能很长
  if (input.content && input.content.length > 1000) {
    input.content = input.content.substring(0, 1000) + '...[truncated]'
  }
  
  return input
}
```

#### 存储估算（精简后）

```
原始请求体：50-200 KB（含代码上下文）
精简后：1-5 KB

100人 × 50次/天 × 60天 × 3KB = 约 900 MB
```

相比原始存储（可能 30GB+），节省 97%+ 空间。

## 定时任务

### 数据清理 (`src/tasks/cleanupSqlite.js`)

```javascript
// 每天凌晨 3 点执行
cron.schedule('0 3 * * *', async () => {
  // 清理 60 天前的请求日志
  await sqliteClient.cleanupOldData('request_logs', 60)
  
  // 清理 365 天前的每日统计
  await sqliteClient.cleanupOldData('daily_stats', 365)
  
  // 执行 VACUUM 回收空间（每周日）
  if (new Date().getDay() === 0) {
    await sqliteClient.vacuum()
  }
})
```

### 月度汇总任务

```javascript
// 每月 1 号凌晨 4 点执行
cron.schedule('0 4 1 * *', async () => {
  // 汇总上个月的数据到 monthly_stats
  await analyticsService.aggregateMonthlyStats(lastMonth)
})
```

## 配置项

```javascript
// config/config.js 新增
analytics: {
  enabled: true,                    // 是否启用 SQLite 统计
  dbPath: './data/analytics.db',    // 数据库文件路径
  requestLogRetentionDays: 60,      // 请求日志保留天数
  dailyStatsRetentionDays: 365,     // 每日统计保留天数
  inputSummaryMaxLength: 1000,      // 输入摘要最大长度
  writeAsync: true                  // 异步写入（不阻塞请求）
}
```

## 前端展示（建议）

### 热力图

使用类似 GitHub contribution graph 的展示：
- X 轴：日期
- Y 轴：API Key（人）
- 颜色深度：请求次数/费用

### 趋势图

- 折线图展示日/周/月趋势
- 支持多指标切换（请求数、Token、费用）
- 支持按 tag 筛选

### 请求日志列表

- 表格展示
- 点击展开查看 input_summary
- 支持按日期、模型筛选

## 迁移策略

1. **第一阶段**：只写入新数据，不迁移历史
2. **第二阶段**：从 Redis 导出现有月度统计，导入 SQLite
3. **历史请求内容**：无法恢复（Redis 中没有存储）

## 风险与缓解

| 风险 | 缓解措施 |
|------|----------|
| SQLite 写入失败 | 异步写入 + catch，不影响主流程 |
| 数据库文件损坏 | 定期备份 data/analytics.db |
| 并发写入冲突 | SQLite WAL 模式 + 适当的锁超时 |
| 磁盘空间不足 | 监控 + 定时清理 + 告警 |

## 实施计划

| 阶段 | 内容 | 预计工作量 |
|------|------|------------|
| 1 | SQLite 数据层 + 表结构 | 2h |
| 2 | 修改写入逻辑 | 1h |
| 3 | 统计查询服务 + API | 3h |
| 4 | 定时清理任务 | 1h |
| 5 | 测试 + 调试 | 2h |

**总计约 1 天工作量**
