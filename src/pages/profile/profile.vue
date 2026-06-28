<script setup lang="ts">
import { ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { navTo } from '@/utils'
import TabBar from '@/components/TabBar/TabBar.vue'
import LoginGuide from '@/components/LoginGuide/LoginGuide.vue'
import {
  isLoggedIn, getUserInfo,
} from '@/services/auth'
import { fetchUserStats } from '@/services/user-stats'
import type { UserInfo } from '@/services/auth'
import type { UserLevelInfo } from '@/types'

const loggedIn = ref(isLoggedIn())
const userInfo = ref<UserInfo | null>(getUserInfo())
const stats = ref<UserLevelInfo | null>(null)

onShow(() => {
  loggedIn.value = isLoggedIn()
  userInfo.value = getUserInfo()
  if (loggedIn.value) loadStats()
})

async function loadStats() {
  try {
    stats.value = await fetchUserStats()
  } catch {}
}

function handleLoginSuccess() {
  loggedIn.value = true
  userInfo.value = getUserInfo()
  loadStats()
}

function maskMiddle(val: string, keep = 3): string {
  if (!val || val.length <= keep * 2) return val || ''
  return val.slice(0, keep) + '***' + val.slice(-keep)
}

function goToDetail() {
  navTo('/pages/profile-detail/profile-detail')
}

function goTo(url: string) {
  navTo(url)
}

const tabList = [
  { pagePath: 'pages/index/index', text: '首页' },
  { pagePath: 'pages/draw/draw', text: '抽牌' },
  { pagePath: 'pages/cards/cards', text: '牌库' },
  { pagePath: 'pages/profile/profile', text: '我的' },
]

function handleTabChange(path: string) {
  uni.switchTab({ url: '/' + path })
}
</script>

<template>
  <view class="page-container profile-page">
    <view v-if="loggedIn && userInfo" class="profile-card" @click="goToDetail">
      <view class="profile-header">
        <image
          v-if="userInfo.avatarUrl"
          class="profile-avatar"
          :src="userInfo.avatarUrl"
          mode="aspectFill"
        />
        <text v-else class="profile-avatar-placeholder">🃏</text>

        <view class="profile-info">
          <text class="profile-nickname">{{ userInfo.nickname }}</text>
          <text class="profile-id">ID {{ maskMiddle(userInfo.id, 4) }}</text>
        </view>

        <text class="profile-arrow">›</text>
      </view>
    </view>

    <!-- 等级/积分/额度卡片 -->
    <view v-if="stats" class="stats-card">
      <view class="level-row">
        <text class="level-badge">Lv.{{ stats.level }}</text>
        <text class="level-title">{{ stats.title }}</text>
      </view>
      <view class="points-row">
        <text class="points-value">{{ stats.points }}</text>
        <text class="points-label">积分</text>
      </view>
      <view class="progress-section">
        <view class="progress-bar">
          <view class="progress-fill" :style="{ width: stats.progress + '%' }" />
        </view>
        <text v-if="stats.nextLevelPoints" class="progress-text">
          {{ stats.points }}/{{ stats.nextLevelPoints }} 升级到{{ stats.nextLevelTitle }}
        </text>
        <text v-else class="progress-text max-level">已达最高等级</text>
      </view>
      <view class="quota-row">
        <text class="quota-item">今日额度：{{ stats.remainingQuota }}/{{ stats.totalQuota }}</text>
        <text class="quota-item">占卜次数：{{ stats.totalReadings }}</text>
      </view>
    </view>

    <!-- 功能入口 -->
    <view v-if="loggedIn" class="menu-section">
      <view class="menu-item" @click="goTo('/pages/checkin/checkin')">
        <text class="menu-icon">📅</text>
        <text class="menu-label">每日签到</text>
        <text class="menu-arrow">›</text>
      </view>
      <view class="menu-item" @click="goTo('/pages/tasks/tasks')">
        <text class="menu-icon">🎯</text>
        <text class="menu-label">任务中心</text>
        <text class="menu-arrow">›</text>
      </view>
      <view class="menu-item" @click="goTo('/pages/invite/invite')">
        <text class="menu-icon">👥</text>
        <text class="menu-label">邀请好友</text>
        <text class="menu-arrow">›</text>
      </view>
      <view class="menu-item" @click="goTo('/pages/history/history')">
        <text class="menu-icon">📖</text>
        <text class="menu-label">占卜记录</text>
        <text class="menu-arrow">›</text>
      </view>
    </view>

    <LoginGuide v-if="!loggedIn" @login-success="handleLoginSuccess" />

    <TabBar :current-path="'pages/profile/profile'" :tabs="tabList" @change="handleTabChange" />
  </view>
</template>

<style lang="scss" scoped>
.profile-page {
  padding: 24rpx;
  padding-bottom: 40rpx;
}

.profile-card {
  background: $bg-card;
  border-radius: $radius-md;
  padding: 28rpx 32rpx;
  margin-bottom: 24rpx;
  cursor: pointer;
}

.profile-header {
  display: flex;
  align-items: center;
  gap: 20rpx;
}

.profile-avatar {
  width: 88rpx;
  height: 88rpx;
  border-radius: $radius-round;
  flex-shrink: 0;
}

.profile-avatar-placeholder {
  width: 88rpx;
  height: 88rpx;
  border-radius: $radius-round;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(201, 169, 110, 0.2);
  font-size: 36rpx;
}

.profile-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 6rpx;
}

.profile-nickname {
  font-size: 30rpx;
  font-weight: 600;
  color: $text-white;
}

.profile-id {
  font-size: 22rpx;
  color: $text-muted;
  font-family: monospace;
}

.profile-arrow {
  font-size: 40rpx;
  color: $text-muted;
  flex-shrink: 0;
  padding: 0 8rpx;
}

.stats-card {
  background: linear-gradient(135deg, $bg-card, #1a1a3e);
  border-radius: $radius-md;
  padding: 28rpx;
  margin-bottom: 24rpx;
  border: 1rpx solid rgba($accent-gold, 0.15);
}

.level-row {
  display: flex;
  align-items: center;
  gap: 12rpx;
  margin-bottom: 16rpx;
}

.level-badge {
  background: linear-gradient(135deg, $accent-gold, $accent-gold-light);
  color: $bg-primary;
  font-size: 24rpx;
  font-weight: 700;
  padding: 4rpx 16rpx;
  border-radius: 20rpx;
}

.level-title {
  font-size: 28rpx;
  color: $text-white;
  font-weight: 600;
}

.points-row {
  display: flex;
  align-items: baseline;
  gap: 8rpx;
  margin-bottom: 16rpx;
}

.points-value {
  font-size: 48rpx;
  font-weight: 700;
  color: $accent-gold;
}

.points-label {
  font-size: 24rpx;
  color: $text-muted;
}

.progress-section {
  margin-bottom: 16rpx;
}

.progress-bar {
  height: 10rpx;
  background: $bg-primary;
  border-radius: 5rpx;
  overflow: hidden;
  margin-bottom: 8rpx;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, $accent-gold, $accent-gold-light);
  border-radius: 5rpx;
  transition: width $transition-normal;
}

.progress-text {
  font-size: 22rpx;
  color: $text-secondary;
}

.max-level {
  color: $accent-gold;
}

.quota-row {
  display: flex;
  justify-content: space-between;
}

.quota-item {
  font-size: 22rpx;
  color: $text-muted;
}

.menu-section {
  margin-bottom: 24rpx;
}

.menu-item {
  display: flex;
  align-items: center;
  gap: 16rpx;
  background: $bg-card;
  border-radius: $radius-md;
  padding: 24rpx 28rpx;
  margin-bottom: 12rpx;
  cursor: pointer;
}

.menu-icon {
  font-size: 32rpx;
}

.menu-label {
  flex: 1;
  font-size: 28rpx;
  color: $text-white;
}

.menu-arrow {
  font-size: 36rpx;
  color: $text-muted;
}
</style>

<style lang="scss" scoped>
.profile-page {
  padding: 24rpx;
  padding-bottom: 40rpx;
}

.profile-card {
  background: $bg-card;
  border-radius: $radius-md;
  padding: 28rpx 32rpx;
  margin-bottom: 32rpx;
  cursor: pointer;
}

.profile-header {
  display: flex;
  align-items: center;
  gap: 20rpx;
}

.profile-avatar {
  width: 88rpx;
  height: 88rpx;
  border-radius: $radius-round;
  flex-shrink: 0;
}

.profile-avatar-placeholder {
  width: 88rpx;
  height: 88rpx;
  border-radius: $radius-round;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(201, 169, 110, 0.2);
  font-size: 36rpx;
}

.profile-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 6rpx;
}

.profile-nickname {
  font-size: 30rpx;
  font-weight: 600;
  color: $text-white;
}

.profile-id {
  font-size: 22rpx;
  color: $text-muted;
  font-family: monospace;
}

.profile-arrow {
  font-size: 40rpx;
  color: $text-muted;
  flex-shrink: 0;
  padding: 0 8rpx;
}
</style>
