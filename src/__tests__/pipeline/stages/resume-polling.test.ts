import { describe, it, expect, vi } from 'vitest'
import { ResumePollingStage } from '@/store/pipeline/stages/resume-polling'
import type { ReadingContext, PipelineServices } from '@/store/pipeline/types'

function mockServices(pollResult?: any): PipelineServices {
  return {
    isLoggedIn: vi.fn(),
    generateLocalReading: vi.fn(),
    fetchReading: vi.fn(),
    pollTaskOnce: vi.fn(() => Promise.resolve(pollResult || { status: 'completed', reading: '轮询结果' })),
    saveRecords: vi.fn(),
    updateCloudRecordInterpretation: vi.fn(),
    showToast: vi.fn(),
  }
}

function ctx(overrides?: Partial<ReadingContext>): ReadingContext {
  return {
    source: 'viewHistory',
    recordId: 'r1',
    cards: [],
    spreadType: 'single',
    question: 'q',
    useOnlineReading: true,
    route: 'resume',
    isLoggedIn: true,
    fallbackReason: null,
    taskId: 'task-1',
    isOnlineProcessing: true,
    interpretation: '',
    isOnlineInterpretation: false,
    hasExplicitOnlineFlag: false,
    isPartialOnlineInterpretation: false,
    comprehensiveInterpretation: '',
    uiState: 'idle',
    ...overrides,
  }
}

describe('ResumePollingStage', () => {
  it('shouldRun 在 route=resume 且有 taskId 时返回 true', () => {
    const stage = new ResumePollingStage(mockServices())
    expect(stage.shouldRun(ctx({ route: 'resume', taskId: 'task-1' }))).toBe(true)
  })

  it('shouldRun 在 route!=resume 时返回 false', () => {
    const stage = new ResumePollingStage(mockServices())
    expect(stage.shouldRun(ctx({ route: 'online', taskId: 'task-1' }))).toBe(false)
  })

  it('shouldRun 无 taskId 时返回 false', () => {
    const stage = new ResumePollingStage(mockServices())
    expect(stage.shouldRun(ctx({ route: 'resume', taskId: undefined }))).toBe(false)
  })

  it('completed 状态时更新解读', async () => {
    const stage = new ResumePollingStage(mockServices({ status: 'completed', reading: '完整解读' }))
    const c = ctx()
    await stage.execute(c)
    expect(c.interpretation).toBe('完整解读')
    expect(c.isOnlineInterpretation).toBe(true)
    expect(c.isOnlineProcessing).toBe(false)
    expect(c.fallbackReason).toBeNull()
    expect(c.taskId).toBeUndefined()
    expect(c.uiState).toBe('done')
  })

  it('failed 状态时标记错误', async () => {
    const stage = new ResumePollingStage(mockServices({ status: 'failed' }))
    const c = ctx({ taskId: 'task-1' })
    await stage.execute(c)
    expect(c.isOnlineProcessing).toBe(false)
    expect(c.fallbackReason).toBe('error')
    expect(c.taskId).toBeUndefined()
    expect(c.uiState).toBe('done')
  })

  it('pending 状态时保持 polling', async () => {
    const stage = new ResumePollingStage(mockServices({ status: 'pending' }))
    const c = ctx()
    await stage.execute(c)
    expect(c.isOnlineProcessing).toBe(true)
  })

  it('返回 continue=true', async () => {
    const stage = new ResumePollingStage(mockServices())
    const result = await stage.execute(ctx())
    expect(result.continue).toBe(true)
  })
})
