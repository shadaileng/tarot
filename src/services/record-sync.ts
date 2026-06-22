// ========== 云端记录同步服务 ==========
// 将本地占卜记录同步到后端 / 从后端拉取合并

import type { ReadingRecord } from '@/types'
import { apiPost, apiGet, apiDelete } from '@/utils/request'
import { isLoggedIn } from '@/services/auth'

// ========== 类型 ==========

/** 后端返回的记录格式 */
interface BackendRecord {
  id: string
  user_id: string
  created_at: string
  spread_type: string
  question: string | null
  cards_json: string
  reading: string
  model: string | null
  is_local: number
}

interface BackendRecordList {
  records: BackendRecord[]
  total: number
  page: number
  limit: number
}

// ========== 上传同步 ==========

/**
 * 将一条本地记录同步到云端
 * @returns 后端记录 ID
 */
export async function syncRecordToCloud(record: ReadingRecord): Promise<string | null> {
  if (!isLoggedIn()) return null

  try {
    const result = await apiPost<BackendRecord>('/user/records', {
      spreadType: record.spreadType,
      question: record.question,
      cardsJson: JSON.stringify(record.cards),
      reading: '',  // 后续可补充解读文本
      isLocal: true,
    }, { timeout: 10000 })

    return result.id
  } catch (err) {
    console.warn('同步记录到云端失败:', err)
    return null
  }
}

// ========== 下拉拉取 ==========

/**
 * 从云端拉取全部记录（分页）
 */
async function fetchAllCloudRecords(): Promise<BackendRecord[]> {
  const allRecords: BackendRecord[] = []
  let page = 1

  while (true) {
    const result = await apiGet<BackendRecordList>('/user/records', { page, limit: 100 }, { timeout: 10000 })

    allRecords.push(...result.records)

    if (allRecords.length >= result.total || result.records.length === 0) {
      break
    }
    page++
  }

  return allRecords
}

/**
 * 将后端记录转为前端 ReadingRecord 格式
 */
function backendToLocal(record: BackendRecord): ReadingRecord {
  let cards
  try {
    cards = JSON.parse(record.cards_json)
  } catch {
    cards = []
  }

  const ts = new Date(record.created_at).getTime()

  return {
    id: record.id,
    backendId: record.id,
    synced: true,
    spreadType: record.spread_type as ReadingRecord['spreadType'],
    spreadName: record.spread_type,  // 后端不存 spreadName
    cards,
    question: record.question || '',
    timestamp: ts,
    date: formatTimestamp(ts),
  }
}

function formatTimestamp(ts: number): string {
  const d = new Date(ts)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

// ========== 合并逻辑 ==========

interface MergeResult {
  records: ReadingRecord[]
  addedCount: number
}

/**
 * 从云端拉取记录并与本地合并
 * - 云端有但本地没有 → 添加到本地
 * - 本地有 backendId 但云端已删除 → 保留本地
 * - 本地没有 backendId → 暂不同步（后续按需上传）
 */
export async function pullAndMerge(localRecords: ReadingRecord[]): Promise<MergeResult> {
  if (!isLoggedIn()) return { records: localRecords, addedCount: 0 }

  try {
    const cloudRecords = await fetchAllCloudRecords()

    // 本地已同步的 backendId 集合
    const syncedIds = new Set(
      localRecords.filter(r => r.backendId).map(r => r.backendId!)
    )

    // 云端新增的（本地没有对应 backendId 的）
    const newFromCloud = cloudRecords.filter(r => !syncedIds.has(r.id))

    // 转换并合并
    const merged = [...localRecords]
    for (const cr of newFromCloud) {
      // 按时间插入（保持倒序）
      const local = backendToLocal(cr)
      let inserted = false
      for (let i = 0; i < merged.length; i++) {
        if (local.timestamp >= (merged[i].timestamp || 0)) {
          merged.splice(i, 0, local)
          inserted = true
          break
        }
      }
      if (!inserted) {
        merged.push(local)
      }
    }

    return { records: merged, addedCount: newFromCloud.length }
  } catch (err) {
    console.warn('从云端拉取记录失败:', err)
    return { records: localRecords, addedCount: 0 }
  }
}

// ========== 删除同步 ==========

/**
 * 从云端删除一条记录
 */
export async function deleteCloudRecord(backendId: string): Promise<boolean> {
  if (!isLoggedIn()) return false

  try {
    await apiDelete(`/user/records/${backendId}`, { timeout: 10000 })
    return true
  } catch (err) {
    console.warn('删除云端记录失败:', err)
    return false
  }
}

// ========== 批量上传未同步记录 ==========

/**
 * 将本地未同步的记录批量上传到云端
 */
export async function uploadUnsyncedRecords(records: ReadingRecord[]): Promise<ReadingRecord[]> {
  if (!isLoggedIn()) return records

  const updated = [...records]
  let changed = false

  for (const record of updated) {
    if (!record.backendId && !record.synced) {
      const backendId = await syncRecordToCloud(record)
      if (backendId) {
        record.backendId = backendId
        record.synced = true
        changed = true
      }
    }
  }

  return changed ? updated : records
}
