// ========== 客户端日志服务 ==========
// 缓冲区 + 批量上报 + 脱敏 + 去重 + 设备指纹
// 不依赖 request.ts，直接用 uni.request 发送，避免循环依赖
// 注意：从 utils/token.ts 导入而非 services/auth.ts，打破 request→client-logger→auth 循环

import { isLoggedIn, getToken } from '@/utils/token'

// ========== 类型 ==========
export type EventLevel = 'info' | 'warn' | 'error'
export type EventCategory = 'auth' | 'reading' | 'sync' | 'poster' | 'page' | 'user_action' | 'error'

export interface ClientEvent {
  id: string
  timestamp: string
  level: EventLevel
  category: EventCategory
  event: string
  result?: 'success' | 'fail' | 'degraded' | 'fallback'
  action?: string
  schemaVersion: number
  data?: Record<string, any>
  device?: DeviceInfo
}

interface DeviceInfo {
  platform: string
  model?: string
  system?: string
  sdkVersion?: string
  appVersion?: string
}

const BACKEND_API = (import.meta.env.VITE_BACKEND_API || '').replace(/\/+$/, '')
const TOKEN_KEY = 'auth_token'

/** 从 JWT token 中解析 userId */
function parseUserIdFromToken(token: string): string | undefined {
  try {
    const payloadBase64 = token.split('.')[1]
    let base64 = payloadBase64.replace(/-/g, '+').replace(/_/g, '/')
    while (base64.length % 4) base64 += '='
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/='
    let result = ''
    for (let i = 0; i < base64.length; i += 4) {
      const a = chars.indexOf(base64[i])
      const b = chars.indexOf(base64[i + 1])
      const c = chars.indexOf(base64[i + 2])
      const d = chars.indexOf(base64[i + 3])
      result += String.fromCharCode((a << 2) | (b >> 4))
      if (c !== 64) result += String.fromCharCode(((b & 15) << 4) | (c >> 2))
      if (d !== 64) result += String.fromCharCode(((c & 3) << 6) | d)
    }
    const payload = JSON.parse(decodeURIComponent(escape(result)))
    return payload.userId || payload.sub || payload.id
  } catch {
    return undefined
  }
}

// ========== 直接用 uni.request 发送（零依赖）==========
function postClientEvents(events: BufferedEvent[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const token = getToken() || uni.getStorageSync(TOKEN_KEY) || ''
    uni.request({
      url: `${BACKEND_API}/api/client-events`,
      method: 'POST',
      header: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      data: { events },
      timeout: API_TIMEOUT,
      success: (res) => {
        if (res.statusCode === 200) {
          resolve()
        } else if (res.statusCode === 401) {
          reject(new Error('UNAUTHORIZED'))
        } else {
          const msg = (res.data as any)?.message || `HTTP ${res.statusCode}`
          reject(new Error(msg))
        }
      },
      fail: (err) => {
        reject(new Error(err.errMsg || '网络请求失败'))
      },
    })
  })
}

// ========== 设备信息（懒初始化）==========
let deviceInfo: DeviceInfo | undefined

function getDeviceInfo(): DeviceInfo {
  if (deviceInfo) return deviceInfo
  deviceInfo = { platform: 'unknown' }
  // #ifdef MP-WEIXIN
  try {
    // 优先使用新版 API（基础库 2.20.1+），旧版兜底
    // 注意：新版 API 的 SDKVersion 在 getAppBaseInfo() 中，需显式映射避免 spread 优先级问题
    if (typeof wx.getDeviceInfo === 'function') {
      const dev = wx.getDeviceInfo()
      const app = wx.getAppBaseInfo()
      deviceInfo = {
        platform: dev.platform || app.platform || 'unknown',
        model: dev.model,
        system: dev.system,
        sdkVersion: app.SDKVersion || (app as any).sdkVersion,
        appVersion: (typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : undefined),
      }
    } else {
      const sys = wx.getSystemInfoSync?.()
      if (sys) {
        deviceInfo = {
          platform: sys.platform || 'unknown',
          model: sys.model,
          system: sys.system,
          sdkVersion: sys.SDKVersion,
          appVersion: (typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : undefined),
        }
      }
    }
  } catch (_) { /* 静默失败 */ }
  // #endif
  return deviceInfo
}

// ========== 设备指纹（用于未登录事件关联）==========
let anonymousId: string | undefined

function getAnonymousId(): string {
  if (anonymousId) return anonymousId
  try {
    anonymousId = uni.getStorageSync('_client_anonymous_id') || ''
    if (!anonymousId) {
      anonymousId = generateId()
      uni.setStorageSync('_client_anonymous_id', anonymousId)
    }
  } catch (_) {
    anonymousId = generateId()
  }
  return anonymousId
}

// ========== 事件缓冲区 ==========
const MAX_BUFFER_SIZE = 20
const MAX_BODY_SIZE_BYTES = 64 * 1024     // 64KB
const FLUSH_INTERVAL_MS = 30000
const API_TIMEOUT = 5000
const PENDING_EVENTS_KEY = '_client_pending_events'
const MAX_PENDING_PERSIST = 100  // 本地持久化上限

interface BufferedEvent extends ClientEvent {
  _userId?: string
  traceId?: string
  schemaVersion: number
}

let buffer: BufferedEvent[] = []
let pendingLaunchEvents: BufferedEvent[] = []  // 登录前的 app_launch 暂存
const MAX_PENDING_LAUNCH = 50                  // 暂存上限，极端冷启 + 断网兜底
let flushTimer: ReturnType<typeof setInterval> | null = null
let isFlushing = false
let lastUserId: string | undefined              // 登出时快照 userId

// G1/G2 异常事件去重：同 url 最近一次上报时间（惰性清理，防止 timer 内存泄漏）
const apiErrorLastReport = new Map<string, number>()
const API_ERROR_DEDUP_MS = 5000
const API_ERROR_SAMPLE_RATE = 0.2               // 1/5 采样
const API_ERROR_MAP_MAX = 100                   // Map 上限，超过时清除 50 条最早过期项

function generateId(): string {
  const hex = '0123456789abcdef'
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    return (c === 'x' ? hex[r] : hex[(r & 0x3) | 0x8])
  })
}

// ========== 操作链路追踪（traceId）==========
let currentTraceId: string | null = null

/** 开始新的追踪链路，返回 traceId */
export function startTrace(): string {
  currentTraceId = generateId()
  return currentTraceId
}

/** 结束当前追踪链路 */
export function endTrace(): void {
  currentTraceId = null
}

/** 获取当前 traceId（只读） */
export function getTraceId(): string | null {
  return currentTraceId
}

// ========== 敏感字段脱敏 ==========
const SENSITIVE_KEYS = ['password', 'passwd', 'pwd', 'phone', 'mobile', 'tel',
  'idCard', 'idcard', 'idNo', 'realName', 'email', 'secret', 'token', 'accessToken']

function sanitize(data?: Record<string, any>): Record<string, any> | undefined {
  if (!data) return undefined
  const clean: Record<string, any> = {}
  for (const [key, val] of Object.entries(data)) {
    if (SENSITIVE_KEYS.some(sk => key.toLowerCase().includes(sk.toLowerCase()))) {
      clean[key] = '[REDACTED]'
    } else {
      clean[key] = val
    }
  }
  return clean
}

// ========== G1/G2 异常去重 + 采样（首条必报）==========
function shouldReportApiError(url: string): boolean {
  const now = Date.now()
  const last = apiErrorLastReport.get(url)
  if (last && now - last < API_ERROR_DEDUP_MS) return false

  // 惰性清理：每次插入前检查 Map 大小，超过上限时删除最早的过期条目
  if (apiErrorLastReport.size >= API_ERROR_MAP_MAX) {
    const cutoff = now - API_ERROR_DEDUP_MS - 1000
    const expired = [...apiErrorLastReport.entries()].filter(([, ts]) => ts < cutoff)
    if (expired.length > 0) {
      // 有过期项则清除
      expired.forEach(([k]) => apiErrorLastReport.delete(k))
    } else {
      // 全部活跃，清除最早的 50 条（保护性兜底）
      const sorted = [...apiErrorLastReport.entries()].sort((a, b) => a[1] - b[1])
      sorted.slice(0, 50).forEach(([k]) => apiErrorLastReport.delete(k))
    }
  }

  // 首条必报（last 为 undefined），后续采样
  if (last !== undefined && Math.random() > API_ERROR_SAMPLE_RATE) return false
  apiErrorLastReport.set(url, now)
  return true
}

// ========== body 大小估算 ==========
function estimateBodySize(events: BufferedEvent[]): number {
  // 以完整请求体结构估算（含 events 包装），避免客户端低估被后端 413 拒绝
  return JSON.stringify({ events }).length
}

// ========== 持久化失败事件到本地 storage ==========
function persistPendingEvents(events: BufferedEvent[]): void {
  try {
    const existing = loadPendingEvents()
    const merged = [...existing, ...events].slice(-MAX_PENDING_PERSIST)
    uni.setStorageSync(PENDING_EVENTS_KEY, JSON.stringify(merged))
  } catch (_) {
    // storage 写入失败，放弃持久化
  }
}

function loadPendingEvents(): BufferedEvent[] {
  try {
    const raw = uni.getStorageSync(PENDING_EVENTS_KEY)
    if (!raw) return []
    return JSON.parse(raw) as BufferedEvent[]
  } catch (_) {
    return []
  }
}

function clearPendingEvents(): void {
  try {
    uni.removeStorageSync(PENDING_EVENTS_KEY)
  } catch (_) {}
}

function enqueue(event: BufferedEvent): void {
  buffer.push(event)
  if (buffer.length >= MAX_BUFFER_SIZE && !isFlushing) {
    flush().catch((err: any) => {
      console.error('[CLIENT-LOG] enqueue auto-flush failed:', err?.message || err)
    })
  }
}

async function flush(): Promise<void> {
  if (buffer.length === 0 || isFlushing) return

  const isLogged = isLoggedIn()
  if (!isLogged) {
    // 未登录时：app_launch 类事件暂存，其余丢弃
    const launchLike = buffer.filter(e => e.category === 'page' && e.event === 'app_launch')
    if (launchLike.length > 0) {
      pendingLaunchEvents.push(...launchLike)
      // 限制暂存大小：超上限时丢弃最早的事件
      while (pendingLaunchEvents.length > MAX_PENDING_LAUNCH) {
        pendingLaunchEvents.shift()
      }
    }
    buffer = []
    return
  }

  try {
    isFlushing = true
    const token = getToken()
    lastUserId = token ? parseUserIdFromToken(token) : undefined  // 快照当前 userId

    // 登录后：合并暂存的 app_launch 事件
    if (pendingLaunchEvents.length > 0) {
      buffer.unshift(...pendingLaunchEvents)
      pendingLaunchEvents = []
    }

    // 合并上次持久化失败的事件
    const pending = loadPendingEvents()
    if (pending.length > 0) {
      clearPendingEvents()
      buffer.unshift(...pending)
    }

    // 限制批次大小：逐条截断直到 body 不超过 64KB
    while (buffer.length > 0 && estimateBodySize(buffer) > MAX_BODY_SIZE_BYTES) {
      buffer.pop()
    }

    const batch = buffer.splice(0)
    await postClientEvents(batch)
  } catch (err: any) {
    // 上报失败：输出错误信息 + 持久化到本地 storage 下次补发
    console.error('[CLIENT-LOG] flush failed:', err?.message || err)
    if (buffer.length > 0) {
      persistPendingEvents(buffer)
      console.warn(`[CLIENT-LOG] ${buffer.length} events persisted to local storage`)
      buffer = []
    }
  } finally {
    isFlushing = false
    // flush 完成后若仍有积压，立即补刷
    if (buffer.length > 0) {
      setTimeout(() => flush(), 100)
    }
  }
}

// ========== 生命周期 ==========
export function initClientLogger(): void {
  getDeviceInfo()
  getAnonymousId()
  if (flushTimer) clearInterval(flushTimer)
  flushTimer = setInterval(flush, FLUSH_INTERVAL_MS)
  log('page', 'app_launch', 'info')

  // 启动后立即尝试补发上次持久化的失败事件
  setTimeout(() => flush(), 1000)
}

export function destroyClientLogger(): void {
  // 先停止定时器，防止并发 flush
  if (flushTimer) { clearInterval(flushTimer); flushTimer = null }

  if (!isLoggedIn() && lastUserId) {
    // 登出时：合并暂存事件，用快照 userId 发送
    const batch = [...buffer, ...pendingLaunchEvents]
    buffer = []
    pendingLaunchEvents = []
    if (batch.length > 0) {
      isFlushing = true  // 互斥：防止残留异步操作并发
      postClientEvents(batch.map(e => ({ ...e, _userId: lastUserId })))
        .catch((err: any) => {
          console.error('[CLIENT-LOG] destroyClientLogger flush failed:', err?.message || err)
          persistPendingEvents(batch)
        })
        .finally(() => { isFlushing = false })
    }
  } else {
    flush().catch((err: any) => {
      console.error('[CLIENT-LOG] destroyClientLogger flush failed:', err?.message || err)
    })
  }
}

// ========== 公开 API ==========
export function log(
  category: EventCategory,
  event: string,
  level: EventLevel = 'info',
  opts?: { result?: ClientEvent['result']; action?: string; data?: Record<string, any> }
): void {
  try {
    // G1/G2 去重采样
    if ((event === 'api_request_fail' || event === 'api_request_timeout')
        && opts?.data?.url && !shouldReportApiError(opts.data.url)) {
      return
    }

    const clientEvent: BufferedEvent = {
      id: generateId(),
      timestamp: new Date().toISOString(),
      level,
      category,
      event,
      result: opts?.result,
      action: opts?.action,
      schemaVersion: 1,
      data: sanitize(opts?.data),
      device: getDeviceInfo(),
      traceId: currentTraceId || undefined,
    }

    if (level === 'error') {
      console.error('[CLIENT-LOG]', event, opts?.data)
    } else if (level === 'warn') {
      console.warn('[CLIENT-LOG]', event, opts?.data)
    }

    enqueue(clientEvent)
  } catch (_) {
    // 日志内部异常永不上抛到业务层
  }
}

export function logInfo(category: EventCategory, event: string, data?: Record<string, any>) {
  log(category, event, 'info', data ? { data } : undefined)
}

export function logWarn(category: EventCategory, event: string, action?: string, data?: Record<string, any>) {
  log(category, event, 'warn', { result: 'fail', action, data })
}

export function logError(category: EventCategory, event: string, action?: string, data?: Record<string, any>) {
  log(category, event, 'error', { result: 'error', action, data })
}

// 暴露匿名 ID 供外部使用
export { getAnonymousId }
