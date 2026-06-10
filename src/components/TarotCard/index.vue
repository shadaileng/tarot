<script setup lang="ts">
import { ref, computed } from 'vue'
import type { TarotCard, CardOrientation } from '@/types'

const props = withDefaults(
  defineProps<{
    card: TarotCard
    orientation?: CardOrientation
    flipped?: boolean
    showPosition?: string
    size?: 'sm' | 'md' | 'lg'
  }>(),
  {
    orientation: 'upright',
    flipped: true,
    size: 'md',
  },
)

const emit = defineEmits<{
  click: []
  flip: []
}>()

const isFlipped = ref(props.flipped)
const imgLoaded = ref(false)

const cardSize = computed(() => {
  const map = { sm: { w: 120, h: 180 }, md: { w: 180, h: 270 }, lg: { w: 240, h: 360 } }
  return map[props.size]
})

function getSuitSymbol(suit: string): string {
  const map: Record<string, string> = {
    wands: '🪄',
    cups: '🏆',
    swords: '⚔️',
    pentacles: '🪙',
  }
  return map[suit] || '✦'
}

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

function handleClick() {
  if (!isFlipped.value) {
    isFlipped.value = true
    emit('flip')
  }
  emit('click')
}
</script>

<template>
  <view
    class="tarot-card"
    :class="[`size-${size}`, { flipped: isFlipped, reversed: orientation === 'reversed' }]"
    :style="{ width: `${cardSize.w}rpx`, height: `${cardSize.h}rpx` }"
    @click="handleClick"
  >
    <!-- 牌背 -->
    <view v-if="!isFlipped" class="card-back-face">
      <view class="back-pattern">
        <text class="back-icon">★</text>
        <text class="back-moon">☽</text>
      </view>
    </view>

    <!-- 牌面 -->
    <view v-else class="card-front-face" :class="['card-face-' + getSuitColor(card.type)]">
      <image
        class="card-image"
        :class="{ loaded: imgLoaded }"
        :src="card.image"
        mode="aspectFill"
        @load="onImgLoad"
        @error="onImgError"
      />
      <view class="card-placeholder" v-if="!imgLoaded">
        <text v-if="card.type === 'major'" class="card-number">{{ ['0','I','II','III','IV','V','VI','VII','VIII','IX','X','XI','XII','XIII','XIV','XV','XVI','XVII','XVIII','XIX','XX','XXI'][card.number] }}</text>
        <text v-else class="card-number">{{ getSuitSymbol(card.type) }}</text>
        <text class="card-suit-label">{{ card.type === 'major' ? '★' : card.name.slice(-1) }}</text>
      </view>
      <text class="card-label">{{ card.name }}</text>
    </view>

    <!-- 位置标签 -->
    <text v-if="showPosition" class="position-label">{{ showPosition }}</text>
  </view>
</template>

<style lang="scss" scoped>
.tarot-card {
  position: relative;
  border-radius: $radius-sm;
  overflow: hidden;
  box-shadow: $shadow-md;
  transition: transform $transition-fast, box-shadow $transition-fast;
  cursor: pointer;

  &:active {
    transform: scale(0.96);
  }

  &.reversed .card-front-face {
    transform: rotate(180deg);
  }
}

// 牌背
.card-back-face {
  width: 100%;
  height: 100%;
  background: linear-gradient(135deg, $card-back-color, #3d2b6b);
  border: 2rpx solid rgba($accent-gold, 0.3);
  border-radius: $radius-sm;
  display: flex;
  align-items: center;
  justify-content: center;
}

.back-pattern {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12rpx;
}

.back-icon {
  font-size: 64rpx;
  color: rgba($accent-gold, 0.4);
}

.back-moon {
  font-size: 36rpx;
  color: rgba($accent-gold, 0.2);
}

// 牌面
.card-front-face {
  width: 100%;
  height: 100%;
  background: $bg-card;
  border-radius: $radius-sm;
  display: flex;
  flex-direction: column;
  position: relative;
  transition: transform $transition-normal;
  overflow: hidden;

  // 不同花色/类型背景
  &.card-face-major {
    background: linear-gradient(135deg, #3a1c61, #1a0a3e);
    border: 2rpx solid rgba($accent-gold, 0.25);
  }
  &.card-face-wands {
    background: linear-gradient(135deg, #6b3a1f, #2e1508);
    border: 2rpx solid rgba(#e67e22, 0.25);
  }
  &.card-face-cups {
    background: linear-gradient(135deg, #1e4d7b, #0a1a3a);
    border: 2rpx solid rgba(#3498db, 0.25);
  }
  &.card-face-swords {
    background: linear-gradient(135deg, #4a5568, #1a202c);
    border: 2rpx solid rgba(#a0aec0, 0.25);
  }
  &.card-face-pentacles {
    background: linear-gradient(135deg, #1e5c3a, #0a1f12);
    border: 2rpx solid rgba(#2ecc71, 0.25);
  }
}

.card-image {
  width: 100%;
  height: 100%;
  position: absolute;
  top: 0;
  left: 0;
  opacity: 0;
  transition: opacity 0.3s ease;

  &.loaded {
    opacity: 1;
  }
}

.card-placeholder {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  position: relative;
  gap: 4rpx;
}

.card-number {
  font-size: 80rpx;
  font-weight: bold;
  color: rgba($accent-gold, 0.5);
  font-family: Georgia, 'Times New Roman', serif;
}

.card-suit-label {
  font-size: 32rpx;
  color: rgba($text-primary, 0.35);
}

.card-label {
  text-align: center;
  font-size: 24rpx;
  color: $text-secondary;
  padding: 8rpx;
  background: rgba(0,0,0,0.3);
  position: relative;
}

// 位置标签
.position-label {
  position: absolute;
  bottom: -36rpx;
  left: 50%;
  transform: translateX(-50%);
  font-size: 22rpx;
  color: $accent-gold;
  white-space: nowrap;
}

// 尺寸
.size-sm {
  .card-label { font-size: 20rpx; }
  .back-icon { font-size: 40rpx; }
  .card-number { font-size: 48rpx; }
}

.size-lg {
  .card-label { font-size: 28rpx; padding: 12rpx; }
  .back-icon { font-size: 88rpx; }
  .card-number { font-size: 100rpx; }
}
</style>
