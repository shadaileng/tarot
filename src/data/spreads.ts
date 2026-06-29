import type { Spread, SpreadType } from '@/types'

/** 所有牌型 */
export const spreads: Record<SpreadType, Spread> = {
  single: {
    type: 'single',
    name: '单张牌型',
    positions: ['今日指引'],
  },
  three: {
    type: 'three',
    name: '三牌型',
    positions: ['过去', '现在', '未来'],
  },
  'celtic-cross': {
    type: 'celtic-cross',
    name: '凯尔特十字',
    positions: [
      '现状', '挑战', '过去', '未来',
      '上方（目标）', '下方（基础）',
      '建议', '外界影响', '希望与恐惧', '最终结果',
    ],
  },
}

/** 获取牌型 */
export function getSpread(type: SpreadType): Spread {
  return spreads[type]
}

/** 所有牌型列表 */
export const spreadList: Spread[] = Object.values(spreads)
