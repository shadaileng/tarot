import type { PipelineStage, ReadingContext, StageResult, PipelineServices } from '../types'
import type { ReadingRecord } from '@/types'

/** Stage 7: 持久化记录 */
export class PersistStage implements PipelineStage {
  name = 'Persist'

  constructor(
    private services: PipelineServices,
    private getRecords: () => ReadingRecord[],
  ) {}

  shouldRun(ctx: ReadingContext): boolean {
    return ctx.route !== 'skip' && !!ctx.interpretation
  }

  async execute(ctx: ReadingContext): Promise<StageResult> {
    const records = this.getRecords()
    const record = records.find(r => r.id === ctx.recordId)
    if (!record) return { continue: true }

    record.interpretation = ctx.interpretation
    record.isOnlineInterpretation = ctx.isOnlineInterpretation
    record.isOnlineProcessing = ctx.isOnlineProcessing
    record.fallbackReason = ctx.fallbackReason
    record.isPartialOnlineInterpretation = ctx.isPartialOnlineInterpretation
    record.comprehensiveInterpretation = ctx.comprehensiveInterpretation
    if (ctx.taskId) record.taskId = ctx.taskId

    this.services.saveRecords()

    // 同步云端
    if (record.backendId && ctx.isOnlineInterpretation) {
      void this.services.updateCloudRecordInterpretation(record.backendId, ctx.interpretation)
    }

    return { continue: true }
  }
}
