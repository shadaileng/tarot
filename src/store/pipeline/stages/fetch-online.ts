import type { PipelineStage, ReadingContext, StageResult, PipelineServices } from '../types'

/** Stage 4: 获取 AI 在线解读 */
export class FetchOnlineStage implements PipelineStage {
  name = 'FetchOnline'

  constructor(private services: PipelineServices) {}

  shouldRun(ctx: ReadingContext): boolean {
    return ctx.route === 'online'
  }

  async execute(ctx: ReadingContext): Promise<StageResult> {
    ctx.uiState = 'loading'

    try {
      const result = await this.services.fetchReading(ctx.question, ctx.cards)

      ctx.interpretation = result.reading
      ctx.isOnlineInterpretation = result.isOnline
      ctx.isPartialOnlineInterpretation = result.isPartialOnline
      ctx.comprehensiveInterpretation = result.comprehensiveInterpretation || ''

      if (!result.isOnline) {
        if (result.taskId) {
          // 软超时降级
          ctx.taskId = result.taskId
          ctx.isOnlineProcessing = true
          ctx.fallbackReason = 'timeout'
          ctx.toastMessage = '卡牌解读正在后台生成中，稍后可在历史记录中查看完整结果'
          ctx.uiState = 'polling'
        } else {
          // 配额/错误降级
          ctx.fallbackReason = result.fallbackReason as 'quota' | 'error' || 'error'
          ctx.toastMessage = result.fallbackReason === 'quota'
            ? '今日分析额度已用完，已切换为本地分析'
            : '卡牌分析暂时不可用，已切换为本地分析'
          ctx.uiState = 'done'
        }
      } else {
        // 在线解读成功：清空降级原因，避免升级成功后 record.fallbackReason 仍保留旧值
        // 导致 result.vue 的 currentFallbackReason 仍读到 'local'，横幅显示"点击下方按钮升级..."
        ctx.fallbackReason = null
        ctx.uiState = 'done'
      }
    } catch (e) {
      console.error('[FetchOnlineStage] 获取解读失败:', e)
      ctx.fallbackReason = 'error'
      ctx.toastMessage = '卡牌分析暂时不可用，已切换为本地分析'
      ctx.uiState = 'done'
    }

    return { continue: true }
  }
}
