<script setup lang="ts">
import { ref, computed, reactive } from 'vue'
import { allCards, majorArcana, minorArcana } from '@/data/cards'
import type { Card } from '@/types'
import TabBar from '@/components/TabBar/TabBar.vue'

type CardCategory = 'all' | 'major' | 'minor'

const activeCategory = ref<CardCategory>('all')
const searchText = ref('')

// 图片加载状态：card.id -> true 表示图片加载成功
const imgLoaded = reactive<Record<string, boolean>>({})

function onImgLoad(cardId: string) {
  imgLoaded[cardId] = true
}

function onImgError(cardId: string) {
  imgLoaded[cardId] = false
}

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

const tabList = [
  { pagePath: 'pages/index/index', text: '首页' },
  { pagePath: 'pages/draw/draw', text: '抽牌' },
  { pagePath: 'pages/cards/cards', text: '牌库' },
  { pagePath: 'pages/profile/profile', text: '我的' },
]

const filteredCards = computed<Card[]>(() => {
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
        <view class="card-image-box" :class="['card-face-' + getSuitColor(card.type)]">
          <image
            class="card-thumb"
            :class="{ loaded: imgLoaded[card.id] }"
            :src="card.image"
            mode="aspectFit"
            @load="onImgLoad(card.id)"
            @error="onImgError(card.id)"
          />
          <view class="card-thumb-placeholder" v-if="!imgLoaded[card.id]">
            <text v-if="card.type === 'major'" class="placeholder-roman">{{ ['0','I','II','III','IV','V','VI','VII','VIII','IX','X','XI','XII','XIII','XIV','XV','XVI','XVII','XVIII','XIX','XX','XXI'][card.number] }}</text>
            <text v-else class="placeholder-num">{{ card.name.slice(-1) }}</text>
            <text class="placeholder-suit">{{ card.type === 'major' ? '★' : getSuitSymbol(card.type) }}</text>
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
  border-radius: $radius-sm;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 12rpx;
  position: relative;
  overflow: hidden;

  // 不同花色/类型的背景渐变
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

.card-thumb {
  width: 100%;
  height: 100%;
  position: absolute;
  opacity: 0;
  transition: opacity 0.3s ease;

  &.loaded {
    opacity: 1;
  }
}

.card-thumb-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  position: absolute;
  width: 100%;
  height: 100%;
  gap: 6rpx;
}

.placeholder-roman {
  font-size: 40rpx;
  color: rgba($accent-gold, 0.7);
  font-weight: bold;
  font-family: Georgia, 'Times New Roman', serif;
  letter-spacing: 2rpx;
}

.placeholder-num {
  font-size: 44rpx;
  color: rgba(#e8d5b7, 0.5);
  font-weight: bold;
}

.placeholder-suit {
  font-size: 36rpx;
  opacity: 0.5;
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
