<script setup lang="ts">
import { ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { navBack } from '@/utils'
import { submitCheckin, fetchCheckinStatus } from '@/services/user-stats'
import type { CheckinResult, CheckinStatus } from '@/types'
import { logInfo } from '@/services/client-logger'

const status = ref<CheckinStatus | null>(null)
const result = ref<CheckinResult | null>(null)
const loading = ref(false)
const error = ref('')

async function loadStatus() {
  try {
    status.value = await fetchCheckinStatus()
  } catch {}
}

async function doCheckin() {
  if (loading.value || status.value?.isCheckedIn) return
  loading.value = true
  error.value = ''
  try {
    result.value = await submitCheckin()
    status.value = await fetchCheckinStatus()
    logInfo('user_action', 'checkin', { streak: status.value?.streak })
  } catch (e: any) {
    if (e.message?.includes('ALREADY_CHECKED_IN')) {
      status.value = await fetchCheckinStatus()
    } else {
      error.value = e.message || '签到失败'
    }
  } finally {
    loading.value = false
  }
}

onShow(() => {
  loadStatus()
})
</script>

<template>
  <view class="page-container checkin-page">
    <view class="checkin-card" @click="doCheckin">
      <view class="checkin-circle" :class="{ checked: status?.isCheckedIn, animating: loading }">
        <text class="checkin-icon">{{ status?.isCheckedIn ? '✅' : '📅' }}</text>
        <text class="checkin-label">{{ status?.isCheckedIn ? '已签到' : '点击签到' }}</text>
      </view>
    </view>

    <view v-if="status" class="streak-section">
      <text class="streak-count">{{ status.streak }}</text>
      <text class="streak-label">连续签到天数</text>
      <view class="streak-bar">
        <view class="streak-fill" :style="{ width: Math.min(status.streak / 20 * 100, 100) + '%' }" />
      </view>
      <text class="streak-hint">连续签到奖励 +2/天，上限 +20</text>
    </view>

    <view v-if="result" class="reward-section">
      <text class="reward-title">今日奖励</text>
      <view class="reward-row">
        <text class="reward-item">基础积分：+{{ result.basePoints }}</text>
        <text v-if="result.streakBonus > 0" class="reward-item">连续奖励：+{{ result.streakBonus }}</text>
      </view>
      <text class="reward-total">共获得 +{{ result.totalPoints }} 积分</text>
    </view>

    <view v-if="error" class="error-msg">{{ error }}</view>

    <view class="checkin-rules">
      <text class="rules-title">签到规则</text>
      <text class="rules-item">• 每日签到获得 5 积分</text>
      <text class="rules-item">• 连续签到每天额外 +2，上限 +20</text>
      <text class="rules-item">• 断签后连续天数重置为 1</text>
    </view>
  </view>
</template>

<style lang="scss" scoped>
.checkin-page {
  padding: 40rpx 32rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.checkin-card {
  width: 280rpx;
  height: 280rpx;
  margin: 40rpx auto;
  cursor: pointer;
}

.checkin-circle {
  width: 100%;
  height: 100%;
  border-radius: $radius-round;
  background: linear-gradient(135deg, $accent-gold, $accent-purple);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  transition: $transition-normal;
  box-shadow: $shadow-lg;

  &.checked {
    background: linear-gradient(135deg, $success, #2ecc71);
  }

  &.animating {
    transform: scale(0.95);
  }
}

.checkin-icon {
  font-size: 64rpx;
  margin-bottom: 12rpx;
}

.checkin-label {
  font-size: 32rpx;
  color: $text-white;
  font-weight: 600;
}

.streak-section {
  text-align: center;
  margin-bottom: 40rpx;
}

.streak-count {
  font-size: 80rpx;
  font-weight: 700;
  color: $accent-gold;
}

.streak-label {
  font-size: 26rpx;
  color: $text-muted;
  display: block;
  margin-bottom: 20rpx;
}

.streak-bar {
  width: 400rpx;
  height: 12rpx;
  background: $bg-card;
  border-radius: 6rpx;
  overflow: hidden;
  margin: 0 auto 12rpx;
}

.streak-fill {
  height: 100%;
  background: linear-gradient(90deg, $accent-gold, $accent-gold-light);
  border-radius: 6rpx;
  transition: width $transition-normal;
}

.streak-hint {
  font-size: 22rpx;
  color: $text-muted;
}

.reward-section {
  width: 100%;
  background: $bg-card;
  border-radius: $radius-md;
  padding: 28rpx;
  margin-bottom: 24rpx;
}

.reward-title {
  font-size: 28rpx;
  color: $text-white;
  font-weight: 600;
  margin-bottom: 16rpx;
  display: block;
}

.reward-row {
  display: flex;
  justify-content: space-between;
  margin-bottom: 12rpx;
}

.reward-item {
  font-size: 26rpx;
  color: $text-secondary;
}

.reward-total {
  font-size: 30rpx;
  color: $accent-gold;
  font-weight: 600;
  display: block;
  text-align: center;
  margin-top: 12rpx;
}

.error-msg {
  color: $danger;
  font-size: 26rpx;
  margin-bottom: 24rpx;
}

.checkin-rules {
  width: 100%;
  background: $bg-card;
  border-radius: $radius-md;
  padding: 28rpx;
}

.rules-title {
  font-size: 28rpx;
  color: $text-white;
  font-weight: 600;
  margin-bottom: 16rpx;
  display: block;
}

.rules-item {
  font-size: 24rpx;
  color: $text-muted;
  display: block;
  margin-bottom: 8rpx;
}
</style>
