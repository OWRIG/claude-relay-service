const { Pool } = require('pg')
const fs = require('fs')
const path = require('path')

// PostgreSQL 配置（优先使用 PG_ 前缀的环境变量）
const pool = new Pool({
  host: process.env.PG_HOST || process.env.POSTGRES_HOST || 'localhost',
  port: parseInt(process.env.PG_PORT || process.env.POSTGRES_PORT || '5433'),
  database: process.env.PG_DATABASE || process.env.POSTGRES_DB || 'postgres',
  user: process.env.PG_USER || process.env.POSTGRES_USER || 'pgvector',
  password: process.env.PG_PASSWORD || process.env.POSTGRES_PASSWORD || 'Aa123456'
})

async function initDatabase() {
  const client = await pool.connect()

  try {
    console.log('🔗 连接到 PostgreSQL...')

    // 读取 SQL 脚本
    const sqlPath = path.join(__dirname, '../custom/scripts/init-postgres.sql')
    const sql = fs.readFileSync(sqlPath, 'utf8')

    console.log('📄 执行初始化脚本...')

    // 执行 SQL（移除 \d 命令，因为它是 psql 特有的）
    const cleanSql = sql.replace(/\\d\s+\w+/g, '')

    await client.query(cleanSql)

    console.log('✅ 数据库表创建成功！')

    // 检查表是否存在
    const result = await client.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name = 'conversation_logs'
    `)

    if (result.rows.length > 0) {
      console.log('✓ conversation_logs 表已创建')

      // 显示表结构
      const columns = await client.query(`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_name = 'conversation_logs'
        ORDER BY ordinal_position
      `)

      console.log('\n📋 表结构:')
      columns.rows.forEach((col) => {
        const nullable = col.is_nullable === 'NO' ? 'NOT NULL' : ''
        console.log(`  - ${col.column_name}: ${col.data_type} ${nullable}`)
      })
    }
  } catch (error) {
    console.error('❌ 初始化失败:', error.message)
    throw error
  } finally {
    client.release()
    await pool.end()
  }
}

// 执行初始化
initDatabase()
  .then(() => {
    console.log('\n🎉 数据库初始化完成！')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n💥 初始化失败:', error)
    process.exit(1)
  })
