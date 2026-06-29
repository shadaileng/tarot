<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { navBack } from '@/utils'
import { getFeedbackDetail } from '@/services/feedback'
import type { Feedback } from '@/types'

const BACKEND_API = (import.meta.env.VITE_BACKEND_API || '').replace(/\/+$/, '')

const feedback = ref<Feedback | null>(null)
const loading = ref(true)
const feedbackId = ref('')

onLoad((query) => {
  if (query?.id) {
    feedbackId.value = query.id as string
    loadDetail()
  }
})

async function loadDetail() {
  loading.value = true
  try {
    feedback.value = await getFeedbackDetail(feedbackId.value)
  } catch {
    // ignore
  } finally {
    loading.value = false
  }
}

function getStatusText(status: string): string {
  const map: Record<string, string> = { pending: '待回复', replied: '已回复', closed: '已关闭' }
  return map[status] || status
}

function getCategoryText(cat: string): string {
  const map: Record<string, string> = { bug: 'Bug', suggestion: '建议', other: '其他' }
  return map[cat] || cat
}

function previewImage(url: string) {
  if (!feedback.value) return
  uni.previewImage({
    urls: feedback.value.images.map((u) => `${BACKEND_API}${u}`),
    current: `${BACKEND_API}${url}`,
  })
}
</script>

<template>
  <view class="detail-page">
    <view v-if="loading" class="loading-state">
      <text>加载中...</text>
    </view>

    <view v-else-if="!feedback" class="empty-state">
      <text>反馈不存在</text>
    </view>

    <view v-else class="detail-content">
      <view class="detail-header">
        <text class="category-tag" :class="'cat-' + feedback.category">{{ getCategoryText(feedback.category) }}</text>
        <text class="status-tag" :class="'status-' + feedback.status">{{ getStatusText(feedback.status) }}</text>
        <text class="detail-time">{{ feedback.createdAt.slice(0, 16).replace('T', ' ') }}</text>
      </view>

      <view class="content-section">
        <text class="content-title">反馈内容</text>
        <text class="content-text">{{ feedback.content }}</text>
      </view>

      <view v-if="feedback.images && feedback.images.length > 0" class="images-section">
        <text class="content-title">截图</text>
        <view class="image-grid">
          <image
            v-for="(img, idx) in feedback.images"
            :key="idx"
            :src="`${BACKEND_API}${img}`"
            mode="aspectFill"
            class="detail-img"
            @click="previewImage(img)"
          />
        </view>
      </view>

      <view v-if="feedback.adminReply" class="reply-section">
        <text class="reply-title">管理员回复</text>
        <view class="reply-box">
          <text class="reply-text">{{ feedback.adminReply }}</text>
          <text v-if="feedback.repliedAt" class="reply-time">{{ feedback.repliedAt.slice(0, 16).replace('T', ' ') }}</text>
        </view>
      </view>

      <view v-else class="reply-section waiting">
        <text class="reply-title">管理员回复</text>
        <view class="reply-box waiting-box">
          <text class="waiting-text">暂无回复，请耐心等待</text>
        </view>
      </view>
    </view>
  </view>
</template>

<style lang="scss" scoped>
.detail-page {
  padding: 24rpx;
}

.loading-state,
.empty-state {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 120rpx 0;
  color: $text-muted;
  font-size: 28rpx;
}

.detail-header {
  display: flex;
  align-items: center;
  gap: 12rpx;
  margin-bottom: 24rpx;
  flex-wrap: wrap;
}

.category-tag {
  padding: 4rpx 16rpx;
  border-radius: 20rpx;
  font-size: 22rpx;
  font-weight: 500;

  &.cat-bug { background: rgba(255, 77, 77, 0.15); color: #ff4d4d; }
  &.cat-suggestion { background: rgba(56, 176, 255, 0.15); color: #38b0ff; }
  &.cat-other { background: rgba(255, 193, 7, 0.15); color: #ffc107; }
}

.status-tag {
  padding: 4rpx 16rpx;
  border-radius: 20rpx;
  font-size: 22rpx;

  &.status-pending { background: rgba(255, 152, 0, 0.15); color: #ff9800; }
  &.status-replied { background: rgba(76, 175, 80, 0.15); color: #4caf50; }
  &.status-closed { background: rgba(158, 158, 158, 0.15); color: #9e9e9e; }
}

.detail-time {
  font-size: 22rpx;
  color: $text-muted;
  margin-left: auto;
}

.content-section,
.images-section,
.reply-section {
  margin-bottom: 32rpx;
}

.content-title,
.reply-title {
  display: block;
  font-size: 26rpx;
  color: $text-secondary;
  margin-bottom: 12rpx;
  font-weight: 500;
}

.content-text {
  display: block;
  font-size: 28rpx;
  color: $text-white;
  line-height: 1.6;
  background: $bg-card;
  border-radius: $radius-md;
  padding: 20rpx;
}

.image-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx;
}

.detail-img {
  width: 200rpx;
  height: 200rpx;
  border-radius: $radius-sm;
  cursor: pointer;
}

.reply-box {
  background: $bg-card;
  border-radius: $radius-md;
  padding: 20rpx;
  border: 1rpx solid rgba($accent-gold, 0.15);
}

.reply-text {
  display: block;
  font-size: 26rpx;
  color: $text-white;
  line-height: 1.6;
}

.reply-time {
  display: block;
  font-size: 22rpx;
  color: $text-muted;
  margin-top: 12rpx;
}

.waiting-box {
  border: 1rpx dashed rgba($text-muted, 0.2);
}

.waiting-text {
  font-size: 26rpx;
  color: $text-muted;
}
</style>
