import type { DrawnCard, SpreadType, FallbackReason } from '@/types'

// ========== 管线上下文 ==========

/** 管线触发来源 */
export type PipelineSource = 'draw' | 'viewHistory' | 'upgrade'

/** 解读路由 */
export type InterpretationRoute =
  | 'online'   // 走 AI 解读
  | 'local'    // 直接本地解读
  | 'resume'   // 恢复后台任务轮询
  | 'skip'     // 已有解读，无需处理

/** 管线上下文（Stage 间传递的唯一数据载体） */
export interface ReadingContext {
  // ===== 元信息 =====
  source: PipelineSource
  recordId: string

  // ===== 输入 =====
  cards: DrawnCard[]
  spreadType: SpreadType
  question: string
  useOnlineReading: boolean

  // ===== 流转状态 =====
  route: InterpretationRoute
  isLoggedIn: boolean
  fallbackReason: FallbackReason | null
  taskId?: string
  isOnlineProcessing: boolean

  // ===== 输出（写入 record & currentReading） =====
  interpretation: string
  isOnlineInterpretation: boolean
  isPartialOnlineInterpretation: boolean
  comprehensiveInterpretation: string

  // ===== UI 信号 =====
  toastMessage?: string
  uiState: 'idle' | 'loading' | 'polling' | 'done'
}

// ========== Stage 接口 ==========

export interface StageResult {
  continue: boolean
  skippedReason?: string
}

export interface PipelineStage {
  name: string
  shouldRun(ctx: ReadingContext): boolean
  execute(ctx: ReadingContext): Promise<StageResult>
}

// ========== 外部依赖注入 ==========

export interface PipelineServices {
  isLoggedIn(): boolean
  generateLocalReading(question: string, cards: DrawnCard[]): string
  fetchReading(question: string, cards: DrawnCard[]): Promise<{
    reading: string
    isOnline: boolean
    isPartialOnline: boolean
    comprehensiveInterpretation?: string
    taskId?: string
    fallbackReason?: string
  }>
  pollTaskOnce(taskId: string): Promise<{
    status: 'completed' | 'pending' | 'failed' | 'cancelled'
    reading?: string
  }>
  saveRecords(): void
  updateCloudRecordInterpretation(backendId: string, text: string): Promise<unknown>
  showToast(title: string, icon?: string, duration?: number): void
}
