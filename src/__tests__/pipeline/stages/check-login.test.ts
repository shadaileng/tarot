import { describe, it, expect, vi } from 'vitest'
import { CheckLoginStage } from '@/store/pipeline/stages/check-login'
import type { ReadingContext, PipelineServices } from '@/store/pipeline/types'

function mockServices(isLoggedIn: boolean): PipelineServices {
  return {
    isLoggedIn: vi.fn(() => isLoggedIn),
    generateLocalReading: vi.fn(),
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
    useOnlineReading: true,
    route: 'online',
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

describe('CheckLoginStage', () => {
  it('shouldRun 在 route=online 时返回 true', () => {
    const stage = new CheckLoginStage(mockServices(true))
    expect(stage.shouldRun(ctx({ route: 'online' }))).toBe(true)
  })

  it('shouldRun 在 route!=online 时返回 false', () => {
    const stage = new CheckLoginStage(mockServices(true))
    expect(stage.shouldRun(ctx({ route: 'local' }))).toBe(false)
    expect(stage.shouldRun(ctx({ route: 'skip' }))).toBe(false)
    expect(stage.shouldRun(ctx({ route: 'resume' }))).toBe(false)
  })

  it('已登录时保持 route=online', async () => {
    const stage = new CheckLoginStage(mockServices(true))
    const c = ctx({ route: 'online' })
    await stage.execute(c)
    expect(c.route).toBe('online')
    expect(c.isLoggedIn).toBe(true)
  })

  it('未登录时切换到 local', async () => {
    const services = mockServices(false)
    const stage = new CheckLoginStage(services)
    const c = ctx({ route: 'online' })
    await stage.execute(c)
    expect(c.route).toBe('local')
    expect(c.isLoggedIn).toBe(false)
    expect(c.fallbackReason).toBe('local')
    expect(c.toastMessage).toContain('未登录')
  })

  it('返回 continue=true', async () => {
    const stage = new CheckLoginStage(mockServices(true))
    const result = await stage.execute(ctx({ route: 'online' }))
    expect(result.continue).toBe(true)
  })
})
