<script setup lang="ts">
interface TabItem {
  pagePath: string
  text: string
}

const props = defineProps<{
  currentPath: string
  tabs: TabItem[]
}>()

const emit = defineEmits<{
  (e: 'change', path: string): void
}>()

const activeColor = '#c9a96e'
const inactiveColor = '#6b5e53'

const iconFiles: Record<string, { normal: string; active: string }> = {
  'pages/index/index': {
    normal: '/static/icons/home.png',
    active: '/static/icons/home-active.png',
  },
  'pages/draw/draw': {
    normal: '/static/icons/draw.png',
    active: '/static/icons/draw-active.png',
  },
  'pages/cards/cards': {
    normal: '/static/icons/cards.png',
    active: '/static/icons/cards-active.png',
  },
  'pages/history/history': {
    normal: '/static/icons/history.png',
    active: '/static/icons/history-active.png',
  },
}

function getIconSrc(pagePath: string): string {
  const isActive = props.currentPath === pagePath
  const icons = iconFiles[pagePath]
  return icons ? (isActive ? icons.active : icons.normal) : ''
}
</script>

<template>
  <view class="tab-bar">
    <view
      v-for="tab in tabs"
      :key="tab.pagePath"
      class="tab-bar-item"
      :class="{ active: currentPath === tab.pagePath }"
      @click="emit('change', tab.pagePath)"
    >
      <image
        class="tab-bar-icon"
        :src="getIconSrc(tab.pagePath)"
        mode="aspectFit"
      />
      <text
        class="tab-bar-text"
        :style="{ color: currentPath === tab.pagePath ? activeColor : inactiveColor }"
      >
        {{ tab.text }}
      </text>
    </view>
  </view>
</template>

<style lang="scss" scoped>
.tab-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: space-around;
  height: 100rpx;
  padding-bottom: env(safe-area-inset-bottom);
  background: #1a1a2e;
  border-top: 1rpx solid rgba(201, 169, 110, 0.15);
  backdrop-filter: blur(20rpx);
}

.tab-bar-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4rpx;
  padding: 8rpx 0;
  transition: all 0.2s ease;

  &:active {
    opacity: 0.7;
    transform: scale(0.95);
  }

  &.active {
    .tab-bar-icon {
      filter: drop-shadow(0 0 8rpx rgba(201, 169, 110, 0.4));
    }
  }
}

.tab-bar-icon {
  width: 44rpx;
  height: 44rpx;
  transition: all 0.25s ease;
}

.tab-bar-text {
  font-size: 20rpx;
  font-weight: 500;
  transition: color 0.25s ease;
}
</style>
