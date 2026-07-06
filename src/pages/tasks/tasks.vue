<script setup lang="ts">
import { ref, computed } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { navTo, showToast } from '@/utils'
import { fetchTasks, claimTask } from '@/services/user-stats'
import type { UserTaskItem } from '@/types'
import { logInfo, logError, startTrace, endTrace } from '@/services/client-logger'

const tasks = ref<UserTaskItem[]>([])
const loading = ref(false)
const claiming = ref<Set<string>>(new Set())

async function loadTasks() {
  startTrace()
  loading.value = true
  try {
    const data = await fetchTasks()
    tasks.value = data.tasks
    logInfo('user_action', 'task_list_load', { result: 'success', count: data.tasks.length })
  } catch (e) {
    logError('user_action', 'task_list_load', e instanceof Error ? e.message : '未知错误')
    showToast('加载任务失败')
  } finally {
    loading.value = false
    endTrace()
  }
}

async function doClaim(taskId: string) {
  if (claiming.value.has(taskId)) return
  startTrace()
  claiming.value.add(taskId)
  try {
    const result = await claimTask(taskId)
    if (result.success) {
      logInfo('user_action', 'task_claim', { taskId, reward: result.pointsReward })
      showToast(`领取成功！+${result.pointsReward} 积分`, 'success')
      await loadTasks()
    }
  } catch (e: any) {
    logError('user_action', 'task_claim', e.message || '领取失败', { taskId })
    showToast(e.message || '领取失败')
  } finally {
    claiming.value.delete(taskId)
    endTrace()
  }
}

const dailyTasks = computed(() => tasks.value.filter(t => t.type === 'daily'))
const achievementTasks = computed(() => tasks.value.filter(t => t.type === 'achievement'))

onShow(() => {
  loadTasks()
})
</script>

<template>
  <view class="page-container tasks-page">
    <view v-if="loading" class="loading-text">加载中...</view>

    <template v-if="!loading">
      <view class="task-section">
        <text class="section-title">📅 每日任务</text>
        <view v-for="task in dailyTasks" :key="task.task_id" class="task-card">
          <view class="task-info">
            <text class="task-title">{{ task.title }}</text>
            <text class="task-desc">{{ task.description }}</text>
            <view class="task-progress">
              <view class="progress-bar">
                <view class="progress-fill" :style="{ width: task.progressPercent + '%' }" />
              </view>
              <text class="progress-text">{{ task.progress }}/{{ task.requirement_count }}</text>
            </view>
          </view>
          <view class="task-reward-info">
            <text class="reward-text">+{{ task.points_reward }} 分</text>
            <text v-if="task.extra_quota_reward > 0" class="reward-quota">+{{ task.extra_quota_reward }} 次</text>
          </view>
          <button
            v-if="task.canClaim"
            class="claim-btn"
            :disabled="claiming.has(task.task_id)"
            @click="doClaim(task.task_id)"
          >
            {{ claiming.has(task.task_id) ? '领取中' : '领取' }}
          </button>
          <text v-else-if="task.reward_claimed" class="claimed-tag">已领取</text>
        </view>
      </view>

      <view class="task-section">
        <text class="section-title">🏆 成就任务</text>
        <view v-for="task in achievementTasks" :key="task.task_id" class="task-card">
          <view class="task-info">
            <text class="task-title">{{ task.title }}</text>
            <text class="task-desc">{{ task.description }}</text>
            <view class="task-progress">
              <view class="progress-bar">
                <view class="progress-fill" :style="{ width: task.progressPercent + '%' }" />
              </view>
              <text class="progress-text">{{ task.progress }}/{{ task.requirement_count }}</text>
            </view>
          </view>
          <view class="task-reward-info">
            <text class="reward-text">+{{ task.points_reward }} 分</text>
            <text v-if="task.extra_quota_reward > 0" class="reward-quota">+{{ task.extra_quota_reward }} 次</text>
          </view>
          <button
            v-if="task.canClaim"
            class="claim-btn"
            :disabled="claiming.has(task.task_id)"
            @click="doClaim(task.task_id)"
          >
            {{ claiming.has(task.task_id) ? '领取中' : '领取' }}
          </button>
          <text v-else-if="task.reward_claimed" class="claimed-tag">已领取</text>
        </view>
      </view>
    </template>
  </view>
</template>

<style lang="scss" scoped>
.tasks-page {
  padding: 32rpx;
}

.loading-text {
  text-align: center;
  color: $text-muted;
  padding: 60rpx 0;
  font-size: 28rpx;
}

.task-section {
  margin-bottom: 40rpx;
}

.section-title {
  font-size: 30rpx;
  font-weight: 600;
  color: $text-white;
  display: block;
  margin-bottom: 20rpx;
}

.task-card {
  background: $bg-card;
  border-radius: $radius-md;
  padding: 24rpx;
  margin-bottom: 16rpx;
  display: flex;
  align-items: center;
  gap: 16rpx;
}

.task-info {
  flex: 1;
  min-width: 0;
}

.task-title {
  font-size: 28rpx;
  color: $text-white;
  font-weight: 500;
  display: block;
  margin-bottom: 4rpx;
}

.task-desc {
  font-size: 22rpx;
  color: $text-muted;
  display: block;
  margin-bottom: 12rpx;
}

.task-progress {
  display: flex;
  align-items: center;
  gap: 12rpx;
}

.progress-bar {
  flex: 1;
  height: 10rpx;
  background: $bg-primary;
  border-radius: 5rpx;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, $accent-gold, $accent-gold-light);
  border-radius: 5rpx;
  transition: width $transition-normal;
}

.progress-text {
  font-size: 20rpx;
  color: $text-muted;
  white-space: nowrap;
}

.task-reward-info {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 4rpx;
}

.reward-text {
  font-size: 24rpx;
  color: $accent-gold;
  font-weight: 600;
}

.reward-quota {
  font-size: 20rpx;
  color: $accent-blue;
}

.claim-btn {
  padding: 12rpx 28rpx;
  background: linear-gradient(135deg, $accent-gold, $accent-gold-light);
  color: $bg-primary;
  border: none;
  border-radius: $radius-sm;
  font-size: 24rpx;
  font-weight: 600;
  white-space: nowrap;
}

.claimed-tag {
  font-size: 22rpx;
  color: $text-muted;
  padding: 8rpx 16rpx;
  background: $bg-primary;
  border-radius: $radius-sm;
}
</style>
