/**
 * 自定义模型价格配置
 * Custom Model Pricing Configuration
 *
 * 使用方法 / Usage:
 * 1. 复制此文件为 customPricing.js
 *    Copy this file to customPricing.js
 *
 * 2. 修改你需要覆盖的模型价格
 *    Modify the model prices you want to override
 *
 * 3. 重启服务生效
 *    Restart the service to apply changes
 *
 * 价格单位: USD per token (不是百万token!)
 * Price unit: USD per token (NOT per million tokens!)
 *
 * 例如: $3/百万token = 0.000003
 * Example: $3/million tokens = 0.000003
 */

module.exports = {
  // Claude Sonnet 4 示例
  'claude-sonnet-4-20250514': {
    input_cost_per_token: 0.000003, // $3/MTok
    output_cost_per_token: 0.000015, // $15/MTok
    cache_creation_input_token_cost: 0.00000375, // $3.75/MTok (5分钟缓存)
    cache_read_input_token_cost: 0.0000003 // $0.30/MTok
  },

  // Claude Opus 4 示例
  'claude-opus-4-20250514': {
    input_cost_per_token: 0.000015, // $15/MTok
    output_cost_per_token: 0.000075, // $75/MTok
    cache_creation_input_token_cost: 0.00001875, // $18.75/MTok
    cache_read_input_token_cost: 0.0000015 // $1.5/MTok
  },

  // GPT-5 示例
  'gpt-5': {
    input_cost_per_token: 0.00000125, // $1.25/MTok
    output_cost_per_token: 0.00001, // $10/MTok
    cache_read_input_token_cost: 0.000000125 // $0.125/MTok
  }

  // 添加更多模型...
  // Add more models...
}
