import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/services/client-logger', () => ({ log: vi.fn(), logInfo: vi.fn(), logWarn: vi.fn(), logError: vi.fn() }))

import { getStoredToken, setStoredToken, removeStoredToken, isLoggedIn, getToken } from '@/utils/token'

const TOKEN_KEY = 'auth_token'

beforeEach(() => {
  vi.clearAllMocks()
  // @ts-expect-error: uni mock
  globalThis.uni.getStorageSync = vi.fn(() => null)
})

describe('getStoredToken', () => {
  it('没有 token 时返回 null', () => {
    expect(getStoredToken()).toBeNull()
  })

  it('有 token 时返回 token 字符串', () => {
    // @ts-expect-error: uni mock
    globalThis.uni.getStorageSync = vi.fn(() => 'my-token')
    expect(getStoredToken()).toBe('my-token')
  })
})

describe('setStoredToken', () => {
  it('保存 token 到 storage', () => {
    setStoredToken('new-token')
    expect(globalThis.uni.setStorageSync).toHaveBeenCalledWith(TOKEN_KEY, 'new-token')
  })
})

describe('removeStoredToken', () => {
  it('清除 token', () => {
    removeStoredToken()
    expect(globalThis.uni.removeStorageSync).toHaveBeenCalledWith(TOKEN_KEY)
  })
})

describe('isLoggedIn', () => {
  it('无 token 时返回 false', () => {
    expect(isLoggedIn()).toBe(false)
  })

  it('未过期 token 返回 true', () => {
    const futureExp = Math.floor(Date.now() / 1000) + 3600
    const payload = btoa(JSON.stringify({ exp: futureExp, userId: 'u1' }))
    const token = `header.${payload}.signature`
    // @ts-expect-error: uni mock
    globalThis.uni.getStorageSync = vi.fn(() => token)
    expect(isLoggedIn()).toBe(true)
  })

  it('已过期 token 返回 false', () => {
    const pastExp = Math.floor(Date.now() / 1000) - 3600
    const payload = btoa(JSON.stringify({ exp: pastExp }))
    const token = `header.${payload}.signature`
    // @ts-expect-error: uni mock
    globalThis.uni.getStorageSync = vi.fn(() => token)
    expect(isLoggedIn()).toBe(false)
  })

  it('无效 token 返回 false', () => {
    // @ts-expect-error: uni mock
    globalThis.uni.getStorageSync = vi.fn(() => 'invalid-token')
    expect(isLoggedIn()).toBe(false)
  })
})

describe('getToken', () => {
  it('调用 getStoredToken', () => {
    // @ts-expect-error: uni mock
    globalThis.uni.getStorageSync = vi.fn(() => 'some-token')
    expect(getToken()).toBe('some-token')
  })
})
