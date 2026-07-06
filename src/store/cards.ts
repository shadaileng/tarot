import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Card, DrawnCard, SpreadType, ReadingRecord, CardOrientation } from '@/types'
import { drawRandomCards } from '@/data/cards'
import { getSpread } from '@/data/spreads'
import { fetchReading, generateLocalReading, pollTaskOnce, cancelReading, type BackendStatus } from '@/services/reading'
import { isLoggedIn } from '@/services/auth'
import { syncRecordToCloud, pullAndMerge, deleteCloudRecord, updateCloudRecordInterpretation } from '@/services/record-sync'
import { createReadingContext, createPipeline } from './pipeline'
import { log, logError, startTrace, endTrace } from '@/services/client-logger'
import { appConfig } from '@/services/app-config'

/** 生成唯一 ID */
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

/** 随机方向 */
function randomOrientation(): CardOrientation {
  return Math.random() > 0.5 ? 'upright' : 'reversed'
}

/** 格式化日期 */
function formatDate(ts: number): string {
  const d = new Date(ts)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

export const useCardStore = defineStore('cards', () => {
  // ========== State ==========
  const currentReading = ref<{
    cards: DrawnCard[]
    spreadType: SpreadType
    question: string
    /** 是否使用在线解读 */
    useOnlineReading: boolean
    /** 综合解读文本 */
    interpretation: string
    /** 是否在线生成（false 表示本地降级） */
    isOnlineInterpretation: boolean
    /** 解读格式不完整，综合解读由本地补偿 */
    isPartialOnlineInterpretation: boolean
    /** 综合解读文本（优先在线生成的，没有则本地生成） */
    comprehensiveInterpretation?: string
  } | null>(null)

  const records = ref<ReadingRecord[]>([])

  /** 解读加载状态 */
  const isLoadingInterpretation = ref(false)

  /** 异步轮询等待状态 */
  const isPolling = ref(false)

  /** 云端同步状态 */
  const isSyncing = ref(false)

  /** 后端服务分层健康状态 */
  const backendStatus = ref<BackendStatus>({ status: 'checking', worker: 'down', gemini: 'unknown' })

  /** 是否正在查看历史记录 */
  const isViewingHistory = ref(false)

  /** 是否正在升级本地解读为 AI 解读 */
  const isUpgrading = ref(false)

  // ========== Getters ==========
  const recordCount = computed(() => records.value.length)

  // ========== Pipeline ==========
  const pipeline = createPipeline({
    isLoggedIn,
    generateLocalReading,
    fetchReading,
    pollTaskOnce,
    saveRecords,
    updateCloudRecordInterpretation,
    showToast: (title, icon, duration) => {
      uni.showToast({ title, icon: icon as any, duration })
    },
    getRecords: () => records.value,
    setCurrentReading: (ctx) => {
      const cur = currentReading.value
      if (cur && cur.cards === ctx.cards) {
        // cards 引用未变：原地修改字段，保持 currentReading 引用稳定
        // 避免触发 reading computed 变化 → watch 重复翻牌 / DOM 闪烁
        cur.interpretation = ctx.interpretation
        cur.isOnlineInterpretation = ctx.isOnlineInterpretation
        cur.isPartialOnlineInterpretation = ctx.isPartialOnlineInterpretation
        cur.comprehensiveInterpretation = ctx.comprehensiveInterpretation
        cur.useOnlineReading = ctx.useOnlineReading
        return
      }
      // cards 变化（如 drawCards 新抽牌、切换到不同历史记录）
      currentReading.value = {
        cards: ctx.cards,
        spreadType: ctx.spreadType,
        question: ctx.question,
        useOnlineReading: ctx.useOnlineReading,
        interpretation: ctx.interpretation,
        isOnlineInterpretation: ctx.isOnlineInterpretation,
        isPartialOnlineInterpretation: ctx.isPartialOnlineInterpretation,
        comprehensiveInterpretation: ctx.comprehensiveInterpretation,
      }
    },
    setLoading: (v) => { isLoadingInterpretation.value = v },
    setPolling: (v) => { isPolling.value = v },
  })

  // ========== Actions ==========

  /** 执行抽牌 */
  function drawCards(spreadType: SpreadType, question = '', useOnlineReading = true) {
    startTrace()
    try {
      isViewingHistory.value = false
      const spread = getSpread(spreadType)
      const drawn = drawRandomCards(spread.positions.length)

      const cards: DrawnCard[] = drawn.map((card, i) => ({
        card,
        orientation: randomOrientation(),
        position: spread.positions[i],
      }))

      log('reading', 'draw_cards', 'info', {
        data: { spreadType, cardCount: cards.length, useOnlineReading }
      })

      const timestamp = Date.now()
      currentReading.value = { cards, spreadType, question, useOnlineReading, interpretation: '', isOnlineInterpretation: false, isPartialOnlineInterpretation: false, comprehensiveInterpretation: '' }

      // 保存到记录
      records.value.unshift({
        id: generateId(),
        spreadType,
        spreadName: spread.name,
        cards,
        question,
        timestamp,
        date: formatDate(timestamp),
        interpretation: '',
        isOnlineInterpretation: useOnlineReading,
        isPartialOnlineInterpretation: false,
        comprehensiveInterpretation: '',
        fallbackReason: useOnlineReading ? null : 'local',
        isOnlineProcessing: useOnlineReading,
      })

      // 最多保留 100 条记录
      if (records.value.length > appConfig.MAX_LOCAL_RECORDS) {
        records.value = records.value.slice(0, appConfig.MAX_LOCAL_RECORDS)
      }

      // 持久化到本地存储
      saveRecords()

      // 同步到云端（静默，不阻塞 UI）
      syncToCloudIfLoggedIn(records.value[0])
    } finally {
      endTrace()
    }
  }

  /** 获取个性化解读（通过管线） */
  async function fetchInterpretation() {
    if (!currentReading.value || currentReading.value.interpretation) return

    const record = records.value[0]
    if (!record) return

    startTrace()
    try {
      // pipeline 运行前设置 loading 状态，让 UI 显示等待动画
      // Stage 8 (NotifyUI) 会在 pipeline 完成后根据 ctx.uiState 最终值更新此状态
      if (currentReading.value.useOnlineReading) {
        isLoadingInterpretation.value = true
      }

      const ctx = createReadingContext(
        'draw',
        record.id,
        currentReading.value.cards,
        currentReading.value.spreadType,
        currentReading.value.question,
        currentReading.value.useOnlineReading,
        record,
      )

      await pipeline.run(ctx)
    } finally {
      endTrace()
    }
  }

  /** 清除当前抽牌结果 */
  function clearReading() {
    currentReading.value = null
    isLoadingInterpretation.value = false
    isPolling.value = false
    isViewingHistory.value = false
  }

  /** 根据 ID 加载历史记录到 currentReading（通过管线） */
  function viewRecord(id: string) {
    startTrace()
    const record = records.value.find(r => r.id === id)
    if (!record) {
      log('reading', 'view_record_not_found', 'warn', { data: { recordId: id } })
      endTrace()
      return
    }

    log('reading', 'view_record', 'info', { data: { recordId: id } })
    isViewingHistory.value = true

    // 先设置临时状态让 UI 立即可用
    const isOnlineInterp = record.isOnlineInterpretation ?? (
      !!(record.interpretation && !record.fallbackReason)
    )
    currentReading.value = {
      cards: record.cards,
      spreadType: record.spreadType,
      question: record.question,
      useOnlineReading: true,
      interpretation: record.interpretation || '',
      isOnlineInterpretation: isOnlineInterp,
      isPartialOnlineInterpretation: record.isPartialOnlineInterpretation ?? false,
      comprehensiveInterpretation: record.comprehensiveInterpretation || '',
    }

    // 触发管线（fire-and-forget，管线完成后 NotifyUIStage 自动刷新 currentReading）
    const ctx = createReadingContext(
      'viewHistory',
      record.id,
      record.cards,
      record.spreadType,
      record.question,
      true,
      record,
    )

    pipeline.run(ctx).finally(() => endTrace()) // fire-and-forget: 管线完成自动结束 trace
  }

  /** 取消后台 AI 解读任务 */
  async function cancelRecordTask(recordId: string) {
    const record = records.value.find(r => r.id === recordId)
    if (!record?.taskId) return

    startTrace()
    try {
      const result = await cancelReading(record.taskId)

      if (result.quotaRefunded) {
        log('reading', 'cancel_reading', 'info', { result: 'success', data: { taskId: record.taskId, quotaRefunded: true } })
        uni.showToast({
          title: '已取消卡牌解读，额度已退还',
          icon: 'none',
          duration: appConfig.TOAST_DURATION_DEFAULT,
        })
      } else {
        log('reading', 'cancel_reading', 'info', { result: 'success', data: { taskId: record.taskId } })
      }

      // 清理 record
      record.taskId = undefined
      record.isOnlineProcessing = false
      saveRecords()
    } catch (e) {
      logError('reading', 'cancel_reading', String(e), { taskId: record.taskId })
      uni.showToast({
        title: '取消失败，请稍后重试',
        icon: 'none',
      })
    } finally {
      endTrace()
    }
  }

  /** 保存记录到本地存储 */
  function saveRecords() {
    try {
      uni.setStorageSync('tarot-records', JSON.stringify(records.value))
    } catch (e) {
      logError('error', 'storage_write_fail', '保存记录失败', { key: 'tarot-records' })
      console.error('保存记录失败:', e)
    }
  }

  /** 从本地存储加载记录，并从云端拉取合并 */
  async function loadRecords() {
    // 1. 从本地加载
    try {
      const data = uni.getStorageSync('tarot-records')
      if (data) {
        records.value = JSON.parse(data)
      }
    } catch (e) {
      logError('error', 'storage_read_fail', '加载本地记录失败', { key: 'tarot-records' })
      console.error('加载本地记录失败:', e)
    }

    // 2. 从云端拉取合并（静默）
    if (isLoggedIn()) {
      isSyncing.value = true
      try {
        const result = await pullAndMerge(records.value)
        if (result.addedCount > 0) {
          records.value = result.records
          saveRecords()
          console.log(`📥 从云端同步了 ${result.addedCount} 条记录`)
        }
      } catch (e) {
        console.warn('云端同步失败，使用本地记录:', e)
      } finally {
        isSyncing.value = false
      }
    }
  }

  /** 删除记录 */
  function deleteRecord(id: string) {
    startTrace()
    try {
      const target = records.value.find(r => r.id === id)
      if (target?.backendId) {
        deleteCloudRecord(target.backendId)
      }
      records.value = records.value.filter((r) => r.id !== id)
      log('reading', 'delete_record', 'info', { data: { recordId: id } })
      saveRecords()
    } finally {
      endTrace()
    }
  }

  /** 清空所有记录 */
  function clearAllRecords() {
    records.value = []
    saveRecords()
  }

  /** 设置后端服务健康状态 */
  function setBackendStatus(status: BackendStatus) {
    backendStatus.value = status
  }

  /** 手动触发深度解读（从本地解读升级，通过管线） */
  async function upgradeToOnlineReading() {
    if (!currentReading.value) return

    const record = records.value[0]
    if (!record) return

    startTrace()
    log('reading', 'upgrade_to_online', 'info')

    // 立即设置 loading 状态，让 UI 显示等待动画
    // 保留旧的本地解读不清空，升级完成后由管线 NotifyUIStage 整体替换
    isUpgrading.value = true
    isLoadingInterpretation.value = true
    currentReading.value.useOnlineReading = true

    const ctx = createReadingContext(
      'upgrade',
      record.id,
      currentReading.value.cards,
      currentReading.value.spreadType,
      currentReading.value.question,
      true,
      record,
    )

    try {
      await pipeline.run(ctx)
    } finally {
      isUpgrading.value = false
      endTrace()
    }
  }

  /** 静默同步单条记录到云端（内部使用） */
  async function syncToCloudIfLoggedIn(record: ReadingRecord) {
    if (!isLoggedIn()) return
    try {
      const backendId = await syncRecordToCloud(record)
      if (backendId) {
        record.backendId = backendId
        record.synced = true
        saveRecords()
      }
    } catch (_) {
      // 静默失败，下次启动时重试
    }
  }

  return {
    currentReading,
    records,
    recordCount,
    isLoadingInterpretation,
    isPolling,
    isSyncing,
    backendStatus,
    isViewingHistory,
    isUpgrading,
    setBackendStatus,
    drawCards,
    fetchInterpretation,
    clearReading,
    viewRecord,
    upgradeToOnlineReading,
    loadRecords,
    deleteRecord,
    clearAllRecords,
    cancelRecordTask,
  }
})
