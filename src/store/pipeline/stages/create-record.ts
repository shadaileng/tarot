import type { PipelineStage, ReadingContext, StageResult, PipelineServices } from '../types'

/** Stage 1: 创建/恢复记录上下文 */
export class CreateRecordStage implements PipelineStage {
  name = 'CreateRecord'

  constructor(private services: PipelineServices) {}

  shouldRun(_ctx: ReadingContext): boolean {
    return true
  }

  async execute(ctx: ReadingContext): Promise<StageResult> {
    if (ctx.source === 'draw') {
      // 新抽牌：初始路由由 useOnlineReading 决定
      ctx.route = ctx.useOnlineReading ? 'online' : 'local'
    } else {
      // 历史/升级：数据已由调用方从 records 填充到 Context
      // 判定解读路由
      if (ctx.isOnlineProcessing && ctx.taskId) {
        ctx.route = 'resume'
      } else if (ctx.interpretation && ctx.source !== 'upgrade') {
        ctx.route = 'skip'
      } else if (ctx.source === 'upgrade') {
        ctx.route = 'online'
      } else {
        ctx.route = 'local'
      }
    }

    // 兼容旧数据推理
    if (ctx.source !== 'draw' && ctx.interpretation && !ctx.isOnlineInterpretation) {
      // 若有解读但未标记来源，通过 fallbackReason 推导
      ctx.isOnlineInterpretation = !ctx.fallbackReason
    }

    return { continue: true }
  }
}
