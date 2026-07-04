import { ReadingPipeline } from './engine'
import { CreateRecordStage } from './stages/create-record'
import { CheckLoginStage } from './stages/check-login'
import { RouteSourceStage } from './stages/route-source'
import { FetchOnlineStage } from './stages/fetch-online'
import { FallbackLocalStage } from './stages/fallback-local'
import { ResumePollingStage } from './stages/resume-polling'
import { PersistStage } from './stages/persist'
import { NotifyUIStage } from './stages/notify-ui'
import type { ReadingContext, PipelineSource } from './types'
import type { DrawnCard, SpreadType, ReadingRecord } from '@/types'

export type { ReadingContext, PipelineSource, InterpretationRoute, PipelineStage, StageResult } from './types'
export { ReadingPipeline } from './engine'

/** 创建初始 Context（用于各入口） */
export function createReadingContext(
  source: PipelineSource,
  recordId: string,
  cards: DrawnCard[],
  spreadType: SpreadType,
  question: string,
  useOnlineReading: boolean,
  record?: ReadingRecord,
): ReadingContext {
  return {
    source,
    recordId,
    cards,
    spreadType,
    question,
    useOnlineReading,
    route: (source === 'viewHistory' || source === 'upgrade') ? 'online' : 'online',
    isLoggedIn: false,
    fallbackReason: null,
    taskId: record?.taskId,
    isOnlineProcessing: record?.isOnlineProcessing ?? false,
    interpretation: record?.interpretation || '',
    isOnlineInterpretation: record?.isOnlineInterpretation ?? !!(record?.interpretation && !record?.fallbackReason),
    isPartialOnlineInterpretation: record?.isPartialOnlineInterpretation ?? false,
    comprehensiveInterpretation: record?.comprehensiveInterpretation || '',
    uiState: 'idle',
  }
}

/**
 * 创建管线实例。由 Store 调用，传入所有外部依赖。
 */
export function createPipeline(deps: {
  isLoggedIn: () => boolean
  generateLocalReading: (question: string, cards: DrawnCard[]) => string
  fetchReading: (question: string, cards: DrawnCard[]) => Promise<{
    reading: string; isOnline: boolean; isPartialOnline: boolean
    comprehensiveInterpretation?: string; taskId?: string; fallbackReason?: string
  }>
  pollTaskOnce: (taskId: string) => Promise<{
    status: 'completed' | 'pending' | 'failed' | 'cancelled'; reading?: string
  }>
  saveRecords: () => void
  updateCloudRecordInterpretation: (backendId: string, text: string) => Promise<unknown>
  showToast: (title: string, icon?: string, duration?: number) => void
  getRecords: () => ReadingRecord[]
  setCurrentReading: (ctx: ReadingContext) => void
  setLoading: (v: boolean) => void
  setPolling: (v: boolean) => void
}): ReadingPipeline {
  const services = {
    isLoggedIn: deps.isLoggedIn,
    generateLocalReading: deps.generateLocalReading,
    fetchReading: deps.fetchReading,
    pollTaskOnce: deps.pollTaskOnce,
    saveRecords: deps.saveRecords,
    updateCloudRecordInterpretation: deps.updateCloudRecordInterpretation,
    showToast: deps.showToast,
  }

  return new ReadingPipeline(services)
    .use(new CreateRecordStage(services))
    .use(new CheckLoginStage(services))
    .use(new RouteSourceStage(services))
    .use(new FetchOnlineStage(services))
    .use(new FallbackLocalStage(services))
    .use(new ResumePollingStage(services))
    .use(new PersistStage(services, deps.getRecords))
    .use(new NotifyUIStage(services, deps.setCurrentReading, deps.setLoading, deps.setPolling))
}
