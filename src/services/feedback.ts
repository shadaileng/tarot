import { apiGet, apiPost } from '@/utils/request'
import type { Feedback, FeedbackListResponse } from '@/types'
import { API_ENDPOINTS } from '@/constants/api'

export interface SubmitFeedbackData {
  category: string
  content: string
  images?: string[]
}

export async function submitFeedback(data: SubmitFeedbackData): Promise<Feedback> {
  return apiPost<Feedback>(API_ENDPOINTS.FEEDBACK.SUBMIT, data)
}

export async function getMyFeedbackList(params: {
  page?: number
  limit?: number
} = {}): Promise<FeedbackListResponse> {
  return apiGet<FeedbackListResponse>(API_ENDPOINTS.FEEDBACK.LIST, params)
}

export async function getFeedbackDetail(id: string): Promise<Feedback> {
  return apiGet<Feedback>(API_ENDPOINTS.FEEDBACK.DETAIL(id))
}

export async function uploadFeedbackImage(tempFilePath: string): Promise<string[]> {
  const token = uni.getStorageSync('auth_token')
  return new Promise((resolve, reject) => {
    uni.uploadFile({
      url: `${import.meta.env.VITE_BACKEND_API || ''}${API_ENDPOINTS.FEEDBACK.UPLOAD_IMAGE}`,
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
