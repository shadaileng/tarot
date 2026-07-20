import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/utils/request', () => ({
  apiPost: vi.fn(),
  apiGet: vi.fn(),
  apiDelete: vi.fn(),
  apiPatch: vi.fn(),
}))

vi.mock('@/services/client-logger', () => ({
  log: vi.fn(), logInfo: vi.fn(), logWarn: vi.fn(), logError: vi.fn(),
}))

const { apiPost, apiGet, apiDelete, apiPatch } = await import('@/utils/request')

import { syncRecordToCloud, pullAndMerge, deleteCloudRecord, updateCloudRecordInterpretation, uploadUnsyncedRecords } from '@/services/record-sync'

function mockCard() {
  return { card: { id: 'm0', name: '愚者', nameEn: 'Fool', number: 0, type: 'major' as const, image: '', keywords: [], uprightMeaning: '', reversedMeaning: '', description: '' }, orientation: 'upright' as const, position: '过去' }
}

function mockRecord(overrides?: any) {
  return {
    id: 'r1',
    spreadType: 'single' as const,
    spreadName: '单张牌',
    cards: [mockCard()],
    question: '今天运势',
    timestamp: Date.now(),
    date: '2026-07-20',
    interpretation: '',
    ...overrides,
  }
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('syncRecordToCloud', () => {
  it('发送记录到云端', async () => {
    // Mock isLoggedIn via token
    const futureExp = Math.floor(Date.now() / 1000) + 3600
    const payload = btoa(JSON.stringify({ exp: futureExp }))
    // @ts-expect-error: uni mock
    globalThis.uni.getStorageSync = vi.fn(() => `header.${payload}.sig`)
    vi.mocked(apiPost).mockResolvedValue({ id: 'backend-1' })

    const record = mockRecord()
    const result = await syncRecordToCloud(record)
    expect(result).toBe('backend-1')
  })

  it('未登录时返回 null', async () => {
    // @ts-expect-error: uni mock
    globalThis.uni.getStorageSync = vi.fn(() => null)
    const record = mockRecord()
    const result = await syncRecordToCloud(record)
    expect(result).toBeNull()
  })
})

describe('pullAndMerge', () => {
  it('未登录时直接返回本地记录', async () => {
    // @ts-expect-error: uni mock
    globalThis.uni.getStorageSync = vi.fn(() => null)
    const local = [mockRecord()]
    const result = await pullAndMerge(local)
    expect(result.records).toHaveLength(1)
    expect(result.addedCount).toBe(0)
  })

  it('合并云端新记录', async () => {
    const futureExp = Math.floor(Date.now() / 1000) + 3600
    const payload = btoa(JSON.stringify({ exp: futureExp }))
    // @ts-expect-error: uni mock
    globalThis.uni.getStorageSync = vi.fn(() => `header.${payload}.sig`)

    vi.mocked(apiGet).mockResolvedValue({
      records: [{
        id: 'cloud-1',
        user_id: 'u1',
        created_at: '2026-07-20T10:00:00Z',
        spread_type: 'three',
        question: '云端问题',
        cards_json: JSON.stringify([mockCard(), mockCard(), mockCard()]),
        reading: '',
        model: null,
        is_local: 0,
        interpretation: '云端解读',
      }],
      total: 1,
      page: 1,
      limit: 100,
    })

    const local = [mockRecord({ id: 'local-1', backendId: 'cloud-1' })]
    const result = await pullAndMerge(local)
    expect(result.addedCount).toBe(0) // cloud-1 已存在于 local
  })
})

describe('deleteCloudRecord', () => {
  it('调用 DELETE API', async () => {
    const futureExp = Math.floor(Date.now() / 1000) + 3600
    const payload = btoa(JSON.stringify({ exp: futureExp }))
    // @ts-expect-error: uni mock
    globalThis.uni.getStorageSync = vi.fn(() => `header.${payload}.sig`)
    vi.mocked(apiDelete).mockResolvedValue({})

    const result = await deleteCloudRecord('backend-1')
    expect(apiDelete).toHaveBeenCalledWith('/api/user/records/backend-1', { timeout: expect.any(Number) })
    expect(result).toBe(true)
  })
})

describe('updateCloudRecordInterpretation', () => {
  it('调用 PATCH API', async () => {
    const futureExp = Math.floor(Date.now() / 1000) + 3600
    const payload = btoa(JSON.stringify({ exp: futureExp }))
    // @ts-expect-error: uni mock
    globalThis.uni.getStorageSync = vi.fn(() => `header.${payload}.sig`)
    vi.mocked(apiPatch).mockResolvedValue({})

    const result = await updateCloudRecordInterpretation('backend-1', '新解读')
    expect(apiPatch).toHaveBeenCalledWith('/api/user/records/backend-1', { interpretation: '新解读' }, { timeout: expect.any(Number) })
    expect(result).toBe(true)
  })
})

describe('uploadUnsyncedRecords', () => {
  it('上传未同步记录并标记 synced', async () => {
    const futureExp = Math.floor(Date.now() / 1000) + 3600
    const payload = btoa(JSON.stringify({ exp: futureExp }))
    // @ts-expect-error: uni mock
    globalThis.uni.getStorageSync = vi.fn(() => `header.${payload}.sig`)
    vi.mocked(apiPost).mockResolvedValue({ id: 'backend-new' })

    const records = [mockRecord({ id: 'unsynced-1', backendId: undefined, synced: false })]
    const result = await uploadUnsyncedRecords(records)
    expect(result[0].synced).toBe(true)
    expect(result[0].backendId).toBe('backend-new')
  })
})
