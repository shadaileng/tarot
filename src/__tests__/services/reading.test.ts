import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/services/app-config', () => ({
  appConfig: { READING_TIMEOUT: 10000, HEALTH_CHECK_TIMEOUT: 5000 },
}))

vi.mock('@/services/client-logger', () => ({
  log: vi.fn(), logInfo: vi.fn(), logWarn: vi.fn(), logError: vi.fn(),
}))

import { fetchReading, pollTaskOnce, cancelReading, checkBackendHealth } from '@/services/reading'

function mockCard(overrides?: any) {
  return {
    card: {
      id: 'major-0',
      name: '愚者',
      nameEn: 'The Fool',
      type: 'major' as const,
      number: 0,
      image: '/static/cards/major-0.svg',
      keywords: ['开始', '冒险'],
      uprightMeaning: '新的开始',
      reversedMeaning: '鲁莽',
      description: '一张牌',
      ...overrides,
    },
    orientation: 'upright' as const,
    position: '过去',
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  // @ts-expect-error: uni mock
  globalThis.uni.getStorageSync = vi.fn(() => null)
  // @ts-expect-error: uni mock
  globalThis.uni.removeStorageSync = vi.fn()
  // @ts-expect-error: uni mock
  globalThis.uni.setStorageSync = vi.fn()
})

describe('fetchReading', () => {
  it('在线解读成功时返回结果', async () => {
    const mockTaskId = 'task-123'
    // 第一次 startReading → taskId
    // 第二次 pollReadingResult → completed
    let callCount = 0
    // @ts-expect-error: uni mock
    globalThis.uni.request = vi.fn(({ success }: any) => {
      callCount++
      if (callCount === 1) {
        // startReading: POST /api/reading/start
        success({
          statusCode: 200,
          data: { taskId: mockTaskId, status: 'pending' },
        })
      } else {
        // pollReadingResult: GET /api/reading/result/{taskId}
        success({
          statusCode: 200,
          data: { status: 'completed', reading: 'AI 解读结果', model: 'gemini' },
        })
      }
    })

    const result = await fetchReading('我的感情问题', [mockCard()])
    expect(result.isOnline).toBe(true)
    expect(result.reading).toBeDefined()
  })

  it('API 失败时降级为本地解读', async () => {
    // @ts-expect-error: uni mock
    globalThis.uni.request = vi.fn(({ fail }: any) => {
      fail({ errMsg: 'request:fail' })
    })

    const result = await fetchReading('我的感情问题', [mockCard()])
    expect(result.isOnline).toBe(false)
    expect(result.fallbackReason).toBe('error')
    expect(result.reading).toBeDefined()
  })
})

describe('pollTaskOnce', () => {
  it('请求解读结果端点', async () => {
    const captured: any[] = []
    // @ts-expect-error: uni mock
    globalThis.uni.request = vi.fn((opts: any) => {
      captured.push(opts)
      opts.success({ statusCode: 200, data: { status: 'completed', reading: '结果' } })
    })
    const result = await pollTaskOnce('task-1')
    expect(captured[0].url).toContain('/api/reading/result/task-1')
    expect(result.status).toBe('completed')
  })
})

describe('cancelReading', () => {
  it('请求取消端点', async () => {
    const captured: any[] = []
    // @ts-expect-error: uni mock
    globalThis.uni.request = vi.fn((opts: any) => {
      captured.push(opts)
      opts.success({ statusCode: 200, data: { status: 'cancelled', quotaRefunded: true } })
    })
    const result = await cancelReading('task-1')
    expect(captured[0].url).toContain('/api/reading/cancel/task-1')
    expect(result.quotaRefunded).toBe(true)
  })
})

describe('checkBackendHealth', () => {
  it('健康端点正常时返回 ok', async () => {
    // @ts-expect-error: uni mock
    globalThis.uni.request = vi.fn(({ success }: any) => {
      success({
        statusCode: 200,
        data: { status: 'ok', worker: 'up', gemini: 'up' },
      })
    })
    const result = await checkBackendHealth()
    expect(result.status).toBe('ok')
    expect(result.worker).toBe('up')
    expect(result.gemini).toBe('up')
  })

  it('健康端点失败时返回 error', async () => {
    // @ts-expect-error: uni mock
    globalThis.uni.request = vi.fn(({ fail }: any) => {
      fail({ errMsg: 'request:fail' })
    })
    const result = await checkBackendHealth()
    expect(result.status).toBe('error')
    expect(result.worker).toBe('down')
  })
})
