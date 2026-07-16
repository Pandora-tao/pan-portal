<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { NButton, NSpin, useMessage } from 'naive-ui'
import { RefreshCw } from 'lucide-vue-next'
import { adminApi } from '../api/admin'
import type { DashboardSummary, TrendPoint } from '../types/admin'
import TrendBars from '../components/TrendBars.vue'

const message = useMessage()
const loading = ref(true)
const summary = ref<DashboardSummary | null>(null)
const trends = ref<TrendPoint[]>([])

const metrics = computed(() => {
  if (!summary.value) return []
  return [
    { label: '注册用户', value: summary.value.totalUsers, detail: `今日新增 ${summary.value.todayNewUsers}` },
    { label: '今日活跃用户', value: summary.value.todayActiveUsers, detail: `聊天用户 ${summary.value.todayChatUsers}` },
    { label: '今日用户消息', value: summary.value.todayUserMessages, detail: `AI 回复 ${summary.value.todayAssistantMessages}` },
    { label: '今日 Token', value: summary.value.todayTokens, detail: `失败回复 ${summary.value.failedAssistantMessages}` },
  ]
})

async function load() {
  loading.value = true
  try {
    ;[summary.value, trends.value] = await Promise.all([adminApi.summary(), adminApi.trends(7)])
  } catch (error) {
    message.error(error instanceof Error ? error.message : '数据加载失败')
  } finally {
    loading.value = false
  }
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat('zh-CN', { dateStyle: 'medium', timeStyle: 'medium' }).format(new Date(value))
}

onMounted(load)
</script>

<template>
  <section class="view-stack">
    <div class="toolbar toolbar-compact">
      <p v-if="summary">数据生成于 {{ formatTime(summary.generatedAt) }}</p>
      <span v-else></span>
      <n-button quaternary :loading="loading" @click="load">
        <template #icon><RefreshCw /></template>
        刷新
      </n-button>
    </div>

    <div v-if="loading && !summary" class="loading-panel"><n-spin size="large" /></div>
    <template v-else-if="summary">
      <div class="metric-grid">
        <article v-for="(metric, index) in metrics" :key="metric.label" class="metric-card">
          <span>0{{ index + 1 }}</span>
          <p>{{ metric.label }}</p>
          <strong>{{ metric.value.toLocaleString('zh-CN') }}</strong>
          <small>{{ metric.detail }}</small>
        </article>
      </div>

      <div class="split-grid">
        <TrendBars :points="trends" metric="activeUsers" label="近 7 日活跃用户" />
        <TrendBars :points="trends" metric="userMessages" label="近 7 日用户消息" />
      </div>

      <section class="quality-grid">
        <article>
          <span>AI 回复成功率</span>
          <strong>{{ summary.assistantSuccessRate.toFixed(2) }}%</strong>
        </article>
        <article>
          <span>响应耗时 P50</span>
          <strong>{{ summary.p50DurationMs.toLocaleString('zh-CN') }} ms</strong>
        </article>
        <article>
          <span>响应耗时 P95</span>
          <strong>{{ summary.p95DurationMs.toLocaleString('zh-CN') }} ms</strong>
        </article>
        <article>
          <span>今日新建会话</span>
          <strong>{{ summary.todayChatSessions.toLocaleString('zh-CN') }}</strong>
        </article>
      </section>
    </template>
  </section>
</template>
