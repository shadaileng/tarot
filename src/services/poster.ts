// ========== 海报生成服务 ==========
// 调用统一后端 tarot-backend 生成海报 PNG
// 替代原有的 Canvas 2D / html2canvas 前端绘制方案

import type { PosterData } from '@/utils/poster/types'
import type { DrawnCard } from '@/types'
import { apiPost } from '@/utils/request'
import { getStoredToken } from '@/utils/request'

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
 * 调用后端 tarot-poster-service，返回可直接展示的图片 URL
 *
 * @param data 海报数据（牌面信息、问题、解读等）
 * @returns 图片 URL（H5 为 blob URL，小程序为临时文件路径）
 */
export async function generatePoster(data: PosterData): Promise<string> {
  const payload = toPosterPayload(data)

  // #ifdef H5
  let arrayBuffer: ArrayBuffer
  try {
    arrayBuffer = await apiPost<ArrayBuffer>('/api/poster', payload, { responseType: 'arraybuffer', timeout: 60000 })
  } catch (err: any) {
    throw new Error(`海报生成失败: ${err.message || err}`)
  }
  const blob = new Blob([arrayBuffer], { type: 'image/png' })
  return URL.createObjectURL(blob)
  // #endif

  // #ifdef MP-WEIXIN
  const token = getStoredToken()

  // Step 1: POST 生成海报，获取缓存 key
  const postRes = await new Promise<any>((resolve, reject) => {
    uni.request({
      url: `${BACKEND_API}/api/poster`,
      method: 'POST',
      header: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      },
      data: payload,
      responseType: 'arraybuffer',
      success: (res) => resolve(res),
      fail: (err) => reject(new Error(err.errMsg)),
    })
  })
  if (postRes.statusCode === 401) throw new Error('UNAUTHORIZED')
  if (postRes.statusCode !== 200) throw new Error(`海报生成失败 (${postRes.statusCode})`)

  const cacheKey = postRes.header?.['X-Cache-Key']
  if (!cacheKey) throw new Error('海报缓存不可用')

  // Step 2: 通过 GET 下载缓存海报 → 得到真实文件系统路径
  const dlRes = await new Promise<any>((resolve, reject) => {
    uni.downloadFile({
      url: `${BACKEND_API}/api/poster/${cacheKey}`,
      header: token ? { 'Authorization': `Bearer ${token}` } : {},
      success: (res) => resolve(res),
      fail: (err) => reject(new Error(err.errMsg)),
    })
  })
  if (dlRes.statusCode !== 200) throw new Error(`海报下载失败 (${dlRes.statusCode})`)

  return dlRes.tempFilePath
  // #endif
}
