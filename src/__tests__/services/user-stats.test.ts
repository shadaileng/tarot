import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/utils/request', () => ({
  apiGet: vi.fn(),
  apiPost: vi.fn(),
}))

const { apiGet, apiPost } = await import('@/utils/request')

import {
  fetchUserStats,
  submitCheckin,
  fetchCheckinStatus,
  fetchTasks,
  claimTask,
  fetchInviteCode,
  fetchInviteRecords,
  fetchLevels,
  bindReferral,
} from '@/services/user-stats'

beforeEach(() => {
  vi.clearAllMocks()
})

describe('fetchUserStats', () => {
  it('调用 GET /api/user/stats', async () => {
    vi.mocked(apiGet).mockResolvedValue({ level: 1, title: '初级', points: 100, nextLevelPoints: 500, nextLevelTitle: '中级', progress: 0.2, totalQuota: 10, usedQuota: 2, remainingQuota: 8, extraQuota: 0, totalReadings: 5 })
    const result = await fetchUserStats()
    expect(apiGet).toHaveBeenCalledWith('/api/user/stats')
    expect(result.level).toBe(1)
  })
})

describe('submitCheckin', () => {
  it('调用 POST /api/checkin', async () => {
    vi.mocked(apiPost).mockResolvedValue({ success: true, streak: 3, streakBonus: 10, basePoints: 5, totalPoints: 15, today: '2026-07-20' })
    const result = await submitCheckin()
    expect(apiPost).toHaveBeenCalledWith('/api/checkin')
    expect(result.success).toBe(true)
  })
})

describe('fetchCheckinStatus', () => {
  it('调用 GET /api/checkin/status', async () => {
    vi.mocked(apiGet).mockResolvedValue({ isCheckedIn: false, streak: 0, lastCheckinDate: null })
    const result = await fetchCheckinStatus()
    expect(apiGet).toHaveBeenCalledWith('/api/checkin/status')
    expect(result.isCheckedIn).toBe(false)
  })
})

describe('fetchTasks', () => {
  it('调用 GET /api/tasks', async () => {
    vi.mocked(apiGet).mockResolvedValue({ tasks: [] })
    const result = await fetchTasks()
    expect(apiGet).toHaveBeenCalledWith('/api/tasks')
    expect(result.tasks).toEqual([])
  })
})

describe('claimTask', () => {
  it('调用 POST /api/tasks/{id}/claim', async () => {
    vi.mocked(apiPost).mockResolvedValue({ success: true, pointsReward: 50, extraQuotaReward: 1 })
    const result = await claimTask('task-1')
    expect(apiPost).toHaveBeenCalledWith('/api/tasks/task-1/claim')
    expect(result.success).toBe(true)
  })
})

describe('fetchInviteCode', () => {
  it('调用 GET /api/invite/code', async () => {
    vi.mocked(apiGet).mockResolvedValue({ referralCode: 'ABC123' })
    const result = await fetchInviteCode()
    expect(apiGet).toHaveBeenCalledWith('/api/invite/code')
    expect(result.referralCode).toBe('ABC123')
  })
})

describe('fetchInviteRecords', () => {
  it('调用 GET /api/invite/records', async () => {
    vi.mocked(apiGet).mockResolvedValue({ records: [], inviter: null })
    const result = await fetchInviteRecords()
    expect(apiGet).toHaveBeenCalledWith('/api/invite/records')
    expect(result.records).toEqual([])
  })
})

describe('fetchLevels', () => {
  it('调用 GET /api/levels', async () => {
    vi.mocked(apiGet).mockResolvedValue({ levels: [{ level: 1, title: '初级', points_required: 0, daily_quota: 10, max_extra_quota: 0 }] })
    const result = await fetchLevels()
    expect(apiGet).toHaveBeenCalledWith('/api/levels')
    expect(result.levels).toHaveLength(1)
  })
})

describe('bindReferral', () => {
  it('调用 POST /api/user/bind-referral', async () => {
    vi.mocked(apiPost).mockResolvedValue({ success: true, message: '绑定成功' })
    const result = await bindReferral('ABC123')
    expect(apiPost).toHaveBeenCalledWith('/api/user/bind-referral', { referralCode: 'ABC123' })
    expect(result.success).toBe(true)
  })
})
