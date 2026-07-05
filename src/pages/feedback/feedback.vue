<script setup lang="ts">
import { ref } from 'vue'
import { navBack } from '@/utils'
import { submitFeedback, uploadFeedbackImage } from '@/services/feedback'
import { showToast } from '@/utils'
import { logInfo, logError, startTrace, endTrace } from '@/services/client-logger'

const BACKEND_API = (import.meta.env.VITE_BACKEND_API || '').replace(/\/+$/, '')

const categories = [
  { value: 'bug', label: 'Bug' },
  { value: 'suggestion', label: '建议' },
  { value: 'other', label: '其他' },
]

const category = ref('bug')
const content = ref('')
const images = ref<string[]>([])
const uploading = ref(false)
const submitting = ref(false)

function selectCategory(val: string) {
  category.value = val
}

function chooseImage() {
  if (images.value.length >= 3) {
    showToast('最多上传 3 张图片')
    return
  }
  uni.chooseImage({
    count: 3 - images.value.length,
    sizeType: ['compressed'],
    sourceType: ['album', 'camera'],
    success: async (res) => {
      uploading.value = true
      try {
        for (const tempPath of res.tempFilePaths) {
          const urls = await uploadFeedbackImage(tempPath)
          images.value.push(...urls)
        }
        logInfo('user_action', 'feedback_image_upload', { result: 'success', imageCount: res.tempFilePaths.length })
      } catch (e) {
        logError('user_action', 'feedback_image_upload', e instanceof Error ? e.message : '未知错误')
        showToast('图片上传失败')
      } finally {
        uploading.value = false
      }
    },
  })
}

function removeImage(index: number) {
  images.value.splice(index, 1)
}

function previewImage(url: string) {
  uni.previewImage({
    urls: images.value.map((u) => `${BACKEND_API}${u}`),
    current: `${BACKEND_API}${url}`,
  })
}

async function handleSubmit() {
  if (!content.value.trim()) {
    showToast('请输入反馈内容')
    return
  }

  startTrace()
  submitting.value = true
  try {
    await submitFeedback({
      category: category.value,
      content: content.value.trim(),
      images: images.value,
    })
    logInfo('user_action', 'feedback_submit', { category: category.value })
    showToast('提交成功')
    setTimeout(() => navBack(), 1500)
  } catch (err: any) {
    logError('user_action', 'feedback_submit', err.message || '提交失败')
    showToast(err.message || '提交失败')
  } finally {
    submitting.value = false
    endTrace()
  }
}
</script>

<template>
  <view class="feedback-page">
    <view class="section">
      <text class="section-label">反馈类型</text>
      <view class="category-row">
        <view
          v-for="cat in categories"
          :key="cat.value"
          class="category-tag"
          :class="{ active: category === cat.value }"
          @click="selectCategory(cat.value)"
        >
          {{ cat.label }}
        </view>
      </view>
    </view>

    <view class="section">
      <text class="section-label">详细描述</text>
      <textarea
        v-model="content"
        class="content-input"
        placeholder="请详细描述您的问题或建议..."
        maxlength="500"
        :disabled="submitting"
      />
      <text class="char-count">{{ content.length }}/500</text>
    </view>

    <view class="section">
      <text class="section-label">截图（选填，最多 3 张）</text>
      <view class="image-grid">
        <view
          v-for="(img, idx) in images"
          :key="idx"
          class="image-item"
          @click="previewImage(img)"
        >
          <image :src="`${BACKEND_API}${img}`" mode="aspectFill" class="preview-img" />
          <text class="image-remove" @click.stop="removeImage(idx)">✕</text>
        </view>
        <view
          v-if="images.length < 3"
          class="image-uploader"
          :class="{ uploading }"
          @click="chooseImage"
        >
          <text class="uploader-icon">+</text>
          <text class="uploader-text">{{ uploading ? '上传中...' : '添加图片' }}</text>
        </view>
      </view>
    </view>

    <button
      class="submit-btn"
      :disabled="submitting || !content.trim()"
      @click="handleSubmit"
    >
      {{ submitting ? '提交中...' : '提交反馈' }}
    </button>
  </view>
</template>

<style lang="scss" scoped>
.feedback-page {
  padding: 24rpx;
}

.section {
  margin-bottom: 32rpx;
}

.section-label {
  display: block;
  font-size: 26rpx;
  color: $text-secondary;
  margin-bottom: 16rpx;
  font-weight: 500;
}

.category-row {
  display: flex;
  gap: 16rpx;
}

.category-tag {
  padding: 12rpx 32rpx;
  border-radius: 30rpx;
  font-size: 26rpx;
  background: $bg-card;
  color: $text-secondary;
  border: 1rpx solid transparent;
  cursor: pointer;

  &.active {
    background: linear-gradient(135deg, $accent-gold, $accent-gold-light);
    color: $bg-primary;
    font-weight: 600;
  }
}

.content-input {
  width: 100%;
  min-height: 240rpx;
  background: $bg-card;
  border-radius: $radius-md;
  padding: 24rpx;
  font-size: 26rpx;
  color: $text-white;
  border: 1rpx solid rgba($text-muted, 0.15);
  box-sizing: border-box;

  &::placeholder {
    color: $text-muted;
  }
}

.char-count {
  display: block;
  text-align: right;
  font-size: 22rpx;
  color: $text-muted;
  margin-top: 8rpx;
}

.image-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx;
}

.image-item {
  position: relative;
  width: 160rpx;
  height: 160rpx;
  border-radius: $radius-sm;
  overflow: hidden;
}

.preview-img {
  width: 100%;
  height: 100%;
}

.image-remove {
  position: absolute;
  top: 4rpx;
  right: 4rpx;
  width: 32rpx;
  height: 32rpx;
  background: rgba(0, 0, 0, 0.6);
  color: #fff;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20rpx;
  cursor: pointer;
}

.image-uploader {
  width: 160rpx;
  height: 160rpx;
  background: $bg-card;
  border: 2rpx dashed rgba($text-muted, 0.25);
  border-radius: $radius-sm;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  cursor: pointer;

  &.uploading {
    opacity: 0.6;
  }
}

.uploader-icon {
  font-size: 48rpx;
  color: $text-muted;
  line-height: 1;
}

.uploader-text {
  font-size: 22rpx;
  color: $text-muted;
  margin-top: 8rpx;
}

.submit-btn {
  width: 100%;
  padding: 24rpx;
  background: linear-gradient(135deg, $accent-gold, $accent-gold-light);
  color: $bg-primary;
  border: none;
  border-radius: $radius-md;
  font-size: 30rpx;
  font-weight: 600;
  text-align: center;
  cursor: pointer;

  &:disabled {
    opacity: 0.5;
  }
}
</style>
