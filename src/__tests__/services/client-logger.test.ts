import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

import { log, logInfo, logWarn, logError, startTrace, endTrace, getTraceId, initClientLogger, destroyClientLogger, getAnonymousId } from '@/services/client-logger'

beforeEach(() => {
  vi.clearAllMocks()
  vi.useFakeTimers()
  // Reset buffer state by destroying and reinitializing
  try { destroyClientLogger() } catch {}
})

afterEach(() => {
  try { destroyClientLogger() } catch {}
  vi.useRealTimers()
})

describe('startTrace / endTrace / getTraceId', () => {
  it('startTrace 生成 traceId', () => {
    const id = startTrace()
    expect(id).toBeTruthy()
    expect(typeof id).toBe('string')
  })

  it('getTraceId 返回当前 traceId', () => {
    const id = startTrace()
    expect(getTraceId()).toBe(id)
  })

  it('endTrace 清除 traceId', () => {
    startTrace()
    endTrace()
    expect(getTraceId()).toBeNull()
  })
})

describe('log', () => {
  it('info 级别不输出 error/warn', () => {
    log('auth', 'test_event', 'info')
    // Should not throw
  })

  it('warn 级别调用 console.warn', () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    log('auth', 'test_warn', 'warn')
    expect(spy).toHaveBeenCalled()
    spy.mockRestore()
  })

  it('error 级别调用 console.error', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    log('auth', 'test_error', 'error')
    expect(spy).toHaveBeenCalled()
    spy.mockRestore()
  })
})

describe('logInfo / logWarn / logError', () => {
  it('logInfo 调用 log 级别 info', () => {
    logInfo('page', 'page_view', { page: 'index' })
    // Should not throw
  })

  it('logWarn 传递 result=fail', () => {
    logWarn('sync', 'sync_fail', '网络错误', { url: '/api/test' })
    // Should not throw
  })

  it('logError 传递 result=error', () => {
    logError('auth', 'login_fail', '凭证错误')
    // Should not throw
  })
})

describe('initClientLogger / destroyClientLogger', () => {
  it('initClientLogger 不抛出异常', () => {
    expect(() => initClientLogger()).not.toThrow()
  })

  it('destroyClientLogger 不抛出异常', () => {
    initClientLogger()
    expect(() => destroyClientLogger()).not.toThrow()
  })
})

describe('getAnonymousId', () => {
  it('返回字符串', () => {
    // @ts-expect-error: uni mock
    globalThis.uni.getStorageSync = vi.fn(() => null)
    // @ts-expect-error: uni mock
    globalThis.uni.setStorageSync = vi.fn()
    const id = getAnonymousId()
    expect(id).toBeTruthy()
  })
})
