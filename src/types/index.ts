// ========== 塔罗牌类型定义 ==========

/** 牌面方向 */
export type CardOrientation = 'upright' | 'reversed'

/** 大阿卡纳牌 */
export type MajorArcanaName =
  | '愚者' | '魔术师' | '女祭司' | '女皇' | '皇帝'
  | '教皇' | '恋人' | '战车' | '力量' | '隐士'
  | '命运之轮' | '正义' | '倒吊人' | '死神' | '节制'
  | '恶魔' | '高塔' | '星星' | '月亮' | '太阳'
  | '审判' | '世界'

/** 小阿卡纳花色 */
export type Suit = 'wands' | 'cups' | 'swords' | 'pentacles'

/** 小阿卡纳牌 */
export type MinorArcanaName = string

/** 单张塔罗牌 */
export interface TarotCard {
  id: string
  name: string
  nameEn: string
  /** 'major' | 花色 */
  type: 'major' | Suit
  /** 大阿卡纳序号 0-21，小阿卡纳为 -1 */
  number: number
  /** 牌面图片路径 */
  image: string
  /** 关键词 */
  keywords: string[]
  /** 正位含义 */
  uprightMeaning: string
  /** 逆位含义 */
  reversedMeaning: string
  /** 描述 */
  description: string
}

/** 抽到的牌 */
export interface DrawnCard {
  card: TarotCard
  orientation: CardOrientation
  /** 在牌阵中的位置描述，如 "过去"、"现在"、"未来" */
  position: string
  /** 个性化解读（针对此牌在此位置、此问题的解读） */
  deepMeaning?: string
}

/** 牌阵类型 */
export type SpreadType = 'single' | 'three' | 'celtic-cross'

/** 牌阵定义 */
export interface Spread {
  type: SpreadType
  name: string
  positions: string[]
}

/** 占卜结果 */
export interface Reading {
  id: string
  spreadType: SpreadType
  cards: DrawnCard[]
  question: string
  timestamp: number
  date: string
  /** 综合解读文本 */
  interpretation?: string
  /** 是否在线生成（false 表示本地降级） */
  isOnlineInterpretation?: boolean
}

/** 占卜记录（持久化） */
export interface ReadingRecord {
  id: string
  spreadType: SpreadType
  spreadName: string
  cards: DrawnCard[]
  question: string
  timestamp: number
  date: string
}
