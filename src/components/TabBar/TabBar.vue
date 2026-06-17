<script setup lang="ts">
import { computed } from 'vue'

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

// SVG path 数据
const iconPaths: Record<string, { normal: string; active: string }> = {
  'pages/index/index': {
    normal: 'M12 3L4 9v12h6v-7h4v7h6V9l-8-6zm0 1.5l6.5 4.87V19h-3.5v-7H9v7H5.5V9.37L12 4.5z',
    active: 'M12 3L4 9v12h6v-7h4v7h6V9l-8-6z',
  },
  'pages/draw/draw': {
    normal: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-2-4h4v-2h-4v2zm0-4h4V7h-4v5z',
    active: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14h4v-2h-4v2zm0-4h4V7h-4v5z',
  },
  'pages/cards/cards': {
    normal: 'M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 14H4V6h16v12zM6 8h4v4H6V8zm6 0h4v2h-4V8zm0 4h4v2h-4v-2zm-6 0h4v4H6v-4z',
    active: 'M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zM6 8h4v4H6V8zm6 0h4v2h-4V8zm0 4h4v2h-4v-2zm-6 0h4v4H6v-4z',
  },
  'pages/history/history': {
    normal: 'M13 3a9 9 0 0 0-9 9H1l3.89 3.89.07.14L9 12H6c0-3.87 3.13-7 7-7s7 3.13 7 7-3.13 7-7 7c-1.93 0-3.68-.79-4.94-2.06l-1.42 1.42A8.954 8.954 0 0 0 13 21a9 9 0 0 0 0-18zm-1 5v5l4.28 2.54.72-1.21-3.5-2.08V8H12z',
    active: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14.5V11l-4.28-2.54.72-1.21L12 9.33l4.56 2.71-.72 1.21L12 11v5.5h-1z',
  },
}

const activeColor = '#c9a96e'
const inactiveColor = '#6b5e53'

/**
 * 将 SVG path d 和颜色拼成完整的 data URI，兼容微信小程序（不支持内联 svg/path 标签）
 */
function buildIconDataUri(pathD: string, color: string): string {
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'><path fill='${color}' d='${pathD}'/></svg>`
  return `data:image/svg+xml,${encodeURIComponent(svg)}`
}

const iconStyles = computed(() => {
  const styles: Record<string, { backgroundImage: string }> = {}
  for (const tab of props.tabs) {
    const isActive = props.currentPath === tab.pagePath
    const color = isActive ? activeColor : inactiveColor
    const pathD = isActive
      ? iconPaths[tab.pagePath]?.active || ''
      : iconPaths[tab.pagePath]?.normal || ''
    styles[tab.pagePath] = {
      backgroundImage: `url('${buildIconDataUri(pathD, color)}')`,
    }
  }
  return styles
})
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
      <view
        class="tab-bar-icon"
        :style="iconStyles[tab.pagePath] || {}"
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
  background-size: contain;
  background-repeat: no-repeat;
  background-position: center;
  transition: all 0.25s ease;
}

.tab-bar-text {
  font-size: 20rpx;
  font-weight: 500;
  transition: color 0.25s ease;
}
</style>
