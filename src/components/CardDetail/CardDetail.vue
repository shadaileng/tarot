<script setup lang="ts">
import { ref, watch } from 'vue'
import type { TarotCard, CardOrientation } from '@/types'

const props = defineProps<{
  visible: boolean
  card: TarotCard | null
  orientation?: CardOrientation
  /** 个性化解读文本 */
  deepMeaning?: string
}>()

const emit = defineEmits<{
  close: []
}>()

const activeTab = ref<'upright' | 'reversed' | 'deep'>('upright')
const imgLoaded = ref(false)

watch(
  () => props.orientation,
  (val) => {
    if (val) activeTab.value = val
  },
  { immediate: true },
)

watch(
  () => props.visible,
  (val) => {
    if (val && props.orientation) {
      activeTab.value = props.orientation
    }
    // 重置图片加载状态
    if (val) {
      imgLoaded.value = false
    }
  },
)

function getSuitColor(suit: string): string {
  const map: Record<string, string> = {
    wands: 'wands',
    cups: 'cups',
    swords: 'swords',
    pentacles: 'pentacles',
    major: 'major',
  }
  return map[suit] || 'major'
}

function onImgLoad() {
  imgLoaded.value = true
}

function onImgError() {
  imgLoaded.value = false
}

function handleClose() {
  emit('close')
}

function handleMaskClick() {
  emit('close')
}
</script>

<template>
  <view v-if="visible && card" class="card-detail-overlay" @click="handleMaskClick">
    <view class="card-detail-popup" @click.stop>
      <!-- 关闭按钮 -->
      <view class="close-btn" @click="handleClose">
        <text>✕</text>
      </view>

      <!-- 牌面大图 -->
      <view class="detail-image-wrap" :class="[orientation, 'card-face-' + getSuitColor(card.type)]">
        <image
          class="detail-image"
          :class="{ loaded: imgLoaded }"
          :src="card.image"
          mode="aspectFit"
          @load="onImgLoad"
          @error="onImgError"
        />
        <view class="detail-image-placeholder" v-if="!imgLoaded">
          <text class="detail-placeholder-icon">{{ card.type === 'major' ? ['0','I','II','III','IV','V','VI','VII','VIII','IX','X','XI','XII','XIII','XIV','XV','XVI','XVII','XVIII','XIX','XX','XXI'][card.number] : '✦' }}</text>
          <text class="detail-placeholder-name">{{ card.name }}</text>
        </view>
      </view>

      <!-- 牌名 -->
      <view class="detail-header">
        <text class="detail-name">{{ card.name }}</text>
        <text class="detail-name-en">{{ card.nameEn }}</text>
      </view>

      <!-- 标签 -->
      <view class="detail-tags">
        <text class="detail-type-tag">
          {{ card.type === 'major' ? '大阿卡纳' : '小阿卡纳' }}
        </text>
        <text v-if="card.number >= 0" class="detail-number-tag">
          {{ card.type === 'major' ? ['0','I','II','III','IV','V','VI','VII','VIII','IX','X','XI','XII','XIII','XIV','XV','XVI','XVII','XVIII','XIX','XX','XXI'][card.number] : `#${card.number}` }}
        </text>
      </view>

      <!-- 关键词 -->
      <view class="detail-keywords">
        <text
          v-for="kw in card.keywords"
          :key="kw"
          class="detail-keyword-tag"
        >{{ kw }}</text>
      </view>

      <!-- 正位/逆位/深度解读 Tab -->
      <view class="detail-tabs" :class="{ 'has-deep': !!deepMeaning }">
        <view
          class="detail-tab"
          :class="{ active: activeTab === 'upright' }"
          @click="activeTab = 'upright'"
        >
          <text>正位 ☀</text>
        </view>
        <view
          class="detail-tab"
          :class="{ active: activeTab === 'reversed' }"
          @click="activeTab = 'reversed'"
        >
          <text>逆位 ☽</text>
        </view>
        <view
          v-if="deepMeaning"
          class="detail-tab tab-deep"
          :class="{ active: activeTab === 'deep' }"
          @click="activeTab = 'deep'"
        >
          <text>个性化解读 ✨</text>
        </view>
      </view>

      <!-- 含义内容 -->
      <view class="detail-content">
        <!-- 个性化解读 -->
        <view v-if="activeTab === 'deep' && deepMeaning" class="detail-meaning detail-deep-meaning">
          <text class="detail-meaning-label">✨ 个性化解读</text>
          <text class="detail-meaning-text">{{ deepMeaning }}</text>
        </view>

        <template v-else>
          <view class="detail-meaning">
            <text class="detail-meaning-label">
              {{ activeTab === 'upright' ? '正位含义' : '逆位含义' }}
            </text>
            <text class="detail-meaning-text">
              {{ activeTab === 'upright' ? card.uprightMeaning : card.reversedMeaning }}
            </text>
          </view>

          <view class="detail-desc">
            <text class="detail-meaning-label">牌面描述</text>
            <text class="detail-meaning-text">{{ card.description }}</text>
          </view>
        </template>
      </view>
    </view>
  </view>
</template>

<style lang="scss" scoped>
.card-detail-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: rgba(0, 0, 0, 0.75);
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  animation: overlayIn 0.25s ease;
}

@keyframes overlayIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.card-detail-popup {
  width: 620rpx;
  max-height: 85vh;
  background: $bg-secondary;
  border-radius: $radius-lg;
  padding: 40rpx 36rpx 36rpx;
  overflow-y: auto;
  position: relative;
  animation: popupIn 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 16rpx 48rpx rgba(0, 0, 0, 0.6);
  border: 1rpx solid rgba($accent-gold, 0.15);
}

@keyframes popupIn {
  from {
    opacity: 0;
    transform: scale(0.9) translateY(20rpx);
  }
  to {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}

.close-btn {
  position: absolute;
  top: 24rpx;
  right: 24rpx;
  width: 56rpx;
  height: 56rpx;
  border-radius: 50%;
  background: rgba(255,255,255,0.08);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10;

  text {
    font-size: 28rpx;
    color: $text-muted;
  }
}

// 牌面大图
.detail-image-wrap {
  width: 100%;
  height: 380rpx;
  background: rgba(0,0,0,0.25);
  border-radius: $radius-md;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 28rpx;
  position: relative;
  overflow: hidden;

  &.reversed {
    transform: rotate(180deg);
  }

  // 不同花色/类型背景
  &.card-face-major {
    background: linear-gradient(135deg, #3a1c61, #1a0a3e);
    border: 2rpx solid rgba($accent-gold, 0.2);
  }
  &.card-face-wands {
    background: linear-gradient(135deg, #6b3a1f, #2e1508);
    border: 2rpx solid rgba(#e67e22, 0.2);
  }
  &.card-face-cups {
    background: linear-gradient(135deg, #1e4d7b, #0a1a3a);
    border: 2rpx solid rgba(#3498db, 0.2);
  }
  &.card-face-swords {
    background: linear-gradient(135deg, #4a5568, #1a202c);
    border: 2rpx solid rgba(#a0aec0, 0.2);
  }
  &.card-face-pentacles {
    background: linear-gradient(135deg, #1e5c3a, #0a1f12);
    border: 2rpx solid rgba(#2ecc71, 0.2);
  }
}

.detail-image {
  width: 100%;
  height: 100%;
  position: absolute;
  opacity: 0;
  transition: opacity 0.3s ease;

  &.loaded {
    opacity: 1;
  }
}

.detail-image-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12rpx;
}

.detail-placeholder-icon {
  font-size: 100rpx;
  opacity: 0.5;
  font-family: Georgia, 'Times New Roman', serif;
  font-weight: bold;
  color: rgba($accent-gold, 0.6);
}

.detail-placeholder-name {
  font-size: 26rpx;
  color: $text-muted;
}

// 牌名
.detail-header {
  text-align: center;
  margin-bottom: 20rpx;
}

.detail-name {
  font-size: 40rpx;
  font-weight: bold;
  color: $text-primary;
  display: block;
}

.detail-name-en {
  font-size: 26rpx;
  color: $text-muted;
  display: block;
  margin-top: 6rpx;
}

// 标签
.detail-tags {
  display: flex;
  justify-content: center;
  gap: 16rpx;
  margin-bottom: 20rpx;
}

.detail-type-tag {
  font-size: 22rpx;
  color: $accent-blue;
  background: rgba($accent-blue, 0.12);
  padding: 6rpx 18rpx;
  border-radius: 20rpx;
}

.detail-number-tag {
  font-size: 22rpx;
  color: $accent-gold;
  background: rgba($accent-gold, 0.12);
  padding: 6rpx 18rpx;
  border-radius: 20rpx;
}

// 关键词
.detail-keywords {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 12rpx;
  margin-bottom: 28rpx;
}

.detail-keyword-tag {
  font-size: 22rpx;
  color: $accent-gold;
  background: rgba($accent-gold, 0.1);
  padding: 6rpx 18rpx;
  border-radius: 20rpx;
}

// Tab 切换
.detail-tabs {
  display: flex;
  border-radius: $radius-sm;
  overflow: hidden;
  background: rgba(0,0,0,0.2);
  margin-bottom: 24rpx;

  &.has-deep .detail-tab {
    font-size: 24rpx;
    padding: 18rpx 0;
  }
}

.detail-tab {
  flex: 1;
  text-align: center;
  padding: 20rpx 0;
  font-size: 28rpx;
  color: $text-muted;
  transition: all $transition-fast;

  &.active {
    color: $text-primary;
    font-weight: 600;
    background: rgba($accent-gold, 0.1);
    box-shadow: inset 0 -4rpx 0 $accent-gold;
  }

  &.tab-deep.active {
    background: rgba(139, 92, 246, 0.1);
    box-shadow: inset 0 -4rpx 0 #8b5cf6;
  }
}

// 深度解读样式
.detail-deep-meaning {
  border-left-color: #8b5cf6;
}

// 含义内容
.detail-content {
  display: flex;
  flex-direction: column;
  gap: 20rpx;
}

.detail-meaning, .detail-desc {
  padding: 24rpx;
  background: rgba(0,0,0,0.15);
  border-radius: $radius-sm;
  border-left: 4rpx solid $accent-gold;
}

.detail-desc {
  border-left-color: $accent-purple;
}

.detail-meaning-label {
  font-size: 26rpx;
  color: $accent-gold;
  font-weight: 600;
  display: block;
  margin-bottom: 12rpx;
}

.detail-meaning-text {
  font-size: 26rpx;
  color: $text-secondary;
  line-height: 1.8;
}
</style>
