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

// ========== 脱敏工具 ==========
function maskMiddle(val: string, keep = 3): string {
  if (!val || val.length <= keep * 2) return val || ''
  return val.slice(0, keep) + '***' + val.slice(-keep)
}

function maskPhone(phone: string): string {
  if (!phone || phone.length < 11) return phone || ''
  return phone.slice(0, 3) + '****' + phone.slice(-4)
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
      <!-- 标题栏：左标题 + 右同步状态 -->
      <view class="title-bar">
        <text class="title-bar-text">📱 用户信息</text>
        <text v-if="store.isSyncing" class="title-bar-sync">☁️ 同步中...</text>
      </view>

      <!-- 头像 + 昵称/ID（头像占两行高度） -->
      <view class="summary">
        <!-- 圆形头像 -->
        <view class="summary-avatar" @click="handleChangeAvatar">
          <image
            v-if="userInfo.avatarUrl"
            class="summary-avatar-img"
            :src="userInfo.avatarUrl"
            mode="aspectFill"
          />
          <text v-else class="summary-avatar-placeholder">🃏</text>
          <view class="summary-avatar-overlay">
            <text>换</text>
          </view>
        </view>

        <!-- 昵称 + ID（两行，靠左） -->
        <view class="summary-text">
          <!-- 昵称行 -->
          <view v-if="!editingNickname" class="st-row st-nickname-row" @click="startEditNickname">
            <text class="st-nickname">{{ userInfo.nickname }}</text>
            <text class="st-edit-icon">✎</text>
          </view>
          <view v-else class="st-row st-nickname-edit">
            <input
              v-model="nicknameInput"
              class="st-nickname-input"
              maxlength="30"
              :focus="true"
              @blur="saveNickname"
              @confirm="saveNickname"
            />
            <text class="st-nickname-save" @click="saveNickname">
              {{ nicknameSaving ? '保存中...' : '保存' }}
            </text>
          </view>

          <!-- ID 行 -->
          <view class="st-row">
            <text class="st-id-label">ID</text>
            <text class="st-id-value">{{ maskMiddle(userInfo.id, 4) }}</text>
          </view>
        </view>
      </view>

      <!-- 绑定信息（邮箱 + 手机号） -->
      <view class="bindings">
        <!-- 邮箱 -->
        <view class="b-row" v-if="!userInfo.email">
          <button class="b-btn" @click="bindEmailOpen = true">
            ✉️ 绑定邮箱
          </button>
        </view>
        <view v-else class="b-row b-row-bound">
          <text class="b-label">✉️</text>
          <text class="b-value">{{ userInfo.email }}</text>
        </view>

        <!-- 手机号 -->
        <!-- #ifdef MP-WEIXIN -->
        <view class="b-row" v-if="!userInfo.phone">
          <button
            class="b-btn b-btn-phone"
            open-type="getPhoneNumber"
            :loading="phoneBinding"
            @getphonenumber="handleGetPhoneNumber"
          >
            📱 绑定手机号
          </button>
        </view>
        <view v-else class="b-row b-row-bound">
          <text class="b-label">📱</text>
          <text class="b-value">{{ maskPhone(userInfo.phone) }}</text>
        </view>
        <!-- #endif -->
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
  padding: 28rpx 32rpx;
  margin-bottom: 32rpx;
}

// 标题栏：左右分布
.title-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24rpx;
}

.title-bar-text {
  font-size: 30rpx;
  font-weight: 600;
  color: $text-white;
}

.title-bar-sync {
  font-size: 22rpx;
  color: $text-muted;
}

// ---------- 头像 + 信息摘要 ----------
.summary {
  display: flex;
  align-items: center;
  gap: 20rpx;
  margin-bottom: 24rpx;
}

// 圆形头像（两行高度）
.summary-avatar {
  position: relative;
  width: 88rpx;
  height: 88rpx;
  border-radius: $radius-round;
  overflow: hidden;
  flex-shrink: 0;
}

.summary-avatar-img {
  width: 100%;
  height: 100%;
  border-radius: $radius-round;
}

.summary-avatar-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(201, 169, 110, 0.2);
  font-size: 36rpx;
  border-radius: $radius-round;
}

.summary-avatar-overlay {
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
    font-size: 20rpx;
    color: #fff;
  }
}

.summary-avatar:active .summary-avatar-overlay {
  opacity: 1;
}

// 昵称 + ID（两行文本）
.summary-text {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 6rpx;
}

.st-row {
  display: flex;
  align-items: center;
  gap: 8rpx;
}

// 昵称
.st-nickname-row {
  height: 40rpx;
}

.st-nickname {
  font-size: 30rpx;
  font-weight: 600;
  color: $text-white;
}

.st-edit-icon {
  font-size: 26rpx;
  color: $text-muted;
}

// 昵称编辑态
.st-nickname-edit {
  display: flex;
  align-items: center;
  gap: 8rpx;
}

.st-nickname-input {
  flex: 1;
  height: 48rpx;
  background: rgba(255, 255, 255, 0.1);
  border-radius: $radius-sm;
  padding: 0 12rpx;
  font-size: 26rpx;
  color: $text-white;
}

.st-nickname-save {
  font-size: 24rpx;
  color: $accent-gold;
  flex-shrink: 0;
}

// ID
.st-id-label {
  font-size: 22rpx;
  color: $text-muted;
}

.st-id-value {
  font-size: 22rpx;
  color: $text-muted;
  font-family: monospace;
}

// ---------- 绑定信息 ----------
.bindings {
  display: flex;
  flex-direction: column;
  gap: 12rpx;
  padding-left: 108rpx;
  margin-bottom: 8rpx;
}

.b-row {
  display: flex;
  align-items: center;
  gap: 8rpx;
}

.b-row-bound {
  .b-label {
    font-size: 24rpx;
  }

  .b-value {
    font-size: 24rpx;
    color: $text-secondary;
  }
}

.b-label {
  font-size: 24rpx;
}

.b-value {
  font-size: 24rpx;
  color: $text-secondary;
}

// 绑定按钮
.b-btn {
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

.b-btn-phone {
  background: rgba(7, 193, 96, 0.12);
  color: #07c160;
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
