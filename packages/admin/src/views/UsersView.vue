<script setup lang="ts">
import { h, onMounted, reactive, ref } from 'vue'
import {
  NButton,
  NDataTable,
  NInput,
  NSelect,
  NTag,
  type DataTableColumns,
  useMessage,
} from 'naive-ui'
import { RefreshCw, Search, UserRoundSearch } from 'lucide-vue-next'
import { adminApi } from '../api/admin'
import type { PageResponse, UserSummary } from '../types/admin'
import UserDetailDrawer from '../components/UserDetailDrawer.vue'

defineProps<{ currentUserId: string }>()

const message = useMessage()
const loading = ref(false)
const result = ref<PageResponse<UserSummary>>({ items: [], page: 0, size: 20, totalElements: 0, totalPages: 0 })
const selectedUserId = ref<string | null>(null)
const drawerOpen = ref(false)
const filters = reactive({ keyword: '', status: null as string | null, role: null as string | null })

function formatTime(value: string | null) {
  if (!value) return '—'
  return new Intl.DateTimeFormat('zh-CN', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
}

const columns: DataTableColumns<UserSummary> = [
  {
    title: '用户',
    key: 'displayName',
    minWidth: 220,
    render: (row) => h('div', { class: 'table-primary' }, [h('strong', row.displayName), h('span', row.email)]),
  },
  { title: '真实姓名', key: 'realName', width: 120, render: (row) => row.realName || '—' },
  {
    title: '状态',
    key: 'status',
    width: 90,
    render: (row) => h(NTag, { type: row.status === 'ACTIVE' ? 'success' : 'error', bordered: false }, { default: () => row.status === 'ACTIVE' ? '正常' : '禁用' }),
  },
  {
    title: '角色',
    key: 'role',
    width: 120,
    render: (row) => h(NTag, { type: row.role === 'SUPER_ADMIN' ? 'info' : 'default', bordered: false }, { default: () => row.role === 'SUPER_ADMIN' ? '超级管理员' : '普通用户' }),
  },
  { title: '会话 / 消息', key: 'chatSessionCount', width: 130, render: (row) => `${row.chatSessionCount} / ${row.chatMessageCount}` },
  { title: '最近活跃', key: 'lastSeenAt', width: 180, render: (row) => formatTime(row.lastSeenAt) },
  {
    title: '',
    key: 'actions',
    width: 90,
    render: (row) => h(NButton, { text: true, type: 'primary', onClick: () => openUser(row.id) }, { default: () => '查看' }),
  },
]

async function load(page = result.value.page) {
  loading.value = true
  try {
    result.value = await adminApi.users({
      keyword: filters.keyword.trim(),
      status: filters.status,
      role: filters.role,
      page,
      size: result.value.size,
    })
  } catch (error) {
    message.error(error instanceof Error ? error.message : '用户加载失败')
  } finally {
    loading.value = false
  }
}

function openUser(id: string) {
  selectedUserId.value = id
  drawerOpen.value = true
}

function resetFilters() {
  filters.keyword = ''
  filters.status = null
  filters.role = null
  load(0)
}

onMounted(() => load(0))
</script>

<template>
  <section class="view-stack">
    <div class="toolbar filter-toolbar">
      <div class="filter-row">
        <n-input v-model:value="filters.keyword" clearable placeholder="邮箱、昵称、真实姓名或 UUID" @keyup.enter="load(0)">
          <template #prefix><Search :size="17" /></template>
        </n-input>
        <n-select
          v-model:value="filters.status"
          clearable
          placeholder="账号状态"
          :options="[{ label: '正常', value: 'ACTIVE' }, { label: '禁用', value: 'DISABLED' }]"
        />
        <n-select
          v-model:value="filters.role"
          clearable
          placeholder="用户角色"
          :options="[{ label: '超级管理员', value: 'SUPER_ADMIN' }, { label: '普通用户', value: 'USER' }]"
        />
        <n-button type="primary" @click="load(0)"><template #icon><UserRoundSearch /></template>查询</n-button>
        <n-button quaternary @click="resetFilters"><template #icon><RefreshCw /></template>清空</n-button>
      </div>
      <p>共 {{ result.totalElements.toLocaleString('zh-CN') }} 名注册用户</p>
    </div>

    <n-data-table
      remote
      :columns="columns"
      :data="result.items"
      :loading="loading"
      :row-key="(row: UserSummary) => row.id"
      :pagination="{
        page: result.page + 1,
        pageSize: result.size,
        itemCount: result.totalElements,
        onChange: (page: number) => load(page - 1),
      }"
      :scroll-x="1100"
      bordered
    />

    <UserDetailDrawer
      v-model:open="drawerOpen"
      :user-id="selectedUserId"
      :current-user-id="currentUserId"
      @changed="load()"
    />
  </section>
</template>
