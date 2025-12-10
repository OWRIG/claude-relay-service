const fs = require('fs')
const path = require('path')

const config = require('../../config/config')
const logger = require('../utils/logger')

const TARGET_PATH_PREFIXES = ['/api/', '/claude/', '/gemini/', '/openai/', '/droid/']
const LOG_ROOT = path.join(process.cwd(), 'logs', 'conversations')

/**
 * 提取用户最新的消息内容（用于监控，不记录完整历史）
 */
const extractUserMessage = (messages) => {
  if (!messages || !Array.isArray(messages)) {
    return null
  }

  // 从后往前找最后一条用户消息
  for (let i = messages.length - 1; i >= 0; i--) {
    const msg = messages[i]
    if (msg.role === 'user') {
      // 如果是简单文本
      if (typeof msg.content === 'string') {
        return msg.content
      }
      // 如果是数组格式（Claude API格式）
      if (Array.isArray(msg.content)) {
        const textContents = msg.content
          .filter((item) => item.type === 'text')
          .map((item) => item.text)
          .join('\n')
        return textContents || null
      }
    }
  }

  return null
}

const buildLogEntry = (req) => ({
  timestamp: new Date().toISOString(),
  requestId: req.id || `req_${Date.now()}`,
  apiKeyId: req.apiKeyId || req.apiKey?.id || 'unknown',
  apiKeyName: req.apiKeyName || req.apiKey?.name || null,
  userId: req.userId || req.user?.id || null,
  method: req.method,
  path: req.path,
  model: req.body?.model || null,
  // 只记录用户最新消息，不记录完整历史
  userMessage: extractUserMessage(req.body?.messages),
  messageCount: req.body?.messages?.length || 0,
  // 不记录 systemPrompt（对监控无意义且占用空间大）
  metadata: {
    ip: req.ip || req.connection?.remoteAddress,
    userAgent: req.headers['user-agent'],
    contentLength: req.headers['content-length']
  }
})

const writeLogAsync = async (logEntry) => {
  const date = new Date().toISOString().split('T')[0]
  const apiKeyId = logEntry.apiKeyId || 'unknown'

  const dirPath = path.join(LOG_ROOT, date)
  const filePath = path.join(dirPath, `${apiKeyId}.jsonl`)

  await fs.promises.mkdir(dirPath, { recursive: true })

  const line = `${JSON.stringify(logEntry)}\n`
  await fs.promises.appendFile(filePath, line, 'utf8')
}

const conversationLogger = (req, res, next) => {
  if (!config.conversationLogging?.enabled) {
    return next()
  }

  if (req.method !== 'POST') {
    return next()
  }

  if (!TARGET_PATH_PREFIXES.some((prefix) => req.path.startsWith(prefix))) {
    return next()
  }

  res.on('finish', async () => {
    try {
      const logEntry = buildLogEntry(req)
      await writeLogAsync(logEntry)
    } catch (error) {
      logger.error('Conversation log write failed', { error: error.message })
    }
  })

  next()
}

module.exports = conversationLogger
