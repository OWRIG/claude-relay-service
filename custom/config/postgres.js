/**
 * PostgreSQL 配置
 * 用于对话记录功能的数据库连接配置
 */

module.exports = {
  // 是否启用对话记录功能
  enabled: process.env.CONVERSATION_LOG_ENABLED !== 'false',

  // PostgreSQL 连接配置
  connection: {
    host: process.env.PG_HOST || 'localhost',
    port: parseInt(process.env.PG_PORT, 10) || 5432,
    database: process.env.PG_DATABASE || 'postgres',
    user: process.env.PG_USER || 'postgres',
    password: process.env.PG_PASSWORD || ''
  },

  // 连接池配置
  pool: {
    max: parseInt(process.env.PG_POOL_SIZE, 10) || 10,
    min: 2,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000
  },

  // 对话记录配置
  logging: {
    // 最大响应内容捕获长度（字节），防止内存问题
    maxCaptureSize: parseInt(process.env.PG_MAX_CAPTURE_SIZE, 10) || 1024 * 1024, // 1MB
    // 是否保存完整的原始响应（非流式请求）
    saveRawResponse: process.env.PG_SAVE_RAW_RESPONSE !== 'false'
  }
}
