<script setup lang="ts">
import { ref, computed } from 'vue'
import { updateProfile, getToken } from '@/services/auth'

const BACKEND_API = (import.meta.env.VITE_BACKEND_API || '').replace(/\/+$/, '')

const avatarTempPath = ref('')
const avatarUrl = ref('')
const nickname = ref('')
const uploading = ref(false)
const saving = ref(false)

const canSubmit = computed(() => nickname.value.trim().length > 0 && !uploading.value)

async function onChooseAvatar(e: any) {
  const { avatarUrl: tempUrl } = e.detail
  if (!tempUrl) return
  avatarTempPath.value = tempUrl

  uploading.value = true
  try {
    const token = getToken()
    const result = await new Promise<any>((resolve, reject) => {
      uni.uploadFile({
        url: `${BACKEND_API}/api/upload/avatar`,
        filePath: tempUrl,
        name: 'avatar',
        header: token ? { Authorization: `Bearer ${token}` } : {},
        success: (res) => {
          try {
            resolve(JSON.parse(res.data as string))
          } catch {
            reject(new Error('上传响应解析失败'))
          }
        },
        fail: (err) => reject(new Error(err.errMsg || '上传失败')),
      })
    })
    avatarUrl.value = result.url
    uni.showToast({ title: '头像已选择', icon: 'success' })
  } catch (err: any) {
    uni.showToast({ title: err.message || '头像上传失败', icon: 'none' })
    avatarTempPath.value = ''
  } finally {
    uploading.value = false
  }
}

async function handleSubmit() {
  const name = nickname.value.trim()
  if (!name) return

  saving.value = true
  try {
    await updateProfile({
      nickname: name,
      ...(avatarUrl.value ? { avatarUrl: avatarUrl.value } : {}),
    })
    uni.setStorageSync('profile_setup_done', true)
    uni.removeStorageSync('profile_setup_skipped')
    uni.reLaunch({ url: '/pages/index/index' })
  } catch (err: any) {
    uni.showToast({ title: err.message || '保存失败，请重试', icon: 'none' })
  } finally {
    saving.value = false
  }
}

function handleSkip() {
  uni.setStorageSync('profile_setup_skipped', true)
  uni.reLaunch({ url: '/pages/index/index' })
}
</script>

<template>
  <view class="setup-page">
    <view class="setup-header">
      <text class="setup-title">完善个人资料</text>
      <text class="setup-desc">设置头像和昵称，让别人认识你</text>
    </view>

    <!-- 头像选择 -->
    <view class="avatar-section">
      <button
        class="avatar-btn"
        open-type="chooseAvatar"
        @chooseavatar="onChooseAvatar"
      >
        <image
          v-if="avatarTempPath"
          class="avatar-img"
          :src="avatarTempPath"
          mode="aspectFill"
        />
        <text v-else class="avatar-placeholder">点击选择头像</text>
      </button>
      <text v-if="uploading" class="upload-hint">上传中...</text>
    </view>

    <!-- 昵称输入 -->
    <view class="nickname-section">
      <text class="field-label">昵称</text>
      <input
        v-model="nickname"
        type="nickname"
        class="nickname-input"
        placeholder="请输入昵称"
        :maxlength="30"
      />
    </view>

    <!-- 操作按钮 -->
    <view class="actions">
      <button
        class="btn-submit"
        :disabled="!canSubmit || saving"
        @click="handleSubmit"
      >
        {{ saving ? '保存中...' : '完成' }}
      </button>
      <button class="btn-skip" @click="handleSkip">稍后设置</button>
    </view>
  </view>
</template>

<style lang="scss" scoped>
.setup-page {
  min-height: 100vh;
  background: $bg-primary;
  padding: 80rpx 48rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.setup-header {
  text-align: center;
  margin-bottom: 64rpx;
}

.setup-title {
  font-size: 40rpx;
  font-weight: 700;
  color: $text-white;
  display: block;
  margin-bottom: 12rpx;
}

.setup-desc {
  font-size: 26rpx;
  color: $text-muted;
}

.avatar-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 48rpx;
}

.avatar-btn {
  width: 160rpx;
  height: 160rpx;
  border-radius: $radius-round;
  overflow: hidden;
  background: rgba(201, 169, 110, 0.15);
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  padding: 0;

  &::after {
    border: none;
  }
}

.avatar-img {
  width: 160rpx;
  height: 160rpx;
}

.avatar-placeholder {
  font-size: 26rpx;
  color: $text-muted;
}

.upload-hint {
  font-size: 24rpx;
  color: $accent-gold;
  margin-top: 12rpx;
}

.nickname-section {
  width: 100%;
  margin-bottom: 64rpx;
}

.field-label {
  font-size: 26rpx;
  color: $text-secondary;
  display: block;
  margin-bottom: 12rpx;
}

.nickname-input {
  width: 100%;
  height: 88rpx;
  background: rgba(255, 255, 255, 0.06);
  border-radius: $radius-sm;
  padding: 0 24rpx;
  font-size: 30rpx;
  color: $text-white;
  box-sizing: border-box;
}

.actions {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 20rpx;
}

.btn-submit {
  width: 100%;
  height: 88rpx;
  background: $accent-gold;
  color: $bg-primary;
  font-size: 30rpx;
  font-weight: 600;
  border-radius: $radius-md;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;

  &::after {
    border: none;
  }

  &[disabled] {
    opacity: 0.5;
  }
}

.btn-skip {
  width: 100%;
  height: 88rpx;
  background: transparent;
  color: $text-muted;
  font-size: 28rpx;
  border-radius: $radius-md;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;

  &::after {
    border: none;
  }
}
</style>
