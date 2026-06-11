<script setup lang="ts">
import { ref, watch, nextTick, onMounted, getCurrentInstance } from 'vue'
import type { DrawnCard } from '@/types'
import { generatePoster } from '@/utils/poster'
import type { PosterData } from '@/utils/poster'

const props = defineProps<{
  visible: boolean
  cards: DrawnCard[]
  question: string
  spreadName: string
  interpretation?: string
}>()

const emit = defineEmits<{
  close: []
  share: [url: string]
}>()

const posterReady = ref(false)
const posterUrl = ref('')
const isSaving = ref(false)
const posterError = ref('')
const canvasId = 'share-poster-canvas'

const componentScope = getCurrentInstance()?.proxy

const posterW = 750
const minPosterH = 1334

const contentW = ref(300)
onMounted(() => {
  const sys = uni.getSystemInfoSync()
  const winW = sys.windowWidth || 375
  const pr = winW / 750
  const maxModalW = 600 * pr
  const maxContentW = winW - 80 * pr
  contentW.value = Math.floor(Math.min(maxModalW, maxContentW))
})

/** 使用统一海报生成入口 */
async function generatePosterImage() {
  console.log('[SharePoster] generatePosterImage called, visible=', props.visible, 'posterReady=', posterReady.value)
  if (posterReady.value) return

  posterError.value = ''
  try {
    const data: PosterData = {
      cards: props.cards,
      question: props.question,
      spreadName: props.spreadName,
      interpretation: props.interpretation,
      date: new Date().toLocaleDateString('zh-CN'),
    }

    console.log('[SharePoster] calling generatePoster...')
    const result = await generatePoster(data, { canvasId, componentScope })
    console.log('[SharePoster] generatePoster success, url=', result.url)
    posterUrl.value = result.url
    posterReady.value = true
  } catch (e) {
    console.log('[SharePoster] generatePoster catch, error=', e)
    posterError.value = '生成失败，请重试'
  }
}

/** 保存海报到相册 */
async function savePoster() {
  if (isSaving.value || !posterUrl.value) return
  isSaving.value = true
  try {
    // #ifdef MP-WEIXIN
    const setting = await uni.getSetting()
    if (!setting.authSetting['scope.writePhotosAlbum']) {
      await uni.authorize({ scope: 'scope.writePhotosAlbum' })
    }
    await uni.saveImageToPhotosAlbum({
      filePath: posterUrl.value,
      success: () => {
        uni.showToast({ title: '已保存到相册', icon: 'success' })
      },
      fail: (err) => {
        if (err.errMsg.includes('auth deny')) {
          uni.showModal({
            title: '提示',
            content: '需要相册权限才能保存海报，请在设置中开启',
            confirmText: '去设置',
            success: (res) => {
              if (res.confirm) {
                uni.openSetting({})
              }
            },
          })
        } else {
          uni.showToast({ title: '保存失败', icon: 'error' })
        }
      },
    })
    // #endif

    // #ifdef H5
    const link = document.createElement('a')
    link.download = 'tarot-poster.png'
    link.href = posterUrl.value
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    uni.showToast({ title: '已开始下载', icon: 'success' })
    // #endif
  } catch (e) {
    console.error('保存海报失败:', e)
    uni.showToast({ title: '保存失败', icon: 'error' })
  } finally {
    isSaving.value = false
  }
}

/** 分享海报 */
function sharePoster() {
  if (!posterUrl.value) return
  // #ifdef MP-WEIXIN
  uni.showToast({ title: '请点击右上角菜单分享', icon: 'none' })
  emit('close')
  // #endif

  // #ifdef H5
  emit('share', posterUrl.value)
  // #endif
}

// 监听 visible 变化，自动生成
watch(
  () => props.visible,
  (val) => {
    if (val) {
      posterReady.value = false
      posterUrl.value = ''
      posterError.value = ''
      nextTick(() => setTimeout(() => generatePosterImage(), 300))
    }
  },
)
</script>

<template>
  <!-- Canvas 始终在 DOM 中（不在弹窗 v-if 内），确保微信原生组件初始化就绪 -->
  <canvas
    :id="canvasId"
    type="2d"
    class="poster-canvas"
    :style="{ width: `${posterW}px`, height: `${minPosterH + 1200}px` }"
  />

  <view v-if="visible" class="poster-overlay" @click.self="emit('close')">
    <view class="poster-modal">
      <!-- 顶部栏 -->
      <view class="poster-header">
        <text class="poster-title">分享海报</text>
        <view class="poster-close" @click="emit('close')">
          <text>✕</text>
        </view>
      </view>

      <!-- 居中加载（absolute） / scroll-view + 显式图片宽度（绕过微信 width:100% 计算异常） -->
      <view class="poster-body">
        <view v-if="!posterReady" class="poster-loading">
          <view v-if="!posterError" class="loading-spinner" />
          <text class="loading-text">{{ posterError || '正在生成海报...' }}</text>
          <view v-if="posterError" class="poster-retry" @click="generatePosterImage">
            <text>点击重试</text>
          </view>
        </view>

        <scroll-view v-else class="poster-body-scroll" scroll-y>
          <image
            :src="posterUrl"
            mode="widthFix"
            :style="{ width: contentW + 'px' }"
          />
        </scroll-view>
      </view>

      <!-- 操作按钮 -->
      <view v-if="posterReady" class="poster-actions">
        <view class="poster-btn save-btn" @click="savePoster">
          <text>{{ isSaving ? '保存中...' : '保存到相册' }}</text>
        </view>
        <view class="poster-btn share-btn" @click="sharePoster">
          <text>分享给好友</text>
        </view>
      </view>
    </view>
  </view>
</template>

<style lang="scss" scoped>
.poster-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.85);
  z-index: 200;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40rpx;
}

.poster-modal {
  width: 100%;
  max-width: 600rpx;
  max-height: 90vh;
  background: $bg-secondary;
  border-radius: $radius-lg;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.poster-body {
  flex: 1;
  min-height: 0;
  position: relative;
}

// 加载中（absolute 撑满 body，居中）
.poster-loading {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

// 图片 scroll-view（填满 body，显式宽度由 JS 绑定）
.poster-body-scroll {
  width: 100%;
  height: 100%;
}

.poster-header {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 28rpx 32rpx;
  border-bottom: 1rpx solid rgba($accent-gold, 0.1);
}

.poster-title {
  font-size: 32rpx;
  color: $accent-gold;
  font-weight: bold;
}

.poster-close {
  width: 48rpx;
  height: 48rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 32rpx;
  color: $text-muted;
}

// 加载中
.poster-loading {
}

.loading-spinner {
  width: 64rpx;
  height: 64rpx;
  border: 4rpx solid rgba($accent-gold, 0.2);
  border-top-color: $accent-gold;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.loading-text {
  margin-top: 24rpx;
  font-size: 26rpx;
  color: $text-muted;
}

.poster-retry {
  margin-top: 20rpx;
  padding: 12rpx 32rpx;
  border: 2rpx solid $accent-gold;
  border-radius: $radius-md;
  font-size: 24rpx;
  color: $accent-gold;

  &:active {
    opacity: 0.7;
  }
}

// 海报图片（宽度由 JS 显式绑定，避免微信 width:100% 在 scroll-view 内计算异常）
.poster-image {
  height: auto;
  border-radius: 0;
  display: block;
}

// 隐藏 canvas（保持视口内可见，否则微信原生 canvas 不渲染）
.poster-canvas {
  position: fixed;
  left: 0;
  bottom: 0;
  opacity: 0.01;
  pointer-events: none;
  z-index: -1;
}

// 操作按钮
.poster-actions {
  flex-shrink: 0;
  display: flex;
  gap: 24rpx;
  padding: 28rpx 32rpx;
  border-top: 1rpx solid rgba($accent-gold, 0.1);
}

.poster-btn {
  flex: 1;
  height: 80rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: $radius-md;
  font-size: 28rpx;
  font-weight: 600;
  transition: all $transition-fast;

  &:active {
    opacity: 0.8;
    transform: scale(0.96);
  }
}

.save-btn {
  background: linear-gradient(135deg, $accent-gold, #b8943f);
  color: #1a1a2e;
}

.share-btn {
  background: transparent;
  color: $accent-gold;
  border: 2rpx solid $accent-gold;
}
</style>
