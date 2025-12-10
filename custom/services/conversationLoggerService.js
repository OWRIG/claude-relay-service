/**
 * 对话记录服务
 * 负责记录 Claude API 对话到 PostgreSQL
 */

const postgresService = require('./postgresService')
const pgConfig = require('../config/postgres')
const logger = require('../../src/utils/logger')

class ConversationLoggerService {
  constructor() {
    this.maxCaptureSize = pgConfig.logging.maxCaptureSize
    this.saveRawResponse = pgConfig.logging.saveRawResponse
  }

  /**
   * 检查是否启用对话记录
   * @returns {boolean}
   */
  isEnabled() {
    return pgConfig.enabled && postgresService.isHealthy()
  }

  /**
   * 从 SSE 格式的响应中提取文本内容
   * @param {string} sseResponse - 完整的 SSE 响应字符串
   * @returns {string} 提取的文本内容
   */
  extractContentFromSSE(sseResponse) {
    const textParts = []
    const lines = sseResponse.split('\n')

    for (const line of lines) {
      if (line.startsWith('data:')) {
        const jsonStr = line.slice(5).trim()
        if (!jsonStr || jsonStr === '[DONE]') {
          continue
        }

        try {
          const data = JSON.parse(jsonStr)
          // 提取 content_block_delta 中的文本
          if (
            data.type === 'content_block_delta' &&
            data.delta?.type === 'text_delta' &&
            data.delta?.text
          ) {
            textParts.push(data.delta.text)
          }
        } catch (e) {
          // 忽略解析错误
          logger.debug('Failed to parse SSE line:', jsonStr.substring(0, 50))
        }
      }
    }

    return textParts.join('')
  }

  /**
   * 清理和验证数据
   * @param {any} data - 要清理的数据
   * @param {number} maxLength - 最大长度
   * @returns {any}
   */
  _sanitizeData(data, maxLength = null) {
    if (data === null || data === undefined) {
      return null
    }

    // 字符串类型
    if (typeof data === 'string') {
      if (maxLength && data.length > maxLength) {
        return `${data.substring(0, maxLength)}... [truncated]`
      }
      return data
    }

    // 对象类型（转为 JSON 字符串后检查长度）
    if (typeof data === 'object') {
      const jsonStr = JSON.stringify(data)
      if (maxLength && jsonStr.length > maxLength) {
        return { _truncated: true, _originalLength: jsonStr.length }
      }
      return data
    }

    return data
  }

  /**
   * 记录对话
   * @param {Object} params - 对话参数
   */
  async logConversation({
    apiKeyId,
    apiKeyName,
    apiKeyTag,
    accountId,
    accountType,
    model,
    requestMessages,
    requestSystem,
    responseContent,
    responseRaw,
    inputTokens,
    outputTokens,
    totalTokens,
    cacheCreateTokens,
    cacheReadTokens,
    responseTimeMs,
    statusCode,
    errorMessage,
    clientIp,
    userAgent
  }) {
    // 检查是否启用
    if (!this.isEnabled()) {
      logger.debug('Conversation logging disabled or PostgreSQL not healthy')
      return
    }

    // 验证必需字段
    if (!apiKeyId) {
      logger.warn('Cannot log conversation: apiKeyId is required')
      return
    }

    try {
      // 清理和验证数据
      const sanitizedRequestMessages = this._sanitizeData(requestMessages, this.maxCaptureSize)
      const sanitizedRequestSystem = this._sanitizeData(requestSystem, this.maxCaptureSize)
      const sanitizedResponseContent = this._sanitizeData(responseContent, this.maxCaptureSize)
      const sanitizedResponseRaw = this.saveRawResponse
        ? this._sanitizeData(responseRaw, this.maxCaptureSize)
        : null

      // 插入数据库
      const sql = `
        INSERT INTO conversation_logs (
          api_key_id, api_key_name, api_key_tag,
          account_id, account_type,
          model,
          request_messages, request_system,
          response_content, response_raw,
          input_tokens, output_tokens, cache_create_tokens, cache_read_tokens, total_tokens,
          response_time_ms, status_code, error_message,
          client_ip, user_agent
        ) VALUES (
          $1, $2, $3,
          $4, $5,
          $6,
          $7, $8,
          $9, $10,
          $11, $12, $13, $14, $15,
          $16, $17, $18,
          $19, $20
        ) RETURNING id
      `

      const values = [
        apiKeyId,
        apiKeyName || null,
        apiKeyTag || null,
        accountId || null,
        accountType || null,
        model || null,
        sanitizedRequestMessages || null,
        sanitizedRequestSystem || null,
        sanitizedResponseContent || null,
        sanitizedResponseRaw || null,
        inputTokens || 0,
        outputTokens || 0,
        cacheCreateTokens || 0,
        cacheReadTokens || 0,
        totalTokens || 0,
        responseTimeMs || null,
        statusCode || null,
        errorMessage || null,
        clientIp || null,
        userAgent || null
      ]

      const result = await postgresService.query(sql, values)
      const logId = result.rows[0].id

      logger.debug(`📝 Conversation logged: ${logId}`, {
        apiKeyId,
        model,
        tokens: { input: inputTokens, output: outputTokens }
      })

      return logId
    } catch (error) {
      // 记录错误但不影响主流程
      logger.error('❌ Failed to log conversation:', {
        error: error.message,
        apiKeyId,
        model
      })
    }
  }

  /**
   * 初始化服务（预留，表已通过 SQL 脚本创建）
   */
  async initialize() {
    if (!this.isEnabled()) {
      logger.info('📊 Conversation logging not enabled')
      return
    }

    try {
      // 检查表是否存在
      const sql = `
        SELECT EXISTS (
          SELECT FROM information_schema.tables
          WHERE table_schema = 'public'
          AND table_name = 'conversation_logs'
        )
      `
      const result = await postgresService.query(sql)
      const tableExists = result.rows[0].exists

      if (tableExists) {
        logger.info('✅ Conversation logs table verified')
      } else {
        logger.warn('⚠️  Conversation logs table not found, please run init-postgres.sql')
      }
    } catch (error) {
      logger.error('❌ Failed to verify conversation logs table:', error.message)
    }
  }
}

// 导出单例
module.exports = new ConversationLoggerService()
