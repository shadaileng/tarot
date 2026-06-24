// ========== 认证服务 ==========
// 微信登录 / token 管理 / 用户信息存储 / 邮箱绑定 / 手机号绑定 / 资料更新

import { apiPost, apiGet, apiPut, getStoredToken, setStoredToken, removeStoredToken, setUnauthorizedHandler } from '@/utils/request'

// ========== 类型 ==========

export interface UserInfo {
  id: string
  nickname: string
  avatarUrl: string | null
  email?: string | null
  phone?: string | null
  createdAt: string
}

export interface LoginResult {
  token: string
  isNewUser?: boolean
  user: UserInfo
}

// ========== 存储 Key ==========

const USER_KEY = 'user_info'

// ========== Token 管理 ==========

/** 获取本地 token */
export function getToken(): string | null {
  return getStoredToken()
}

/** 获取本地用户信息 */
export function getUserInfo(): UserInfo | null {
  try {
    const raw = uni.getStorageSync(USER_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

/** 保存用户信息 */
function setUserInfo(user: UserInfo): void {
  uni.setStorageSync(USER_KEY, JSON.stringify(user))
}

/** 检查是否已登录 */
export function isLoggedIn(): boolean {
  const token = getToken()
  if (!token) return false
  return !isTokenExpired(token)
}

/** 简单 JWT 过期检测（不验证签名，仅检查 exp） */
function isTokenExpired(token: string): boolean {
  try {
    const payloadBase64 = token.split('.')[1]
    const payload = JSON.parse(atob(payloadBase64))
    if (!payload.exp) return false
    return Date.now() >= payload.exp * 1000
  } catch {
    return true // 解析失败认为已过期
  }
}

/** 登出 */
export function logout(): void {
  removeStoredToken()
  uni.removeStorageSync(USER_KEY)
}

// ========== 检测环境 ==========

/** 是否在微信环境 */
function isWechatEnv(): boolean {
  // #ifdef MP-WEIXIN
  return typeof wx !== 'undefined' && typeof wx.login === 'function'
  // #endif
  // #ifdef H5
  return false
  // #endif
}

// ========== 登录 ==========

/**
 * 统一登录入口：自动根据环境选择登录方式
 * 小程序端：微信一键登录
 * H5 端：需要调用 emailLogin
 */
export async function login(): Promise<LoginResult> {
  if (isWechatEnv()) {
    return wechatLogin()
  }
  throw new Error('H5 端请使用邮箱登录')
}

/**
 * 小程序微信登录
 */
async function wechatLogin(): Promise<LoginResult> {
  return new Promise((resolve, reject) => {
    // #ifdef MP-WEIXIN
    wx.login({
      success: async (res) => {
        if (!res.code) {
          reject(new Error('获取微信登录凭证失败'))
          return
        }
        try {
          const result = await apiPost<LoginResult>('/api/auth/wechat-login', { code: res.code }, { auth: false })
          setStoredToken(result.token)
          setUserInfo(result.user)
          resolve(result)
        } catch (err) {
          reject(err)
        }
      },
      fail: (err) => {
        reject(new Error(err.errMsg || '微信登录失败'))
      },
    })
    // #endif
    // #ifdef H5
    reject(new Error('当前环境不支持微信登录'))
    // #endif
  })
}

/**
 * H5 邮箱登录
 */
export async function emailLogin(email: string, password: string): Promise<LoginResult> {
  const result = await apiPost<LoginResult>('/api/auth/email-login', { email, password }, { auth: false })
  setStoredToken(result.token)
  setUserInfo(result.user)
  return result
}

/**
 * H5 邮箱注册
 */
export async function emailRegister(email: string, password: string): Promise<LoginResult> {
  const result = await apiPost<LoginResult>('/api/auth/email-register', { email, password }, { auth: false })
  setStoredToken(result.token)
  setUserInfo(result.user)
  return result
}

// ========== 账号绑定（需已登录）==========

/**
 * 绑定邮箱（小程序端）
 */
export async function bindEmail(email: string, password: string): Promise<{ message: string; email: string }> {
  return apiPost('/api/auth/bind-email', { email, password })
}

/**
 * 绑定手机号（小程序端）
 */
export async function bindPhone(phoneCode: string): Promise<{ message: string; phone: string }> {
  return apiPost('/api/auth/bind-phone', { code: phoneCode })
}

// ========== 用户资料（需已登录）==========

/**
 * 更新用户资料（昵称/头像）
 */
export async function updateProfile(data: {
  nickname?: string
  avatarUrl?: string
}): Promise<{ user: UserInfo }> {
  const result = await apiPut<{ user: UserInfo }>('/api/user/profile', data)
  // 同步更新本地缓存
  if (result.user) {
    setUserInfo(result.user)
  }
  return result
}

/**
 * 刷新本地用户信息（从后端拉取）
 */
export async function refreshUserInfo(): Promise<UserInfo | null> {
  try {
    const result = await apiGet<{ user: UserInfo }>('/api/user/profile')
    if (result.user) {
      setUserInfo(result.user)
      return result.user
    }
    return null
  } catch {
    return null
  }
}

// ========== 首次登录引导 ==========

const PHONE_PROMPTED_KEY = 'phone_bind_prompted'

/**
 * 是否应该弹出手机号绑定引导（新用户首次登录后、尚未绑定手机号、未提示过）
 */
export function shouldPromptPhoneBind(userInfo: UserInfo): boolean {
  if (userInfo.phone) return false
  try {
    const prompted = uni.getStorageSync(PHONE_PROMPTED_KEY)
    return !prompted
  } catch {
    return true
  }
}

/**
 * 标记手机号绑定引导已展示
 */
export function markPhonePromptShown(): void {
  uni.setStorageSync(PHONE_PROMPTED_KEY, '1')
}

// ========== 初始化 ==========

/**
 * 注册 401 全局回调（在 App.vue onLaunch 中调用）
 */
export function initAuth(onNeedLogin: () => void): void {
  setUnauthorizedHandler(onNeedLogin)
}
