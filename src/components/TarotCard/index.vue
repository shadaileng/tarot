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

const cardSize = computed(() => {
  const map = { sm: { w: 120, h: 180 }, md: { w: 180, h: 270 }, lg: { w: 240, h: 360 } }
  return map[props.size]
})

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
    <view v-else class="card-front-face">
      <image
        class="card-image"
        :src="card.image"
        mode="aspectFill"
      />
      <view class="card-placeholder">
        <text class="card-number">{{ card.type === 'major' ? card.number : '✦' }}</text>
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
}

.card-image {
  width: 100%;
  height: 100%;
  position: absolute;
  top: 0;
  left: 0;
}

.card-placeholder {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
}

.card-number {
  font-size: 80rpx;
  font-weight: bold;
  color: rgba($accent-gold, 0.2);
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
