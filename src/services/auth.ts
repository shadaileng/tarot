// ========== 认证服务 ==========
// 微信登录 / token 管理 / 用户信息存储 / 邮箱绑定 / 资料更新

import { apiPost, apiGet, apiPut, setUnauthorizedHandler } from '@/utils/request'
import { getStoredToken, setStoredToken, removeStoredToken, isLoggedIn as _isLoggedIn, getToken as _getToken } from '@/utils/token'
import { logInfo, logError } from '@/services/client-logger'
import { API_ENDPOINTS } from '@/constants/api'

// 再导出 token 函数，兼容现有调用方（client-logger、record-sync、cards 等）
export { isLoggedIn, getToken } from '@/utils/token'

// ========== 类型 ==========

export interface UserInfo {
  id: string
  nickname: string
  avatarUrl: string | null
  email?: string | null
  gender?: number | null
  birthday?: string | null
  createdAt: string
}

export interface LoginResult {
  token: string
  isNewUser?: boolean
  user: UserInfo
}

// ========== 存储 Key ==========

const USER_KEY = 'user_info'

// ========== 用户信息 ==========

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

/** 登出 */
export function logout(): void {
  logInfo('auth', 'logout')
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
    logInfo('auth', 'wechat_login_start')
    wx.login({
      success: async (res) => {
        if (!res.code) {
          logError('auth', 'wechat_login_fail', '微信登录凭证获取失败')
          reject(new Error('获取微信登录凭证失败'))
          return
        }
        try {
          const result = await apiPost<LoginResult>(API_ENDPOINTS.AUTH.WECHAT_LOGIN, { code: res.code }, { auth: false })
          setStoredToken(result.token)
          setUserInfo(result.user)
          logInfo('auth', 'wechat_login_success', { isNewUser: result.isNewUser })
          resolve(result)
        } catch (err) {
          logError('auth', 'wechat_login_fail', err instanceof Error ? err.message : '未知错误')
          reject(err)
        }
      },
      fail: (err) => {
        logError('auth', 'wechat_login_fail', err.errMsg)
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
  try {
    const result = await apiPost<LoginResult>(API_ENDPOINTS.AUTH.EMAIL_LOGIN, { email, password }, { auth: false })
    setStoredToken(result.token)
    setUserInfo(result.user)
    logInfo('auth', 'email_login_success')
    return result
  } catch (err) {
    logError('auth', 'email_login_fail', err instanceof Error ? err.message : '未知错误')
    throw err
  }
}

/**
 * H5 邮箱注册
 */
export async function emailRegister(email: string, password: string): Promise<LoginResult> {
  try {
    const result = await apiPost<LoginResult>(API_ENDPOINTS.AUTH.EMAIL_REGISTER, { email, password }, { auth: false })
    setStoredToken(result.token)
    setUserInfo(result.user)
    logInfo('auth', 'email_register_success', { isNewUser: result.isNewUser })
    return result
  } catch (err) {
    logError('auth', 'email_register_fail', err instanceof Error ? err.message : '未知错误')
    throw err
  }
}

// ========== 账号绑定（需已登录）==========

/**
 * 绑定邮箱（小程序端）
 */
export async function bindEmail(email: string, password: string): Promise<{ message: string; email: string }> {
  try {
    const result = await apiPost(API_ENDPOINTS.AUTH.BIND_EMAIL, { email, password })
    logInfo('auth', 'bind_email', { result: 'success' })
    return result
  } catch (err) {
    logError('auth', 'bind_email', err instanceof Error ? err.message : '未知错误')
    throw err
  }
}

// ========== 用户资料（需已登录）==========

/**
 * 更新用户资料（昵称/头像/性别/生日）
 */
export async function updateProfile(data: {
  nickname?: string
  avatarUrl?: string
  gender?: number
  birthday?: string
}): Promise<{ user: UserInfo }> {
  try {
    const result = await apiPut<{ user: UserInfo }>(API_ENDPOINTS.AUTH.PROFILE, data)
    // 同步更新本地缓存
    if (result.user) {
      setUserInfo(result.user)
    }
    logInfo('auth', 'profile_update', { fields: Object.keys(data) })
    return result
  } catch (err) {
    logError('auth', 'profile_update_fail', err instanceof Error ? err.message : '未知错误')
    throw err
  }
}

/**
 * 刷新本地用户信息（从后端拉取）
 */
export async function refreshUserInfo(): Promise<UserInfo | null> {
  try {
    const result = await apiGet<{ user: UserInfo }>(API_ENDPOINTS.AUTH.PROFILE)
    if (result.user) {
      setUserInfo(result.user)
      logInfo('auth', 'refresh_user_info', { result: 'success' })
      return result.user
    }
    return null
  } catch (err) {
    logError('auth', 'refresh_user_info', err instanceof Error ? err.message : '未知错误')
    return null
  }
}

// ========== 初始化 ==========

/**
 * 注册 401 全局回调（在 App.vue onLaunch 中调用）
 */
export function initAuth(onNeedLogin: () => void): void {
  setUnauthorizedHandler(onNeedLogin)
}
