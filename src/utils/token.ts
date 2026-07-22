// ========== Token 管理 ==========
// JWT 存储 / 读取 / 过期检测
// 独立模块，避免 request ↔ auth ↔ client-logger 循环依赖

const TOKEN_KEY = 'auth_token'
const USER_KEY = 'user_info'

// ========== Token 存储 ==========

/** 获取本地存储的 JWT token */
export function getStoredToken(): string | null {
  const raw = uni.getStorageSync(TOKEN_KEY)
  return raw || null
}

/** 保存 JWT token */
export function setStoredToken(token: string): void {
  uni.setStorageSync(TOKEN_KEY, token)
}

/** 清除 JWT token */
export function removeStoredToken(): void {
  uni.removeStorageSync(TOKEN_KEY)
}

// ========== Token 解析 ==========

/** Base64 URL 解码（兼容微信小程序，不依赖 atob） */
export function base64UrlDecode(str: string): string {
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/')
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
  return decodeURIComponent(escape(result))
}

/** 简单 JWT 过期检测（不验证签名，仅检查 exp） */
function isTokenExpired(token: string): boolean {
  try {
    const payloadBase64 = token.split('.')[1]
    const payload = JSON.parse(base64UrlDecode(payloadBase64))
    if (!payload.exp) return false
    return Date.now() >= payload.exp * 1000
  } catch {
    return true // 解析失败认为已过期
  }
}

// ========== 对外 API ==========

/** 获取本地 token（auth 模块别名） */
export function getToken(): string | null {
  return getStoredToken()
}

/** 检查是否已登录（token 存在且未过期） */
export function isLoggedIn(): boolean {
  const token = getStoredToken()
  if (!token) return false
  return !isTokenExpired(token)
}
