<template>
  <scroll-view
    class="virtual-list"
    scroll-y
    @scroll="handleScroll"
  >
    <view class="virtual-list-phantom" :style="{ height: phantomHeight + 'px' }" />
    <view class="virtual-list-content" :style="{ transform: `translateY(${offsetY}px)` }">
      <view
        v-for="item in visibleItems"
        :key="item.id"
        class="virtual-list-item"
        :style="{ height: itemHeight + 'px' }"
      >
        <slot name="item" :item="item" />
      </view>
    </view>
  </scroll-view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'

const props = defineProps<{
  items: any[]
  itemHeight: number
  buffer?: number
}>()

const scrollTop = ref(0)
const containerHeight = ref(600)

const phantomHeight = computed(() => props.items.length * props.itemHeight)

const visibleRange = computed(() => {
  const buffer = props.buffer || 5
  const start = Math.floor(scrollTop.value / props.itemHeight) - buffer
  const end = Math.ceil((scrollTop.value + containerHeight.value) / props.itemHeight) + buffer
  return {
    start: Math.max(0, start),
    end: Math.min(props.items.length, end),
  }
})

const visibleItems = computed(() =>
  props.items.slice(visibleRange.value.start, visibleRange.value.end)
)

const offsetY = computed(() => visibleRange.value.start * props.itemHeight)

function handleScroll(e: any) {
  scrollTop.value = e.detail.scrollTop
}

onMounted(() => {
  const query = uni.createSelectorQuery()
  query.select('.virtual-list').boundingClientRect((rect) => {
    if (rect) {
      containerHeight.value = rect.height
    }
  }).exec()
})
</script>

<style lang="scss" scoped>
.virtual-list {
  position: relative;
  overflow-y: auto;
  height: 100%;
}

.virtual-list-phantom {
  pointer-events: none;
}

.virtual-list-content {
  position: absolute;
  left: 0;
  right: 0;
  top: 0;
}

.virtual-list-item {
  box-sizing: border-box;
}
</style>
