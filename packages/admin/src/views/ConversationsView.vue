<script setup lang="ts">
import { h, onMounted, reactive, ref } from 'vue'
import { NButton, NDataTable, NInput, type DataTableColumns, useMessage } from 'naive-ui'
import { RefreshCw, Search } from 'lucide-vue-next'
import { adminApi } from '../api/admin'
import type { ConversationSummary, PageResponse } from '../types/admin'
import ConversationDrawer from '../components/ConversationDrawer.vue'

const message = useMessage()
const loading = ref(false)
const result = ref<PageResponse<ConversationSummary>>({ items: [], page: 0, size: 20, totalElements: 0, totalPages: 0 })
const filters = reactive({ keyword: '' })
const selectedId = ref<string | null>(null)
const drawerOpen = ref(false)

function formatTime(value: string) {
  return new Intl.DateTimeFormat('zh-CN', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
}

const columns: DataTableColumns<ConversationSummary> = [
  {
    title: '对话', key: 'title', minWidth: 250,
    render: (row) => h('div', { class: 'table-primary' }, [h('strong', row.title), h('span', row.id)]),
  },
  {
    title: '用户', key: 'userEmail', minWidth: 210,
    render: (row) => h('div', { class: 'table-primary' }, [h('strong', row.userDisplayName), h('span', row.userEmail)]),
  },
  { title: '消息', key: 'messageCount', width: 80 },
  { title: 'Token', key: 'tokenCount', width: 100, render: (row) => row.tokenCount.toLocaleString('zh-CN') },
  { title: '平均耗时', key: 'averageDurationMs', width: 110, render: (row) => `${row.averageDurationMs} ms` },
  { title: '最近更新', key: 'updatedAt', width: 180, render: (row) => formatTime(row.updatedAt) },
  { title: '', key: 'actions', width: 90, render: (row) => h(NButton, { text: true, type: 'primary', onClick: () => open(row.id) }, { default: () => '查看' }) },
]

async function load(page = result.value.page) {
  loading.value = true
  try {
    result.value = await adminApi.conversations({ keyword: filters.keyword.trim(), page, size: result.value.size })
  } catch (error) {
    message.error(error instanceof Error ? error.message : '对话加载失败')
  } finally {
    loading.value = false
  }
}

function open(id: string) {
  selectedId.value = id
  drawerOpen.value = true
}

onMounted(() => load(0))
</script>

<template>
  <section class="view-stack">
    <div class="toolbar filter-toolbar">
      <div class="filter-row conversation-filter">
        <n-input v-model:value="filters.keyword" clearable placeholder="会话标题、UUID、用户邮箱或昵称" @keyup.enter="load(0)"><template #prefix><Search :size="17" /></template></n-input>
        <n-button type="primary" @click="load(0)">查询</n-button>
        <n-button quaternary @click="filters.keyword = ''; load(0)"><template #icon><RefreshCw /></template>清空</n-button>
      </div>
      <p>共 {{ result.totalElements.toLocaleString('zh-CN') }} 个对话</p>
    </div>
    <n-data-table
      remote
      :columns="columns"
      :data="result.items"
      :loading="loading"
      :row-key="(row: ConversationSummary) => row.id"
      :pagination="{ page: result.page + 1, pageSize: result.size, itemCount: result.totalElements, onChange: (page: number) => load(page - 1) }"
      :scroll-x="1100"
      bordered
    />
    <ConversationDrawer v-model:open="drawerOpen" :conversation-id="selectedId" @deleted="load()" />
  </section>
</template>
