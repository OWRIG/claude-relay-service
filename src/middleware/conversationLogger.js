const fs = require('fs')
const path = require('path')

const config = require('../../config/config')
const logger = require('../utils/logger')

const TARGET_PATH_PREFIXES = ['/api/', '/claude/', '/gemini/', '/openai/', '/droid/']
const LOG_ROOT = path.join(process.cwd(), 'logs', 'conversations')

const buildLogEntry = (req) => {
  return {
    timestamp: new Date().toISOString(),
    requestId: req.id || `req_${Date.now()}`,
    apiKeyId: req.apiKeyId || req.apiKey?.id || 'unknown',
    apiKeyName: req.apiKeyName || req.apiKey?.name || null,
    userId: req.userId || req.user?.id || null,
    method: req.method,
    path: req.path,
    model: req.body?.model || null,
    messages: req.body?.messages || null,
    systemPrompt: req.body?.system || null,
    metadata: {
      ip: req.ip || req.connection?.remoteAddress,
      userAgent: req.headers['user-agent'],
      contentLength: req.headers['content-length']
    }
  }
}

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
