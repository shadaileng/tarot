// ========== 积分等级体系服务 ==========
// 签到 / 任务 / 邀请 / 统计 API

import { apiPost, apiGet } from '@/utils/request'
import type { UserLevelInfo, CheckinResult, CheckinStatus, UserTaskItem, InviteRecord, LevelDefinition } from '@/types'

export async function fetchUserStats(): Promise<UserLevelInfo> {
  return apiGet<UserLevelInfo>('/api/user/stats')
}

export async function submitCheckin(): Promise<CheckinResult> {
  return apiPost<CheckinResult>('/api/checkin')
}

export async function fetchCheckinStatus(): Promise<CheckinStatus> {
  return apiGet<CheckinStatus>('/api/checkin/status')
}

export async function fetchTasks(): Promise<{ tasks: UserTaskItem[] }> {
  return apiGet<{ tasks: UserTaskItem[] }>('/api/tasks')
}

export async function claimTask(taskId: string): Promise<{ success: boolean; pointsReward: number; extraQuotaReward: number }> {
  return apiPost(`/api/tasks/${taskId}/claim`)
}

export async function fetchInviteCode(): Promise<{ referralCode: string }> {
  return apiGet<{ referralCode: string }>('/api/invite/code')
}

export async function fetchInviteRecords(): Promise<{ records: InviteRecord[] }> {
  return apiGet<{ records: InviteRecord[] }>('/api/invite/records')
}

export async function fetchLevels(): Promise<{ levels: LevelDefinition[] }> {
  return apiGet<{ levels: LevelDefinition[] }>('/api/levels')
}
