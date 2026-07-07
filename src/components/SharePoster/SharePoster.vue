<script setup lang="ts">
import { ref, watch, nextTick, onMounted } from 'vue'
import type { DrawnCard } from '@/types'
import { generatePoster, startPoster, pollPosterResult, cancelPoster } from '@/services/poster'

import type { PosterData } from '@/utils/poster/types'
import { logInfo, logError, startTrace, endTrace } from '@/services/client-logger'

const BACKEND_API = (import.meta.env.VITE_BACKEND_API || '').replace(/\/+$/, '')

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
const posterSavePath = ref('')
const isSaving = ref(false)
const posterError = ref('')
const currentTaskId = ref('')
const polling = ref(false)

const currentTheme = ref<'dark' | 'light'>('dark')

/** 切换主题并重新生成海报 */
function toggleTheme() {
  currentTheme.value = currentTheme.value === 'dark' ? 'light' : 'dark'
  posterReady.value = false
  posterUrl.value = ''
  posterSavePath.value = ''
  posterError.value = ''
  currentTaskId.value = ''
  uni.removeStorageSync('pending_poster_taskId')
  nextTick(() => generatePosterImage())
}

const contentW = ref(300)

onMounted(() => {
  const winW = (uni.getWindowInfo()?.windowWidth || 375)
  const pr = winW / 750

  const maxModalW = 600 * pr
  const maxContentW = winW - 80 * pr
  contentW.value = Math.floor(Math.min(maxModalW, maxContentW))
})

/** 判断是否为认证相关错误 */
function isAuthError(err: any): boolean {
  const msg = String(err?.message || err || '')
  return msg === 'UNAUTHORIZED' || msg.includes('Unauthorized') || msg.includes('缺少认证')
}

/** 调用后端海报微服务生成海报（异步模式） */
async function generatePosterImage() {
  if (posterReady.value) return

  startTrace()
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

    // 1. 提交异步任务
    const { taskId } = await startPoster(data)
    currentTaskId.value = taskId

    // 2. 持久化 taskId（支持页面重入）
    uni.setStorageSync('pending_poster_taskId', taskId)

    // 3. 轮询等待结果
    const result = await pollPosterTask(taskId)

    // 4. 清理持久化的 taskId
    uni.removeStorageSync('pending_poster_taskId')

    // 5. 处理结果
    if (result.status === 'completed' && result.cacheKey) {
      await downloadAndSavePoster(result.cacheKey)
    } else if (result.status === 'failed') {
      posterError.value = result.error || '生成失败，请重试'
    } else if (result.status === 'pending' || result.status === 'rendering') {
      posterError.value = '生成超时，任务仍在后台进行，稍后可重新打开查看'
    }
  } catch (e: any) {
    // 清理 taskId
    uni.removeStorageSync('pending_poster_taskId')

    logError('poster', 'poster_generate_fail', e?.message || '未知错误')
    console.error('[SharePoster] 海报生成失败:', e)
    if (isAuthError(e)) {
      posterError.value = '登录已过期，请关闭后重新登录再试'
    } else if (/(timeout|abort|超时|取消)/i.test(e?.message || '')) {
      posterError.value = '生成超时，请重试'
    } else {
      posterError.value = '生成失败，请重试'
    }
  } finally {
    endTrace()
  }
}

/** 轮询海报任务 */
async function pollPosterTask(taskId: string, maxWaitMs = 90000, pollInterval = 2000) {
  const startTime = Date.now()
  polling.value = true

  try {
    while (Date.now() - startTime < maxWaitMs) {
      const result = await pollPosterResult(taskId)

      if (result.status === 'completed' || result.status === 'failed') {
        return result
      }

      // 等待后继续轮询
      await new Promise(resolve => setTimeout(resolve, pollInterval))
    }

    // 软超时：返回当前状态，不清除 taskId
    return { status: 'pending' as const }
  } finally {
    polling.value = false
  }
}

/** 下载并保存海报 */
async function downloadAndSavePoster(cacheKey: string) {
  // #ifdef MP-WEIXIN
  const token = uni.getStorageSync('auth_token')
  const dlRes = await new Promise<any>((resolve, reject) => {
    uni.downloadFile({
      url: `${BACKEND_API}/api/poster/${cacheKey}`,
      header: token ? { 'Authorization': `Bearer ${token}` } : {},
      success: (res) => resolve(res),
      fail: (err) => reject(new Error(err.errMsg)),
    })
  })
  if (dlRes.statusCode !== 200) {
    throw new Error(`海报下载失败 (${dlRes.statusCode})`)
  }

  const fs = uni.getFileSystemManager()
  const data = fs.readFileSync(dlRes.tempFilePath)
  const savePath = `${wx.env.USER_DATA_PATH}/poster-save-${Date.now()}.png`
  fs.writeFileSync(savePath, data)

  posterUrl.value = dlRes.tempFilePath
  posterSavePath.value = savePath
  posterReady.value = true
  // #endif

  // #ifdef H5
  posterUrl.value = `${BACKEND_API}/api/poster/${cacheKey}`
  posterReady.value = true
  // #endif
}

/** 取消海报生成 */
async function handleCancel() {
  if (!currentTaskId.value) return

  try {
    await cancelPoster(currentTaskId.value)
    uni.removeStorageSync('pending_poster_taskId')
    posterError.value = '已取消生成'
  } catch (e) {
    // 忽略错误
  }
}

/** 保存海报到相册 */
async function savePoster() {
  if (isSaving.value || !posterUrl.value) return
  startTrace()
  isSaving.value = true
  logInfo('poster', 'poster_save_click')
  try {
    // #ifdef MP-WEIXIN
    await new Promise<void>((resolve) => {
      uni.saveImageToPhotosAlbum({
        filePath: posterSavePath.value || posterUrl.value,
        success: () => {
          logInfo('poster', 'poster_save_success', { platform: 'mp-weixin' })
          uni.showToast({ title: '已保存到相册', icon: 'success' })
          resolve()
        },
        fail: (err: any) => {
          if (err.errMsg.includes('auth deny')) {
            logError('poster', 'poster_save_fail', 'auth_deny', { platform: 'mp-weixin' })
            uni.showModal({
              title: '提示',
              content: '需要相册权限才能保存海报，请在设置中开启',
              confirmText: '去设置',
              success: (res) => {
                if (res.confirm) uni.openSetting({})
              },
            })
          } else {
            logError('poster', 'poster_save_fail', 'save_error', { platform: 'mp-weixin', errMsg: err.errMsg })
            uni.showToast({ title: '保存失败', icon: 'error' })
          }
          resolve()
        },
      })
    })
    // #endif

    // #ifdef H5
    const link = document.createElement('a')
    link.download = 'tarot-poster.png'
    link.href = posterUrl.value
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    logInfo('poster', 'poster_save_success', { platform: 'h5' })
    uni.showToast({ title: '已开始下载', icon: 'success' })
    // #endif
  } catch (e) {
    logError('poster', 'poster_save_fail', 'exception', { platform: 'unknown', errMsg: String(e) })
    console.error('保存海报失败:', e)
    uni.showToast({ title: '保存失败', icon: 'error' })
  } finally {
    isSaving.value = false
    endTrace()
  }
}

/** 遮罩层点击处理：仅当点击遮罩自身（非弹窗内容）时关闭 */
function handleOverlayClick(e: any) {
  // #ifdef MP-WEIXIN
  // 小程序下 .self 修饰符不可靠，手动判断 target
  if (e.target === e.currentTarget) {
    emit('close')
  }
  // #endif
  // #ifdef H5
  emit('close')
  // #endif
}

/** 分享海报 */
function sharePoster() {
  if (!posterUrl.value) return
  startTrace()
  // #ifdef MP-WEIXIN
  logInfo('poster', 'poster_share_success')
  uni.showToast({ title: '请点击右上角菜单分享', icon: 'none' })
  emit('close')
  // #endif

  // #ifdef H5
  logInfo('poster', 'poster_share_success')
  emit('share', posterUrl.value)
  // #endif
  endTrace()
}

// 监听 visible 变化，自动生成
watch(
  () => props.visible,
  (val) => {
    if (val) {
      posterReady.value = false
      posterUrl.value = ''
      posterSavePath.value = ''
      posterError.value = ''
      currentTaskId.value = ''

      // 检查是否有未完成的任务
      const pendingTaskId = uni.getStorageSync('pending_poster_taskId')
      if (pendingTaskId) {
        // 恢复轮询
        currentTaskId.value = pendingTaskId
        pollPosterTask(pendingTaskId).then(result => {
          uni.removeStorageSync('pending_poster_taskId')

          if (result.status === 'completed' && result.cacheKey) {
            downloadAndSavePoster(result.cacheKey)
          } else if (result.status === 'failed') {
            posterError.value = '生成失败，请重试'
          } else {
            posterError.value = '任务仍在进行中，请稍后重新打开'
          }
        })
        return
      }

      nextTick(() => setTimeout(() => generatePosterImage(), 300))
    }
  },
)
</script>

<template>
  <view v-if="visible" class="poster-overlay" @click="handleOverlayClick" catchtouchmove>
    <view class="poster-modal" @click.stop>
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
      <view class="poster-body">
        <view v-if="!posterReady" class="poster-loading">
          <view v-if="!posterError && polling" class="loading-spinner" />
          <text class="loading-text">{{ posterError || '正在生成海报...' }}</text>
          <view v-if="posterError" class="poster-retry" @click="generatePosterImage">
            <text>点击重试</text>
          </view>
          <view v-if="!posterError && polling" class="poster-cancel" @click="handleCancel">
            <text>取消生成</text>
          </view>
        </view>

        <view
          v-else
          class="poster-body-content"
          :style="{ width: contentW + 'px' }"
        >
          <image
            :src="posterUrl"
            mode="widthFix"
            style="width: 100%;"
            @error="(e: any) => console.error('[SharePoster] image load error:', posterUrl, e)"
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
  align-self: stretch;
}

.poster-body {
  flex: 1;
  min-height: 0;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
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

// 图片容器：宽度由 JS 绑定，图片 widthFix 自适应高度
.poster-body-content {
  display: flex;
  align-items: flex-start;
  justify-content: center;
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

.poster-cancel {
  margin-top: 16rpx;
  padding: 12rpx 32rpx;
  font-size: 24rpx;
  color: $text-muted;

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
