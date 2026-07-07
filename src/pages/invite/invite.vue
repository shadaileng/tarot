<script setup lang="ts">
import { ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { showToast, getFullUrl } from '@/utils'
import { fetchInviteCode, fetchInviteRecords } from '@/services/user-stats'
import type { InviteRecord } from '@/types'

const referralCode = ref('')
const records = ref<InviteRecord[]>([])
const loading = ref(false)

async function loadData() {
  loading.value = true
  try {
    const [codeData, recordsData] = await Promise.all([
      fetchInviteCode(),
      fetchInviteRecords(),
    ])
    referralCode.value = codeData.referralCode
    records.value = recordsData.records
  } catch {
    showToast('加载邀请信息失败')
  } finally {
    loading.value = false
  }
}

function copyCode() {
  uni.setClipboardData({
    data: referralCode.value,
    success: () => showToast('邀请码已复制', 'success'),
  })
}

function share() {
  const app = getApp()
  const pages = getCurrentPages()
  const page = pages[pages.length - 1]
  page?.onShareAppMessage?.({})
}

onShow(() => {
  loadData()
})
</script>

<template>
  <view class="page-container invite-page">
    <view class="invite-card">
      <text class="invite-title">🎉 邀请好友</text>
      <text class="invite-desc">邀请好友注册并完成首次抽牌，双方均可获得奖励</text>

      <view class="code-section">
        <text class="code-label">我的邀请码</text>
        <view class="code-row" @click="copyCode">
          <text class="code-text">{{ referralCode || '------' }}</text>
          <text class="copy-hint">点击复制</text>
        </view>
      </view>

      <view class="reward-list">
        <text class="reward-title">邀请奖励</text>
        <text class="reward-item">• 邀请 1 位好友：+50 积分 + 10 次额度</text>
        <text class="reward-item">• 邀请 3 位好友：+200 积分 + 30 次额度</text>
      </view>
    </view>

    <view class="records-section">
      <text class="section-title">邀请记录</text>
      <view v-if="records.length === 0" class="empty-state">
        <text>暂无邀请记录</text>
      </view>
      <view v-for="record in records" :key="record.id" class="record-card">
        <view class="record-avatar">
          <text v-if="!record.avatar_url">{{ record.nickname?.[0] || '?' }}</text>
          <image v-else :src="getFullUrl(record.avatar_url)" mode="aspectFill" />
        </view>
        <view class="record-info">
          <text class="record-name">{{ record.nickname || '匿名用户' }}</text>
          <text class="record-status">{{ record.status === 'completed' ? '已完成首次抽牌' : '待完成' }}</text>
        </view>
        <text class="record-date">{{ record.completed_at?.slice(0, 10) || record.created_at.slice(0, 10) }}</text>
      </view>
    </view>
  </view>
</template>

<style lang="scss" scoped>
.invite-page {
  padding: 32rpx;
}

.invite-card {
  background: $bg-card;
  border-radius: $radius-md;
  padding: 32rpx;
  margin-bottom: 32rpx;
}

.invite-title {
  font-size: 32rpx;
  font-weight: 600;
  color: $text-white;
  display: block;
  margin-bottom: 12rpx;
}

.invite-desc {
  font-size: 24rpx;
  color: $text-secondary;
  display: block;
  margin-bottom: 28rpx;
  line-height: 1.6;
}

.code-section {
  text-align: center;
  margin-bottom: 28rpx;
}

.code-label {
  font-size: 22rpx;
  color: $text-muted;
  display: block;
  margin-bottom: 12rpx;
}

.code-row {
  display: inline-flex;
  align-items: center;
  gap: 16rpx;
  background: $bg-primary;
  padding: 20rpx 40rpx;
  border-radius: $radius-md;
  cursor: pointer;
  border: 2rpx dashed $accent-gold;
}

.code-text {
  font-size: 36rpx;
  font-weight: 700;
  color: $accent-gold;
  font-family: monospace;
  letter-spacing: 6rpx;
}

.copy-hint {
  font-size: 22rpx;
  color: $text-muted;
}

.reward-list {
  background: $bg-primary;
  border-radius: $radius-sm;
  padding: 20rpx;
}

.reward-title {
  font-size: 24rpx;
  color: $text-white;
  font-weight: 500;
  display: block;
  margin-bottom: 12rpx;
}

.reward-item {
  font-size: 22rpx;
  color: $text-secondary;
  display: block;
  margin-bottom: 6rpx;
}

.records-section {
  margin-bottom: 40rpx;
}

.section-title {
  font-size: 28rpx;
  font-weight: 600;
  color: $text-white;
  display: block;
  margin-bottom: 16rpx;
}

.empty-state {
  text-align: center;
  color: $text-muted;
  font-size: 26rpx;
  padding: 40rpx 0;
}

.record-card {
  display: flex;
  align-items: center;
  gap: 16rpx;
  background: $bg-card;
  border-radius: $radius-md;
  padding: 20rpx;
  margin-bottom: 12rpx;
}

.record-avatar {
  width: 60rpx;
  height: 60rpx;
  border-radius: $radius-round;
  background: $bg-primary;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24rpx;
  color: $text-muted;
  flex-shrink: 0;
  overflow: hidden;
}

.record-avatar image {
  width: 100%;
  height: 100%;
}

.record-info {
  flex: 1;
  min-width: 0;
}

.record-name {
  font-size: 26rpx;
  color: $text-white;
  display: block;
}

.record-status {
  font-size: 22rpx;
  color: $text-muted;
}

.record-date {
  font-size: 20rpx;
  color: $text-muted;
}
</style>
