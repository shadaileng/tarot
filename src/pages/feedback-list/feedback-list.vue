<script setup lang="ts">
import { ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { navTo } from '@/utils'
import { getMyFeedbackList } from '@/services/feedback'
import type { Feedback } from '@/types'

const feedbackList = ref<Feedback[]>([])
const loading = ref(true)
const page = ref(1)
const hasMore = ref(true)

async function loadData() {
  loading.value = true
  try {
    const res = await getMyFeedbackList({ page: page.value, limit: 20 })
    if (page.value === 1) {
      feedbackList.value = res.data
    } else {
      feedbackList.value.push(...res.data)
    }
    hasMore.value = feedbackList.value.length < res.total
  } catch {
    // ignore
  } finally {
    loading.value = false
  }
}

function loadMore() {
  if (!hasMore.value || loading.value) return
  page.value++
  loadData()
}

onShow(() => {
  page.value = 1
  feedbackList.value = []
  loadData()
})

function getStatusText(status: string): string {
  const map: Record<string, string> = { pending: '待回复', replied: '已回复', closed: '已关闭' }
  return map[status] || status
}

function getStatusClass(status: string): string {
  const map: Record<string, string> = { pending: 'status-pending', replied: 'status-replied', closed: 'status-closed' }
  return map[status] || ''
}

function getCategoryText(cat: string): string {
  const map: Record<string, string> = { bug: 'Bug', suggestion: '建议', other: '其他' }
  return map[cat] || cat
}

function goToDetail(item: Feedback) {
  navTo(`/pages/feedback-detail/feedback-detail?id=${item.id}`)
}
</script>

<template>
  <view class="list-page">
    <view v-if="loading && feedbackList.length === 0" class="loading-state">
      <text>加载中...</text>
    </view>

    <view v-else-if="feedbackList.length === 0" class="empty-state">
      <text class="empty-icon">💬</text>
      <text class="empty-text">暂无反馈记录</text>
      <text class="empty-hint">去「意见反馈」提交您的问题或建议</text>
    </view>

    <view v-else class="feedback-list">
      <view
        v-for="item in feedbackList"
        :key="item.id"
        class="feedback-card"
        @click="goToDetail(item)"
      >
        <view class="card-header">
          <text class="category-tag" :class="'cat-' + item.category">{{ getCategoryText(item.category) }}</text>
          <text class="status-tag" :class="getStatusClass(item.status)">{{ getStatusText(item.status) }}</text>
        </view>
        <text class="card-content">{{ item.content }}</text>
        <view v-if="item.adminReply" class="card-reply">
          <text class="reply-label">管理员回复：</text>
          <text class="reply-text">{{ item.adminReply }}</text>
        </view>
        <text class="card-time">{{ item.createdAt.slice(0, 16).replace('T', ' ') }}</text>
      </view>
    </view>

    <view v-if="hasMore && feedbackList.length > 0" class="load-more" @click="loadMore">
      <text>{{ loading ? '加载中...' : '点击加载更多' }}</text>
    </view>
  </view>
</template>

<style lang="scss" scoped>
.list-page {
  padding: 24rpx;
}

.loading-state,
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 120rpx 0;
  color: $text-muted;
}

.empty-icon {
  font-size: 64rpx;
  margin-bottom: 16rpx;
}

.empty-text {
  font-size: 28rpx;
  color: $text-secondary;
  margin-bottom: 8rpx;
}

.empty-hint {
  font-size: 24rpx;
  color: $text-muted;
}

.feedback-card {
  background: $bg-card;
  border-radius: $radius-md;
  padding: 24rpx;
  margin-bottom: 16rpx;
  cursor: pointer;
}

.card-header {
  display: flex;
  align-items: center;
  gap: 12rpx;
  margin-bottom: 12rpx;
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

.card-content {
  display: block;
  font-size: 26rpx;
  color: $text-white;
  line-height: 1.5;
  margin-bottom: 12rpx;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
}

.card-reply {
  background: rgba($accent-gold, 0.06);
  border-radius: $radius-sm;
  padding: 12rpx;
  margin-bottom: 12rpx;
}

.reply-label {
  font-size: 22rpx;
  color: $accent-gold;
  font-weight: 500;
}

.reply-text {
  font-size: 24rpx;
  color: $text-secondary;
}

.card-time {
  display: block;
  font-size: 22rpx;
  color: $text-muted;
}

.load-more {
  text-align: center;
  padding: 24rpx;
  color: $text-muted;
  font-size: 24rpx;
  cursor: pointer;
}
</style>
