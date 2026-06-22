<script setup lang="ts">
import { ref, computed } from 'vue'
import { emailLogin, emailRegister } from '@/services/auth'

const emit = defineEmits<{
  loginSuccess: []
}>()

type Mode = 'login' | 'register'

const mode = ref<Mode>('login')
const email = ref('')
const password = ref('')
const loading = ref(false)
const errorMsg = ref('')

const isLogin = computed(() => mode.value === 'login')
const title = computed(() => isLogin.value ? '邮箱登录' : '创建账号')
const buttonText = computed(() => {
  if (loading.value) return isLogin.value ? '登录中...' : '注册中...'
  return isLogin.value ? '登录' : '注册'
})
const switchText = computed(() => isLogin.value ? '没有账号？去注册' : '已有账号？去登录')

async function handleSubmit() {
  if (!email.value.trim()) {
    errorMsg.value = '请输入邮箱地址'
    return
  }
  if (!password.value) {
    errorMsg.value = '请输入密码'
    return
  }

  loading.value = true
  errorMsg.value = ''
  try {
    const result = isLogin.value
      ? await emailLogin(email.value.trim(), password.value)
      : await emailRegister(email.value.trim(), password.value)

    const name = result.user.nickname || email.value.trim()
    uni.showToast({ title: `${isLogin.value ? '欢迎回来' : '注册成功'}，${name}`, icon: 'success' })
    emit('loginSuccess')
  } catch (err: any) {
    errorMsg.value = err.message || (isLogin.value ? '登录失败，请重试' : '注册失败，请重试')
  } finally {
    loading.value = false
  }
}

function toggleMode() {
  mode.value = isLogin.value ? 'register' : 'login'
  errorMsg.value = ''
}
</script>

<template>
  <view class="login-guide">
    <view class="lg-card">
      <text class="lg-icon">🔮</text>
      <text class="lg-title">{{ title }}</text>
      <text class="lg-desc">登录后可云端保存记录，换设备不丢失</text>

      <view class="lg-form">
        <input
          v-model="email"
          class="lg-input"
          placeholder="邮箱地址"
          type="text"
          placeholder-style="color: rgba(255,255,255,0.35)"
        />
        <input
          v-model="password"
          class="lg-input"
          placeholder="密码"
          type="password"
          placeholder-style="color: rgba(255,255,255,0.35)"
        />

        <view
          class="lg-btn"
          :class="{ 'lg-btn-loading': loading }"
          @click="handleSubmit"
        >
          <text>{{ buttonText }}</text>
        </view>

        <view class="lg-switch" @click="toggleMode">
          <text>{{ switchText }}</text>
        </view>
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

.lg-form {
  width: 100%;
  max-width: 480rpx;
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

.lg-input {
  width: 100%;
  height: 80rpx;
  padding: 0 24rpx;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: $radius-sm;
  font-size: 28rpx;
  color: $text-white;
  box-sizing: border-box;
}

.lg-btn {
  width: 100%;
  height: 88rpx;
  background: linear-gradient(135deg, #576bff, #4a5af0);
  border-radius: $radius-md;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-top: 8rpx;

  text {
    color: #fff;
    font-size: 30rpx;
    font-weight: 600;
  }

  &.lg-btn-loading {
    opacity: 0.7;
  }
}

.lg-switch {
  padding: 8rpx 0;

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
