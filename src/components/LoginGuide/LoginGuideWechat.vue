<script setup lang="ts">
import { ref } from 'vue'
import { login, shouldPromptPhoneBind, markPhonePromptShown } from '@/services/auth'

const emit = defineEmits<{
  loginSuccess: []
}>()

const loading = ref(false)
const errorMsg = ref('')
const showPhonePrompt = ref(false)

async function handleWechatLogin() {
  loading.value = true
  errorMsg.value = ''
  try {
    const result = await login()
    uni.showToast({ title: `欢迎，${result.user.nickname}`, icon: 'success' })

    // 新用户且未绑定手机号：引导授权
    if (result.isNewUser && shouldPromptPhoneBind(result.user)) {
      showPhonePrompt.value = true
    } else {
      emit('loginSuccess')
    }
  } catch (err: any) {
    errorMsg.value = err.message || '登录失败，请重试'
  } finally {
    loading.value = false
  }
}

function handleSkipPhone() {
  markPhonePromptShown()
  showPhonePrompt.value = false
  emit('loginSuccess')
}

function handlePhoneBound() {
  markPhonePromptShown()
  showPhonePrompt.value = false
  emit('loginSuccess')
}

/** handleGetPhoneNumber 回调（来自 button open-type="getPhoneNumber"） */
async function handleGetPhoneNumber(e: any) {
  const code = e.detail?.code
  if (!code) {
    handleSkipPhone()
    return
  }
  try {
    const { bindPhone } = await import('@/services/auth')
    await bindPhone(code)
    uni.showToast({ title: '手机号已绑定', icon: 'success' })
    handlePhoneBound()
  } catch (err: any) {
    uni.showToast({ title: err.message || '绑定失败', icon: 'none' })
    handleSkipPhone()
  }
}
</script>

<template>
  <view class="login-guide">
    <!-- 手机号授权引导（新用户首次登录后） -->
    <view v-if="showPhonePrompt" class="lg-card">
      <text class="lg-icon">📱</text>
      <text class="lg-title">绑定手机号</text>
      <text class="lg-desc">绑定后可跨设备同步记录，换手机不丢失</text>

      <button
        class="lg-btn lg-btn-phone"
        open-type="getPhoneNumber"
        @getphonenumber="handleGetPhoneNumber"
      >
        授权手机号
      </button>

      <view class="lg-skip" @click="handleSkipPhone">
        <text>暂时跳过</text>
      </view>
    </view>

    <!-- 登录引导 -->
    <view v-else class="lg-card">
      <text class="lg-icon">🔮</text>
      <text class="lg-title">登录后同步占卜记录</text>
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

.lg-btn-phone {
  background: linear-gradient(135deg, #576bff, #4a5af0);
}

.lg-skip {
  margin-top: 24rpx;
  padding: 8rpx 24rpx;

  text {
    font-size: 26rpx;
    color: $text-muted;
  }
}

.lg-error {
  margin-top: 16rpx;
  font-size: 24rpx;
  color: $danger;
}
</style>
