<script setup lang="ts">
import { computed } from 'vue'
import type { TrendPoint } from '../types/admin'

const props = defineProps<{
  points: TrendPoint[]
  metric: 'newUsers' | 'activeUsers' | 'userMessages' | 'assistantMessages'
  label: string
}>()

const maxValue = computed(() => Math.max(1, ...props.points.map((point) => point[props.metric])))

function height(value: number) {
  if (value === 0) return 2
  return Math.max(8, Math.round((value / maxValue.value) * 100))
}

function dateLabel(date: string) {
  return date.slice(5).replace('-', '.')
}
</script>

<template>
  <section class="trend-panel">
    <header>
      <h2>{{ label }}</h2>
      <span>最大值 {{ maxValue.toLocaleString('zh-CN') }}</span>
    </header>
    <div v-if="points.length" class="trend-bars">
      <div v-for="point in points" :key="point.date" class="trend-column">
        <span class="trend-value">{{ point[metric] }}</span>
        <div class="trend-track">
          <div class="trend-fill" :style="{ height: `${height(point[metric])}%` }"></div>
        </div>
        <time :datetime="point.date">{{ dateLabel(point.date) }}</time>
      </div>
    </div>
    <p v-else class="empty-copy">当前时间范围没有趋势数据。</p>
  </section>
</template>
