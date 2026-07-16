<script setup lang="ts">
import { h, onMounted, reactive, ref } from 'vue'
import { NButton, NDataTable, NInput, NTag, type DataTableColumns, useMessage } from 'naive-ui'
import { RefreshCw, Search } from 'lucide-vue-next'
import { adminApi } from '../api/admin'
import type { AuditView, PageResponse } from '../types/admin'

const message = useMessage()
const loading = ref(false)
const result = ref<PageResponse<AuditView>>({ items: [], page: 0, size: 20, totalElements: 0, totalPages: 0 })
const filters = reactive({ action: '', targetId: '' })

function formatTime(value: string) {
  return new Intl.DateTimeFormat('zh-CN', { dateStyle: 'medium', timeStyle: 'medium' }).format(new Date(value))
}

const columns: DataTableColumns<AuditView> = [
  { title: '时间', key: 'createdAt', width: 190, render: (row) => formatTime(row.createdAt) },
  { title: '动作', key: 'action', minWidth: 210, render: (row) => h('code', { class: 'audit-action' }, row.action) },
  { title: '目标类型', key: 'targetType', width: 140 },
  { title: '目标 UUID', key: 'targetId', minWidth: 220, render: (row) => row.targetId || '—' },
  { title: '原因', key: 'reason', minWidth: 180, render: (row) => row.reason || '—' },
  { title: 'IP', key: 'ipAddress', width: 130, render: (row) => row.ipAddress || '—' },
  { title: '结果', key: 'result', width: 90, render: (row) => h(NTag, { type: row.result === 'SUCCESS' ? 'success' : 'error', bordered: false }, { default: () => row.result === 'SUCCESS' ? '成功' : '失败' }) },
]

async function load(page = result.value.page) {
  loading.value = true
  try {
    result.value = await adminApi.audits({ action: filters.action.trim(), targetId: filters.targetId.trim(), page, size: result.value.size })
  } catch (error) {
    message.error(error instanceof Error ? error.message : '审计日志加载失败')
  } finally {
    loading.value = false
  }
}

function reset() {
  filters.action = ''
  filters.targetId = ''
  load(0)
}

onMounted(() => load(0))
</script>

<template>
  <section class="view-stack">
    <div class="toolbar filter-toolbar">
      <div class="filter-row audit-filter">
        <n-input v-model:value="filters.action" clearable placeholder="动作，例如 USER_DISABLE"><template #prefix><Search :size="17" /></template></n-input>
        <n-input v-model:value="filters.targetId" clearable placeholder="目标 UUID" @keyup.enter="load(0)" />
        <n-button type="primary" @click="load(0)">查询</n-button>
        <n-button quaternary @click="reset"><template #icon><RefreshCw /></template>清空</n-button>
      </div>
      <p>日志只读，默认至少保留 180 天。</p>
    </div>
    <n-data-table
      remote
      :columns="columns"
      :data="result.items"
      :loading="loading"
      :row-key="(row: AuditView) => row.id"
      :pagination="{ page: result.page + 1, pageSize: result.size, itemCount: result.totalElements, onChange: (page: number) => load(page - 1) }"
      :scroll-x="1250"
      bordered
    />
  </section>
</template>
