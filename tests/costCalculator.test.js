jest.mock('../src/services/pricingService', () => ({
  calculateCost: jest.fn(),
  getModelPricing: jest.fn()
}))

describe('CostCalculator', () => {
  let CostCalculator
  let pricingService

  beforeEach(() => {
    jest.resetModules()
    pricingService = require('../src/services/pricingService')
    CostCalculator = require('../src/utils/costCalculator')
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  it('returns zero-cost result instead of throwing when dynamic pricing is unavailable', () => {
    pricingService.calculateCost.mockReturnValue({
      inputCost: 0,
      outputCost: 0,
      cacheCreateCost: 0,
      cacheReadCost: 0,
      ephemeral5mCost: 0,
      ephemeral1hCost: 0,
      totalCost: 0,
      hasPricing: false,
      isLongContextRequest: false
    })

    expect(() =>
      CostCalculator.calculateCost(
        {
          input_tokens: 1000,
          output_tokens: 2000,
          cache_creation_input_tokens: 3000,
          cache_read_input_tokens: 4000,
          cache_creation: {
            ephemeral_5m_input_tokens: 1000,
            ephemeral_1h_input_tokens: 2000
          }
        },
        'unknown-dynamic-model'
      )
    ).not.toThrow()

    expect(CostCalculator.calculateCost(
      {
        input_tokens: 1000,
        output_tokens: 2000,
        cache_creation_input_tokens: 3000,
        cache_read_input_tokens: 4000,
        cache_creation: {
          ephemeral_5m_input_tokens: 1000,
          ephemeral_1h_input_tokens: 2000
        }
      },
      'unknown-dynamic-model'
    )).toMatchObject({
      usingDynamicPricing: false,
      costs: {
        input: 0,
        output: 0,
        cacheWrite: 0,
        cacheRead: 0,
        total: 0
      },
      pricing: {
        input: 0,
        output: 0,
        cacheWrite: 0,
        cacheRead: 0
      }
    })
  })
})
