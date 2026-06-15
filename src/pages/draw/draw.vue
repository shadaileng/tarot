<script setup lang="ts">
import { ref, computed } from 'vue'
import type { SpreadType, DrawnCard } from '@/types'
import { spreadList, getSpread } from '@/data/spreads'
import { useTarotStore } from '@/store'
import { navTo } from '@/utils'
import TabBar from '@/components/TabBar/TabBar.vue'

const store = useTarotStore()
const selectedSpread = ref<SpreadType>('single')
const question = ref('')
const useAI = ref(true)

const currentSpread = computed(() => getSpread(selectedSpread.value))

// ========== 动画状态机 ==========
type AnimPhase = 'idle' | 'shuffle' | 'deal' | 'done'
const animPhase = ref<AnimPhase>('idle')
const shuffleCards = ref<number[]>([])  // 洗牌中的牌索引
const dealCards = ref<number[]>([])      // 已发牌到位置的索引
const dealComplete = ref(false)          // 发牌是否全部完成

const cardCount = computed(() => currentSpread.value?.positions.length ?? 1)

/** 抽到的牌数据（动画期间使用） */
const drawnCards = ref<DrawnCard[]>([])

/** 牌阵位槽布局信息 */
interface SlotLayout {
  x: number
  y: number
  angle: number
  scale: number
}

/** 根据牌阵类型计算各槽位的目标布局（rpx） */
function getSlotLayouts(spreadType: SpreadType): SlotLayout[] {
  switch (spreadType) {
    case 'single':
      return [
        { x: 0, y: 0, angle: 0, scale: 1 },
      ]
    case 'three':
      return [
        { x: -220, y: 0, angle: -4, scale: 0.95 },
        { x: 0, y: -30, angle: 0, scale: 1.05 },
        { x: 220, y: 0, angle: 4, scale: 0.95 },
      ]
    case 'celtic-cross':
      // 凯尔特十字：十字(6张) + 柱(4张) 布局
      return [
        // 十字核心
        { x: -180, y: -180, angle: -2, scale: 0.92 },   // 0: 现状
        { x: 180, y: -180, angle: 2, scale: 0.92 },      // 1: 挑战
        { x: -180, y: -30, angle: -1, scale: 0.95 },     // 2: 过去
        { x: 180, y: -30, angle: 1, scale: 0.95 },       // 3: 未来
        { x: 0, y: -300, angle: 0, scale: 0.92 },        // 4: 上方（目标）
        { x: 0, y: 0, angle: 0, scale: 1.0 },            // 5: 下方（基础）
        // 右侧柱
        { x: -180, y: 130, angle: 1, scale: 0.95 },      // 6: 建议
        { x: 180, y: 130, angle: -1, scale: 0.95 },      // 7: 外界影响
        { x: -180, y: 280, angle: 0, scale: 0.92 },      // 8: 希望与恐惧
        { x: 180, y: 280, angle: 0, scale: 0.92 },       // 9: 最终结果
      ]
    default:
      return Array.from({ length: cardCount.value }, () => ({ x: 0, y: 0, angle: 0, scale: 1 }))
  }
}

/** 当前牌阵的槽位布局 */
const slotLayouts = computed(() => getSlotLayouts(selectedSpread.value))

/** 牌堆中剩余的牌数（视觉递减） */
const deckRemaining = computed(() => {
  if (animPhase.value === 'shuffle') return shuffleCards.value.length
  if (animPhase.value === 'deal') return Math.max(0, cardCount.value - dealCards.value.length)
  return 0
})

/** 发牌时牌堆是否可见 */
const showDeck = computed(() => {
  return animPhase.value === 'shuffle' || (animPhase.value === 'deal' && deckRemaining.value > 0)
})

// ========== JS 帧驱动飞行动画 ==========

/** 每张飞行牌的状态 */
interface FlyingCardState {
  index: number       // 牌在牌阵中的索引
  progress: number    // 0 → 1 动画进度（已缓动）
  fromX: number       // 起点 X（牌堆中心 = 0）
  fromY: number       // 起点 Y（牌堆中心 = 0）
  toX: number         // 目标 X（槽位偏移 rpx）
  toY: number         // 目标 Y（槽位偏移 rpx）
  toAngle: number     // 目标旋转角度
  toScale: number     // 目标缩放
}

/** 当前飞行中的牌列表（支持多牌并行飞行） */
const flyingCards = ref<FlyingCardState[]>([])

/** 飞行中已到达目标的牌索引集合 */
const flyCompleted = ref<Set<number>>(new Set())

/**
 * 三次贝塞尔曲线求解器（简化 Newton-Raphson 法）
 * @param t - 原始时间进度 0~1
 * @param p1x, p1y - 控制点1
 * @param p2x, p2y - 控制点2
 * @returns 缓动后的 y 值 0~1
 */
function cubicBezier(t: number, p1x: number, p1y: number, p2x: number, p2y: number): number {
  // 使用采样查找表避免 Newton-Raphson 迭代
  // 精度：50 个采样点
  const samples: Array<{ t: number; x: number; y: number }> = []
  for (let i = 0; i <= 50; i++) {
    const st = i / 50
    const bx = 3 * (1 - st) * (1 - st) * st * p1x + 3 * (1 - st) * st * st * p2x + st * st * st
    const by = 3 * (1 - st) * (1 - st) * st * p1y + 3 * (1 - st) * st * st * p2y + st * st * st
    samples.push({ t: st, x: bx, y: by })
  }

  // 二分查找 x 值对应的 y
  let lo = 0, hi = 50
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1
    if (samples[mid].x < t) lo = mid
    else hi = mid
  }

  // 线性插值
  const loS = samples[lo], hiS = samples[hi]
  const ratio = hiS.x === loS.x ? 0 : (t - loS.x) / (hiS.x - loS.x)
  return loS.y + (hiS.y - loS.y) * ratio
}

/** 根据飞行状态计算内联 transform 样式 */
function getFlyingStyle(card: FlyingCardState) {
  const t = card.progress

  // 线性插值位置
  const x = card.fromX + (card.toX - card.fromX) * t
  const y = card.fromY + (card.toY - card.fromY) * t

  // 弧线偏移：抛物线 y = -4 * arcHeight * t * (1 - t)
  // 根据牌阵类型调整弧线高度
  const spreadType = selectedSpread.value
  let arcHeight = 80 // rpx，默认弧线最高点
  if (spreadType === 'three' && (card.index === 0 || card.index === 2)) {
    arcHeight = 100 // 三牌两侧弧线更大
  } else if (spreadType === 'celtic-cross') {
    arcHeight = 60 // 凯尔特十字更紧凑
  }
  const arcY = -4 * arcHeight * t * (1 - t)

  // 旋转插值：初始 -20deg → 目标角度
  const startRotate = card.toX < -50 ? -25 : card.toX > 50 ? 25 : -20
  const rot = card.toAngle * t + startRotate * (1 - t)

  // 缩放：小 → 大 → 回弹到目标
  let sc: number
  if (t < 0.6) {
    // 0.5 → 1.08
    sc = 0.5 + t * (0.58 / 0.6)
  } else if (t < 0.85) {
    // 1.08 → 0.95（回弹）
    const p = (t - 0.6) / 0.25
    sc = 1.08 - p * 0.13
  } else {
    // 0.95 → 目标 scale
    const p = (t - 0.85) / 0.15
    sc = 0.95 + p * (card.toScale - 0.95)
  }

  // 透明度
  const opacity = t < 0.12 ? t / 0.12 : 1

  return {
    left: '50%',
    top: '42%',
    marginLeft: '-70rpx',
    marginTop: '-105rpx',
    transform: `translate(${x}rpx, ${y + arcY}rpx) rotate(${rot}deg) scale(${sc})`,
    opacity,
    transition: 'none',
  }
}

/** 启动单张牌的 JS 帧驱动飞行动画 */
function startFlyAnimation(cardIndex: number) {
  const layouts = slotLayouts.value
  if (cardIndex >= layouts.length) return

  const layout = layouts[cardIndex]

  const state: FlyingCardState = {
    index: cardIndex,
    progress: 0,
    fromX: 0,
    fromY: 0,
    toX: layout.x,
    toY: layout.y,
    toAngle: layout.angle,
    toScale: layout.scale,
  }

  flyingCards.value.push(state)

  const duration = 400 // ms
  const startTime = Date.now()

  const timer = setInterval(() => {
    const elapsed = Date.now() - startTime
    const rawT = Math.min(elapsed / duration, 1)

    // cubic-bezier(0.22, 0.61, 0.36, 1) 缓动
    const easedT = cubicBezier(rawT, 0.22, 0.61, 0.36, 1)
    state.progress = easedT

    if (rawT >= 1) {
      clearInterval(timer)

      // 落地：从飞行列表移除，加入已完成集合
      dealCards.value = [...dealCards.value, cardIndex]
      flyCompleted.value.add(cardIndex)
      flyingCards.value = flyingCards.value.filter(c => c.index !== cardIndex)

      if (dealCards.value.length >= cardCount.value) {
        // 所有牌发完
        dealComplete.value = true
        setTimeout(() => {
          animPhase.value = 'done'
          navTo('/pages/result/result')
        }, 800)
      } else {
        // 延迟 100ms 发下一张牌
        setTimeout(() => {
          startFlyAnimation(cardIndex + 1)
        }, 100)
      }
    }
  }, 16) // ~60fps
}

const tabList = [
  { pagePath: 'pages/index/index', text: '首页' },
  { pagePath: 'pages/draw/draw', text: '抽牌' },
  { pagePath: 'pages/cards/cards', text: '牌库' },
  { pagePath: 'pages/history/history', text: '记录' },
]

function handleDraw() {
  if (animPhase.value !== 'idle') return

  // 触觉反馈
  // #ifdef MP-WEIXIN
  wx.vibrateShort({ type: 'medium' })
  // #endif

  // 1. 先抽牌（数据层面）
  store.drawCards(selectedSpread.value, question.value, useAI.value)
  drawnCards.value = store.currentReading?.cards ?? []

  // 2. 启动洗牌动画
  animPhase.value = 'shuffle'
  dealCards.value = []
  dealComplete.value = false
  flyingCards.value = []
  flyCompleted.value = new Set()
  shuffleCards.value = Array.from({ length: Math.min(cardCount.value + 4, 10) }, (_, i) => i)

  // 洗牌 1.2s 后进入发牌阶段
  setTimeout(() => {
    animPhase.value = 'deal'

    // 第一张牌开始飞行（JS 帧驱动）
    startFlyAnimation(0)
  }, 1200)
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

      <!-- ========== 洗牌阶段 ========== -->
      <view v-if="animPhase === 'shuffle'" class="anim-shuffle">
        <text class="shuffle-title">牌灵正在回应你的问题...</text>
        <view class="shuffle-deck">
          <view
            v-for="(_, i) in shuffleCards"
            :key="i"
            class="shuffle-card"
            :style="{
              animationDelay: `${i * 0.08}s`,
              transform: `rotate(${(i - shuffleCards.length / 2) * 6}deg) translateY(${Math.abs(i - shuffleCards.length / 2) * 8}rpx)`,
              zIndex: shuffleCards.length - i,
            }"
          >
            <view class="shuffle-card-inner">
              <text class="shuffle-star">★</text>
            </view>
          </view>
        </view>
      </view>

      <!-- ========== 发牌阶段 ========== -->
      <view v-if="animPhase === 'deal' || animPhase === 'done'" class="anim-deal">
        <text class="deal-title">
          {{ dealComplete ? '命运之轮已揭示答案' : '命运之轮正在转动...' }}
        </text>

        <!-- 中央牌堆（发牌过程中可见） -->
        <view v-if="showDeck" class="deck-pile" :class="{ shrinking: animPhase === 'deal' }">
          <view
            v-for="i in deckRemaining"
            :key="'deck-' + i"
            class="deck-card-stack"
            :style="{
              transform: `translateY(${(i - 1) * 3}rpx) rotate(${(i - deckRemaining / 2) * 2}deg)`,
              zIndex: i,
              opacity: animPhase === 'deal' ? 0.5 : 1,
            }"
          >
            <view class="deck-card-inner">
              <text class="deck-card-star">★</text>
            </view>
          </view>
        </view>

        <!-- 牌阵槽位 -->
        <view class="deal-slots" :class="[`slots-${currentSpread?.type}`]">
          <view
            v-for="(pos, i) in currentSpread?.positions"
            :key="i"
            class="deal-slot"
            :class="{
              dealt: dealCards.includes(i),
              'has-flying': flyingCards.some(c => c.index === i),
            }"
            :style="{
              transform: dealCards.includes(i)
                ? `translate(${slotLayouts[i].x}rpx, ${slotLayouts[i].y}rpx)`
                : '',
            }"
          >
            <view class="deal-card-placeholder">
              <!-- 空槽：虚线框 + 发光点 -->
              <view v-if="!dealCards.includes(i)" class="deal-empty">
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

        <!-- 飞行中的牌（独立层，JS 帧驱动，支持多牌并行） -->
        <view
          v-for="card in flyingCards"
          :key="card.index"
          class="flying-card"
          :style="getFlyingStyle(card)"
        >
          <view class="flying-card-face">
            <text class="flying-card-star">★</text>
            <text class="flying-card-moon">☽</text>
          </view>

          <!-- 拖尾粒子 x3 -->
          <view class="fly-trail t1" />
          <view class="fly-trail t2" />
          <view class="fly-trail t3" />
        </view>
      </view>
    </view>

    <!-- ========== 选择区域（动画时隐藏） ========== -->
    <template v-if="animPhase === 'idle'">
      <!-- 牌阵选择 -->
      <view class="spread-select">
        <text class="section-title">选择牌阵</text>
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
          <view class="ai-toggle">
            <text class="ai-toggle-label">AI 解读</text>
            <switch
              :checked="useAI"
              color="#c9a96e"
              style="transform: scale(0.7);"
              @change="useAI = $event.detail.value"
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

      <!-- 牌阵预览 -->
      <view class="spread-preview">
        <text class="section-title">牌阵预览：{{ currentSpread?.name }}</text>
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
  padding: 32rpx;
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

.ai-toggle {
  display: flex;
  align-items: center;
  gap: 8rpx;
}

.ai-toggle-label {
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
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  overflow: hidden;
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
// 洗牌阶段
// ==========================================
.anim-shuffle {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 60rpx;
  z-index: 1;
}

.shuffle-title {
  font-size: 32rpx;
  color: $accent-gold;
  animation: textPulse 1.5s ease-in-out infinite;
}

@keyframes textPulse {
  0%, 100% { opacity: 0.6; }
  50% { opacity: 1; }
}

.shuffle-deck {
  position: relative;
  width: 200rpx;
  height: 280rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.shuffle-card {
  position: absolute;
  width: 140rpx;
  height: 210rpx;
  animation: shuffleMove 0.6s ease-in-out infinite alternate;
}

.shuffle-card-inner {
  width: 100%;
  height: 100%;
  background: linear-gradient(135deg, $card-back-color, #3d2b6b);
  border-radius: $radius-sm;
  border: 2rpx solid rgba($accent-gold, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: $shadow-md;
}

.shuffle-star {
  font-size: 48rpx;
  color: rgba($accent-gold, 0.5);
}

@keyframes shuffleMove {
  0% { transform: translateY(-6rpx); }
  100% { transform: translateY(6rpx); }
}

// ==========================================
// 发牌阶段
// ==========================================
.anim-deal {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 30rpx;
  z-index: 1;
  width: 100%;
  padding: 0 32rpx;
  box-sizing: border-box;
}

.deal-title {
  font-size: 30rpx;
  color: $accent-gold;
  animation: textPulse 1.5s ease-in-out infinite;
  text-align: center;
}

// -------- 中央牌堆（发牌过程中可见） --------
.deck-pile {
  position: relative;
  width: 140rpx;
  height: 210rpx;
  transition: opacity 0.3s ease;

  &.shrinking {
    animation: deckFadeOut 0.5s ease forwards;
  }
}

.deck-card-stack {
  position: absolute;
  width: 140rpx;
  height: 210rpx;
  transition: transform 0.3s ease, opacity 0.3s ease;
}

.deck-card-inner {
  width: 100%;
  height: 100%;
  background: linear-gradient(135deg, $card-back-color, #3d2b6b);
  border-radius: $radius-sm;
  border: 2rpx solid rgba($accent-gold, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: $shadow-md;
}

.deck-card-star {
  font-size: 48rpx;
  color: rgba($accent-gold, 0.4);
}

@keyframes deckFadeOut {
  to { opacity: 0; transform: scale(0.8); }
}

// -------- 牌阵槽位容器 --------
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
    .deal-slot { flex: 1; min-width: 180rpx; max-width: 220rpx; }
  }
  &.slots-celtic-cross {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 20rpx 30rpx;
    max-width: 500rpx;
    margin: 0 auto;
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

  &.dealt .deal-card-back {
    border-color: rgba($accent-gold, 0.5);
    box-shadow: 0 0 24rpx rgba($accent-gold, 0.2);
  }

  &.has-flying {
    z-index: 5;
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

.deal-slot.dealt .deal-pos-label {
  color: $accent-gold;
}

// ==========================================
// 飞行中的牌（独立层，JS 帧驱动内联 transform）
// ==========================================
.flying-card {
  position: fixed;
  width: 140rpx;
  height: 210rpx;
  z-index: 200;
  left: 50%;
  top: 42%;
  margin-left: -70rpx;
  margin-top: -105rpx;
  pointer-events: none;
  // 注意：transform/opacity 由 JS getFlyingStyle() 内联设置，不在此处定义
}

.flying-card-face {
  width: 100%;
  height: 100%;
  background: linear-gradient(135deg, $card-back-color, #3d2b6b);
  border-radius: $radius-sm;
  border: 2rpx solid rgba($accent-gold, 0.6);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6rpx;
  box-shadow: 0 8rpx 40rpx rgba($accent-gold, 0.3);
}

.flying-card-star {
  font-size: 52rpx;
  color: rgba($accent-gold, 0.8);
}

.flying-card-moon {
  font-size: 30rpx;
  color: rgba($accent-gold, 0.4);
}

// 拖尾粒子
.fly-trail {
  position: absolute;
  width: 12rpx;
  height: 12rpx;
  background: $accent-gold;
  border-radius: 50%;
  opacity: 0;
  box-shadow: 0 0 12rpx $accent-gold;

  &.t1 { animation: trailFade1 0.4s ease-out both; }
  &.t2 { animation: trailFade2 0.35s ease-out both; animation-delay: 0.05s; }
  &.t3 { animation: trailFade3 0.3s ease-out both; animation-delay: 0.1s; }
}

@keyframes trailFade1 {
  0% {
    opacity: 0.8;
    transform: translate(-20rpx, -30rpx) scale(1);
  }
  100% {
    opacity: 0;
    transform: translate(-60rpx, -80rpx) scale(0.1);
  }
}

@keyframes trailFade2 {
  0% {
    opacity: 0.6;
    transform: translate(10rpx, -20rpx) scale(0.8);
  }
  100% {
    opacity: 0;
    transform: translate(50rpx, -60rpx) scale(0.1);
  }
}

@keyframes trailFade3 {
  0% {
    opacity: 0.5;
    transform: translate(-5rpx, -10rpx) scale(0.6);
  }
  100% {
    opacity: 0;
    transform: translate(-30rpx, -40rpx) scale(0.1);
  }
}


</style>
