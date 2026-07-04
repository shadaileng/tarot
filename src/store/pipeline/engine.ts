import type { ReadingContext, PipelineStage, PipelineServices } from './types'

export class ReadingPipeline {
  private stages: PipelineStage[] = []
  private services: PipelineServices
  private running = false

  constructor(services: PipelineServices) {
    this.services = services
  }

  get isRunning(): boolean {
    return this.running
  }

  use(stage: PipelineStage): this {
    this.stages.push(stage)
    return this
  }

  async run(ctx: ReadingContext): Promise<ReadingContext> {
    if (this.running) {
      console.warn('[Pipeline] 管线正在执行中，拒绝新请求')
      return ctx
    }

    this.running = true
    console.log(`[Pipeline] 开始执行，来源: ${ctx.source}, recordId: ${ctx.recordId}`)

    try {
      for (const stage of this.stages) {
        if (!stage.shouldRun(ctx)) {
          console.log(`[Pipeline] ${stage.name}: 跳过`)
          continue
        }

        console.log(`[Pipeline] ${stage.name}: 执行中...`)
        const result = await stage.execute(ctx)

        if (!result.continue) {
          console.log(`[Pipeline] ${stage.name}: 短路退出`)
          break
        }
      }
    } catch (e) {
      console.error('[Pipeline] 执行异常:', e)
    } finally {
      this.running = false
    }

    console.log(`[Pipeline] 完成，最终路由: ${ctx.route}, UI状态: ${ctx.uiState}`)
    return ctx
  }
}
