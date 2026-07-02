<script setup lang="ts">
import { computed } from 'vue'
import { useCardStore } from '@/store'
import { navTo } from '@/utils'
import TabBar from '@/components/TabBar/TabBar.vue'

const store = useCardStore()
const records = computed(() => store.records)

// ========== tabBar & 记录管理 ==========

const tabList = [
  { pagePath: 'pages/index/index', text: '首页' },
  { pagePath: 'pages/draw/draw', text: '抽牌' },
  { pagePath: 'pages/cards/cards', text: '牌库' },
  { pagePath: 'pages/profile/profile', text: '我的' },
]

function handleTabChange(path: string) {
  uni.switchTab({ url: '/' + path })
}

function handleDelete(id: string) {
  uni.showModal({
    title: '确认删除',
    content: '确定要删除这条记录吗？',
    success: (res) => {
      if (res.confirm) {
        store.deleteRecord(id)
        uni.showToast({ title: '已删除', icon: 'success' })
      }
    },
  })
}

function handleClearAll() {
  if (records.value.length === 0) return
  uni.showModal({
    title: '确认清空',
    content: '确定要清空所有抽牌记录吗？此操作不可撤销。',
    success: (res) => {
      if (res.confirm) {
        store.clearAllRecords()
        uni.showToast({ title: '已清空', icon: 'success' })
      }
    },
  })
}

function handleViewDetail(id: string) {
  navTo(`/pages/result/result?id=${id}`)
}

function getOrientationLabel(ori: string): string {
  return ori === 'upright' ? '正位' : '逆位'
}
</script>

<template>
  <view class="page-container history-page">
    <!-- ========== 记录列表 ========== -->
    <!-- 顶部操作栏 -->
    <view v-if="records.length > 0" class="history-header">
      <text class="header-count">共 {{ records.length }} 条记录</text>
      <text class="header-clear" @click="handleClearAll">清空全部</text>
    </view>

    <!-- 记录列表 -->
    <view class="records-list">
      <view
        v-for="record in records"
        :key="record.id"
        class="record-item"
        @click="handleViewDetail(record.id)"
      >
        <view class="record-header">
          <text class="record-spread">{{ record.spreadName }}</text>
          <text class="record-date">{{ record.date }}</text>
        </view>

        <view v-if="record.question" class="record-question">
          <text class="rq-label">问：</text>
          <text class="rq-text">{{ record.question }}</text>
        </view>

        <view class="record-cards-preview">
          <view
            v-for="(dc, i) in record.cards"
            :key="i"
            class="rcp-item"
          >
            <text class="rcp-name">{{ dc.card.name }}</text>
            <text
              class="rcp-ori"
              :class="dc.orientation"
            >
              {{ getOrientationLabel(dc.orientation) }}
            </text>
          </view>
        </view>

        <view class="record-delete" @click.stop="handleDelete(record.id)">
          <text>删除</text>
        </view>
      </view>
    </view>

    <!-- 空状态 -->
    <view v-if="records.length === 0" class="empty-state">
      <text class="empty-icon">📜</text>
      <text class="empty-title">暂无抽牌记录</text>
      <text class="empty-desc">开始你的第一次抽牌吧</text>
      <view class="btn-primary empty-btn" @click="navTo('/pages/draw/draw')">
        <text>去抽牌</text>
      </view>
    </view>

    <!-- 自定义底部导航 -->
    <TabBar :current-path="'pages/history/history'" :tabs="tabList" @tab-change="handleTabChange" />
  </view>
</template>

<style lang="scss" scoped>
.history-page {
  padding: 24rpx;
  padding-bottom: 40rpx;
}

// ========== 记录列表 ==========
.history-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24rpx;
}

.header-count {
  font-size: 26rpx;
  color: $text-muted;
}

.header-clear {
  font-size: 26rpx;
  color: $danger;
  padding: 8rpx 16rpx;
}

.records-list {
  display: flex;
  flex-direction: column;
  gap: 20rpx;
}

.record-item {
  background: $bg-card;
  border-radius: $radius-md;
  padding: 28rpx;
  position: relative;
  transition: all $transition-fast;

  &:active {
    opacity: 0.8;
  }
}

.record-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12rpx;
}

.record-spread {
  font-size: 30rpx;
  font-weight: 600;
  color: $accent-gold;
}

.record-date {
  font-size: 24rpx;
  color: $text-muted;
}

.record-question {
  background: rgba(0,0,0,0.2);
  border-radius: $radius-sm;
  padding: 16rpx 20rpx;
  margin-bottom: 16rpx;
}

.rq-label {
  font-size: 24rpx;
  color: $text-muted;
}

.rq-text {
  font-size: 26rpx;
  color: $text-secondary;
}

.record-cards-preview {
  display: flex;
  flex-wrap: wrap;
  gap: 12rpx;
}

.rcp-item {
  display: flex;
  align-items: center;
  gap: 8rpx;
  background: rgba(0,0,0,0.2);
  border-radius: 20rpx;
  padding: 8rpx 20rpx;
}

.rcp-name {
  font-size: 24rpx;
  color: $text-primary;
}

.rcp-ori {
  font-size: 20rpx;

  &.upright {
    color: $upright-color;
  }

  &.reversed {
    color: $reversed-color;
  }
}

.record-delete {
  position: absolute;
  right: 20rpx;
  bottom: 20rpx;
  padding: 6rpx 20rpx;

  text {
    font-size: 24rpx;
    color: $danger;
    opacity: 0.6;
  }
}

// 空状态
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding-top: 180rpx;
}

.empty-icon {
  font-size: 100rpx;
  margin-bottom: 24rpx;
}

.empty-title {
  font-size: 32rpx;
  color: $text-secondary;
  margin-bottom: 12rpx;
}

.empty-desc {
  font-size: 26rpx;
  color: $text-muted;
  margin-bottom: 48rpx;
}

.empty-btn {
  width: 300rpx;
  height: 88rpx;
}
</style>
