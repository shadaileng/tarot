<template>
  <view class="card-spread">
    <view
      v-for="(position, index) in positions"
      :key="position.id"
      class="card-position"
      :style="getPositionStyle(position)"
      @tap="handleCardTap(index)"
    >
      <TarotCard
        v-if="cards[index]"
        :card="cards[index]"
        :revealed="revealedIndices.includes(index)"
        :label="position.label"
      />
      <view v-else class="empty-position">
        <text class="position-label">{{ position.label }}</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import TarotCard from '@/components/TarotCard/TarotCard.vue'
import { spreadConfigs } from './spreads'
import type { CardSpreadProps } from './types'

const props = withDefaults(defineProps<CardSpreadProps>(), {
  cards: () => [],
  revealedIndices: () => [],
})

const emit = defineEmits<{
  cardTap: [index: number]
}>()

const positions = computed(() => {
  return spreadConfigs[props.spreadType]?.positions || []
})

function getPositionStyle(position: { x: number; y: number; rotation: number }) {
  return {
    left: `${position.x}%`,
    top: `${position.y}%`,
    transform: `translate(-50%, -50%) rotate(${position.rotation}deg)`,
  }
}

function handleCardTap(index: number) {
  emit('cardTap', index)
}
</script>

<style lang="scss" scoped>
.card-spread {
  position: relative;
  width: 100%;
  height: 100%;
  min-height: 600rpx;
}

.card-position {
  position: absolute;
  width: 120rpx;
  height: 200rpx;
}

.empty-position {
  width: 100%;
  height: 100%;
  border: 2rpx dashed rgba(255, 255, 255, 0.3);
  border-radius: 8rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.position-label {
  font-size: 20rpx;
  color: rgba(255, 255, 255, 0.5);
}
</style>
