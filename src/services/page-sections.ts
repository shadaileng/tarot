import { reactive } from 'vue'
import { apiGet } from '@/utils/request'
import { API_ENDPOINTS } from '@/constants/api'

// 页面区域可见性配置（内存响应式对象，App 启动时加载一次）
// 所有 section 有显式默认值，API 返回后覆盖对应项（未返回的保留默认值）
export const sectionConfig = reactive<Record<string, Record<string, boolean>>>({
  index: {
    particle_background: true,
    hero_section: true,
    backend_status: false,
    spread_selection: true,
    question_input: false,
    draw_button: true,
  },
  draw: {
    spread_selection: true,
    question_input: false,
    spread_preview: true,
    draw_action: true,
  }
})

// 从后端拉取配置（App 启动时调用一次）
export async function loadPageSections(): Promise<void> {
  try {
    const config = await apiGet<Record<string, Record<string, boolean>>>(API_ENDPOINTS.CONFIG.PAGE_SECTIONS)
    for (const [pageKey, sections] of Object.entries(config)) {
      if (sectionConfig[pageKey]) {
        Object.assign(sectionConfig[pageKey], sections)
      }
    }
  } catch {
    console.warn('页面配置加载失败，使用默认值')
  }
}
