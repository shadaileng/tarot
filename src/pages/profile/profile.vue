<script setup lang="ts">
import { ref } from 'vue'
import { navTo } from '@/utils'
import TabBar from '@/components/TabBar/TabBar.vue'
import LoginGuide from '@/components/LoginGuide/LoginGuide.vue'
import {
  isLoggedIn, getUserInfo,
} from '@/services/auth'
import type { UserInfo } from '@/services/auth'

const loggedIn = ref(isLoggedIn())
const userInfo = ref<UserInfo | null>(getUserInfo())

function handleLoginSuccess() {
  loggedIn.value = true
  userInfo.value = getUserInfo()
}

function maskMiddle(val: string, keep = 3): string {
  if (!val || val.length <= keep * 2) return val || ''
  return val.slice(0, keep) + '***' + val.slice(-keep)
}

function goToDetail() {
  navTo('/pages/profile-detail/profile-detail')
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
