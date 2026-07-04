import type { PipelineStage, ReadingContext, StageResult, PipelineServices } from '../types'

/** Stage 8: 通知 UI 层 — 更新 currentReading、弹出 toast */
export class NotifyUIStage implements PipelineStage {
  name = 'NotifyUI'

  constructor(
    private services: PipelineServices,
    private setCurrentReading: (ctx: ReadingContext) => void,
    private setLoading: (v: boolean) => void,
    private setPolling: (v: boolean) => void,
  ) {}

  shouldRun(_ctx: ReadingContext): boolean {
    return true
  }

  async execute(ctx: ReadingContext): Promise<StageResult> {
    // 1. 同步 currentReading
    this.setCurrentReading(ctx)

    // 2. Toast 通知
    if (ctx.toastMessage) {
      this.services.showToast(ctx.toastMessage, 'none', 2000)
    }

    // 3. 更新全局加载/轮询状态
    this.setLoading(ctx.uiState === 'loading')
    this.setPolling(ctx.uiState === 'polling')

    return { continue: true }
  }
}
