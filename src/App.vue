<script setup lang="ts">
import { onLaunch, onShow, onHide } from '@dcloudio/uni-app'
import { useCardStore } from '@/store'
import { isLoggedIn, getUserInfo, initAuth, login } from '@/services/auth'
import { checkBackendHealth } from '@/services/reading'
import { loadPageSections } from '@/services/page-sections'
import { loadAppConfig, appConfig } from '@/services/app-config'
import { resetAuthRefreshLock } from '@/utils/request'
import { initClientLogger, destroyClientLogger, log } from '@/services/client-logger'

// 标记是否为冷启动（onLaunch 首次触发）
let isColdLaunch = true

onLaunch(() => {
  const store = useCardStore()

  // 异步初始化（延迟到框架页面栈初始化完成后执行，避免自定义 tabBar + async onLaunch
  // 触发微信 SDK 3.x "appLaunch with non-empty page stack" 内部错误）
  setTimeout(async () => {
    // 最早初始化日志服务
    initClientLogger()

    // ========== 注册 401 回调（必须在任何可能触发 401 的操作之前）==========
    // 当业务接口返回 401 时自动触发（token 过期或无效）
    initAuth(async () => {
      console.log('🔄 登录态已过期，尝试重新登录...')
      try {
        const result = await login()
        console.log('✅ 自动登录成功', result.user.nickname)
        uni.showToast({ title: '登录已恢复', icon: 'success', duration: appConfig.TOAST_DURATION_SHORT })
      } catch (err) {
        console.warn('⚠️ 自动登录失败', err)
      } finally {
        resetAuthRefreshLock()
      }
    })

    await store.loadRecords()
    console.log('🃏 卡牌小程序启动')

    // 静默检查登录态
    if (isLoggedIn()) {
      const user = getUserInfo()
      console.log('✅ 已有有效登录态', user?.nickname)
    } else {
      console.log('👤 游客模式：未登录')
    }

    // 全局健康检查：尽早检测后端服务状态
    store.setBackendStatus(await checkBackendHealth())

    // 加载小程序远程配置（与 pageSections 并行）
    loadAppConfig()

    // 加载页面区域可见性配置
    loadPageSections()
  }, 0)

  // 屏蔽框架内部 showShareMenu 权限报错（appId 审核通过后删除）
  // #ifdef MP-WEIXIN
  wx.onError((err: any) => {
    if (typeof err === 'string' && err.includes('showShareMenu')) return
  })
  // #endif
})

// 微信分享配置（appid 审核通过后启用）
onShow(() => {
  // 热启动时（非首次 onShow）上报 app_show 事件
  if (!isColdLaunch) {
    log('page', 'app_show', 'info')
  }
  isColdLaunch = false

  // #ifdef MP-WEIXIN
  try {
    uni.showShareMenu({
      withShareTicket: true,
      menus: ['shareAppMessage', 'shareTimeline'],
    })
  } catch (_) {}
  // #endif
})

// 切后台：清除定时器并 flush
onHide(() => {
  log('page', 'app_hide', 'info')
  destroyClientLogger()
})
</script>

<template>
</template>

<style>
@import '@/app.css';
</style>

<style lang="scss">
@import '@/styles/global.scss';
</style>
