import type { PipelineStage, ReadingContext, StageResult, PipelineServices } from '../types'

/** Stage 2: 登录校验 — 未登录时切换到本地解读 */
export class CheckLoginStage implements PipelineStage {
  name = 'CheckLogin'

  constructor(private services: PipelineServices) {}

  shouldRun(ctx: ReadingContext): boolean {
    return ctx.route === 'online'
  }

  async execute(ctx: ReadingContext): Promise<StageResult> {
    ctx.isLoggedIn = this.services.isLoggedIn()
    if (!ctx.isLoggedIn) {
      ctx.route = 'local'
      ctx.fallbackReason = 'local'
      ctx.toastMessage = '未登录，已为你生成本地分析'
    }
    return { continue: true }
  }
}
