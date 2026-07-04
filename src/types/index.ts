// ========== 卡牌类型定义 ==========

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

/** 单张卡牌 */
export interface Card {
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
  card: Card
  orientation: CardOrientation
  /** 在牌型中的位置描述，如 "过去"、"现在"、"未来" */
  position: string
  /** 个性化解读（针对此牌在此位置、此问题的解读） */
  deepMeaning?: string
}

/** 牌型类型 */
export type SpreadType = 'single' | 'three' | 'celtic-cross'

/** 牌型定义 */
export interface Spread {
  type: SpreadType
  name: string
  positions: string[]
}

/** 抽牌结果 */
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

/** 抽牌记录（持久化） */
export interface ReadingRecord {
  id: string
  spreadType: SpreadType
  spreadName: string
  cards: DrawnCard[]
  question: string
  timestamp: number
  date: string
  /** 后端记录 ID（云端同步后获得） */
  backendId?: string
  /** 是否已同步到云端 */
  synced?: boolean
  /** 解读文本 */
  interpretation?: string
  /** 异步解读 taskId（有值 = AI 解读中/已完成但未刷新） */
  taskId?: string
  /** 后台 AI 解读进行中（前端已降级展示本地） */
  isOnlineProcessing?: boolean
}

// ========== 积分等级体系 ==========

/** 用户等级信息 */
export interface UserLevelInfo {
  level: number
  title: string
  points: number
  nextLevelPoints: number | null
  nextLevelTitle: string | null
  progress: number
  totalQuota: number
  usedQuota: number
  remainingQuota: number
  extraQuota: number
  totalReadings: number
}

/** 签到结果 */
export interface CheckinResult {
  success: boolean
  streak: number
  streakBonus: number
  basePoints: number
  totalPoints: number
  today: string
}

/** 签到状态 */
export interface CheckinStatus {
  isCheckedIn: boolean
  streak: number
  lastCheckinDate: string | null
}

/** 任务定义 */
export interface TaskDefinition {
  id: string
  title: string
  description: string | null
  type: 'daily' | 'achievement'
  requirement_type: string
  requirement_count: number
  points_reward: number
  extra_quota_reward: number
  icon: string | null
  sort_order: number
  is_active: number
}

/** 用户任务 */
export interface UserTaskItem {
  id: string
  user_id: string
  task_id: string
  progress: number
  is_completed: number
  reward_claimed: number
  completed_at: string | null
  claimed_at: string | null
  reset_date: string | null
  created_at: string
  title: string
  description: string | null
  type: string
  requirement_type: string
  requirement_count: number
  points_reward: number
  extra_quota_reward: number
  icon: string | null
  sort_order: number
  progressPercent: number
  canClaim: number
}

/** 等级定义 */
export interface LevelDefinition {
  level: number
  title: string
  points_required: number
  daily_quota: number
  max_extra_quota: number
}

/** 我的邀请人信息 */
export interface InviterInfo {
  referralCode: string
  nickname: string
  avatarUrl: string | null
}

/** 邀请记录 */
export interface InviteRecord {
  id: string
  invitee_id: string
  status: string
  created_at: string
  completed_at: string | null
  nickname: string | null
  avatar_url: string | null
}

// ========== 意见反馈 ==========

export interface Feedback {
  id: string
  category: 'bug' | 'suggestion' | 'other'
  content: string
  images: string[]
  status: 'pending' | 'replied' | 'closed'
  adminReply?: string
  repliedAt?: string
  createdAt: string
}

export interface FeedbackListResponse {
  total: number
  page: number
  limit: number
  data: Feedback[]
}
