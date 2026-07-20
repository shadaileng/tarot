import { describe, it, expect, vi } from 'vitest'
import { FetchOnlineStage } from '@/store/pipeline/stages/fetch-online'
import type { ReadingContext, PipelineServices } from '@/store/pipeline/types'

function mockServices(fetchResult?: any, throwError?: boolean): PipelineServices {
  const fetchReading = throwError
    ? vi.fn(() => Promise.reject(new Error('network error')))
    : vi.fn(() => Promise.resolve(fetchResult || {
        reading: '在线解读结果',
        isOnline: true,
        isPartialOnline: false,
      }))

  return {
    isLoggedIn: vi.fn(() => true),
    generateLocalReading: vi.fn(() => 'local'),
    fetchReading,
    pollTaskOnce: vi.fn(),
    saveRecords: vi.fn(),
    updateCloudRecordInterpretation: vi.fn(),
    showToast: vi.fn(),
  }
}

function ctx(overrides?: Partial<ReadingContext>): ReadingContext {
  return {
    source: 'draw',
    recordId: 'r1',
    cards: [],
    spreadType: 'single',
    question: 'q',
    useOnlineReading: true,
    route: 'online',
    isLoggedIn: true,
    fallbackReason: null,
    taskId: undefined,
    isOnlineProcessing: false,
    interpretation: '',
    isOnlineInterpretation: false,
    hasExplicitOnlineFlag: false,
    isPartialOnlineInterpretation: false,
    comprehensiveInterpretation: '',
    uiState: 'idle',
    ...overrides,
  }
}

describe('FetchOnlineStage', () => {
  it('shouldRun 在 route=online 时返回 true', () => {
    const stage = new FetchOnlineStage(mockServices())
    expect(stage.shouldRun(ctx({ route: 'online' }))).toBe(true)
  })

  it('shouldRun 在 route!=online 时返回 false', () => {
    const stage = new FetchOnlineStage(mockServices())
    expect(stage.shouldRun(ctx({ route: 'local' }))).toBe(false)
  })

  it('在线解读成功时设置上下文', async () => {
    const stage = new FetchOnlineStage(mockServices({
      reading: 'AI 解读',
      isOnline: true,
      isPartialOnline: false,
      comprehensiveInterpretation: '综合解读',
    }))
    const c = ctx()
    await stage.execute(c)
    expect(c.interpretation).toBe('AI 解读')
    expect(c.isOnlineInterpretation).toBe(true)
    expect(c.isPartialOnlineInterpretation).toBe(false)
    expect(c.comprehensiveInterpretation).toBe('综合解读')
    expect(c.fallbackReason).toBeNull()
    expect(c.uiState).toBe('done')
  })

  it('超时降级时设置 taskId 和 polling 状态', async () => {
    const stage = new FetchOnlineStage(mockServices({
      reading: '局部结果',
      isOnline: false,
      isPartialOnline: false,
      taskId: 'task-123',
      fallbackReason: 'timeout',
    }))
    const c = ctx()
    await stage.execute(c)
    expect(c.taskId).toBe('task-123')
    expect(c.isOnlineProcessing).toBe(true)
    expect(c.fallbackReason).toBe('timeout')
    expect(c.uiState).toBe('polling')
  })

  it('配额降级时设置 fallbackReason=quota', async () => {
    const stage = new FetchOnlineStage(mockServices({
      reading: 'local',
      isOnline: false,
      isPartialOnline: false,
      fallbackReason: 'quota',
    }))
    const c = ctx()
    await stage.execute(c)
    expect(c.fallbackReason).toBe('quota')
    expect(c.uiState).toBe('done')
  })

  it('异常降级时设置 fallbackReason=error', async () => {
    const stage = new FetchOnlineStage(mockServices(undefined, true))
    const c = ctx()
    await stage.execute(c)
    expect(c.fallbackReason).toBe('error')
    expect(c.uiState).toBe('done')
  })

  it('返回 continue=true', async () => {
    const stage = new FetchOnlineStage(mockServices())
    const result = await stage.execute(ctx())
    expect(result.continue).toBe(true)
  })
})
