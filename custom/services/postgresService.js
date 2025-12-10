/**
 * PostgreSQL 连接池服务
 * 用于对话记录功能的数据库连接管理
 */

const { Pool } = require('pg')
const pgConfig = require('../config/postgres')
const logger = require('../../src/utils/logger')

class PostgresService {
  constructor() {
    this.pool = null
    this.isConnected = false
    this.isInitializing = false
  }

  /**
   * 初始化连接池
   */
  async initialize() {
    // 如果已经初始化或正在初始化，直接返回
    if (this.pool || this.isInitializing) {
      return this.pool
    }

    // 检查是否启用
    if (!pgConfig.enabled) {
      logger.info('📊 PostgreSQL conversation logging is disabled')
      return null
    }

    this.isInitializing = true

    try {
      // 创建连接池
      this.pool = new Pool({
        ...pgConfig.connection,
        ...pgConfig.pool
      })

      // 监听连接事件
      this.pool.on('connect', () => {
        this.isConnected = true
        logger.debug('🔗 PostgreSQL client connected')
      })

      this.pool.on('error', (err) => {
        this.isConnected = false
        logger.error('❌ PostgreSQL pool error:', err)
      })

      this.pool.on('remove', () => {
        logger.debug('🔌 PostgreSQL client removed from pool')
      })

      // 测试连接
      const client = await this.pool.connect()
      await client.query('SELECT NOW()')
      client.release()

      this.isConnected = true
      logger.info('✅ PostgreSQL connection pool initialized successfully')
      logger.info(
        `📊 Pool config: max=${pgConfig.pool.max}, database=${pgConfig.connection.database}`
      )

      return this.pool
    } catch (error) {
      this.isConnected = false
      this.pool = null
      logger.error('💥 Failed to initialize PostgreSQL:', error.message)
      throw error
    } finally {
      this.isInitializing = false
    }
  }

  /**
   * 执行查询
   * @param {string} sql - SQL 查询语句
   * @param {Array} params - 查询参数
   * @returns {Promise<Object>} 查询结果
   */
  async query(sql, params = []) {
    if (!this.pool) {
      throw new Error('PostgreSQL pool not initialized')
    }

    try {
      const result = await this.pool.query(sql, params)
      return result
    } catch (error) {
      logger.error('❌ PostgreSQL query error:', {
        sql: sql.substring(0, 100), // 只记录前100字符
        error: error.message
      })
      throw error
    }
  }

  /**
   * 获取连接池
   * @returns {Pool|null}
   */
  getPool() {
    return this.pool
  }

  /**
   * 健康检查
   * @returns {Promise<Object>}
   */
  async healthCheck() {
    if (!pgConfig.enabled) {
      return {
        status: 'disabled',
        message: 'Conversation logging disabled'
      }
    }

    if (!this.pool) {
      return {
        status: 'not_initialized',
        message: 'Pool not initialized'
      }
    }

    try {
      const client = await this.pool.connect()
      const result = await client.query('SELECT NOW() as now, version() as version')
      client.release()

      return {
        status: 'healthy',
        connected: this.isConnected,
        database: pgConfig.connection.database,
        host: pgConfig.connection.host,
        port: pgConfig.connection.port,
        poolSize: pgConfig.pool.max,
        timestamp: result.rows[0].now,
        version: `${result.rows[0].version.split(' ')[0]} ${result.rows[0].version.split(' ')[1]}`
      }
    } catch (error) {
      return {
        status: 'unhealthy',
        connected: false,
        error: error.message
      }
    }
  }

  /**
   * 关闭连接池
   */
  async close() {
    if (this.pool) {
      try {
        await this.pool.end()
        this.isConnected = false
        this.pool = null
        logger.info('👋 PostgreSQL connection pool closed')
      } catch (error) {
        logger.error('❌ Error closing PostgreSQL pool:', error)
        throw error
      }
    }
  }

  /**
   * 获取连接状态
   * @returns {boolean}
   */
  isHealthy() {
    return this.isConnected && this.pool !== null
  }
}

// 导出单例
module.exports = new PostgresService()
