import type { PipelineStage, ReadingContext, StageResult, PipelineServices } from '../types'

/** Stage 6: 恢复后台轮询 */
export class ResumePollingStage implements PipelineStage {
  name = 'ResumePolling'

  constructor(private services: PipelineServices) {}

  shouldRun(ctx: ReadingContext): boolean {
    return ctx.route === 'resume' && !!ctx.taskId
  }

  async execute(ctx: ReadingContext): Promise<StageResult> {
    ctx.uiState = 'polling'

    try {
      const result = await this.services.pollTaskOnce(ctx.taskId!)
      if (result.status === 'completed' && result.reading) {
        ctx.interpretation = result.reading
        ctx.isOnlineInterpretation = true
        ctx.isOnlineProcessing = false
        ctx.fallbackReason = null
        ctx.taskId = undefined
        ctx.uiState = 'done'
      } else if (result.status === 'failed' || result.status === 'cancelled') {
        ctx.isOnlineProcessing = false
        ctx.fallbackReason = 'error'
        ctx.taskId = undefined
        ctx.uiState = 'done'
      }
      // pending: 保持 polling 状态
    } catch {
      ctx.uiState = 'done' // 网络异常不阻塞
    }

    return { continue: true }
  }
}
