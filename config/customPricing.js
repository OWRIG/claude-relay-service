/**
 * 自定义模型价格配置
 * Custom Model Pricing Configuration
 *
 * 价格单位: USD per token (不是百万token!)
 * Price unit: USD per token (NOT per million tokens!)
 *
 * 例如: $3/百万token = 0.000003
 * Example: $3/million tokens = 0.000003
 *
 * 费用计算使用的是请求中的原始模型名（映射前），不是映射后的名称
 */

module.exports = {
  // minimax-m2.1 模型价格（按人民币计算，当作美元使用）
  // 输入: ￥2.1/MTok = 0.0000021
  // 输出: ￥8.4/MTok = 0.0000084
  // 缓存创建(写入): ￥2.625/MTok = 0.000002625
  // 缓存读取: ￥0.21/MTok = 0.00000021
  'minimax-m2.1': {
    input_cost_per_token: 0.0000021,
    output_cost_per_token: 0.0000084,
    cache_creation_input_token_cost: 0.000002625,
    cache_read_input_token_cost: 0.00000021
  },
  'claude-sonnet-4-5-20250929': {
    input_cost_per_token: 0.0000021,
    output_cost_per_token: 0.0000084,
    cache_creation_input_token_cost: 0.000002625,
    cache_read_input_token_cost: 0.00000021
  },
  'claude-haiku-4-5-20251001': {
    input_cost_per_token: 0.0000021,
    output_cost_per_token: 0.0000084,
    cache_creation_input_token_cost: 0.000002625,
    cache_read_input_token_cost: 0.00000021
  },
  'glm-4.7': {
    input_cost_per_token: 0.0000021,
    output_cost_per_token: 0.0000084,
    cache_creation_input_token_cost: 0.0000021,
    cache_read_input_token_cost: 0.0000084,
  },
  'glm-4.5-air': {
    input_cost_per_token: 0.0000012,
    output_cost_per_token: 0.0000020,
    cache_creation_input_token_cost: 0.00000024,
    cache_read_input_token_cost: 0.00000024,
  }
}
