// ========== 统一请求封装 ==========
// 基于 uni.request，自动注入 JWT token，处理 401 重新登录

import { logWarn, logError, logInfo } from '@/services/client-logger'
import { getStoredToken, removeStoredToken } from '@/utils/token'

// 再导出 token 函数，兼容现有调用方（auth.ts、poster.ts 等）
export { getStoredToken, setStoredToken, removeStoredToken } from '@/utils/token'

const BACKEND_API = (import.meta.env.VITE_BACKEND_API || '').replace(/\/+$/, '')

interface RequestOptions {
  /** 是否携带 token（默认 true） */
  auth?: boolean
  /** 是否跳过 401 自动重登录（默认 false） */
  skipAuthRefresh?: boolean
  /** 超时时间（毫秒） */
  timeout?: number
  /** 响应类型 */
  responseType?: 'text' | 'arraybuffer'
}

let onUnauthorized: (() => void) | null = null
let isRefreshing = false

/**
 * 注册 401 回调（由 auth service 调用）
 */
export function setUnauthorizedHandler(handler: () => void): void {
  onUnauthorized = handler
}

/**
 * 重置重登录锁（由 App.vue 重登录完成后调用）
 */
export function resetAuthRefreshLock(): void {
  isRefreshing = false
}

/**
 * 内部请求方法
 */
function request<T>(
  method: 'GET' | 'POST' | 'PUT' | 'DELETE',
  url: string,
  data?: any,
  options: RequestOptions = {}
): Promise<T> {
  const fullUrl = url.startsWith('http') ? url : `${BACKEND_API}${url}`
  const { auth = true, skipAuthRefresh = false, timeout, responseType } = options

  const header: Record<string, string> = {}

  if (typeof FormData === 'undefined' || !(data instanceof FormData)) {
    header['Content-Type'] = 'application/json'
  }

  if (auth) {
    const token = getStoredToken()
    if (token) {
      header['Authorization'] = `Bearer ${token}`
    }
  }

  return new Promise((resolve, reject) => {
    uni.request({
      url: fullUrl,
      method,
      header,
      data,
      timeout: timeout ?? 15000,
      responseType: responseType || 'text',
      success: (res) => {
        if (res.statusCode === 401) {
          console.error('[REQ] 401 received for URL:', fullUrl)
          logWarn('error', 'token_expired', '清除token并触发重新登录', { url: fullUrl })
          // Token 过期或无效：同步清除 token + userInfo，保持状态一致
          removeStoredToken()
          uni.removeStorageSync('user_info')
          if (!skipAuthRefresh && onUnauthorized && !isRefreshing) {
            isRefreshing = true
            logInfo('auth', 'auto_login_recovery_success')
            onUnauthorized()
          }
          reject(new Error('UNAUTHORIZED'))
          return
        }

        if (res.statusCode && res.statusCode >= 400) {
          const errData = res.data as any
          const message = errData?.message || errData?.error || `请求失败 (${res.statusCode})`
          if (res.statusCode !== 401) {
            logWarn('error', 'api_client_error', message, { url: fullUrl, statusCode: res.statusCode })
          }
          reject(new Error(message))
          return
        }

        resolve(res.data as T)
      },
      fail: (err) => {
        const errMsg = err.errMsg || '网络请求失败'
        if (errMsg.includes('timeout')) {
          logWarn('error', 'api_request_timeout', '请求超时', { url: fullUrl, timeout: timeout ?? 15000 })
        } else {
          logError('error', 'api_request_fail', errMsg, { url: fullUrl })
        }
        reject(new Error(errMsg))
      },
    })
  })
}

/**
 * POST 请求（自动注入 JWT）
 */
export function apiPost<T>(url: string, data?: any, options?: RequestOptions): Promise<T> {
  return request<T>('POST', url, data, options)
}

/**
 * GET 请求（自动注入 JWT）
 */
export function apiGet<T>(url: string, params?: Record<string, any>, options?: RequestOptions): Promise<T> {
  // 将 params 拼接到 URL（uni.request 不直接支持 params）
  let fullUrl = url
  if (params) {
    const qs = Object.entries(params)
      .filter(([, v]) => v !== undefined && v !== null)
      .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
      .join('&')
    if (qs) fullUrl += `?${qs}`
  }
  return request<T>('GET', fullUrl, undefined, options)
}

/**
 * PUT 请求（自动注入 JWT）
 */
export function apiPut<T>(url: string, data?: any, options?: RequestOptions): Promise<T> {
  return request<T>('PUT', url, data, options)
}

/**
 * DELETE 请求（自动注入 JWT）
 */
export function apiDelete<T>(url: string, options?: RequestOptions): Promise<T> {
  return request<T>('DELETE', url, undefined, options)
}

/**
 * PATCH 请求（自动注入 JWT）
 */
export function apiPatch<T>(url: string, data?: any, options?: RequestOptions): Promise<T> {
  return request<T>('PATCH', url, data, options)
}
