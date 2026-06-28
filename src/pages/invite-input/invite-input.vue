<script setup lang="ts">
import { ref } from 'vue'
import { navBack, showToast } from '@/utils'
import { bindReferral } from '@/services/user-stats'

const code = ref('')
const loading = ref(false)
const error = ref('')

async function doBind() {
  const trimmed = code.value.trim()
  if (!trimmed || trimmed.length !== 6) {
    error.value = '请输入 6 位邀请码'
    return
  }
  loading.value = true
  error.value = ''
  try {
    await bindReferral(trimmed)
    showToast('邀请码绑定成功！', 'success')
    setTimeout(() => navBack(), 1500)
  } catch (e: any) {
    error.value = e.message || '绑定失败'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <view class="page-container invite-input-page">
    <view class="input-card">
      <text class="page-title">输入邀请码</text>
      <text class="page-desc">输入好友的 6 位邀请码，双方均可获得额外奖励</text>

      <view class="input-wrap">
        <input
          v-model="code"
          class="code-input"
          placeholder="请输入 6 位邀请码（区分大小写）"
          maxlength="6"
          auto-focus
          @input="error = ''"
        />
      </view>

      <text v-if="error" class="error-text">{{ error }}</text>

      <button
        class="submit-btn"
        :disabled="loading || code.trim().length !== 6"
        @click="doBind"
      >
        {{ loading ? '提交中...' : '确认绑定' }}
      </button>

      <view class="reward-section">
        <text class="reward-title">邀请奖励</text>
        <text class="reward-item">• 邀请 1 位好友：+50 积分 + 10 次额度</text>
        <text class="reward-item">• 邀请 3 位好友：+200 积分 + 30 次额度</text>
        <text class="reward-item">• 被邀请人完成首次占卜后自动发放</text>
      </view>
    </view>
  </view>
</template>

<style lang="scss" scoped>
.invite-input-page {
  padding: 40rpx 32rpx;
}

.input-card {
  background: $bg-card;
  border-radius: $radius-md;
  padding: 40rpx 32rpx;
}

.page-title {
  font-size: 34rpx;
  font-weight: 700;
  color: $text-white;
  display: block;
  margin-bottom: 12rpx;
}

.page-desc {
  font-size: 26rpx;
  color: $text-secondary;
  display: block;
  margin-bottom: 36rpx;
  line-height: 1.6;
}

.input-wrap {
  background: $bg-primary;
  border-radius: $radius-md;
  padding: 24rpx;
  margin-bottom: 16rpx;
  border: 2rpx solid rgba($accent-gold, 0.2);
}

.code-input {
  width: 100%;
  font-size: 40rpx;
  font-weight: 700;
  color: $accent-gold;
  text-align: center;
  letter-spacing: 12rpx;
  font-family: monospace;
  height: 60rpx;
}

.error-text {
  color: $danger;
  font-size: 24rpx;
  display: block;
  margin-bottom: 16rpx;
  text-align: center;
}

.submit-btn {
  width: 100%;
  padding: 24rpx 0;
  background: linear-gradient(135deg, $accent-gold, $accent-gold-light);
  color: $bg-primary;
  border: none;
  border-radius: $radius-md;
  font-size: 30rpx;
  font-weight: 700;
  text-align: center;
  margin-bottom: 32rpx;

  &[disabled] {
    opacity: 0.4;
  }
}

.reward-section {
  background: $bg-primary;
  border-radius: $radius-sm;
  padding: 24rpx;
}

.reward-title {
  font-size: 24rpx;
  color: $text-white;
  font-weight: 500;
  display: block;
  margin-bottom: 12rpx;
}

.reward-item {
  font-size: 22rpx;
  color: $text-muted;
  display: block;
  margin-bottom: 6rpx;
  line-height: 1.5;
}
</style>
