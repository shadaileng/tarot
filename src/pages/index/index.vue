<script setup lang="ts">
import { ref } from 'vue'
import type { SpreadType } from '@/types'
import { spreadList } from '@/data/spreads'
import { useTarotStore } from '@/store'
import { navTo } from '@/utils'
import TabBar from '@/components/TabBar/TabBar.vue'

const store = useTarotStore()
const selectedSpread = ref<SpreadType>('single')
const question = ref('')

const spreadIcons: Record<SpreadType, string> = {
  single: '🃏',
  three: '🎴',
  'celtic-cross': '✝️',
}

const tabList = [
  { pagePath: 'pages/index/index', text: '首页' },
  { pagePath: 'pages/draw/draw', text: '抽牌' },
  { pagePath: 'pages/cards/cards', text: '牌库' },
  { pagePath: 'pages/history/history', text: '记录' },
]

function handleDraw() {
  store.drawCards(selectedSpread.value, question.value)
  navTo('/pages/result/result')
}

function handleTabChange(path: string) {
  uni.switchTab({ url: '/' + path })
}
</script>

<template>
  <view class="page-container index-page">
    <!-- 顶部区域 -->
    <view class="hero-section">
      <view class="hero-glow" />
      <text class="hero-title">塔罗牌占卜</text>
      <text class="hero-subtitle">探索命运的神秘指引</text>
      <view class="hero-stars">
        <text class="star">✦</text>
        <text class="star">✦</text>
        <text class="star">✦</text>
      </view>
    </view>

    <!-- 牌阵选择 -->
    <view class="spread-section">
      <text class="section-title">选择牌阵</text>
      <view class="spread-list">
        <view
          v-for="spread in spreadList"
          :key="spread.type"
          class="spread-item"
          :class="{ active: selectedSpread === spread.type }"
          @click="selectedSpread = spread.type"
        >
          <text class="spread-icon">{{ spreadIcons[spread.type] }}</text>
          <text class="spread-name">{{ spread.name }}</text>
          <text class="spread-count">{{ spread.positions.length }} 张牌</text>
        </view>
      </view>
    </view>

    <!-- 问题输入 -->
    <view class="question-section">
      <text class="section-title">你想问什么？（选填）</text>
      <view class="question-input-wrap">
        <textarea
          v-model="question"
          class="question-input"
          placeholder="默想你的问题..."
          placeholder-style="color: #6b5e53"
          maxlength="200"
          :auto-height="true"
        />
        <text class="input-count">{{ question.length }}/200</text>
      </view>
    </view>

    <!-- 抽牌按钮 -->
    <view class="draw-btn-wrap">
      <view class="btn-primary draw-btn" @click="handleDraw">
        <text class="draw-btn-icon">🔮</text>
        <text class="draw-btn-text">开始占卜</text>
      </view>
    </view>

    <!-- 自定义底部导航 -->
    <TabBar :current-path="'pages/index/index'" :tabs="tabList" @change="handleTabChange" />
  </view>
</template>

<style lang="scss" scoped>
.index-page {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 0 40rpx;
}

// 顶部
.hero-section {
  position: relative;
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 120rpx 0 80rpx;
}

.hero-glow {
  position: absolute;
  top: 0;
  width: 400rpx;
  height: 400rpx;
  border-radius: 50%;
  background: radial-gradient(circle, rgba($accent-purple, 0.3) 0%, transparent 70%);
  pointer-events: none;
}

.hero-title {
  font-size: 56rpx;
  font-weight: bold;
  color: $accent-gold;
  letter-spacing: 8rpx;
  position: relative;
  z-index: 1;
}

.hero-subtitle {
  font-size: 28rpx;
  color: $text-secondary;
  margin-top: 16rpx;
  letter-spacing: 4rpx;
  position: relative;
  z-index: 1;
}

.hero-stars {
  display: flex;
  gap: 24rpx;
  margin-top: 24rpx;
  position: relative;
  z-index: 1;
}

.star {
  font-size: 32rpx;
  color: $accent-gold-light;
  opacity: 0.6;
}

// 牌阵
.spread-section {
  width: 100%;
  margin-bottom: 40rpx;
}

.section-title {
  font-size: 30rpx;
  color: $text-secondary;
  margin-bottom: 20rpx;
  display: block;
}

.spread-list {
  display: flex;
  gap: 20rpx;
}

.spread-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 32rpx 16rpx;
  background: $bg-card;
  border-radius: $radius-md;
  border: 2rpx solid transparent;
  transition: all $transition-fast;

  &.active {
    border-color: $accent-gold;
    background: rgba($accent-gold, 0.08);
  }
}

.spread-icon {
  font-size: 48rpx;
  margin-bottom: 12rpx;
}

.spread-name {
  font-size: 28rpx;
  color: $text-primary;
  font-weight: 600;
}

.spread-count {
  font-size: 22rpx;
  color: $text-muted;
  margin-top: 6rpx;
}

// 问题
.question-section {
  width: 100%;
  margin-bottom: 48rpx;
}

.question-input-wrap {
  background: $bg-card;
  border-radius: $radius-md;
  padding: 24rpx;
  position: relative;
}

.question-input {
  width: 100%;
  min-height: 100rpx;
  font-size: 28rpx;
  color: $text-primary;
  background: transparent;
}

.input-count {
  text-align: right;
  font-size: 22rpx;
  color: $text-muted;
  display: block;
  margin-top: 8rpx;
}

// 按钮
.draw-btn-wrap {
  width: 100%;
  padding-bottom: 60rpx;
}

.draw-btn {
  width: 100%;
  height: 100rpx;
  font-size: 36rpx;
  gap: 16rpx;
}

.draw-btn-icon {
  font-size: 40rpx;
}
</style>
