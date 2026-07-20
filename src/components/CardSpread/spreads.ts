import type { SpreadConfig } from './types'

export const spreadConfigs: Record<string, SpreadConfig> = {
  single: {
    type: 'single',
    positions: [
      { id: 0, x: 50, y: 50, rotation: 0, label: '今日指引' },
    ],
  },
  three: {
    type: 'three',
    positions: [
      { id: 0, x: 20, y: 50, rotation: -10, label: '过去' },
      { id: 1, x: 50, y: 50, rotation: 0, label: '现在' },
      { id: 2, x: 80, y: 50, rotation: 10, label: '未来' },
    ],
  },
  celtic: {
    type: 'celtic',
    positions: [
      { id: 0, x: 50, y: 30, rotation: 0, label: '当前情况' },
      { id: 1, x: 30, y: 50, rotation: -5, label: '挑战' },
      { id: 2, x: 50, y: 70, rotation: 0, label: '根源' },
      { id: 3, x: 70, y: 50, rotation: 5, label: '过去' },
      { id: 4, x: 50, y: 10, rotation: 0, label: '可能' },
      { id: 5, x: 20, y: 30, rotation: -10, label: '近未来' },
      { id: 6, x: 20, y: 70, rotation: -10, label: '态度' },
      { id: 7, x: 80, y: 30, rotation: 10, label: '环境' },
      { id: 8, x: 80, y: 70, rotation: 10, label: '希望' },
      { id: 9, x: 50, y: 90, rotation: 0, label: '最终结果' },
    ],
  },
}
