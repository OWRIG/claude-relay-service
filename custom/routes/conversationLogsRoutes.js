/**
 * 对话记录 Admin 路由
 * 提供对话记录查询和统计 API
 */

const express = require('express')
const router = express.Router()
const conversationQueryService = require('../services/conversationQueryService')
const logger = require('../../src/utils/logger')

/**
 * GET /admin/conversation-logs
 * 查询对话记录列表（分页+筛选）
 */
router.get('/', async (req, res) => {
  try {
    const {
      apiKeyId,
      apiKeyName,
      tag,
      accountId,
      model,
      startDate,
      endDate,
      status,
      page = '1',
      pageSize = '20',
      sortBy = 'created_at',
      sortOrder = 'desc'
    } = req.query

    const result = await conversationQueryService.queryLogs({
      apiKeyId,
      apiKeyName,
      tag,
      accountId,
      model,
      startDate,
      endDate,
      status,
      page: parseInt(page, 10),
      pageSize: parseInt(pageSize, 10),
      sortBy,
      sortOrder
    })

    res.json({
      success: true,
      ...result
    })
  } catch (error) {
    logger.error('❌ Failed to query conversation logs:', error)
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    })
  }
})

/**
 * GET /admin/conversation-logs/stats
 * 获取统计信息
 */
router.get('/stats', async (req, res) => {
  try {
    const stats = await conversationQueryService.getStats()

    res.json({
      success: true,
      data: stats
    })
  } catch (error) {
    logger.error('❌ Failed to get conversation stats:', error)
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    })
  }
})

/**
 * GET /admin/conversation-logs/:id
 * 获取单条记录详情
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params

    // UUID 格式验证
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid ID format',
        message: 'ID must be a valid UUID'
      })
    }

    const log = await conversationQueryService.getLogById(id)

    if (!log) {
      return res.status(404).json({
        success: false,
        error: 'Not found',
        message: 'Conversation log not found'
      })
    }

    res.json({
      success: true,
      data: log
    })
  } catch (error) {
    logger.error('❌ Failed to get conversation log by id:', error)
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    })
  }
})

module.exports = router
