import { reactive } from 'vue'
import { apiGet } from '@/utils/request'

// 页面区域可见性配置（内存响应式对象，App 启动时加载一次）
export const sectionConfig = reactive<Record<string, Record<string, boolean>>>({})

// 从后端拉取配置（App 启动时调用一次）
export async function loadPageSections(): Promise<void> {
  try {
    const config = await apiGet<Record<string, Record<string, boolean>>>('/api/page-sections')
    // 清空旧数据，用新数据覆盖
    Object.keys(sectionConfig).forEach(k => delete sectionConfig[k])
    Object.assign(sectionConfig, config)
  } catch {
    // 失败时保持默认（空对象，所有 v-if 条件 !== false 默认显示）
    console.warn('页面配置加载失败，使用默认显示')
  }
}
