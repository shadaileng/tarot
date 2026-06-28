<script setup lang="ts">
import { onLaunch, onShow } from '@dcloudio/uni-app'
import { useTarotStore } from '@/store'
import { isLoggedIn, getUserInfo, initAuth, login } from '@/services/auth'
import { checkBackendHealth } from '@/services/reading'

onLaunch(() => {
  const store = useTarotStore()

  // 异步初始化（延迟到框架页面栈初始化完成后执行，避免自定义 tabBar + async onLaunch
  // 触发微信 SDK 3.x "appLaunch with non-empty page stack" 内部错误）
  setTimeout(async () => {
    await store.loadRecords()
    console.log('🃏 塔罗牌小程序启动')

    // 静默检查登录态
    if (isLoggedIn()) {
      const user = getUserInfo()
      console.log('✅ 已有有效登录态', user?.nickname)
    } else {
      console.log('👤 游客模式：未登录')
    }

    // 全局健康检查：尽早检测后端服务状态
    store.setBackendStatus(await checkBackendHealth())

    // ========== 注册 401 回调 ==========
    // 当业务接口返回 401 时自动触发（token 过期或无效）
    initAuth(async () => {
      console.log('🔄 登录态已过期，尝试重新登录...')
      try {
        const result = await login()
        console.log('✅ 自动登录成功', result.user.nickname)
        uni.showToast({ title: '登录已恢复', icon: 'success', duration: 1500 })
      } catch (err) {
        console.warn('⚠️ 自动登录失败', err)
      }
    })
  }, 0)

  // 屏蔽框架内部 showShareMenu 权限报错（appId 审核通过后删除）
  // #ifdef MP-WEIXIN
  wx.onError((err) => {
    if (typeof err === 'string' && err.includes('showShareMenu')) return
  })
  // #endif
})

// 微信分享配置（appid 审核通过后启用）
onShow(() => {
  // #ifdef MP-WEIXIN
  try {
    uni.showShareMenu({
      withShareTicket: true,
      menus: ['shareAppMessage', 'shareTimeline'],
    })
  } catch (_) {}
  // #endif
})
</script>

<style>
@import '@/app.css';
</style>

<style lang="scss">
@import '@/styles/global.scss';
</style>
