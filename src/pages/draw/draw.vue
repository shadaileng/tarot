<script setup lang="ts">
import { ref, computed } from 'vue'
import type { SpreadType } from '@/types'
import { spreadList, getSpread } from '@/data/spreads'
import { useTarotStore } from '@/store'
import { navTo, navBack } from '@/utils'
import TabBar from '@/components/TabBar/TabBar.vue'

const store = useTarotStore()
const selectedSpread = ref<SpreadType>('single')
const question = ref('')

const currentSpread = computed(() => getSpread(selectedSpread.value))

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
  <view class="page-container draw-page">
    <!-- 牌阵选择 -->
    <view class="spread-select">
      <text class="section-title">选择牌阵</text>
      <view class="spread-grid">
        <view
          v-for="spread in spreadList"
          :key="spread.type"
          class="spread-card"
          :class="{ active: selectedSpread === spread.type }"
          @click="selectedSpread = spread.type"
        >
          <text class="spread-card-name">{{ spread.name }}</text>
          <text class="spread-card-desc">{{ spread.positions.join(' · ') }}</text>
          <text class="spread-card-count">{{ spread.positions.length }} 张牌</text>
        </view>
      </view>
    </view>

    <!-- 问题 -->
    <view class="question-wrap">
      <text class="section-title">默想你的问题</text>
      <textarea
        v-model="question"
        class="question-textarea"
        placeholder="在心中默想你的问题，也可以写在这里..."
        placeholder-style="color: #6b5e53"
        maxlength="200"
        :auto-height="true"
      />
    </view>

    <!-- 牌阵预览 -->
    <view class="spread-preview">
      <text class="section-title">牌阵预览：{{ currentSpread?.name }}</text>
      <view class="preview-cards">
        <view
          v-for="(pos, i) in currentSpread?.positions"
          :key="i"
          class="preview-card-slot"
        >
          <view class="card-back-preview">
            <text class="card-back-star">★</text>
          </view>
          <text class="preview-pos">{{ pos }}</text>
        </view>
      </view>
    </view>

    <!-- 抽牌按钮 -->
    <view class="draw-action">
      <view class="btn-primary" @click="handleDraw">
        <text>🔮 开始抽牌</text>
      </view>
    </view>

    <!-- 自定义底部导航 -->
    <TabBar :current-path="'pages/draw/draw'" :tabs="tabList" @change="handleTabChange" />
  </view>
</template>

<style lang="scss" scoped>
.draw-page {
  padding: 32rpx;
}

.section-title {
  font-size: 30rpx;
  color: $text-secondary;
  margin-bottom: 20rpx;
  display: block;
}

.spread-grid {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

.spread-card {
  background: $bg-card;
  border-radius: $radius-md;
  padding: 28rpx 32rpx;
  border: 2rpx solid transparent;
  transition: all $transition-fast;

  &.active {
    border-color: $accent-gold;
    background: rgba($accent-gold, 0.06);
  }
}

.spread-card-name {
  font-size: 32rpx;
  color: $text-primary;
  font-weight: 600;
}

.spread-card-desc {
  font-size: 24rpx;
  color: $text-muted;
  display: block;
  margin-top: 8rpx;
}

.spread-card-count {
  font-size: 22rpx;
  color: $accent-gold;
  display: block;
  margin-top: 6rpx;
}

.question-wrap {
  margin-top: 40rpx;
}

.question-textarea {
  width: 100%;
  min-height: 120rpx;
  background: $bg-card;
  border-radius: $radius-md;
  padding: 24rpx;
  font-size: 28rpx;
  color: $text-primary;
}

.spread-preview {
  margin-top: 40rpx;
}

.preview-cards {
  display: flex;
  flex-wrap: wrap;
  gap: 20rpx;
  justify-content: center;
}

.preview-card-slot {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12rpx;
}

.card-back-preview {
  width: 100rpx;
  height: 150rpx;
  background: linear-gradient(135deg, $card-back-color, #3d2b6b);
  border-radius: $radius-sm;
  border: 2rpx solid $card-border-color;
  display: flex;
  align-items: center;
  justify-content: center;
}

.card-back-star {
  font-size: 36rpx;
  color: $accent-gold;
  opacity: 0.5;
}

.preview-pos {
  font-size: 22rpx;
  color: $text-muted;
}

.draw-action {
  margin-top: 60rpx;
  padding-bottom: 40rpx;

  .btn-primary {
    width: 100%;
    height: 96rpx;
    font-size: 34rpx;
  }
}
</style>
