/**
 * 对话查询服务
 * 提供对话记录的查询、统计功能
 */

const postgresService = require('./postgresService')
const logger = require('../../src/utils/logger')

class ConversationQueryService {
  /**
   * 分页查询对话记录
   * @param {Object} params - 查询参数
   * @returns {Promise<Object>}
   */
  async queryLogs({
    apiKeyId,
    apiKeyName,
    tag,
    accountId,
    model,
    startDate,
    endDate,
    status, // 'success' or 'error'
    page = 1,
    pageSize = 20,
    sortBy = 'created_at',
    sortOrder = 'desc'
  }) {
    try {
      // 限制每页条数
      const limit = Math.min(Math.max(1, pageSize), 100)
      const offset = (page - 1) * limit

      // 构建 WHERE 条件
      const conditions = []
      const params = []
      let paramIndex = 1

      if (apiKeyId) {
        conditions.push(`api_key_id = $${paramIndex++}`)
        params.push(apiKeyId)
      }

      if (apiKeyName) {
        conditions.push(`api_key_name ILIKE $${paramIndex++}`)
        params.push(`%${apiKeyName}%`)
      }

      if (tag) {
        conditions.push(`api_key_tag = $${paramIndex++}`)
        params.push(tag)
      }

      if (accountId) {
        conditions.push(`account_id = $${paramIndex++}`)
        params.push(accountId)
      }

      if (model) {
        conditions.push(`model = $${paramIndex++}`)
        params.push(model)
      }

      if (startDate) {
        conditions.push(`created_at >= $${paramIndex++}`)
        params.push(startDate)
      }

      if (endDate) {
        conditions.push(`created_at <= $${paramIndex++}`)
        params.push(endDate)
      }

      if (status === 'success') {
        conditions.push(`status_code >= 200 AND status_code < 300`)
      } else if (status === 'error') {
        conditions.push(`(status_code < 200 OR status_code >= 300)`)
      }

      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''

      // 验证排序字段和方向
      const allowedSortFields = ['created_at', 'response_time_ms', 'total_tokens', 'status_code']
      const validSortBy = allowedSortFields.includes(sortBy) ? sortBy : 'created_at'
      const validSortOrder = sortOrder.toLowerCase() === 'asc' ? 'ASC' : 'DESC'

      // 查询总数
      const countSql = `SELECT COUNT(*) FROM conversation_logs ${whereClause}`
      const countResult = await postgresService.query(countSql, params)
      const total = parseInt(countResult.rows[0].count)

      // 查询数据（不包含大字段）
      const dataSql = `
        SELECT
          id, api_key_id, api_key_name, api_key_tag,
          account_id, account_type,
          model,
          input_tokens, output_tokens, cache_create_tokens, cache_read_tokens, total_tokens,
          response_time_ms, status_code,
          created_at
        FROM conversation_logs
        ${whereClause}
        ORDER BY ${validSortBy} ${validSortOrder}
        LIMIT $${paramIndex++} OFFSET $${paramIndex++}
      `
      const dataParams = [...params, limit, offset]
      const dataResult = await postgresService.query(dataSql, dataParams)

      // 查询可用的标签和模型
      const tagsResult = await postgresService.query(
        'SELECT DISTINCT api_key_tag FROM conversation_logs WHERE api_key_tag IS NOT NULL ORDER BY api_key_tag'
      )
      const modelsResult = await postgresService.query(
        'SELECT DISTINCT model FROM conversation_logs WHERE model IS NOT NULL ORDER BY model'
      )

      return {
        data: dataResult.rows,
        total,
        page,
        pageSize: limit,
        totalPages: Math.ceil(total / limit),
        availableTags: tagsResult.rows.map((r) => r.api_key_tag),
        availableModels: modelsResult.rows.map((r) => r.model)
      }
    } catch (error) {
      logger.error('❌ Failed to query conversation logs:', error)
      throw error
    }
  }

  /**
   * 获取单条记录详情
   * @param {string} id - 记录ID
   * @returns {Promise<Object|null>}
   */
  async getLogById(id) {
    try {
      const sql = `
        SELECT * FROM conversation_logs WHERE id = $1
      `
      const result = await postgresService.query(sql, [id])

      if (result.rows.length === 0) {
        return null
      }

      return result.rows[0]
    } catch (error) {
      logger.error('❌ Failed to get conversation log by id:', error)
      throw error
    }
  }

  /**
   * 获取统计信息
   * @returns {Promise<Object>}
   */
  async getStats() {
    try {
      // 总对话数和今日对话数
      const countSql = `
        SELECT
          COUNT(*) as total_conversations,
          COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE) as today_conversations
        FROM conversation_logs
      `
      const countResult = await postgresService.query(countSql)

      // Token 使用统计
      const tokenSql = `
        SELECT
          COALESCE(SUM(input_tokens), 0) as total_input_tokens,
          COALESCE(SUM(output_tokens), 0) as total_output_tokens,
          COALESCE(SUM(cache_create_tokens), 0) as total_cache_create_tokens,
          COALESCE(SUM(cache_read_tokens), 0) as total_cache_read_tokens,
          COALESCE(SUM(total_tokens), 0) as total_all_tokens
        FROM conversation_logs
      `
      const tokenResult = await postgresService.query(tokenSql)

      // 按模型分组统计
      const modelSql = `
        SELECT
          model,
          COUNT(*) as count,
          COALESCE(SUM(total_tokens), 0) as total_tokens
        FROM conversation_logs
        WHERE model IS NOT NULL
        GROUP BY model
        ORDER BY count DESC
        LIMIT 10
      `
      const modelResult = await postgresService.query(modelSql)

      return {
        totalConversations: parseInt(countResult.rows[0].total_conversations),
        todayConversations: parseInt(countResult.rows[0].today_conversations),
        totalTokens: {
          input: parseInt(tokenResult.rows[0].total_input_tokens),
          output: parseInt(tokenResult.rows[0].total_output_tokens),
          cacheCreate: parseInt(tokenResult.rows[0].total_cache_create_tokens),
          cacheRead: parseInt(tokenResult.rows[0].total_cache_read_tokens),
          total: parseInt(tokenResult.rows[0].total_all_tokens)
        },
        byModel: modelResult.rows.map((row) => ({
          model: row.model,
          count: parseInt(row.count),
          totalTokens: parseInt(row.total_tokens)
        }))
      }
    } catch (error) {
      logger.error('❌ Failed to get conversation stats:', error)
      throw error
    }
  }

  /**
   * 获取可用的标签列表
   * @returns {Promise<Array<string>>}
   */
  async getAvailableTags() {
    try {
      const sql = `
        SELECT DISTINCT api_key_tag
        FROM conversation_logs
        WHERE api_key_tag IS NOT NULL
        ORDER BY api_key_tag
      `
      const result = await postgresService.query(sql)
      return result.rows.map((r) => r.api_key_tag)
    } catch (error) {
      logger.error('❌ Failed to get available tags:', error)
      throw error
    }
  }

  /**
   * 获取可用的模型列表
   * @returns {Promise<Array<string>>}
   */
  async getAvailableModels() {
    try {
      const sql = `
        SELECT DISTINCT model
        FROM conversation_logs
        WHERE model IS NOT NULL
        ORDER BY model
      `
      const result = await postgresService.query(sql)
      return result.rows.map((r) => r.model)
    } catch (error) {
      logger.error('❌ Failed to get available models:', error)
      throw error
    }
  }
}

// 导出单例
module.exports = new ConversationQueryService()
