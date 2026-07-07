import { appConfig } from '@/services/app-config'

const BACKEND_API = (import.meta.env.VITE_BACKEND_API || '').replace(/\/+$/, '')

/**
 * 将相对URL转换为完整URL
 * 如果已经是完整URL（http/https开头），直接返回
 * 否则拼接BACKEND_API前缀
 */
export function getFullUrl(url: string | null | undefined): string {
  if (!url) return ''
  if (url.startsWith('http://') || url.startsWith('https://')) return url
  return `${BACKEND_API}${url}`
}

/** 格式化时间戳为日期字符串 */
export function formatDate(ts: number): string {
  const d = new Date(ts)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** 格式化时间戳为完整时间字符串 */
export function formatDateTime(ts: number): string {
  const d = new Date(ts)
  return `${formatDate(ts)} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

/** 生成唯一 ID */
export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

/** 数组随机洗牌 */
export function shuffle<T>(arr: T[]): T[] {
  const result = [...arr]
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[result[i], result[j]] = [result[j], result[i]]
  }
  return result
}

/** 截断文本 */
export function truncate(text: string, maxLen: number): string {
  return text.length > maxLen ? text.slice(0, maxLen) + '...' : text
}

/** 页面跳转 */
export function navTo(url: string) {
  uni.navigateTo({ url })
}

/** 返回上一页 */
export function navBack() {
  uni.navigateBack()
}

/** 切换 Tab */
export function switchTab(url: string) {
  uni.switchTab({ url })
}

/** 显示 Toast */
export function showToast(title: string, icon: 'success' | 'error' | 'none' = 'none') {
  uni.showToast({ title, icon, duration: appConfig.TOAST_DURATION_DEFAULT })
}
