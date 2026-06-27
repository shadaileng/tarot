<script setup lang="ts">
import { ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { navBack } from '@/utils'
import {
  isLoggedIn, getUserInfo, logout,
  updateProfile, bindEmail as bindEmailApi,
} from '@/services/auth'
import type { UserInfo } from '@/services/auth'

const userInfo = ref<UserInfo | null>(getUserInfo())

onShow(() => {
  if (!isLoggedIn()) {
    uni.showToast({ title: '请先登录', icon: 'none' })
    uni.switchTab({ url: '/pages/profile/profile' })
    return
  }
  userInfo.value = getUserInfo()
})

const genderLabels = ['保密', '男', '女']
const genderIndex = ref(0)
const saving = ref(false)

function syncGender() {
  if (userInfo.value?.gender != null) {
    genderIndex.value = userInfo.value.gender
  }
}

const nicknameInput = ref('')
const editingNickname = ref(false)

function startEditNickname() {
  nicknameInput.value = userInfo.value?.nickname || ''
  editingNickname.value = true
}

async function saveNickname() {
  const name = nicknameInput.value.trim()
  if (!name) return
  saving.value = true
  try {
    const result = await updateProfile({ nickname: name })
    userInfo.value = result.user
  } catch (err: any) {
    uni.showToast({ title: err.message || '保存失败', icon: 'none' })
  } finally {
    editingNickname.value = false
    saving.value = false
  }
}

async function handleAvatarChange() {
  // #ifdef MP-WEIXIN
  try {
    const res = await uni.chooseImage({
      count: 1,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
    })
    const tempPath = res.tempFilePaths[0]
    saving.value = true
    const fs = uni.getFileSystemManager()
    const base64: string = await new Promise((resolve, reject) => {
      fs.readFile({
        filePath: tempPath,
        encoding: 'base64',
        success(res) { resolve(res.data as string) },
        fail(err) { reject(new Error(err.errMsg || '读取文件失败')) },
      })
    })
    const ext = (tempPath.match(/\.(\w+)(\?|$)/) || ['', 'jpg'])[1]
    const avatarUrl = `data:image/${ext};base64,${base64}`
    const result = await updateProfile({ avatarUrl })
    userInfo.value = result.user
    uni.showToast({ title: '头像已更新', icon: 'success' })
  } catch (err: any) {
    if (err.errMsg?.includes('cancel')) return
    uni.showToast({ title: err.message || '更换失败', icon: 'none' })
  } finally {
    saving.value = false
  }
  // #endif

  // #ifdef H5
  uni.showToast({ title: 'H5 端暂不支持头像上传', icon: 'none' })
  // #endif
}

async function handleGenderChange(e: any) {
  const idx = e.detail?.value
  if (idx == null) return
  genderIndex.value = idx
  saving.value = true
  try {
    const result = await updateProfile({ gender: idx })
    userInfo.value = result.user
  } catch (err: any) {
    uni.showToast({ title: err.message || '保存失败', icon: 'none' })
  } finally {
    saving.value = false
  }
}

async function handleBirthdayChange(e: any) {
  const date = e.detail?.value
  if (!date) return
  saving.value = true
  try {
    const result = await updateProfile({ birthday: date })
    userInfo.value = result.user
  } catch (err: any) {
    uni.showToast({ title: err.message || '保存失败', icon: 'none' })
  } finally {
    saving.value = false
  }
}

// ========== 邮箱绑定 ==========
const bindEmailOpen = ref(false)
const bindEmailAddr = ref('')
const bindEmailPass = ref('')
const bindEmailLoading = ref(false)

async function handleBindEmail() {
  const email = bindEmailAddr.value.trim()
  const pwd = bindEmailPass.value.trim()
  if (!email || !pwd) {
    uni.showToast({ title: '请填写完整信息', icon: 'none' })
    return
  }
  bindEmailLoading.value = true
  try {
    await bindEmailApi(email, pwd)
    userInfo.value = getUserInfo()
    bindEmailOpen.value = false
    uni.showToast({ title: '邮箱绑定成功', icon: 'success' })
  } catch (err: any) {
    uni.showToast({ title: err.message || '绑定失败', icon: 'none' })
  } finally {
    bindEmailLoading.value = false
  }
}

// ========== 退出登录 ==========
function handleLogout() {
  uni.showModal({
    title: '确认退出',
    content: '退出登录后记录仍保留在本地。',
    success: (res) => {
      if (res.confirm) {
        logout()
        uni.showToast({ title: '已退出', icon: 'success' })
        navBack()
      }
    },
  })
}
</script>

<template>
  <view v-if="userInfo" class="page-container detail-page">
    <!-- 头像 -->
    <view class="avatar-section" @click="handleAvatarChange">
      <image
        v-if="userInfo.avatarUrl"
        class="avatar-img"
        :src="userInfo.avatarUrl"
        mode="aspectFill"
      />
      <text v-else class="avatar-placeholder">🃏</text>
      <text class="avatar-hint">点击更换头像</text>
    </view>

    <!-- 资料表单 -->
    <view class="form-section">
      <!-- 昵称 -->
      <view class="form-row">
        <text class="form-label">昵称</text>
        <view v-if="!editingNickname" class="form-value-row" @click="startEditNickname">
          <text class="form-value form-value-clickable">{{ userInfo.nickname }}</text>
          <text class="form-edit-hint">✎</text>
        </view>
        <input
          v-else
          v-model="nicknameInput"
          class="form-input"
          maxlength="30"
          :focus="true"
          @blur="saveNickname"
          @confirm="saveNickname"
        />
      </view>

      <!-- 分隔线 -->
      <view class="form-divider"></view>

      <!-- 性别 -->
      <view class="form-row">
        <text class="form-label">性别</text>
        <picker
          :value="genderIndex"
          :range="genderLabels"
          @change="handleGenderChange"
        >
          <view class="form-value-row">
            <text class="form-value form-value-clickable">{{ genderLabels[genderIndex] }}</text>
            <text class="form-arrow">›</text>
          </view>
        </picker>
      </view>

      <view class="form-divider"></view>

      <!-- 生日 -->
      <view class="form-row">
        <text class="form-label">生日</text>
        <picker
          mode="date"
          :value="userInfo.birthday || ''"
          :start="'1900-01-01'"
          :end="new Date().toISOString().split('T')[0]"
          @change="handleBirthdayChange"
        >
          <view class="form-value-row">
            <text class="form-value form-value-clickable">
              {{ userInfo.birthday || '未设置' }}
            </text>
            <text class="form-arrow">›</text>
          </view>
        </picker>
      </view>

      <view class="form-divider"></view>

      <!-- 邮箱 -->
      <view class="form-row">
        <text class="form-label">邮箱</text>
        <view v-if="!userInfo.email" class="form-value-row">
          <button class="form-bind-btn" @click="bindEmailOpen = true">
            绑定邮箱
          </button>
        </view>
        <text v-else class="form-value">{{ userInfo.email }}</text>
      </view>
    </view>

    <!-- 退出登录 -->
    <view class="logout-section" @click="handleLogout">
      <text>退出登录</text>
    </view>

    <!-- 邮箱绑定弹窗 -->
    <view v-if="bindEmailOpen" class="modal-mask" @click="bindEmailOpen = false">
      <view class="modal-card" @click.stop>
        <text class="modal-title">绑定邮箱</text>
        <text class="modal-desc">绑定后可跨设备查看记录</text>
        <input
          v-model="bindEmailAddr"
          class="modal-input"
          type="text"
          placeholder="请输入邮箱地址"
        />
        <input
          v-model="bindEmailPass"
          class="modal-input"
          type="password"
          placeholder="设置登录密码（至少6位）"
        />
        <view class="modal-actions">
          <button class="modal-btn modal-btn-cancel" @click="bindEmailOpen = false">取消</button>
          <button
            class="modal-btn modal-btn-confirm"
            :loading="bindEmailLoading"
            @click="handleBindEmail"
          >
            确认绑定
          </button>
        </view>
      </view>
    </view>

    <!-- 加载提示 -->
    <view v-if="saving" class="saving-toast">保存中...</view>
  </view>
</template>

<style lang="scss" scoped>
.detail-page {
  padding: 32rpx 24rpx;
  padding-bottom: 60rpx;
}

// ========== 头像区域 ==========
.avatar-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 32rpx 0;
}

.avatar-img {
  width: 120rpx;
  height: 120rpx;
  border-radius: $radius-round;
}

.avatar-placeholder {
  width: 120rpx;
  height: 120rpx;
  border-radius: $radius-round;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(201, 169, 110, 0.2);
  font-size: 48rpx;
}

.avatar-hint {
  font-size: 24rpx;
  color: $text-muted;
  margin-top: 12rpx;
}

// ========== 表单区域 ==========
.form-section {
  background: $bg-card;
  border-radius: $radius-md;
  padding: 0 32rpx;
  margin-top: 24rpx;
}

.form-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 88rpx;
}

.form-label {
  font-size: 28rpx;
  color: $text-white;
  flex-shrink: 0;
}

.form-value-row {
  display: flex;
  align-items: center;
  gap: 8rpx;
}

.form-value {
  font-size: 28rpx;
  color: $text-secondary;
}

.form-value-clickable {
  cursor: pointer;
}

.form-edit-hint {
  font-size: 24rpx;
  color: $text-muted;
}

.form-input {
  width: 240rpx;
  height: 56rpx;
  background: rgba(255, 255, 255, 0.08);
  border-radius: $radius-sm;
  padding: 0 16rpx;
  font-size: 28rpx;
  color: $text-white;
  text-align: right;
}

.form-arrow {
  font-size: 32rpx;
  color: $text-muted;
}

.form-divider {
  height: 1rpx;
  background: rgba(255, 255, 255, 0.06);
}

.form-bind-btn {
  font-size: 24rpx;
  color: $accent-gold;
  background: rgba(201, 169, 110, 0.1);
  border: none;
  padding: 6rpx 16rpx;
  border-radius: 20rpx;
  line-height: 1.6;

  &::after {
    border: none;
  }
}

// ========== 退出登录 ==========
.logout-section {
  margin-top: 48rpx;
  text-align: center;
  padding: 24rpx 0;

  text {
    font-size: 28rpx;
    color: $danger;
  }
}

// ========== 邮箱绑定弹窗 ==========
.modal-mask {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-card {
  background: $bg-card;
  border-radius: $radius-md;
  padding: 40rpx 32rpx;
  width: 580rpx;
  max-width: 90vw;
}

.modal-title {
  font-size: 34rpx;
  font-weight: 600;
  color: $text-white;
  display: block;
  text-align: center;
  margin-bottom: 8rpx;
}

.modal-desc {
  font-size: 24rpx;
  color: $text-muted;
  display: block;
  text-align: center;
  margin-bottom: 32rpx;
}

.modal-input {
  width: 100%;
  height: 80rpx;
  background: rgba(255, 255, 255, 0.06);
  border-radius: $radius-sm;
  padding: 0 20rpx;
  font-size: 28rpx;
  color: $text-white;
  margin-bottom: 16rpx;
  box-sizing: border-box;
}

.modal-actions {
  display: flex;
  gap: 20rpx;
  margin-top: 24rpx;
}

.modal-btn {
  flex: 1;
  height: 80rpx;
  border-radius: $radius-sm;
  font-size: 28rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;

  &::after {
    border: none;
  }
}

.modal-btn-cancel {
  background: rgba(255, 255, 255, 0.06);
  color: $text-secondary;
}

.modal-btn-confirm {
  background: $accent-gold;
  color: $bg-primary;
  font-weight: 600;
}

// ========== 保存提示 ==========
.saving-toast {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: rgba(0, 0, 0, 0.8);
  color: #fff;
  padding: 16rpx 32rpx;
  border-radius: $radius-sm;
  font-size: 26rpx;
  z-index: 2000;
}
</style>
