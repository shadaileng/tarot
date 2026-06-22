<script setup lang="ts">
import { ref } from 'vue'
import { navTo } from '@/utils'
import TabBar from '@/components/TabBar/TabBar.vue'
import LoginGuide from '@/components/LoginGuide/LoginGuide.vue'
import {
  isLoggedIn, getUserInfo, logout, login,
  updateProfile, bindEmail as bindEmailApi, bindPhone as bindPhoneApi,
} from '@/services/auth'
import type { UserInfo } from '@/services/auth'
import { useTarotStore } from '@/store'

const store = useTarotStore()

// ========== 登录态 ==========
const loggedIn = ref(isLoggedIn())
const userInfo = ref<UserInfo | null>(getUserInfo())

function handleLoginSuccess() {
  loggedIn.value = true
  userInfo.value = getUserInfo()
}

function handleLogout() {
  uni.showModal({
    title: '确认退出',
    content: '退出登录后记录仍保留在本地。',
    success: (res) => {
      if (res.confirm) {
        logout()
        loggedIn.value = false
        userInfo.value = null
        uni.showToast({ title: '已退出', icon: 'success' })
      }
    },
  })
}

// ========== 资料编辑 ==========
const editingNickname = ref(false)
const nicknameInput = ref('')
const nicknameSaving = ref(false)

function startEditNickname() {
  nicknameInput.value = userInfo.value?.nickname || ''
  editingNickname.value = true
}

async function saveNickname() {
  const name = nicknameInput.value.trim()
  if (!name) {
    uni.showToast({ title: '昵称不能为空', icon: 'none' })
    return
  }
  nicknameSaving.value = true
  try {
    const result = await updateProfile({ nickname: name })
    userInfo.value = result.user
    editingNickname.value = false
    uni.showToast({ title: '昵称已更新', icon: 'success' })
  } catch (err: any) {
    uni.showToast({ title: err.message || '更新失败', icon: 'none' })
  } finally {
    nicknameSaving.value = false
  }
}

// ========== 头像更换 ==========
const avatarUploading = ref(false)

async function handleChangeAvatar() {
  // #ifdef MP-WEIXIN
  try {
    const res = await uni.chooseImage({
      count: 1,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
    })
    const tempPath = res.tempFilePaths[0]
    avatarUploading.value = true
    const fs = uni.getFileSystemManager()
    const base64 = fs.readFileSync(tempPath, 'base64') as string
    const ext = tempPath.split('.').pop() || 'jpg'
    const avatarUrl = `data:image/${ext};base64,${base64}`
    const result = await updateProfile({ avatarUrl })
    userInfo.value = result.user
    uni.showToast({ title: '头像已更新', icon: 'success' })
  } catch (err: any) {
    if (err.errMsg?.includes('cancel')) return
    uni.showToast({ title: err.message || '更换失败', icon: 'none' })
  } finally {
    avatarUploading.value = false
  }
  // #endif

  // #ifdef H5
  uni.showToast({ title: 'H5 端暂不支持头像上传', icon: 'none' })
  // #endif
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

// ========== 手机号绑定 ==========
const phoneBinding = ref(false)

async function handleGetPhoneNumber(e: any) {
  const code = e.detail?.code
  if (!code) {
    uni.showToast({ title: '授权已取消', icon: 'none' })
    return
  }
  phoneBinding.value = true
  try {
    const result = await bindPhoneApi(code)
    userInfo.value = getUserInfo()
    uni.showToast({ title: '手机号绑定成功', icon: 'success' })
  } catch (err: any) {
    uni.showToast({ title: err.message || '绑定失败', icon: 'none' })
  } finally {
    phoneBinding.value = false
  }
}

// ========== TabBar ==========
const tabList = [
  { pagePath: 'pages/index/index', text: '首页' },
  { pagePath: 'pages/draw/draw', text: '抽牌' },
  { pagePath: 'pages/cards/cards', text: '牌库' },
  { pagePath: 'pages/profile/profile', text: '我的' },
]

function handleTabChange(path: string) {
  uni.switchTab({ url: '/' + path })
}
</script>

<template>
  <view class="page-container profile-page">
    <!-- ========== 用户资料区 ========== -->
    <!-- 已登录：展示资料卡片 -->
    <view v-if="loggedIn && userInfo" class="profile-card">
      <!-- 头像 + 基本信息 -->
      <view class="profile-top">
        <view class="profile-avatar-wrap" @click="handleChangeAvatar">
          <image
            v-if="userInfo.avatarUrl"
            class="profile-avatar"
            :src="userInfo.avatarUrl"
            mode="aspectFill"
          />
          <text v-else class="profile-avatar-placeholder">🃏</text>
          <view class="profile-avatar-overlay">
            <text>换</text>
          </view>
        </view>

        <view class="profile-info">
          <!-- 昵称 -->
          <view v-if="!editingNickname" class="profile-nickname-row" @click="startEditNickname">
            <text class="profile-nickname">{{ userInfo.nickname }}</text>
            <text class="profile-edit-icon">✎</text>
          </view>
          <view v-else class="profile-nickname-edit">
            <input
              v-model="nicknameInput"
              class="nickname-input"
              maxlength="30"
              :focus="true"
              @blur="saveNickname"
              @confirm="saveNickname"
            />
            <text class="nickname-save" @click="saveNickname">
              {{ nicknameSaving ? '保存中...' : '保存' }}
            </text>
          </view>

          <!-- 绑定信息 -->
          <view class="profile-bindings">
            <!-- 手机号 -->
            <!-- #ifdef MP-WEIXIN -->
            <view class="pb-item" v-if="!userInfo.phone">
              <button
                class="pb-btn pb-btn-phone"
                open-type="getPhoneNumber"
                :loading="phoneBinding"
                @getphonenumber="handleGetPhoneNumber"
              >
                📱 绑定手机号
              </button>
            </view>
            <view v-else class="pb-item pb-item-bound">
              <text class="pb-label">📱</text>
              <text class="pb-value">{{ userInfo.phone }}</text>
            </view>
            <!-- #endif -->

            <!-- 邮箱 -->
            <view v-if="!userInfo.email" class="pb-item">
              <button class="pb-btn" @click="bindEmailOpen = true">
                ✉️ 绑定邮箱
              </button>
            </view>
            <view v-else class="pb-item pb-item-bound">
              <text class="pb-label">✉️</text>
              <text class="pb-value">{{ userInfo.email }}</text>
            </view>
          </view>
        </view>
      </view>

      <!-- 同步状态 -->
      <view v-if="store.isSyncing" class="profile-sync">
        <text>☁️ 同步中...</text>
      </view>

      <!-- 退出按钮 -->
      <view class="profile-logout" @click="handleLogout">
        <text>退出登录</text>
      </view>
    </view>

    <!-- 未登录：展示登录引导 -->
    <LoginGuide v-if="!loggedIn" @login-success="handleLoginSuccess" />

    <!-- ========== 邮箱绑定弹窗 ========== -->
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

    <!-- 自定义底部导航 -->
    <TabBar :current-path="'pages/profile/profile'" :tabs="tabList" @change="handleTabChange" />
  </view>
</template>

<style lang="scss" scoped>
.profile-page {
  padding: 24rpx;
  padding-bottom: 40rpx;
}

// ========== 用户资料卡片 ==========
.profile-card {
  background: $bg-card;
  border-radius: $radius-md;
  padding: 32rpx;
  margin-bottom: 32rpx;
}

.profile-top {
  display: flex;
  gap: 24rpx;
}

.profile-avatar-wrap {
  position: relative;
  width: 120rpx;
  height: 120rpx;
  border-radius: $radius-round;
  overflow: hidden;
  flex-shrink: 0;
}

.profile-avatar {
  width: 100%;
  height: 100%;
  border-radius: $radius-round;
}

.profile-avatar-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(201, 169, 110, 0.2);
  font-size: 48rpx;
  border-radius: $radius-round;
}

.profile-avatar-overlay {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.2s;
  border-radius: $radius-round;

  text {
    font-size: 22rpx;
    color: #fff;
  }
}

.profile-avatar-wrap:active .profile-avatar-overlay {
  opacity: 1;
}

.profile-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 12rpx;
}

// 昵称
.profile-nickname-row {
  display: flex;
  align-items: center;
  gap: 8rpx;
}

.profile-nickname {
  font-size: 34rpx;
  font-weight: 600;
  color: $text-white;
}

.profile-edit-icon {
  font-size: 28rpx;
  color: $text-muted;
}

.profile-nickname-edit {
  display: flex;
  align-items: center;
  gap: 12rpx;
}

.nickname-input {
  flex: 1;
  height: 56rpx;
  background: rgba(255,255,255,0.1);
  border-radius: $radius-sm;
  padding: 0 16rpx;
  font-size: 28rpx;
  color: $text-white;
}

.nickname-save {
  font-size: 26rpx;
  color: $accent-gold;
  flex-shrink: 0;
}

// 绑定信息
.profile-bindings {
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}

.pb-item {
  display: flex;
}

.pb-btn {
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

.pb-btn-phone {
  background: rgba(7, 193, 96, 0.12);
  color: #07c160;
}

.pb-item-bound {
  display: flex;
  align-items: center;
  gap: 6rpx;
}

.pb-label {
  font-size: 24rpx;
}

.pb-value {
  font-size: 24rpx;
  color: $text-secondary;
}

// 同步状态
.profile-sync {
  text-align: center;
  padding: 12rpx 0 0;

  text {
    font-size: 22rpx;
    color: $text-muted;
  }
}

// 退出
.profile-logout {
  text-align: center;
  margin-top: 24rpx;
  padding-top: 20rpx;
  border-top: 1rpx solid rgba(255,255,255,0.06);

  text {
    font-size: 26rpx;
    color: $text-muted;
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
  background: rgba(255,255,255,0.06);
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
  background: rgba(255,255,255,0.06);
  color: $text-secondary;
}

.modal-btn-confirm {
  background: $accent-gold;
  color: $bg-primary;
  font-weight: 600;
}
</style>
