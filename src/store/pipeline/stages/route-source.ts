import type { PipelineStage, ReadingContext, StageResult } from '../types'

/** Stage 3: 路由日志标记 */
export class RouteSourceStage implements PipelineStage {
  name = 'RouteSource'

  shouldRun(_ctx: ReadingContext): boolean {
    return true
  }

  async execute(ctx: ReadingContext): Promise<StageResult> {
    console.log(`[Pipeline] 路由: ${ctx.route}, 来源: ${ctx.source}`)
    return { continue: true }
  }
}
