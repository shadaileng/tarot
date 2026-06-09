<script setup lang="ts">
import { onLaunch } from '@dcloudio/uni-app'
import { useTarotStore } from '@/store'

onLaunch(() => {
  const store = useTarotStore()
  store.loadRecords()
  console.log('🃏 塔罗牌小程序启动')
})
</script>

<style>
@import '@/app.css';
</style>

<style lang="scss">
@import '@/styles/global.scss';
</style>
