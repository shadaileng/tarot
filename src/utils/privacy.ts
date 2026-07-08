/**
 * 隐私授权工具函数
 * 处理微信小程序隐私API授权逻辑
 */

/** 存储隐私授权的 resolve 回调 */
let privacyResolve: ((value: { event: string }) => void) | null = null

/** 标记是否已注册监听 */
let isListenerRegistered = false

/**
 * 注册隐私授权监听（应在 App.vue onLaunch 中调用）
 */
export function registerPrivacyListener() {
  // #ifdef MP-WEIXIN
  if (isListenerRegistered) return
  if (typeof wx === 'undefined' || !wx.onNeedPrivacyAuthorization) return

  wx.onNeedPrivacyAuthorization((resolve: (value: { event: string }) => void) => {
    // 存储 resolve，等待用户点击同意后调用
    privacyResolve = resolve
    // 触发全局事件，让 PrivacyModal 组件显示
    uni.$emit('showPrivacyModal')
  })

  isListenerRegistered = true
  // #endif
}

/**
 * 用户同意隐私授权
 */
export function agreePrivacy() {
  if (privacyResolve) {
    privacyResolve({ event: 'agree' })
    privacyResolve = null
    uni.$emit('hidePrivacyModal')
  }
}

/**
 * 用户拒绝隐私授权
 */
export function rejectPrivacy() {
  privacyResolve = null
  uni.$emit('hidePrivacyModal')
  // 给出提示，10秒后可再次触发
  uni.showToast({
    title: '需要同意隐私协议才能使用该功能',
    icon: 'none',
    duration: 2000,
  })
}

/**
 * 打开隐私协议页面
 */
export function openPrivacyContract() {
  // #ifdef MP-WEIXIN
  if (typeof wx !== 'undefined' && wx.openPrivacyContract) {
    wx.openPrivacyContract({})
  }
  // #endif
}
