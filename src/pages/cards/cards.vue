<script setup lang="ts">
import { ref, computed } from 'vue'
import { allCards, majorArcana, minorArcana } from '@/data/tarot-cards'
import type { TarotCard } from '@/types'
import TabBar from '@/components/TabBar/TabBar.vue'

type CardCategory = 'all' | 'major' | 'minor'

const activeCategory = ref<CardCategory>('all')
const searchText = ref('')

const tabList = [
  { pagePath: 'pages/index/index', text: '首页' },
  { pagePath: 'pages/draw/draw', text: '抽牌' },
  { pagePath: 'pages/cards/cards', text: '牌库' },
  { pagePath: 'pages/history/history', text: '记录' },
]

const filteredCards = computed<TarotCard[]>(() => {
  let cards = allCards

  if (activeCategory.value === 'major') {
    cards = majorArcana
  } else if (activeCategory.value === 'minor') {
    cards = minorArcana
  }

  if (searchText.value.trim()) {
    const kw = searchText.value.trim().toLowerCase()
    cards = cards.filter(
      (c) =>
        c.name.toLowerCase().includes(kw) ||
        c.nameEn.toLowerCase().includes(kw) ||
        c.keywords.some((k) => k.toLowerCase().includes(kw)),
    )
  }

  return cards
})

function getSuitLabel(type: string): string {
  const map: Record<string, string> = {
    major: '大阿卡纳',
    wands: '权杖',
    cups: '圣杯',
    swords: '宝剑',
    pentacles: '星币',
  }
  return map[type] || type
}

function handleTabChange(path: string) {
  uni.switchTab({ url: '/' + path })
}
</script>

<template>
  <view class="page-container cards-page">
    <!-- 搜索栏 -->
    <view class="search-bar">
      <input
        v-model="searchText"
        class="search-input"
        placeholder="搜索牌名、关键词..."
        placeholder-style="color: #6b5e53"
      />
    </view>

    <!-- 分类筛选 -->
    <view class="category-tabs">
      <view
        v-for="cat in (['all', 'major', 'minor'] as CardCategory[])"
        :key="cat"
        class="tab-item"
        :class="{ active: activeCategory === cat }"
        @click="activeCategory = cat"
      >
        <text>{{ cat === 'all' ? '全部' : cat === 'major' ? '大阿卡纳' : '小阿卡纳' }}</text>
      </view>
    </view>

    <!-- 牌列表 -->
    <view class="cards-grid">
      <view
        v-for="card in filteredCards"
        :key="card.id"
        class="card-item"
      >
        <view class="card-image-box">
          <image
            class="card-thumb"
            :src="card.image"
            mode="aspectFit"
          />
          <view class="card-thumb-placeholder">
            <text class="placeholder-num">{{ card.type === 'major' ? card.number : '✦' }}</text>
          </view>
        </view>
        <view class="card-meta">
          <text class="card-name">{{ card.name }}</text>
          <text class="card-suit">{{ getSuitLabel(card.type) }}</text>
        </view>
      </view>
    </view>

    <!-- 空结果 -->
    <view v-if="filteredCards.length === 0" class="empty-state">
      <text class="empty-icon">🔍</text>
      <text class="empty-text">未找到匹配的牌</text>
    </view>

    <!-- 自定义底部导航 -->
    <TabBar :current-path="'pages/cards/cards'" :tabs="tabList" @change="handleTabChange" />
  </view>
</template>

<style lang="scss" scoped>
.cards-page {
  padding: 24rpx;
  padding-bottom: 40rpx;
}

// 搜索
.search-bar {
  margin-bottom: 20rpx;
}

.search-input {
  width: 100%;
  height: 72rpx;
  background: $bg-card;
  border-radius: 36rpx;
  padding: 0 36rpx;
  font-size: 28rpx;
  color: $text-primary;
}

// 分类
.category-tabs {
  display: flex;
  gap: 16rpx;
  margin-bottom: 28rpx;
}

.tab-item {
  padding: 12rpx 32rpx;
  border-radius: 32rpx;
  font-size: 26rpx;
  color: $text-secondary;
  background: $bg-card;
  transition: all $transition-fast;

  &.active {
    background: $accent-gold;
    color: $bg-primary;
    font-weight: 600;
  }
}

// 牌网格
.cards-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16rpx;
}

.card-item {
  background: $bg-card;
  border-radius: $radius-md;
  overflow: hidden;
  padding: 16rpx;
}

.card-image-box {
  width: 100%;
  aspect-ratio: 2/3;
  background: rgba(0,0,0,0.2);
  border-radius: $radius-sm;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 12rpx;
  position: relative;
}

.card-thumb {
  width: 100%;
  height: 100%;
  position: absolute;
}

.card-thumb-placeholder {
  position: absolute;
}

.placeholder-num {
  font-size: 48rpx;
  color: rgba($accent-gold, 0.3);
  font-weight: bold;
}

.card-meta {
  text-align: center;
}

.card-name {
  font-size: 24rpx;
  color: $text-primary;
  display: block;
}

.card-suit {
  font-size: 20rpx;
  color: $text-muted;
}

// 空
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding-top: 120rpx;
}

.empty-icon {
  font-size: 80rpx;
  margin-bottom: 16rpx;
}

.empty-text {
  font-size: 28rpx;
  color: $text-muted;
}
</style>
