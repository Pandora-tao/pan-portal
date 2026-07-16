<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { NButton, NButtonGroup, NSpin, useMessage } from 'naive-ui'
import { adminApi } from '../api/admin'
import type { TrendPoint } from '../types/admin'
import TrendBars from '../components/TrendBars.vue'

const message = useMessage()
const days = ref(30)
const loading = ref(false)
const points = ref<TrendPoint[]>([])

async function load() {
  loading.value = true
  try {
    points.value = await adminApi.trends(days.value)
  } catch (error) {
    message.error(error instanceof Error ? error.message : '趋势加载失败')
  } finally {
    loading.value = false
  }
}

watch(days, load)
onMounted(load)
</script>

<template>
  <section class="view-stack">
    <div class="toolbar">
      <div>
        <h2>按北京时间自然日统计</h2>
        <p>当前统计基于注册、登录会话和聊天消息的服务端数据。</p>
      </div>
      <n-button-group>
        <n-button v-for="option in [7, 30, 90]" :key="option" :type="days === option ? 'primary' : 'default'" @click="days = option">
          {{ option }} 日
        </n-button>
      </n-button-group>
    </div>
    <div v-if="loading" class="loading-panel"><n-spin size="large" /></div>
    <div v-else class="analytics-grid">
      <TrendBars :points="points" metric="newUsers" label="新增用户" />
      <TrendBars :points="points" metric="activeUsers" label="活跃用户" />
      <TrendBars :points="points" metric="userMessages" label="用户消息" />
      <TrendBars :points="points" metric="assistantMessages" label="AI 回复" />
    </div>
    <aside class="data-scope-note">
      <strong>数据范围</strong>
      <p>抽奖与答题数据尚未进入服务端，本页不会展示浏览器 localStorage 中的活动记录。接口命名空间已在 P1 预留。</p>
    </aside>
  </section>
</template>
