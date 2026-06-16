<script setup lang="ts">
import { ref, watch, nextTick, onMounted } from 'vue'
import type { DrawnCard } from '@/types'
import { generatePoster } from '@/services/poster'
import type { PosterData } from '@/utils/poster/types'

const props = defineProps<{
  visible: boolean
  cards: DrawnCard[]
  question: string
  spreadName: string
  interpretation?: string
  comprehensiveInterpretation?: string
}>()

const emit = defineEmits<{
  close: []
  share: [url: string]
}>()

const posterReady = ref(false)
const posterUrl = ref('')
const isSaving = ref(false)
const posterError = ref('')

const currentTheme = ref<'dark' | 'light'>('dark')

/** 切换主题并重新生成海报 */
function toggleTheme() {
  currentTheme.value = currentTheme.value === 'dark' ? 'light' : 'dark'
  posterReady.value = false
  posterUrl.value = ''
  posterError.value = ''
  nextTick(() => generatePosterImage())
}

const contentW = ref(300)
const bodyAvailableH = ref(400)

onMounted(() => {
  const sys = uni.getSystemInfoSync()
  const winW = sys.windowWidth || 375
  const winH = sys.windowHeight || 667
  const pr = winW / 750

  const maxModalW = 600 * pr
  const maxContentW = winW - 80 * pr
  contentW.value = Math.floor(Math.min(maxModalW, maxContentW))

  // 计算 body 区域可用高度：弹窗 90vh - header - actions
  const maxModalH = winH * 0.9
  const headerH = 100 * pr
  const actionsH = 136 * pr
  bodyAvailableH.value = Math.max(
    Math.floor(maxModalH - headerH - actionsH),
    300
  )
})

/** 调用后端海报微服务生成海报 */
async function generatePosterImage() {
  if (posterReady.value) return

  posterError.value = ''
  try {
    // #ifdef H5
    const template = 'default'
    // #endif
    // #ifdef MP-WEIXIN
    const template = 'wechat'
    // #endif

    const data: PosterData = {
      cards: props.cards,
      question: props.question,
      spreadName: props.spreadName,
      interpretation: props.interpretation,
      comprehensiveInterpretation: props.comprehensiveInterpretation,
      date: new Date().toLocaleDateString('zh-CN'),
      theme: currentTheme.value,
      template,
    }

    posterUrl.value = await generatePoster(data)
    posterReady.value = true
  } catch (e) {
    console.error('[SharePoster] 海报生成失败:', e)
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
      fail: (err: any) => {
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
  <view v-if="visible" class="poster-overlay" @click.self="emit('close')">
    <view class="poster-modal">
      <!-- 顶部栏 -->
      <view class="poster-header">
        <text class="poster-title">分享海报</text>
        <view class="poster-header-right">
          <view class="theme-toggle" @click="toggleTheme">
            <text>{{ currentTheme === 'dark' ? '☀️' : '🌙' }}</text>
          </view>
          <view class="poster-close" @click="emit('close')">
            <text>✕</text>
          </view>
        </view>
      </view>

      <!-- 海报内容 -->
      <view class="poster-body" :style="{ minHeight: bodyAvailableH + 'px' }">
        <view v-if="!posterReady" class="poster-loading">
          <view v-if="!posterError" class="loading-spinner" />
          <text class="loading-text">{{ posterError || '正在生成海报...' }}</text>
          <view v-if="posterError" class="poster-retry" @click="generatePosterImage">
            <text>点击重试</text>
          </view>
        </view>

        <view
          v-else
          class="poster-body-content"
          :style="{
            width: contentW + 'px',
            height: bodyAvailableH + 'px',
          }"
        >
          <image
            :src="posterUrl"
            mode="aspectFit"
            style="width: 100%; height: 100%;"
          />
        </view>
      </view>

      <!-- 操作按钮 — 始终占据空间，按钮在就绪后才显示 -->
      <view class="poster-actions">
        <view v-if="posterReady" class="poster-btn save-btn" @click="savePoster">
          <text>{{ isSaving ? '保存中...' : '保存到相册' }}</text>
        </view>
        <view v-if="posterReady" class="poster-btn share-btn" @click="sharePoster">
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
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
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

// 图片容器：显式宽高由 JS 绑定，配合 aspectFit 自适应缩放
.poster-body-content {
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
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

.poster-header-right {
  display: flex;
  align-items: center;
  gap: 20rpx;
}

.theme-toggle {
  width: 48rpx;
  height: 48rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 32rpx;

  &:active {
    opacity: 0.7;
  }
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
