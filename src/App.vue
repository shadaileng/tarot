<script setup lang="ts">
import { onLaunch, onShow } from '@dcloudio/uni-app'
import { useTarotStore } from '@/store'
import { isLoggedIn, getUserInfo, initAuth, login } from '@/services/auth'

onLaunch(() => {
  const store = useTarotStore()
  store.loadRecords()
  console.log('🃏 塔罗牌小程序启动')

  // 静默检查登录态
  if (isLoggedIn()) {
    const user = getUserInfo()
    console.log('✅ 已有有效登录态', user?.nickname)
  } else {
    console.log('👤 游客模式：未登录')
  }

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
      // 静默失败，用户下次手动触发鉴权操作时会看到登录引导
    }
  })

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
