<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { agreePrivacy, rejectPrivacy, openPrivacyContract } from '@/utils/privacy'

const visible = ref(false)

onMounted(() => {
  uni.$on('showPrivacyModal', () => {
    visible.value = true
  })
  uni.$on('hidePrivacyModal', () => {
    visible.value = false
  })
})

onUnmounted(() => {
  uni.$off('showPrivacyModal')
  uni.$off('hidePrivacyModal')
})

function handleAgree() {
  agreePrivacy()
}

function handleReject() {
  rejectPrivacy()
}

function handleViewContract() {
  openPrivacyContract()
}
</script>

<template>
  <view v-if="visible" class="privacy-overlay" catchtouchmove>
    <view class="privacy-modal">
      <view class="privacy-header">
        <text class="privacy-title">个人信息保护提示</text>
      </view>
      <view class="privacy-body">
        <text class="privacy-content">
          感谢您使用卡牌抽牌小程序！为了保障您的合法权益，在使用保存海报功能前，请您仔细阅读并同意《用户隐私保护指引》。
        </text>
        <text class="privacy-link" @click="handleViewContract">
          查看《用户隐私保护指引》
        </text>
      </view>
      <view class="privacy-actions">
        <button
          class="privacy-btn agree-btn"
          @click="handleAgree"
        >
          同意
        </button>
        <view class="privacy-btn reject-btn" @click="handleReject">
          <text>拒绝</text>
        </view>
      </view>
    </view>
  </view>
</template>

<style lang="scss" scoped>
.privacy-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  z-index: 999;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40rpx;
}

.privacy-modal {
  width: 100%;
  max-width: 600rpx;
  background: #fff;
  border-radius: 24rpx;
  overflow: hidden;
}

.privacy-header {
  padding: 32rpx;
  border-bottom: 1rpx solid #eee;
}

.privacy-title {
  font-size: 34rpx;
  font-weight: bold;
  color: #333;
}

.privacy-body {
  padding: 32rpx;
  min-height: 200rpx;
}

.privacy-content {
  font-size: 28rpx;
  color: #666;
  line-height: 1.6;
  margin-bottom: 20rpx;
}

.privacy-link {
  font-size: 26rpx;
  color: #1890ff;
  text-decoration: underline;
}

.privacy-actions {
  display: flex;
  padding: 24rpx 32rpx 32rpx;
  gap: 24rpx;
}

.privacy-btn {
  flex: 1;
  height: 88rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 12rpx;
  font-size: 30rpx;
  font-weight: 600;
}

.agree-btn {
  background: linear-gradient(135deg, #b8943f, #d4a843);
  color: #fff;
  border: none;
}

.reject-btn {
  background: #f5f5f5;
  color: #666;
  border: 1rpx solid #ddd;
}
</style>
