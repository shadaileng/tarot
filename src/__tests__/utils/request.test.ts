import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/services/client-logger', () => ({
  log: vi.fn(), logInfo: vi.fn(), logWarn: vi.fn(), logError: vi.fn(),
}))

import { apiGet, apiPost, apiPut, apiDelete, apiPatch, setUnauthorizedHandler, resetAuthRefreshLock } from '@/utils/request'

function mockRequestSuccess(data: any, statusCode = 200) {
  // @ts-expect-error: uni mock
  globalThis.uni.request = vi.fn(({ success }: any) => {
    success({ statusCode, data })
  })
}

function mockRequestFail(errMsg: string) {
  // @ts-expect-error: uni mock
  globalThis.uni.request = vi.fn(({ fail }: any) => {
    fail({ errMsg })
  })
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('apiGet', () => {
  it('成功时返回数据', async () => {
    mockRequestSuccess({ result: 'ok' })
    const result = await apiGet('/api/test')
    expect(result).toEqual({ result: 'ok' })
  })

  it('params 拼接为查询参数', async () => {
    const captured: any[] = []
    // @ts-expect-error: uni mock
    globalThis.uni.request = vi.fn((opts: any) => {
      captured.push(opts)
      opts.success({ statusCode: 200, data: {} })
    })
    await apiGet('/api/test', { a: 1, b: 'hello' })
    expect(captured[0].url).toContain('?')
    expect(captured[0].url).toContain('a=1')
    expect(captured[0].url).toContain('b=hello')
  })

  it('忽略 undefined/null 参数', async () => {
    const captured: any[] = []
    // @ts-expect-error: uni mock
    globalThis.uni.request = vi.fn((opts: any) => {
      captured.push(opts)
      opts.success({ statusCode: 200, data: {} })
    })
    await apiGet('/api/test', { a: 1, b: undefined, c: null })
    expect(captured[0].url).toContain('a=1')
    expect(captured[0].url).not.toContain('b=')
    expect(captured[0].url).not.toContain('c=')
  })

  it('错误时抛出 Error', async () => {
    mockRequestFail('timeout')
    await expect(apiGet('/api/test')).rejects.toThrow()
  })
})

describe('apiPost', () => {
  it('发送 POST 请求', async () => {
    const captured: any[] = []
    // @ts-expect-error: uni mock
    globalThis.uni.request = vi.fn((opts: any) => {
      captured.push(opts)
      opts.success({ statusCode: 200, data: { id: 1 } })
    })
    const result = await apiPost('/api/create', { name: 'test' })
    expect(captured[0].method).toBe('POST')
    expect(result).toEqual({ id: 1 })
  })
})

describe('apiPut / apiDelete / apiPatch', () => {
  it('apiPut 发送 PUT 请求', async () => {
    mockRequestSuccess({ ok: true })
    const result = await apiPut('/api/update', { name: 'new' })
    expect(result).toEqual({ ok: true })
  })

  it('apiDelete 发送 DELETE 请求', async () => {
    mockRequestSuccess({ deleted: true })
    const result = await apiDelete('/api/delete')
    expect(result).toEqual({ deleted: true })
  })

  it('apiPatch 发送 PATCH 请求', async () => {
    mockRequestSuccess({ patched: true })
    const result = await apiPatch('/api/patch', { field: 'val' })
    expect(result).toEqual({ patched: true })
  })
})

describe('401 处理', () => {
  it('401 时清除 token', async () => {
    // @ts-expect-error: uni mock
    globalThis.uni.request = vi.fn(({ success }: any) => {
      success({ statusCode: 401, data: {} })
    })
    await expect(apiGet('/api/test')).rejects.toThrow('UNAUTHORIZED')
    expect(globalThis.uni.removeStorageSync).toHaveBeenCalledWith('auth_token')
    expect(globalThis.uni.removeStorageSync).toHaveBeenCalledWith('user_info')
  })
})

describe('setUnauthorizedHandler / resetAuthRefreshLock', () => {
  it('setUnauthorizedHandler 注册回调', () => {
    const handler = vi.fn()
    setUnauthorizedHandler(handler)
    expect(() => resetAuthRefreshLock()).not.toThrow()
  })
})
