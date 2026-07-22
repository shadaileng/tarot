// 深度解读服务 - 调用统一后端 tarot-backend，失败时降级到本地规则

import type { DrawnCard } from '@/types'
import { apiPost, apiGet } from '@/utils/request'
import { log } from '@/services/client-logger'
import { appConfig } from '@/services/app-config'
import { API_ENDPOINTS } from '@/constants/api'
import { generateSummary } from '@/services/reading/local-summary'

/** 从解读文本中提取综合解读部分 */
function extractComprehensive(text: string): string | null {
  const markerRegex = /✨\s*\*{0,2}综合解读\*{0,2}/
  const match = text.match(markerRegex)
  if (!match) return null
  const idx = match.index! + match[0].length
  return text.substring(idx).trim()
}

export interface ReadingResult {
  /** 生成的完整解读文本 */
  reading: string
  /** 是否在线生成（false 表示本地降级） */
  isOnline: boolean
  /** 解读格式不完整，综合解读部分由本地补偿 */
  isPartialOnline: boolean
  /** 综合解读文本（优先在线生成的，没有则本地生成） */
  comprehensiveInterpretation?: string
  /** 降级原因：quota=额度用完，error=其他错误，timeout=后台仍在生成 */
  fallbackReason?: 'quota' | 'error' | 'timeout'
  /** 异步任务 taskId（降级时携带，供 record 保存以支持后续升级） */
  taskId?: string
}

/**
 * 提交异步解读任务
 * @returns taskId
 */
async function startReading(question: string, cards: DrawnCard[]): Promise<string> {
  const data = await apiPost<{ taskId: string; status: string }>(
    API_ENDPOINTS.READING.START,
    {
      question,
      cards: cards.map((c) => ({
        position: c.position,
        name: c.card.name,
        isUpright: c.orientation === 'upright',
        uprightMeaning: c.card.uprightMeaning,
        reversedMeaning: c.card.reversedMeaning,
        keywords: c.card.keywords,
      })),
    },
    { timeout: appConfig.READING_TIMEOUT, skipAuthRefresh: true },
  )
  // 持久化 taskId，支持重进页面后继续轮询
  uni.setStorageSync('pending_reading_taskId', data.taskId)
  return data.taskId
}

/**
 * 轮询解读任务结果（单次，供外部调用）
 */
export async function pollTaskOnce(taskId: string): Promise<{
  status: 'pending' | 'completed' | 'failed' | 'cancelled'
  reading?: string
  model?: string
  incomplete?: boolean
  warning?: string
  error?: string
}> {
  return apiGet(API_ENDPOINTS.READING.RESULT(taskId), undefined, { skipAuthRefresh: true })
}

/**
 * 轮询解读任务结果（内部使用）
 */
async function pollReadingResult(taskId: string): Promise<{
  status: 'pending' | 'completed' | 'failed' | 'cancelled'
  reading?: string
  model?: string
  incomplete?: boolean
  warning?: string
  error?: string
}> {
  return pollTaskOnce(taskId)
}

/**
 * 取消解读任务
 * @param taskId - 任务 ID
 */
export async function cancelReading(taskId: string): Promise<{
  status: string
  quotaRefunded: boolean
  message?: string
}> {
  return apiPost(API_ENDPOINTS.READING.CANCEL(taskId), {}, { skipAuthRefresh: true })
}

/** 等待 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * 主入口：异步提交 + 轮询等待结果
 * @param question - 用户问题
 * @param cards - 抽到的卡牌
 * @returns 解读结果（在线成功 / 降级为本地）
 */
export async function fetchReading(question: string, cards: DrawnCard[]): Promise<ReadingResult> {
  log('reading', 'fetch_reading_start', 'info', { data: { mode: 'online', cardCount: cards.length } })
  try {
    // 检查是否有缓存的 pending taskId（重进页面恢复）
    let taskId = uni.getStorageSync('pending_reading_taskId')

    if (!taskId) {
      // 1. 提交异步任务
      taskId = await startReading(question, cards)
    }

    // 2. 轮询等待结果（最多 90 秒）
    const maxWaitMs = 90000
    const pollInterval = 2000
    const startTime = Date.now()

    while (Date.now() - startTime < maxWaitMs) {
      await sleep(pollInterval)

      try {
        const result = await pollReadingResult(taskId)

        if (result.status === 'completed' && result.reading) {
          // 解读完成，清理 taskId 缓存
          uni.removeStorageSync('pending_reading_taskId')
          log('reading', 'fetch_reading_success', 'info', { data: { model: result.model } })

          if (result.incomplete && !/✨\s*\*{0,2}综合解读/.test(result.reading)) {
            // 不完整解读，补全综合解读
            const summary = generateSummaryOnly(question, cards)
            const compensated = result.reading + summary
            return {
              reading: compensated,
              isOnline: true,
              isPartialOnline: true,
              comprehensiveInterpretation: generateSummaryOnlyText(question, cards),
            }
          }
          const summary = extractComprehensive(result.reading)
          return {
            reading: result.reading,
            isOnline: true,
            isPartialOnline: false,
            comprehensiveInterpretation: summary || undefined,
          }
        }

        if (result.status === 'failed' || result.status === 'cancelled') {
          uni.removeStorageSync('pending_reading_taskId')
          throw new Error(result.error || (result.status === 'cancelled' ? 'AI reading cancelled' : 'AI reading failed'))
        }

        // status === 'pending' → 继续轮询
      } catch (pollErr) {
        // 网络错误不中断轮询，继续等待
        if (pollErr instanceof Error &&
            (pollErr.message === 'AI reading failed' || pollErr.message === 'AI reading cancelled')) {
          throw pollErr
        }
      }
    }

    // 3. 软超时：不清除 Storage，不取消后台任务
    //    将 taskId 随降级结果返回，由 store 保存到 record 供后续升级
    const localReading = generateLocalReading(question, cards)
    const localSummary = generateSummaryOnlyText(question, cards)
    log('reading', 'fetch_reading_fallback_local', 'warn', {
      result: 'fallback',
      action: '软超时，降级本地解读',
      data: { reason: 'timeout' }
    })
    return {
      reading: localReading,
      isOnline: false,
      isPartialOnline: false,
      comprehensiveInterpretation: localSummary,
      fallbackReason: 'timeout',
      taskId,  // ← 保留 taskId
    }
  } catch (e) {
    uni.removeStorageSync('pending_reading_taskId')
    console.warn('[fetchReading] 在线解读失败，降级为本地:',
      e instanceof Error ? e.message : String(e))
    const localReading = generateLocalReading(question, cards)
    const localSummary = generateSummaryOnlyText(question, cards)
    const isQuota = e instanceof Error && (
      e.message.includes('额度') ||
      e.message.includes('DAILY_QUOTA_EXCEEDED') ||
      e.message.includes('GUEST_DAILY_LIMIT')
    )
    log('reading', 'fetch_reading_fallback_local', isQuota ? 'warn' : 'error', {
      result: 'fallback',
      action: isQuota ? '额度用完，降级本地解读' : 'API异常，降级本地解读',
      data: { reason: isQuota ? 'quota' : 'error' }
    })
    return {
      reading: localReading,
      isOnline: false,
      isPartialOnline: false,
      comprehensiveInterpretation: localSummary,
      fallbackReason: isQuota ? 'quota' : 'error',
    }
  }
}

/**
 * 本地降级：基于规则拼接与问题关联的解读
 */
export function generateLocalReading(question: string, cards: DrawnCard[]): string {
  const category = detectCategory(question)

  const parts = cards.map((c) => {
    const isUpright = c.orientation === 'upright'
    const meaning = isUpright ? c.card.uprightMeaning : c.card.reversedMeaning
    const orientation = isUpright ? '正位' : '逆位'
    const keyword = c.card.keywords[isUpright ? 0 : c.card.keywords.length - 1] || c.card.keywords[0]

    let contextHint = ''
    if (category === 'love') {
      contextHint = isUpright
        ? `在感情方面，${c.card.name}正位暗示着${keyword}的能量将正面影响你的关系。`
        : `在感情方面，${c.card.name}逆位提醒你注意${keyword}的问题，可能需要更多沟通与理解。`
    } else if (category === 'career') {
      contextHint = isUpright
        ? `在事业方面，${c.card.name}正位预示着${keyword}的机遇正在到来。`
        : `在事业方面，${c.card.name}逆位暗示你可能面临${keyword}的挑战，需要调整策略。`
    } else if (category === 'study') {
      contextHint = isUpright
        ? `在学业方面，${c.card.name}正位说明${keyword}将助你取得进步。`
        : `在学业方面，${c.card.name}逆位提醒你${keyword}可能成为阻碍，需要更多耐心。`
    } else {
      contextHint = isUpright
        ? `${c.card.name}正位带来${keyword}的积极能量。`
        : `${c.card.name}逆位暗示${keyword}的挑战需要面对。`
    }

    return `📍 位置：${c.position} — ${c.card.name}（${orientation}）\n${contextHint}\n牌面含义：${meaning}`
  })

  const summary = _generateSummary(question, cards, category)

  return `${parts.join('\n\n')}\n\n✨ 综合解读\n${summary}`
}

/**
 * 仅生成本地综合解读（用于补偿在线解读缺失的综合解读部分），并标注「（本地补充）」
 */
function generateSummaryOnly(question: string, cards: DrawnCard[]): string {
  const category = detectCategory(question)
  return generateSummary({ question, cards, category, includePrefix: true, includeBody: true })
}

/**
 * 仅生成综合解读文本（不含标记），用于 comprehensiveInterpretation 字段
 */
function generateSummaryOnlyText(question: string, cards: DrawnCard[]): string {
  const category = detectCategory(question)
  return generateSummary({ question, cards, category, includePrefix: false, includeBody: true })
}

/**
 * 生成综合总结
 */
function _generateSummary(question: string, cards: DrawnCard[], category: string): string {
  return generateSummary({ question, cards, category, includePrefix: false, includeBody: true })
}

/**
 * 后端分层健康状态
 */
export interface BackendStatus {
  /** 整体状态: ok | degraded | error */
  status: 'checking' | 'ok' | 'degraded' | 'error'
  /** Worker 是否可用 */
  worker: 'up' | 'down'
  /** 后端解读引擎是否可用 */
  gemini: 'up' | 'down' | 'unconfigured' | 'unknown'
}

/**
 * 检测后台服务分层健康状态
 * 请求 GET /api/health 端点，返回服务各组件的可用性
 */
export async function checkBackendHealth(): Promise<BackendStatus> {
  try {
    const data = await apiGet<{ status?: string; worker?: string; gemini?: string }>(
      API_ENDPOINTS.READING.HEALTH,
      undefined,
      { auth: false, timeout: appConfig.HEALTH_CHECK_TIMEOUT }
    )
    return {
      status: data.status || 'error',
      worker: data.worker || 'down',
      gemini: data.gemini || 'unknown',
    }
  } catch {
    return { status: 'error', worker: 'down', gemini: 'unknown' }
  }
}

/**
 * 根据问题关键词检测问题类别
 */
function detectCategory(question: string): 'love' | 'career' | 'study' | 'general' {
  const loveKeywords = ['感情', '爱情', '恋爱', '恋人', '对象', '男朋友', '女朋友', '老公', '老婆', '复合', '分手', '暗恋', '暧昧', '婚姻', '结婚', '桃花', '姻缘']
  const careerKeywords = ['事业', '工作', '职场', '升职', '跳槽', '面试', '创业', '薪资', '老板', '同事', '项目', '合作']
  const studyKeywords = ['学业', '考试', '学习', '考研', '高考', '考公', '留学', '成绩', '复习', '升学']

  if (loveKeywords.some((k) => question.includes(k))) return 'love'
  if (careerKeywords.some((k) => question.includes(k))) return 'career'
  if (studyKeywords.some((k) => question.includes(k))) return 'study'
  return 'general'
}
