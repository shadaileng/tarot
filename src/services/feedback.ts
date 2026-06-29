import { apiGet, apiPost } from '@/utils/request'
import type { Feedback, FeedbackListResponse } from '@/types'

export interface SubmitFeedbackData {
  category: string
  content: string
  images?: string[]
}

export async function submitFeedback(data: SubmitFeedbackData): Promise<Feedback> {
  return apiPost<Feedback>('/api/feedback', data)
}

export async function getMyFeedbackList(params: {
  page?: number
  limit?: number
} = {}): Promise<FeedbackListResponse> {
  return apiGet<FeedbackListResponse>('/api/feedback', params)
}

export async function getFeedbackDetail(id: string): Promise<Feedback> {
  return apiGet<Feedback>(`/api/feedback/${id}`)
}

export async function uploadFeedbackImage(tempFilePath: string): Promise<string[]> {
  const token = uni.getStorageSync('auth_token')
  return new Promise((resolve, reject) => {
    uni.uploadFile({
      url: `${import.meta.env.VITE_BACKEND_API || ''}/api/upload/feedback`,
      filePath: tempFilePath,
      name: 'images',
      header: token ? { Authorization: `Bearer ${token}` } : {},
      success: (res) => {
        try {
          const data = JSON.parse(res.data as string)
          resolve(data.urls || [])
        } catch {
          reject(new Error('上传失败'))
        }
      },
      fail: (err) => {
        reject(new Error(err.errMsg || '上传失败'))
      },
    })
  })
}
