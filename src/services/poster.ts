// ========== 海报生成服务 ==========
// 调用统一后端 tarot-backend 生成海报 PNG
// 替代原有的 Canvas 2D / html2canvas 前端绘制方案

import type { PosterData } from '@/utils/poster/types'
import type { DrawnCard } from '@/types'
import { apiPost } from '@/utils/request'
import { getStoredToken } from '@/utils/token'
import { log, logInfo, logError } from '@/services/client-logger'
import { appConfig } from '@/services/app-config'
import { API_ENDPOINTS } from '@/constants/api'

const BACKEND_API = (import.meta.env.VITE_BACKEND_API || '').replace(/\/+$/, '')

/** 将前端 DrawnCard 转为后端期望的扁平 PosterCard 格式 */
function toPosterCardInput(card: DrawnCard) {
  const { card: c, orientation, position } = card
  return {
    name: c.name,
    image: c.image,
    position,
    orientation,
    meaning: orientation === 'upright' ? c.uprightMeaning : c.reversedMeaning,
    keywords: c.keywords,
    type: c.type,
    number: c.number,
  }
}

/** 将 PosterData 转为后端 API 格式 */
function toPosterPayload(data: PosterData) {
  return {
    cards: data.cards.map(toPosterCardInput),
    question: data.question,
    spreadName: data.spreadName,
    interpretation: data.interpretation,
    comprehensiveInterpretation: data.comprehensiveInterpretation,
    date: data.date,
    theme: data.theme,
    template: data.template,
  }
}

/**
 * 生成海报图片
 * 调用后端 tarot-poster-service 生成海报 PNG
 *
 * @param data 海报数据（牌面信息、问题、解读等）
 * @returns url（展示用）和 savePath（可选，保存到相册用）
 */
export async function generatePoster(data: PosterData): Promise<{ url: string; savePath?: string }> {
  logInfo('poster', 'poster_generate_start', { template: data.template, cardCount: data.cards.length })
  const payload = toPosterPayload(data)

  // #ifdef H5
  let arrayBuffer: ArrayBuffer
  try {
    arrayBuffer = await apiPost<ArrayBuffer>(API_ENDPOINTS.POSTER.GENERATE, payload, { responseType: 'arraybuffer', timeout: appConfig.POSTER_TIMEOUT })
    logInfo('poster', 'poster_generate_success')
  } catch (err: any) {
    logError('poster', 'poster_generate_fail', err.message || '未知错误')
    throw new Error(`海报生成失败: ${err.message || err}`)
  }
  const blob = new Blob([arrayBuffer], { type: 'image/png' })
  return { url: URL.createObjectURL(blob) }
  // #endif

  // #ifdef MP-WEIXIN
  const token = getStoredToken()

  // Step 1: POST /api/poster/key → 从 JSON body 获取 cacheKey（不依赖 arraybuffer 响应头）
  const keyRes = await new Promise<any>((resolve, reject) => {
    uni.request({
      url: `${BACKEND_API}${API_ENDPOINTS.POSTER.KEY}`,
      method: 'POST',
      header: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      },
      data: payload,
      timeout: appConfig.POSTER_TIMEOUT,
      success: (res) => resolve(res),
      fail: (err) => reject(new Error(err.errMsg)),
    })
  })
  if (keyRes.statusCode === 401) throw new Error('UNAUTHORIZED')
  if (keyRes.statusCode !== 200) {
    logError('poster', 'poster_generate_step_fail', `获取海报key失败 (${keyRes.statusCode})`, { step: 'get_key', statusCode: keyRes.statusCode })
    throw new Error(`海报生成失败 (${keyRes.statusCode})`)
  }

  const cacheKey = keyRes.data?.cacheKey
  if (!cacheKey) {
    logError('poster', 'poster_generate_step_fail', '海报缓存不可用', { step: 'get_key' })
    throw new Error('海报缓存不可用')
  }

  // Step 2: 通过 GET 下载缓存海报 → tempFilePath（展示用）
  const dlRes = await new Promise<any>((resolve, reject) => {
    uni.downloadFile({
      url: `${BACKEND_API}${API_ENDPOINTS.POSTER.DOWNLOAD(cacheKey)}`,
      header: token ? { 'Authorization': `Bearer ${token}` } : {},
      success: (res) => resolve(res),
      fail: (err) => reject(new Error(err.errMsg)),
    })
  })
  if (dlRes.statusCode !== 200) {
    logError('poster', 'poster_generate_step_fail', `海报下载失败 (${dlRes.statusCode})`, { step: 'download', statusCode: dlRes.statusCode })
    throw new Error(`海报下载失败 (${dlRes.statusCode})`)
  }

  // Step 3: 将临时文件写入 USER_DATA_PATH（真实文件路径，供保存到相册用）
  let savePath: string | undefined
  try {
    const fs = uni.getFileSystemManager()
    const data = fs.readFileSync(dlRes.tempFilePath)
    const path = `${wx.env.USER_DATA_PATH}/poster-save-${Date.now()}.png`
    fs.writeFileSync(path, data)
    savePath = path
  } catch (e) {
    logError('poster', 'poster_generate_step_fail', String(e), { step: 'write_persist_file' })
    console.error('[poster] 写入持久文件失败:', e)
  }

  logInfo('poster', 'poster_generate_success')
  return { url: dlRes.tempFilePath, savePath }
  // #endif
}

// ========== 异步模式 API ==========

/** 提交异步海报任务 */
export async function startPoster(data: PosterData): Promise<{ taskId: string }> {
  const payload = toPosterPayload(data)
  return apiPost(API_ENDPOINTS.POSTER.START, payload)
}

/** 轮询海报任务结果 */
export async function pollPosterResult(taskId: string): Promise<{
  taskId: string
  status: 'pending' | 'rendering' | 'completed' | 'failed'
  url?: string
  cacheKey?: string
  error?: string
}> {
  const token = getStoredToken()
  const res = await new Promise<any>((resolve, reject) => {
    uni.request({
      url: `${BACKEND_API}${API_ENDPOINTS.POSTER.RESULT(taskId)}`,
      method: 'GET',
      header: token ? { 'Authorization': `Bearer ${token}` } : {},
      success: (res) => resolve(res),
      fail: (err) => reject(new Error(err.errMsg)),
    })
  })
  if (res.statusCode === 401) throw new Error('UNAUTHORIZED')
  if (res.statusCode !== 200) {
    throw new Error(`查询海报任务失败 (${res.statusCode})`)
  }
  return res.data
}

/** 取消海报任务 */
export async function cancelPoster(taskId: string): Promise<void> {
  const token = getStoredToken()
  const res = await new Promise<any>((resolve, reject) => {
    uni.request({
      url: `${BACKEND_API}${API_ENDPOINTS.POSTER.CANCEL(taskId)}`,
      method: 'POST',
      header: token ? { 'Authorization': `Bearer ${token}` } : {},
      success: (res) => resolve(res),
      fail: (err) => reject(new Error(err.errMsg)),
    })
  })
  if (res.statusCode !== 200) {
    throw new Error(`取消海报任务失败 (${res.statusCode})`)
  }
}
