import { describe, it, expect, vi } from 'vitest'
import { FallbackLocalStage } from '@/store/pipeline/stages/fallback-local'
import type { ReadingContext, PipelineServices } from '@/store/pipeline/types'

function mockServices(): PipelineServices {
  return {
    isLoggedIn: vi.fn(),
    generateLocalReading: vi.fn(() => '本地解读结果'),
    fetchReading: vi.fn(),
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
    useOnlineReading: false,
    route: 'local',
    isLoggedIn: false,
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

describe('FallbackLocalStage', () => {
  it('shouldRun 在 route=local 且无 interpretation 时返回 true', () => {
    const stage = new FallbackLocalStage(mockServices())
    expect(stage.shouldRun(ctx({ route: 'local', interpretation: '' }))).toBe(true)
  })

  it('shouldRun 在已有 interpretation 时返回 false', () => {
    const stage = new FallbackLocalStage(mockServices())
    expect(stage.shouldRun(ctx({ route: 'local', interpretation: '已有' }))).toBe(false)
  })

  it('shouldRun 在 route!=local 时返回 false', () => {
    const stage = new FallbackLocalStage(mockServices())
    expect(stage.shouldRun(ctx({ route: 'online' }))).toBe(false)
  })

  it('执行时生成本地解读并更新上下文', async () => {
    const stage = new FallbackLocalStage(mockServices())
    const c = ctx()
    await stage.execute(c)
    expect(c.interpretation).toBe('本地解读结果')
    expect(c.isOnlineInterpretation).toBe(false)
    expect(c.isPartialOnlineInterpretation).toBe(false)
    expect(c.comprehensiveInterpretation).toBe('')
    expect(c.uiState).toBe('done')
  })

  it('保持已有的 fallbackReason', async () => {
    const stage = new FallbackLocalStage(mockServices())
    const c = ctx({ fallbackReason: 'quota' })
    await stage.execute(c)
    expect(c.fallbackReason).toBe('quota')
  })

  it('没有 fallbackReason 时设为 local', async () => {
    const stage = new FallbackLocalStage(mockServices())
    const c = ctx({ fallbackReason: null })
    await stage.execute(c)
    expect(c.fallbackReason).toBe('local')
  })

  it('返回 continue=true', async () => {
    const stage = new FallbackLocalStage(mockServices())
    const result = await stage.execute(ctx())
    expect(result.continue).toBe(true)
  })
})
