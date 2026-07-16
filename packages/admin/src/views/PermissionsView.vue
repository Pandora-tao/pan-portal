<script setup lang="ts">
import { h, onMounted, ref } from 'vue'
import { NButton, NDataTable, NTag, type DataTableColumns, useMessage } from 'naive-ui'
import { RefreshCw, ShieldCheck } from 'lucide-vue-next'
import { adminApi } from '../api/admin'
import type { UserSummary } from '../types/admin'

const message = useMessage()
const loading = ref(false)
const admins = ref<UserSummary[]>([])

function formatTime(value: string | null) {
  if (!value) return '—'
  return new Intl.DateTimeFormat('zh-CN', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
}

const columns: DataTableColumns<UserSummary> = [
  { title: '超级管理员', key: 'displayName', render: (row) => h('div', { class: 'table-primary' }, [h('strong', row.displayName), h('span', row.email)]) },
  { title: '状态', key: 'status', width: 110, render: (row) => h(NTag, { type: row.status === 'ACTIVE' ? 'success' : 'error', bordered: false }, { default: () => row.status === 'ACTIVE' ? '正常' : '禁用' }) },
  { title: '最近登录', key: 'lastLoginAt', width: 190, render: (row) => formatTime(row.lastLoginAt) },
  { title: '授予时间', key: 'createdAt', width: 190, render: (row) => formatTime(row.createdAt) },
]

async function load() {
  loading.value = true
  try {
    admins.value = await adminApi.superAdmins()
  } catch (error) {
    message.error(error instanceof Error ? error.message : '管理员列表加载失败')
  } finally {
    loading.value = false
  }
}

onMounted(load)
</script>

<template>
  <section class="view-stack">
    <div class="toolbar">
      <div><h2>固定角色模型</h2><p>当前只有超级管理员和普通用户两种角色，不提供逐项权限配置。</p></div>
      <n-button quaternary :loading="loading" @click="load"><template #icon><RefreshCw /></template>刷新</n-button>
    </div>
    <div class="permission-summary">
      <ShieldCheck :size="34" />
      <div><strong>{{ admins.filter((item) => item.status === 'ACTIVE').length }}</strong><span>名有效超级管理员</span></div>
      <p>提升或降级操作请在“用户管理”的用户详情中进行。系统始终保护最后一名有效超级管理员。</p>
    </div>
    <n-data-table :columns="columns" :data="admins" :loading="loading" :row-key="(row: UserSummary) => row.id" bordered />
  </section>
</template>
