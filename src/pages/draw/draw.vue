<script setup lang="ts">
import { ref, computed } from 'vue'
import type { SpreadType, DrawnCard } from '@/types'
import { spreadList, getSpread } from '@/data/spreads'
import { useCardStore } from '@/store'
import { navTo } from '@/utils'
import { onShow } from '@dcloudio/uni-app'
import { isLoggedIn } from '@/services/auth'
import TabBar from '@/components/TabBar/TabBar.vue'

const store = useCardStore()
const selectedSpread = ref<SpreadType>('single')
const question = ref('')
const useOnlineReading = ref(isLoggedIn())

const currentSpread = computed(() => getSpread(selectedSpread.value))

// ========== 动画状态机 ==========
type AnimPhase = 'idle' | 'deal' | 'dealt'
const animPhase = ref<AnimPhase>('idle')

const cardCount = computed(() => currentSpread.value?.positions.length ?? 1)

/** 抽到的牌数据（动画期间使用） */
const drawnCards = ref<DrawnCard[]>([])

/** 牌型位槽布局信息 */
interface SlotLayout {
  x: number
  y: number
  angle: number
  scale: number
}

/** 根据牌型类型计算各槽位的目标布局（rpx） */
function getSlotLayouts(spreadType: SpreadType): SlotLayout[] {
  switch (spreadType) {
    case 'single':
      return [
        { x: 0, y: 0, angle: 0, scale: 1 },
      ]
    case 'three':
      return [
        { x: -90, y: 0, angle: -4, scale: 0.95 },
        { x: 0, y: -20, angle: 0, scale: 1.05 },
        { x: 90, y: 0, angle: 4, scale: 0.95 },
      ]
    case 'celtic-cross':
      // 归一化坐标：5×3 矩阵中的 (row, col)，与结果页 CSS Grid 参数一致
      // 列宽=180+12gap=192rpx, 行高=240+16gap=256rpx, 以矩阵中心(row=3,col=2)为原点
      // 公式：x = (col - 2) × 192,  y = (row - 3) × 256
      // 只需修改此映射即可调整所有牌位，无需逐个改坐标
      return CELTIC_CROSS_GRID.map((pos, i) => ({
        x: (pos.col - 2) * 192,
        y: (pos.row - 3) * 256,
        angle: pos.col === 2 ? 0 : (pos.col === 1 ? -1 : 1),
        scale: pos.row <= 2 ? 1 : (pos.row >= 5 ? 0.92 : 0.95),
      }))
    default:
      return Array.from({ length: cardCount.value }, () => ({ x: 0, y: 0, angle: 0, scale: 1 }))
  }
}

/** 当前牌型的槽位布局 */
const slotLayouts = computed(() => getSlotLayouts(selectedSpread.value))

/** 已落地的牌索引列表（控制 CSS transition 触发） */
const landedCards = ref<number[]>([])
/** 牌初始处于底部状态（CSS transition 从底部飞入） */
const cardsFlyIn = ref(false)

/** 牌是否全部落地 */
const allCardsLanded = computed(() => landedCards.value.length >= cardCount.value)

// ========== 页面显示时复位 ==========
onShow(() => {
  if (animPhase.value !== 'idle') {
    animPhase.value = 'idle'
    landedCards.value = []
    cardsFlyIn.value = false
  }
})

/** 凯尔特十字在 5×3 矩阵中的归一化坐标（行、列，从 1 开始） */
const CELTIC_CROSS_GRID = [
  { row: 2, col: 2 },  // 0: 现状（中心格）
  { row: 2, col: 2 },  // 1: 挑战（中心格重叠，模板中旋转 90°）
  { row: 2, col: 1 },  // 2: 过去
  { row: 2, col: 3 },  // 3: 未来
  { row: 1, col: 2 },  // 4: 上方 / 目标
  { row: 3, col: 2 },  // 5: 下方 / 基础
  { row: 4, col: 2 },  // 6: 建议
  { row: 5, col: 1 },  // 7: 外界影响
  { row: 5, col: 2 },  // 8: 希望与恐惧
  { row: 5, col: 3 },  // 9: 最终结果
]

const tabList = [
  { pagePath: 'pages/index/index', text: '首页' },
  { pagePath: 'pages/draw/draw', text: '抽牌' },
  { pagePath: 'pages/cards/cards', text: '牌库' },
  { pagePath: 'pages/profile/profile', text: '我的' },
]

function handleDraw() {
  if (animPhase.value !== 'idle') return

  // 触觉反馈
  // #ifdef MP-WEIXIN
  wx.vibrateShort({ type: 'medium' })
  // #endif

  // 抽牌（数据层面）
  store.drawCards(selectedSpread.value, question.value, useOnlineReading.value)
  drawnCards.value = store.currentReading?.cards ?? []

  // 进入发牌阶段：所有槽位初始在底部
  animPhase.value = 'deal'
  landedCards.value = []
  cardsFlyIn.value = false

  // 逐张延迟飞入（CSS transition 驱动）
  const totalCards = cardCount.value
  for (let i = 0; i < totalCards; i++) {
    setTimeout(() => {
      landedCards.value.push(i)
      // 最后一张牌落地后进入 dealt 状态
      if (landedCards.value.length >= totalCards) {
        setTimeout(() => {
          cardsFlyIn.value = true
          animPhase.value = 'dealt'
        }, 400) // 等待最后一张牌的 CSS transition 完成
      }
    }, i * 150) // 每张间隔 150ms
  }
}

/** 点击翻牌 → 跳转结果页 */
function handleFlipAll() {
  if (animPhase.value !== 'dealt') return
  navTo('/pages/result/result')
}

function handleTabChange(path: string) {
  uni.switchTab({ url: '/' + path })
}
</script>

<template>
  <view class="page-container draw-page">
    <!-- ========== 动画遮罩层 ========== -->
    <view v-if="animPhase !== 'idle'" class="anim-overlay">
      <!-- 星空粒子背景 -->
      <view class="starfield">
        <view
          v-for="i in 25"
          :key="i"
          class="star-particle"
          :style="{
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            animationDelay: `${Math.random() * 3}s`,
            animationDuration: `${1.5 + Math.random() * 2}s`,
            opacity: 0.3 + Math.random() * 0.7,
            width: `${2 + Math.random() * 4}rpx`,
            height: `${2 + Math.random() * 4}rpx`,
          }"
        />
      </view>

      <!-- ========== 发牌阶段 ========== -->
      <view v-if="animPhase === 'deal' || animPhase === 'dealt'" class="anim-deal">
        <text class="deal-title">
          {{ animPhase === 'dealt' ? '命运之轮已揭示答案' : '命运之轮正在转动...' }}
        </text>

        <!-- 牌型槽位（CSS transition 驱动从底部飞入） -->
        <view class="deal-slots" :class="[`slots-${currentSpread?.type}`]">
          <view
            v-for="(pos, i) in currentSpread?.positions"
            :key="i"
            class="deal-slot"
            :class="{
              'fly-in': landedCards.includes(i),
              'slot-challenge': currentSpread?.type === 'celtic-cross' && i === 1,
            }"
            :style="{
              transform: landedCards.includes(i)
                ? `translate(${slotLayouts[i].x}rpx, ${slotLayouts[i].y}rpx)`
                : `translate(${slotLayouts[i].x}rpx, 400rpx) scale(0.3)`,
            }"
          >
            <view class="deal-card-placeholder" :style="currentSpread?.type === 'celtic-cross' && i === 1 ? { transform: 'rotate(90deg)' } : {}">
              <!-- 空槽：虚线框 + 发光点 -->
              <view v-if="!landedCards.includes(i)" class="deal-empty">
                <text class="deal-empty-glow">✦</text>
              </view>

              <!-- 已发牌：牌背展示 -->
              <view v-else class="deal-card-back">
                <view class="deal-card-inner">
                  <text class="deal-card-icon">★</text>
                  <text class="deal-card-moon">☽</text>
                </view>
                <!-- 落地光晕 -->
                <view class="deal-card-land-glow" />
              </view>
            </view>
            <text class="deal-pos-label">{{ pos }}</text>
          </view>
        </view>

        <!-- 翻牌按钮（所有牌落地后显示） -->
        <view v-if="animPhase === 'dealt'" class="flip-action">
          <view class="btn-primary btn-flip" @click="handleFlipAll">
            <text>🔮 点击翻牌</text>
          </view>
        </view>
      </view>
    </view>

    <!-- ========== 选择区域（动画时隐藏） ========== -->
    <template v-if="animPhase === 'idle'">
      <!-- 牌型选择 -->
      <view class="spread-select">
        <text class="section-title">选择牌型</text>
        <view class="spread-grid">
          <view
            v-for="spread in spreadList"
            :key="spread.type"
            class="spread-card"
            :class="{ active: selectedSpread === spread.type }"
            @click="selectedSpread = spread.type"
          >
            <text class="spread-card-name">{{ spread.name }}</text>
            <text class="spread-card-desc">{{ spread.positions.join(' · ') }}</text>
            <text class="spread-card-count">{{ spread.positions.length }} 张牌</text>
          </view>
        </view>
      </view>

      <!-- 问题 -->
      <view class="question-wrap">
        <view class="section-title-row">
          <text class="section-title">默想你的问题</text>
          <view class="online-toggle">
            <text class="online-toggle-label">深度解读</text>
            <switch
              :checked="useOnlineReading"
              color="#c9a96e"
              style="transform: scale(0.7);"
              @change="useOnlineReading = $event.detail.value"
            />
          </view>
        </view>
        <textarea
          v-model="question"
          class="question-textarea"
          placeholder="在心中默想你的问题，也可以写在这里..."
          placeholder-style="color: #6b5e53"
          maxlength="200"
          :auto-height="true"
        />
      </view>

      <!-- 牌型预览 -->
      <view class="spread-preview">
        <text class="section-title">牌型预览：{{ currentSpread?.name }}</text>
        <view class="preview-cards">
          <view
            v-for="(pos, i) in currentSpread?.positions"
            :key="i"
            class="preview-card-slot"
          >
            <view class="card-back-preview">
              <text class="card-back-star">★</text>
            </view>
            <text class="preview-pos">{{ pos }}</text>
          </view>
        </view>
      </view>

      <!-- 抽牌按钮 -->
      <view class="draw-action">
        <view class="btn-primary" @click="handleDraw">
          <text>🔮 开始抽牌</text>
        </view>
      </view>
    </template>

    <!-- 自定义底部导航 -->
    <TabBar :current-path="'pages/draw/draw'" :tabs="tabList" @change="handleTabChange" />
  </view>
</template>

<style lang="scss" scoped>
.draw-page {
  padding: 32rpx 32rpx 140rpx 32rpx;
  position: relative;
  min-height: 100vh;
}

.section-title {
  font-size: 30rpx;
  color: $text-secondary;
  display: block;
}

.section-title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20rpx;
}

.section-title-row .section-title {
  margin-bottom: 0;
}

.online-toggle {
  display: flex;
  align-items: center;
  gap: 8rpx;
}

.online-toggle-label {
  font-size: 22rpx;
  color: $accent-gold;
}

.spread-grid {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

.spread-card {
  background: $bg-card;
  border-radius: $radius-md;
  padding: 28rpx 32rpx;
  border: 2rpx solid transparent;
  transition: all $transition-fast;

  &.active {
    border-color: $accent-gold;
    background: rgba($accent-gold, 0.06);
  }
}

.spread-card-name {
  font-size: 32rpx;
  color: $text-primary;
  font-weight: 600;
}

.spread-card-desc {
  font-size: 24rpx;
  color: $text-muted;
  display: block;
  margin-top: 8rpx;
}

.spread-card-count {
  font-size: 22rpx;
  color: $accent-gold;
  display: block;
  margin-top: 6rpx;
}

.question-wrap {
  margin-top: 40rpx;
}

.question-textarea {
  width: 100%;
  min-height: 120rpx;
  background: $bg-card;
  border-radius: $radius-md;
  padding: 24rpx;
  font-size: 28rpx;
  color: $text-primary;
}

.spread-preview {
  margin-top: 40rpx;
}

.preview-cards {
  display: flex;
  flex-wrap: wrap;
  gap: 20rpx;
  justify-content: center;
}

.preview-card-slot {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12rpx;
}

.card-back-preview {
  width: 100rpx;
  height: 150rpx;
  background: linear-gradient(135deg, $card-back-color, #3d2b6b);
  border-radius: $radius-sm;
  border: 2rpx solid $card-border-color;
  display: flex;
  align-items: center;
  justify-content: center;
}

.card-back-star {
  font-size: 36rpx;
  color: $accent-gold;
  opacity: 0.5;
}

.preview-pos {
  font-size: 22rpx;
  color: $text-muted;
}

.draw-action {
  margin-top: 60rpx;
  padding-bottom: 40rpx;

  .btn-primary {
    width: 100%;
    height: 96rpx;
    font-size: 34rpx;
  }
}

// ==========================================
// 动画遮罩层
// ==========================================
.anim-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: $bg-primary;
  z-index: 100;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
  padding-bottom: 140rpx;
}

// 星空粒子
.starfield {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  pointer-events: none;
}

.star-particle {
  position: absolute;
  background: $accent-gold;
  border-radius: 50%;
  animation: starTwinkle 2s ease-in-out infinite alternate;
}

@keyframes starTwinkle {
  0% { opacity: 0.2; transform: scale(0.8); }
  100% { opacity: 1; transform: scale(1.2); }
}

// ==========================================
// 发牌阶段
// ==========================================
.anim-deal {
  min-height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 30rpx;
  z-index: 1;
  width: 100%;
  padding: 60rpx 32rpx;
  box-sizing: border-box;
}

.deal-title {
  font-size: 30rpx;
  color: $accent-gold;
  animation: textPulse 1.5s ease-in-out infinite;
  text-align: center;
}

@keyframes textPulse {
  0%, 100% { opacity: 0.6; }
  50% { opacity: 1; }
}

// -------- 牌型槽位容器 --------
.deal-slots {
  display: flex;
  gap: 24rpx;
  justify-content: center;
  flex-wrap: wrap;
  width: 100%;
  position: relative;

  &.slots-single {
    .deal-slot { flex: 1; min-width: 200rpx; max-width: 240rpx; }
  }
  &.slots-three {
    position: relative;
    width: 100%;
    height: 360rpx;
    flex-wrap: nowrap;
    justify-content: center;

    .deal-slot {
      position: absolute;
      left: 50%;
      top: 50%;
      margin-left: -70rpx;
      margin-top: -105rpx;
    }
  }
  &.slots-celtic-cross {
    // 5×3 矩阵布局，与结果页一致
    position: relative;
    width: 600rpx;
    height: 1400rpx;
    margin: 0 auto;
    flex-wrap: nowrap;
    justify-content: center;

    .deal-slot {
      position: absolute;
      // 以容器中心为原点定位
      left: 50%;
      top: 50%;
      margin-left: -75rpx;
      margin-top: -120rpx;
    }
  }
}

// -------- 单个槽位 --------
.deal-slot {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14rpx;
  transition: transform 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
  position: relative;

  &.fly-in .deal-card-back {
    border-color: rgba($accent-gold, 0.5);
    box-shadow: 0 0 24rpx rgba($accent-gold, 0.2);
  }
}

.deal-card-placeholder {
  width: 140rpx;
  height: 210rpx;
  position: relative;
}

.deal-empty {
  width: 100%;
  height: 100%;
  border: 2rpx dashed rgba($accent-gold, 0.15);
  border-radius: $radius-sm;
  display: flex;
  align-items: center;
  justify-content: center;
}

.deal-empty-glow {
  font-size: 40rpx;
  color: rgba($accent-gold, 0.2);
  animation: glowPulse 2s ease-in-out infinite;
}

@keyframes glowPulse {
  0%, 100% { opacity: 0.1; transform: scale(0.9); }
  50% { opacity: 0.4; transform: scale(1.1); }
}

// 已落地的牌背
.deal-card-back {
  width: 100%;
  height: 100%;
  background: linear-gradient(135deg, $card-back-color, #3d2b6b);
  border-radius: $radius-sm;
  border: 2rpx solid rgba($accent-gold, 0.3);
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  overflow: hidden;
  box-shadow: $shadow-md;
  animation: cardLand 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) both;
}

.deal-card-inner {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8rpx;
}

.deal-card-icon {
  font-size: 48rpx;
  color: rgba($accent-gold, 0.5);
}

.deal-card-moon {
  font-size: 28rpx;
  color: rgba($accent-gold, 0.3);
}

// 落地光晕
.deal-card-land-glow {
  position: absolute;
  inset: 0;
  border-radius: $radius-sm;
  background: radial-gradient(circle at center, rgba($accent-gold, 0.25) 0%, transparent 70%);
  animation: landGlow 0.6s ease-out both;
}

@keyframes landGlow {
  0% { opacity: 1; }
  100% { opacity: 0; }
}

@keyframes cardLand {
  0% {
    transform: scale(0.6) rotate(-10deg);
    opacity: 0;
  }
  60% {
    transform: scale(1.08) rotate(2deg);
    opacity: 1;
  }
  80% {
    transform: scale(0.95) rotate(-0.5deg);
  }
  100% {
    transform: scale(1) rotate(0);
    opacity: 1;
  }
}

.deal-pos-label {
  font-size: 22rpx;
  color: $text-muted;
  text-align: center;
  transition: color 0.4s ease;
}

.deal-slot.fly-in .deal-pos-label {
  color: $accent-gold;
}

// ==========================================
// 翻牌按钮
// ==========================================
.flip-action {
  margin-top: 40rpx;
  width: 100%;
  padding: 0 32rpx;
  box-sizing: border-box;
  animation: fadeInUp 0.5s ease both;
}

.btn-flip {
  width: 100%;
  height: 96rpx;
  font-size: 34rpx;
}

@keyframes fadeInUp {
  0% {
    opacity: 0;
    transform: translateY(30rpx);
  }
  100% {
    opacity: 1;
    transform: translateY(0);
  }
}


</style>
