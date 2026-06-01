jest.mock('../src/utils/logger', () => ({
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  performance: jest.fn()
}))

jest.mock('../config/config', () => ({ requestTimeout: 1000 }), {
  virtual: true
})

jest.mock('../src/services/account/claudeConsoleAccountService', () => ({
  getAccount: jest.fn(),
  getMappedModel: jest.fn((supportedModels, model) => supportedModels?.[model] || model),
  _createProxyAgent: jest.fn(() => null),
  isAccountRateLimited: jest.fn().mockResolvedValue(false),
  isAccountOverloaded: jest.fn().mockResolvedValue(false),
  removeAccountRateLimit: jest.fn(),
  removeAccountOverload: jest.fn(),
  checkQuotaUsage: jest.fn()
}))

jest.mock('../src/services/userMessageQueueService', () => ({
  isUserMessageRequest: jest.fn(() => false),
  acquireQueueLock: jest.fn(),
  releaseQueueLock: jest.fn()
}))

jest.mock('../src/models/redis', () => ({
  getClientSafe: jest.fn(() => ({
    exists: jest.fn().mockResolvedValue(1),
    hset: jest.fn().mockResolvedValue(1)
  })),
  incrConsoleAccountConcurrency: jest.fn(),
  decrConsoleAccountConcurrency: jest.fn(),
  refreshConsoleAccountConcurrencyLease: jest.fn()
}))

const claudeConsoleAccountService = require('../src/services/account/claudeConsoleAccountService')
const claudeConsoleRelayService = require('../src/services/relay/claudeConsoleRelayService')

function createResponseStream() {
  return {
    headersSent: false,
    getHeader: jest.fn(() => null),
    writeHead: jest.fn(),
    write: jest.fn(),
    end: jest.fn()
  }
}

describe('ClaudeConsoleRelayService message normalization', () => {
  let makeStreamRequest

  beforeEach(() => {
    jest.clearAllMocks()

    claudeConsoleAccountService.getAccount.mockResolvedValue({
      id: 'console-1',
      name: 'Console Gemini',
      apiUrl: 'https://console.example.com',
      apiKey: 'test-key',
      proxy: null,
      userAgent: null,
      supportedModels: {
        'gemini-3.5-flash': 'google/gemini-3.5-flash'
      },
      maxConcurrentTasks: 0
    })

    makeStreamRequest = jest
      .spyOn(claudeConsoleRelayService, '_makeClaudeConsoleStreamRequest')
      .mockResolvedValue(undefined)
  })

  afterEach(() => {
    makeStreamRequest.mockRestore()
  })

  test('merges consecutive assistant blocks and preserves provider redacted thinking', async () => {
    const requestBody = {
      model: 'gemini-3.5-flash',
      stream: true,
      messages: [
        { role: 'user', content: 'delete skills' },
        {
          role: 'assistant',
          content: [{ type: 'thinking', thinking: 'Inspecting skills', signature: '' }]
        },
        {
          role: 'assistant',
          content: [{ type: 'text', text: 'I will search skill files.' }]
        },
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
              input: { pattern: '**/*' }
            }
          ]
        },
        {
          role: 'user',
          content: [{ type: 'tool_result', tool_use_id: 'toolu_1', content: 'No files found' }]
        }
      ]
    }

    await claudeConsoleRelayService.relayStreamRequestWithUsageCapture(
      requestBody,
      { id: 'key-1', name: 'Test key' },
      createResponseStream(),
      {},
      jest.fn(),
      'console-1'
    )

    const forwardedBody = makeStreamRequest.mock.calls[0][0]

    expect(forwardedBody.model).toBe('google/gemini-3.5-flash')
    expect(forwardedBody.messages).toHaveLength(3)
    expect(forwardedBody.messages[1]).toMatchObject({
      role: 'assistant',
      content: [
        { type: 'thinking', thinking: 'Inspecting skills', signature: '' },
        { type: 'text', text: 'I will search skill files.' },
        { type: 'redacted_thinking', data: 'rosetta-ai/signature' },
        {
          type: 'tool_use',
          id: 'toolu_1',
          name: 'Glob',
          input: { pattern: '**/*' }
        }
      ]
    })
    expect(requestBody.messages).toHaveLength(6)
  })
})
