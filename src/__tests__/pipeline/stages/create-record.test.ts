import { describe, it, expect, vi } from 'vitest'
import { CreateRecordStage } from '@/store/pipeline/stages/create-record'
import type { ReadingContext, PipelineServices } from '@/store/pipeline/types'

function mockServices(): PipelineServices {
  return {
    isLoggedIn: vi.fn(),
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

describe('CreateRecordStage', () => {
  it('shouldRun 始终返回 true', () => {
    const stage = new CreateRecordStage(mockServices())
    expect(stage.shouldRun(ctx())).toBe(true)
  })

  it('draw 来源且 useOnlineReading=true 时路由为 online', async () => {
    const stage = new CreateRecordStage(mockServices())
    const c = ctx({ source: 'draw', useOnlineReading: true })
    await stage.execute(c)
    expect(c.route).toBe('online')
  })

  it('draw 来源且 useOnlineReading=false 时路由为 local', async () => {
    const stage = new CreateRecordStage(mockServices())
    const c = ctx({ source: 'draw', useOnlineReading: false })
    await stage.execute(c)
    expect(c.route).toBe('local')
  })

  it('viewHistory 且 isOnlineProcessing+taskId 时路由为 resume', async () => {
    const stage = new CreateRecordStage(mockServices())
    const c = ctx({ source: 'viewHistory', isOnlineProcessing: true, taskId: 'task-1' })
    await stage.execute(c)
    expect(c.route).toBe('resume')
  })

  it('viewHistory 且有 interpretation 时路由为 skip', async () => {
    const stage = new CreateRecordStage(mockServices())
    const c = ctx({ source: 'viewHistory', interpretation: '已有解读' })
    await stage.execute(c)
    expect(c.route).toBe('skip')
  })

  it('upgrade 来源时路由为 online', async () => {
    const stage = new CreateRecordStage(mockServices())
    const c = ctx({ source: 'upgrade' })
    await stage.execute(c)
    expect(c.route).toBe('online')
  })

  it('viewHistory 无 interpretation 且无在线处理时路由为 local', async () => {
    const stage = new CreateRecordStage(mockServices())
    const c = ctx({ source: 'viewHistory', interpretation: '', isOnlineProcessing: false })
    await stage.execute(c)
    expect(c.route).toBe('local')
  })

  it('旧数据通过 fallbackReason 推导 isOnlineInterpretation', async () => {
    const stage = new CreateRecordStage(mockServices())
    const c = ctx({
      source: 'viewHistory',
      interpretation: '一些解读',
      hasExplicitOnlineFlag: false,
      fallbackReason: null,
    })
    await stage.execute(c)
    expect(c.isOnlineInterpretation).toBe(true)
  })

  it('旧数据有 fallbackReason 时 isOnlineInterpretation 为 false', async () => {
    const stage = new CreateRecordStage(mockServices())
    const c = ctx({
      source: 'viewHistory',
      interpretation: '一些解读',
      hasExplicitOnlineFlag: false,
      fallbackReason: 'local',
    })
    await stage.execute(c)
    expect(c.isOnlineInterpretation).toBe(false)
  })

  it('返回 continue=true', async () => {
    const stage = new CreateRecordStage(mockServices())
    const result = await stage.execute(ctx())
    expect(result.continue).toBe(true)
  })
})
