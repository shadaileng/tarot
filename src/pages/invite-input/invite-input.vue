<script setup lang="ts">
import { ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { navBack, showToast } from '@/utils'
import { bindReferral, fetchInviteRecords } from '@/services/user-stats'
import type { InviterInfo } from '@/types'
import { logInfo, logError, startTrace, endTrace } from '@/services/client-logger'

const code = ref('')
const loading = ref(false)
const error = ref('')
const inviter = ref<InviterInfo | null>(null)

onShow(async () => {
  try {
    const data = await fetchInviteRecords()
    inviter.value = data.inviter
    logInfo('user_action', 'invite_records_load', { result: 'success' })
  } catch (e) {
    logError('user_action', 'invite_records_load', e instanceof Error ? e.message : '未知错误')
  }
})

async function doBind() {
  const trimmed = code.value.trim()
  if (!trimmed || trimmed.length !== 6) {
    error.value = '请输入 6 位邀请码'
    return
  }
  startTrace()
  loading.value = true
  error.value = ''
  try {
    await bindReferral(trimmed)
    logInfo('user_action', 'invite_bind', { result: 'success' })
    showToast('邀请码绑定成功！', 'success')
    setTimeout(() => navBack(), 1500)
  } catch (e: any) {
    logError('user_action', 'invite_bind', e.message || '绑定失败')
    error.value = e.message || '绑定失败'
  } finally {
    loading.value = false
    endTrace()
  }
}
</script>

<template>
  <view class="page-container invite-input-page">
    <view v-if="inviter" class="inviter-card">
      <text class="inviter-icon">🎉</text>
      <view class="inviter-info">
        <text class="inviter-label">已绑定邀请人</text>
        <text class="inviter-name">{{ inviter.nickname }}</text>
        <text class="inviter-code">邀请码：{{ inviter.referralCode }}</text>
      </view>
    </view>

    <view class="input-card">
      <text class="page-title">{{ inviter ? '已绑定邀请人' : '输入邀请码' }}</text>
      <text class="page-desc">输入好友的 6 位邀请码，双方均可获得额外奖励</text>

      <template v-if="!inviter">
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
      </template>

      <view v-else class="bound-hint">
        <text>已绑定邀请人，无需重复操作</text>
      </view>

      <view class="reward-section">
        <text class="reward-title">邀请奖励</text>
        <text class="reward-item">• 邀请 1 位好友：+50 积分 + 10 次额度</text>
        <text class="reward-item">• 邀请 3 位好友：+200 积分 + 30 次额度</text>
        <text class="reward-item">• 被邀请人完成首次抽牌后自动发放</text>
      </view>
    </view>
  </view>
</template>

<style lang="scss" scoped>
.invite-input-page {
  padding: 40rpx 32rpx;
}

.inviter-card {
  background: linear-gradient(135deg, rgba($success, 0.15), rgba($accent-gold, 0.1));
  border-radius: $radius-md;
  padding: 24rpx 28rpx;
  margin-bottom: 24rpx;
  display: flex;
  align-items: center;
  gap: 16rpx;
  border: 1rpx solid rgba($success, 0.3);
}

.inviter-icon {
  font-size: 40rpx;
}

.inviter-info {
  flex: 1;
}

.inviter-label {
  font-size: 22rpx;
  color: $success;
  display: block;
  margin-bottom: 4rpx;
}

.inviter-name {
  font-size: 28rpx;
  color: $text-white;
  font-weight: 600;
  display: block;
}

.inviter-code {
  font-size: 22rpx;
  color: $text-muted;
  font-family: monospace;
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

.bound-hint {
  text-align: center;
  color: $text-muted;
  font-size: 26rpx;
  padding: 40rpx 0;
  margin-bottom: 32rpx;
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
