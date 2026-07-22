// ========== 积分等级体系服务 ==========
// 签到 / 任务 / 邀请 / 统计 API

import { apiPost, apiGet } from '@/utils/request'
import type { UserLevelInfo, CheckinResult, CheckinStatus, UserTaskItem, InviteRecord, LevelDefinition } from '@/types'
import { API_ENDPOINTS } from '@/constants/api'

export async function fetchUserStats(): Promise<UserLevelInfo> {
  return apiGet<UserLevelInfo>(API_ENDPOINTS.STATS.USER)
}

export async function submitCheckin(): Promise<CheckinResult> {
  return apiPost<CheckinResult>(API_ENDPOINTS.STATS.CHECKIN)
}

export async function fetchCheckinStatus(): Promise<CheckinStatus> {
  return apiGet<CheckinStatus>(API_ENDPOINTS.STATS.CHECKIN_STATUS)
}

export async function fetchTasks(): Promise<{ tasks: UserTaskItem[] }> {
  return apiGet<{ tasks: UserTaskItem[] }>(API_ENDPOINTS.STATS.TASKS)
}

export async function claimTask(taskId: string): Promise<{ success: boolean; pointsReward: number; extraQuotaReward: number }> {
  return apiPost(API_ENDPOINTS.STATS.CLAIM_TASK(taskId))
}

export async function fetchInviteCode(): Promise<{ referralCode: string }> {
  return apiGet<{ referralCode: string }>(API_ENDPOINTS.STATS.INVITE_CODE)
}

export async function fetchInviteRecords(): Promise<{ records: InviteRecord[]; inviter: InviterInfo | null }> {
  return apiGet<{ records: InviteRecord[]; inviter: InviterInfo | null }>(API_ENDPOINTS.STATS.INVITE_RECORDS)
}

export async function fetchLevels(): Promise<{ levels: LevelDefinition[] }> {
  return apiGet<{ levels: LevelDefinition[] }>(API_ENDPOINTS.STATS.LEVELS)
}

export async function bindReferral(referralCode: string): Promise<{ success: boolean; message: string }> {
  return apiPost(API_ENDPOINTS.STATS.BIND_REFERRAL, { referralCode })
}
