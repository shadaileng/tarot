import { reactive } from 'vue'
import { apiGet } from '@/utils/request'

/**
 * 小程序运行时配置（从后端动态拉取）
 *
 * 设计原则：
 * - 内存响应式对象，App 启动时加载一次
 * - 失败时使用默认值，不影响正常使用
 * - 不存 localStorage，关闭小程序后失效
 */
export const appConfig = reactive<Record<string, number>>({
  REQUEST_DEFAULT_TIMEOUT: 15000,
  READING_TIMEOUT: 10000,
  HEALTH_CHECK_TIMEOUT: 5000,
  POSTER_TIMEOUT: 60000,
  SYNC_TIMEOUT: 10000,
  QUESTION_MAX_LENGTH: 200,
  NICKNAME_MAX_LENGTH: 30,
  FEEDBACK_MAX_LENGTH: 500,
  INVITE_CODE_LENGTH: 6,
  MAX_LOCAL_RECORDS: 100,
  RECORD_PAGE_SIZE: 100,
  TOAST_DURATION_DEFAULT: 2000,
  TOAST_DURATION_SHORT: 1500,
  STARFIELD_PARTICLE_COUNT: 40,
  CARD_FLIP_INTERVAL: 400,
  KEYWORD_DISPLAY_LIMIT: 3,
  USE_ONLINE_READING_DEFAULT: 1,
})

/**
 * 从后端拉取小程序配置（App 启动时调用一次）
 */
export async function loadAppConfig(): Promise<void> {
  try {
    const remote = await apiGet<Record<string, number>>(
      '/api/app-config',
      undefined,
      { auth: false, timeout: 5000 },
    )
    Object.assign(appConfig, remote)
  } catch (e) {
    console.warn('[APP-CONFIG] 拉取失败，使用默认配置', e)
  }
}
