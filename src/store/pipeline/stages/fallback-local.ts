import type { PipelineStage, ReadingContext, StageResult, PipelineServices } from '../types'

/** Stage 5: 本地解读兜底 */
export class FallbackLocalStage implements PipelineStage {
  name = 'FallbackLocal'

  constructor(private services: PipelineServices) {}

  shouldRun(ctx: ReadingContext): boolean {
    return ctx.route === 'local' && !ctx.interpretation
  }

  async execute(ctx: ReadingContext): Promise<StageResult> {
    ctx.interpretation = this.services.generateLocalReading(ctx.question, ctx.cards)
    ctx.isOnlineInterpretation = false
    ctx.isPartialOnlineInterpretation = false
    ctx.comprehensiveInterpretation = ''
    ctx.fallbackReason = ctx.fallbackReason || 'local'
    ctx.uiState = 'done'
    return { continue: true }
  }
}
