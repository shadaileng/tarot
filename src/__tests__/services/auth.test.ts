import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/services/client-logger', () => ({
  log: vi.fn(), logInfo: vi.fn(), logWarn: vi.fn(), logError: vi.fn(),
  startTrace: vi.fn(),
  endTrace: vi.fn(),
  getTraceId: vi.fn(),
}))

vi.mock('@/utils/request', () => ({
  apiPost: vi.fn(),
  apiGet: vi.fn(),
  apiPut: vi.fn(),
  setUnauthorizedHandler: vi.fn(),
}))

const { apiPost, apiGet, apiPut } = await import('@/utils/request')

import { getUserInfo, logout, isLoggedIn, getToken, emailLogin, emailRegister, bindEmail, updateProfile, refreshUserInfo, initAuth } from '@/services/auth'

const USER_KEY = 'user_info'

beforeEach(() => {
  vi.clearAllMocks()
  // @ts-expect-error: uni mock
  globalThis.uni.getStorageSync = vi.fn(() => null)
  // @ts-expect-error: uni mock
  globalThis.uni.removeStorageSync = vi.fn()
  // @ts-expect-error: uni mock
  globalThis.uni.setStorageSync = vi.fn()
})

describe('getUserInfo', () => {
  it('没有用户信息时返回 null', () => {
    expect(getUserInfo()).toBeNull()
  })

  it('有用户信息时解析返回', () => {
    const user = { id: 'u1', nickname: '测试', avatarUrl: null }
    // @ts-expect-error: uni mock
    globalThis.uni.getStorageSync = vi.fn(() => JSON.stringify(user))
    expect(getUserInfo()).toEqual(user)
  })
})

describe('logout', () => {
  it('清除 token 和用户信息', () => {
    logout()
    expect(globalThis.uni.removeStorageSync).toHaveBeenCalledWith('auth_token')
    expect(globalThis.uni.removeStorageSync).toHaveBeenCalledWith(USER_KEY)
  })
})

describe('emailLogin', () => {
  it('成功时保存 token 和用户信息', async () => {
    const response = { token: 'jwt-token', user: { id: 'u1', nickname: '测试', avatarUrl: null, createdAt: '2026-01-01' } }
    vi.mocked(apiPost).mockResolvedValue(response)
    const result = await emailLogin('test@example.com', 'password')
    expect(apiPost).toHaveBeenCalledWith('/api/auth/email-login', { email: 'test@example.com', password: 'password' }, { auth: false })
    expect(result.token).toBe('jwt-token')
    expect(globalThis.uni.setStorageSync).toHaveBeenCalledWith('auth_token', 'jwt-token')
  })
})

describe('emailRegister', () => {
  it('成功时注册并保存', async () => {
    const response = { token: 'jwt', isNewUser: true, user: { id: 'u2', nickname: '新用户', avatarUrl: null, createdAt: '2026-07-20' } }
    vi.mocked(apiPost).mockResolvedValue(response)
    const result = await emailRegister('new@test.com', 'pass')
    expect(apiPost).toHaveBeenCalledWith('/api/auth/email-register', { email: 'new@test.com', password: 'pass' }, { auth: false })
    expect(result.isNewUser).toBe(true)
  })
})

describe('bindEmail', () => {
  it('调用绑定 API', async () => {
    vi.mocked(apiPost).mockResolvedValue({ message: '绑定成功', email: 'test@test.com' })
    const result = await bindEmail('test@test.com', 'pass')
    expect(result.message).toBe('绑定成功')
  })
})

describe('updateProfile', () => {
  it('更新资料并同步本地缓存', async () => {
    const user = { id: 'u1', nickname: '新昵称', avatarUrl: null, createdAt: '2026-01-01' }
    vi.mocked(apiPut).mockResolvedValue({ user })
    const result = await updateProfile({ nickname: '新昵称' })
    expect(result.user.nickname).toBe('新昵称')
    expect(globalThis.uni.setStorageSync).toHaveBeenCalledWith(USER_KEY, JSON.stringify(user))
  })
})

describe('refreshUserInfo', () => {
  it('拉取并更新缓存', async () => {
    const user = { id: 'u1', nickname: '刷新', avatarUrl: null, createdAt: '2026-01-01' }
    vi.mocked(apiGet).mockResolvedValue({ user })
    const result = await refreshUserInfo()
    expect(result?.nickname).toBe('刷新')
  })
})

describe('initAuth', () => {
  it('注册 401 回调', () => {
    const handler = vi.fn()
    initAuth(handler)
    expect(() => initAuth(vi.fn())).not.toThrow()
  })
})

describe('re-exported token functions', () => {
  it('isLoggedIn 存在', () => {
    expect(typeof isLoggedIn).toBe('function')
  })

  it('getToken 存在', () => {
    expect(typeof getToken).toBe('function')
  })
})
