import { describe, it, expect, vi } from 'vitest'
import { ReadingPipeline } from '@/store/pipeline/engine'
import type { PipelineStage, ReadingContext, PipelineServices } from '@/store/pipeline/types'

function createMockServices(): PipelineServices {
  return {
    isLoggedIn: vi.fn(() => true),
    generateLocalReading: vi.fn(() => 'local reading'),
    fetchReading: vi.fn(),
    pollTaskOnce: vi.fn(),
    saveRecords: vi.fn(),
    updateCloudRecordInterpretation: vi.fn(),
    showToast: vi.fn(),
  }
}

function createStage(name: string, opts?: {
  shouldRun?: boolean
  executeResult?: boolean
  executeError?: boolean
}): PipelineStage {
  const shouldRun = opts?.shouldRun ?? true
  const executeResult = opts?.executeResult ?? true
  const executeError = opts?.executeError ?? false

  return {
    name,
    shouldRun: vi.fn(() => shouldRun),
    execute: vi.fn(async () => {
      if (executeError) throw new Error('stage error')
      return { continue: executeResult }
    }),
  }
}

function createContext(overrides?: Partial<ReadingContext>): ReadingContext {
  return {
    source: 'draw',
    recordId: 'test-record-id',
    cards: [],
    spreadType: 'single',
    question: 'test question',
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

describe('ReadingPipeline', () => {
  it('构造时保存 services 引用', () => {
    const services = createMockServices()
    const pipeline = new ReadingPipeline(services)
    expect(pipeline).toBeDefined()
    expect(pipeline.isRunning).toBe(false)
  })

  it('use() 添加 stage 并返回自身支持链式调用', () => {
    const pipeline = new ReadingPipeline(createMockServices())
    const stage = createStage('test')
    const result = pipeline.use(stage)
    expect(result).toBe(pipeline)
  })

  it('run() 依次执行所有 stage', async () => {
    const pipeline = new ReadingPipeline(createMockServices())
    const stage1 = createStage('stage1')
    const stage2 = createStage('stage2')
    const stage3 = createStage('stage3')

    pipeline.use(stage1).use(stage2).use(stage3)

    const ctx = createContext()
    await pipeline.run(ctx)

    expect(stage1.execute).toHaveBeenCalled()
    expect(stage2.execute).toHaveBeenCalled()
    expect(stage3.execute).toHaveBeenCalled()
  })

  it('run() 跳过 shouldRun=false 的 stage', async () => {
    const pipeline = new ReadingPipeline(createMockServices())
    const stage1 = createStage('stage1')
    const stage2 = createStage('stage2', { shouldRun: false })

    pipeline.use(stage1).use(stage2)

    const ctx = createContext()
    await pipeline.run(ctx)

    expect(stage1.execute).toHaveBeenCalled()
    expect(stage2.execute).not.toHaveBeenCalled()
  })

  it('run() 在 stage 返回 continue=false 时短路退出', async () => {
    const pipeline = new ReadingPipeline(createMockServices())
    const stage1 = createStage('stage1')
    const stage2 = createStage('stage2', { executeResult: false })
    const stage3 = createStage('stage3')

    pipeline.use(stage1).use(stage2).use(stage3)

    const ctx = createContext()
    await pipeline.run(ctx)

    expect(stage1.execute).toHaveBeenCalled()
    expect(stage2.execute).toHaveBeenCalled()
    expect(stage3.execute).not.toHaveBeenCalled()
  })

  it('run() 拒绝并发执行', async () => {
    const pipeline = new ReadingPipeline(createMockServices())
    const stage = createStage('slow')
    // @ts-expect-error: override for testing
    stage.execute = vi.fn(() => new Promise(resolve => setTimeout(() => resolve({ continue: true }), 100)))

    pipeline.use(stage)

    const ctx = createContext()
    const [r1, r2] = await Promise.all([pipeline.run(ctx), pipeline.run(ctx)])
    expect(r1).toBe(ctx)
    expect(r2).toBe(ctx)
    expect(stage.execute).toHaveBeenCalledTimes(1)
  })

  it('run() 捕获 stage 异常，后续 stage 不再执行', async () => {
    const pipeline = new ReadingPipeline(createMockServices())
    const stageErr = createStage('err', { executeError: true })
    const stageOk = createStage('ok')

    pipeline.use(stageErr).use(stageOk)

    const ctx = createContext()
    const result = await pipeline.run(ctx)

    expect(stageErr.execute).toHaveBeenCalled()
    expect(stageOk.execute).not.toHaveBeenCalled()
    expect(result).toBe(ctx)
  })

  it('run() 设置 running=false 即使 stage 抛出异常', async () => {
    const pipeline = new ReadingPipeline(createMockServices())
    const stage = createStage('err', { executeError: true })
    pipeline.use(stage)

    const ctx = createContext()
    await pipeline.run(ctx)

    expect(pipeline.isRunning).toBe(false)
  })

  it('run() 返回传入的 ctx 对象', async () => {
    const pipeline = new ReadingPipeline(createMockServices())
    pipeline.use(createStage('a'))

    const ctx = createContext()
    const result = await pipeline.run(ctx)

    expect(result).toBe(ctx)
  })
})
