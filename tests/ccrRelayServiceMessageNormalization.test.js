jest.mock('axios', () => jest.fn())

jest.mock(
  '../config/config',
  () => ({
    requestTimeout: 1000
  }),
  { virtual: true }
)

jest.mock('../src/services/account/ccrAccountService', () => ({
  getAccount: jest.fn(),
  getMappedModel: jest.fn((_supportedModels, model) => model),
  _createProxyAgent: jest.fn(() => null),
  isAccountRateLimited: jest.fn().mockResolvedValue(false),
  isAccountOverloaded: jest.fn().mockResolvedValue(false),
  removeAccountRateLimit: jest.fn(),
  removeAccountOverload: jest.fn(),
  markAccountRateLimited: jest.fn(),
  markAccountOverloaded: jest.fn(),
  checkQuotaUsage: jest.fn()
}))

jest.mock('../src/services/userMessageQueueService', () => ({
  isUserMessageRequest: jest.fn(() => false),
  acquireQueueLock: jest.fn(),
  releaseQueueLock: jest.fn()
}))

jest.mock('../src/utils/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
  api: jest.fn(),
  performance: jest.fn()
}))

jest.mock('../src/utils/upstreamErrorHelper', () => ({
  markTempUnavailable: jest.fn().mockResolvedValue(undefined),
  parseRetryAfter: jest.fn(() => null)
}))

jest.mock('../src/models/redis', () => ({
  getClientSafe: jest.fn(() => ({
    hset: jest.fn().mockResolvedValue(1)
  }))
}))

const axios = require('axios')
const ccrAccountService = require('../src/services/account/ccrAccountService')
const ccrRelayService = require('../src/services/relay/ccrRelayService')

function createEmitter() {
  return {
    once: jest.fn(),
    removeListener: jest.fn()
  }
}

describe('CcrRelayService message normalization', () => {
  beforeEach(() => {
    jest.clearAllMocks()

    ccrAccountService.getAccount.mockResolvedValue({
      id: 'ccr-1',
      name: 'CCR Gemini',
      apiUrl: 'https://relay.example.com/v1/messages',
      apiKey: 'cr-key',
      supportedModels: {}
    })

    axios.mockResolvedValue({
      status: 200,
      headers: { 'content-type': 'application/json' },
      data: {
        id: 'msg_1',
        type: 'message',
        role: 'assistant',
        model: 'gemini-3.5-flash',
        content: [],
        usage: { input_tokens: 1, output_tokens: 1 }
      }
    })
  })

  test('merges consecutive assistant blocks before forwarding to CCR', async () => {
    const requestBody = {
      model: 'gemini-3.5-flash',
      messages: [
        { role: 'user', content: 'list skills' },
        {
          role: 'assistant',
          content: [{ type: 'redacted_thinking', data: 'rosetta-ai/signature' }]
        },
        {
          role: 'assistant',
          content: [
            {
              type: 'tool_use',
              id: 'toolu_1',
              name: 'Glob',
              input: { pattern: '**/SKILL.md' }
            }
          ]
        },
        {
          role: 'user',
          content: [{ type: 'tool_result', tool_use_id: 'toolu_1', content: 'No files found' }]
        }
      ]
    }

    await ccrRelayService.relayRequest(
      requestBody,
      { id: 'key-1', name: 'Test key' },
      createEmitter(),
      createEmitter(),
      {},
      'ccr-1'
    )

    const forwardedBody = axios.mock.calls[0][0].data

    expect(forwardedBody.messages).toHaveLength(3)
    expect(forwardedBody.messages[1]).toMatchObject({
      role: 'assistant',
      content: [
        { type: 'redacted_thinking', data: 'rosetta-ai/signature' },
        {
          type: 'tool_use',
          id: 'toolu_1',
          name: 'Glob',
          input: { pattern: '**/SKILL.md' }
        }
      ]
    })
    expect(requestBody.messages).toHaveLength(4)
  })
})
