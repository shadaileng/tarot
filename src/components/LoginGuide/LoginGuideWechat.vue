<script setup lang="ts">
import { ref } from 'vue'
import { login } from '@/services/auth'

const emit = defineEmits<{
  loginSuccess: []
}>()

const loading = ref(false)
const errorMsg = ref('')

async function handleWechatLogin() {
  loading.value = true
  errorMsg.value = ''
  try {
    const result = await login()

    // 新用户且未完成资料设置 → 跳转引导页
    if (result.isNewUser) {
      uni.reLaunch({ url: '/pages/profile-setup/profile-setup' })
      return
    }

    // 老用户：检查是否之前跳过且未完成设置
    const skipped = uni.getStorageSync('profile_setup_skipped')
    const done = uni.getStorageSync('profile_setup_done')
    if (skipped && !done && !result.user.avatarUrl) {
      uni.showModal({
        title: '完善资料',
        content: '设置头像和昵称，让别人认识你',
        confirmText: '去设置',
        cancelText: '跳过',
        success: (res) => {
          if (res.confirm) {
            uni.navigateTo({ url: '/pages/profile-setup/profile-setup' })
          } else {
            emit('loginSuccess')
          }
        },
      })
      return
    }

    console.log('[LOGIN] login success, user:', result.user.nickname)
    uni.showToast({ title: `欢迎，${result.user.nickname}`, icon: 'success' })
    emit('loginSuccess')
  } catch (err: any) {
    errorMsg.value = err.message || '登录失败，请重试'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <view class="login-guide">
    <!-- 登录引导 -->
    <view class="lg-card">
      <text class="lg-icon">🔮</text>
      <text class="lg-title">登录后同步抽牌记录</text>
      <text class="lg-desc">登录后可云端保存记录，换设备不丢失</text>

      <view
        class="lg-btn"
        :class="{ 'lg-btn-loading': loading }"
        @click="handleWechatLogin"
      >
        <text v-if="!loading">微信一键登录</text>
        <text v-else>登录中...</text>
      </view>

      <text v-if="errorMsg" class="lg-error">{{ errorMsg }}</text>
    </view>
  </view>
</template>

<style lang="scss" scoped>
.login-guide {
  padding: 40rpx 24rpx;
}

.lg-card {
  background: $bg-card;
  border-radius: $radius-md;
  padding: 48rpx 32rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
}

.lg-icon {
  font-size: 64rpx;
  margin-bottom: 16rpx;
}

.lg-title {
  font-size: 32rpx;
  font-weight: 600;
  color: $text-white;
  margin-bottom: 8rpx;
}

.lg-desc {
  font-size: 26rpx;
  color: $text-muted;
  margin-bottom: 36rpx;
  line-height: 1.6;
}

.lg-btn {
  width: 100%;
  max-width: 480rpx;
  height: 88rpx;
  background: linear-gradient(135deg, #07c160, #06ad56);
  border-radius: $radius-md;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;

  &::after {
    border: none;
  }

  text {
    color: #fff;
    font-size: 30rpx;
    font-weight: 600;
  }

  &.lg-btn-loading {
    opacity: 0.7;
  }
}

.lg-error {
  margin-top: 16rpx;
  font-size: 24rpx;
  color: $danger;
}
</style>
