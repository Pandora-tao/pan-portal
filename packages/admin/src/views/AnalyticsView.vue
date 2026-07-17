<script setup lang="ts">
import { h, onMounted, ref, watch } from 'vue'
import {
  NButton,
  NButtonGroup,
  NDataTable,
  NInput,
  NPagination,
  NSelect,
  NSpin,
  NTag,
  useDialog,
  useMessage,
  type DataTableColumns,
} from 'naive-ui'
import { adminApi } from '../api/admin'
import type { AdminPrizeRecord, PrizeClaimStatus, TrendPoint } from '../types/admin'
import TrendBars from '../components/TrendBars.vue'

const message = useMessage()
const dialog = useDialog()
const days = ref(30)
const trendLoading = ref(false)
const points = ref<TrendPoint[]>([])
const prizeLoading = ref(false)
const prizes = ref<AdminPrizeRecord[]>([])
const prizePage = ref(1)
const prizePageSize = 10
const prizeTotal = ref(0)
const prizeStatus = ref<PrizeClaimStatus | null>(null)
const prizeKeyword = ref('')

const statusLabel: Record<PrizeClaimStatus, string> = {
  UNCLAIMED: '待领取',
  CLAIMED: '待核销',
  REDEEMED: '已核销',
}

const statusType: Record<PrizeClaimStatus, 'default' | 'warning' | 'success'> = {
  UNCLAIMED: 'default',
  CLAIMED: 'warning',
  REDEEMED: 'success',
}

const formatTime = (value: string | null) => (value ? new Date(value).toLocaleString('zh-CN', { hour12: false }) : '—')

async function loadTrends() {
  trendLoading.value = true
  try {
    points.value = await adminApi.trends(days.value)
  } catch (error) {
    message.error(error instanceof Error ? error.message : '趋势加载失败')
  } finally {
    trendLoading.value = false
  }
}

async function loadPrizes() {
  prizeLoading.value = true
  try {
    const result = await adminApi.luckyDrawPrizes({
      status: prizeStatus.value,
      keyword: prizeKeyword.value.trim() || null,
      page: prizePage.value - 1,
      size: prizePageSize,
    })
    prizes.value = result.items
    prizeTotal.value = result.totalElements
  } catch (error) {
    message.error(error instanceof Error ? error.message : '奖品记录加载失败')
  } finally {
    prizeLoading.value = false
  }
}

function confirmRedeem(row: AdminPrizeRecord) {
  dialog.warning({
    title: '确认核销奖品',
    content: `${row.userDisplayName}（${row.userEmail}）的“${row.prizeDisplayName}”核销后不能撤销。`,
    positiveText: '确认核销',
    negativeText: '取消',
    async onPositiveClick() {
      try {
        await adminApi.redeemLuckyDrawPrize(row.id, '管理后台确认核销')
        message.success('奖品已核销')
        await loadPrizes()
      } catch (error) {
        message.error(error instanceof Error ? error.message : '核销失败')
        return false
      }
    },
  })
}

const columns: DataTableColumns<AdminPrizeRecord> = [
  { title: '奖品', key: 'prizeDisplayName', minWidth: 170 },
  {
    title: '用户',
    key: 'user',
    minWidth: 210,
    render: (row) => h('div', [h('strong', row.userDisplayName), h('small', { class: 'table-secondary' }, row.userEmail)]),
  },
  {
    title: '状态',
    key: 'claimStatus',
    width: 100,
    render: (row) => h(NTag, { type: statusType[row.claimStatus], bordered: true }, { default: () => statusLabel[row.claimStatus] }),
  },
  { title: '中奖时间', key: 'createdAt', width: 180, render: (row) => formatTime(row.createdAt) },
  { title: '领取时间', key: 'claimedAt', width: 180, render: (row) => formatTime(row.claimedAt) },
  {
    title: '操作',
    key: 'actions',
    width: 100,
    render: (row) => row.claimStatus === 'CLAIMED'
      ? h(NButton, { size: 'small', type: 'primary', onClick: () => confirmRedeem(row) }, { default: () => '核销' })
      : '—',
  },
]

watch(days, loadTrends)
watch(prizeStatus, () => {
  prizePage.value = 1
  loadPrizes()
})
watch(prizePage, loadPrizes)
onMounted(() => {
  loadTrends()
  loadPrizes()
})
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
    <div v-if="trendLoading" class="loading-panel"><n-spin size="large" /></div>
    <div v-else class="analytics-grid">
      <TrendBars :points="points" metric="newUsers" label="新增用户" />
      <TrendBars :points="points" metric="activeUsers" label="活跃用户" />
      <TrendBars :points="points" metric="userMessages" label="用户消息" />
      <TrendBars :points="points" metric="assistantMessages" label="AI 回复" />
    </div>
    <aside class="data-scope-note">
      <strong>数据范围</strong>
      <p>活动答题、剩余机会、中奖结果及领取状态均以服务端记录为准；旧版浏览器 localStorage 数据不纳入统计。</p>
    </aside>

    <section class="prize-section">
      <div class="toolbar">
        <div>
          <h2>奖品领取与核销</h2>
          <p>只有用户已领取的奖品可以核销，核销操作会进入审计日志。</p>
        </div>
        <div class="prize-filters">
          <n-input v-model:value="prizeKeyword" clearable placeholder="用户、邮箱或奖品" @keyup.enter="prizePage = 1; loadPrizes()" />
          <n-select
            v-model:value="prizeStatus"
            clearable
            placeholder="全部状态"
            :options="[
              { label: '待领取', value: 'UNCLAIMED' },
              { label: '待核销', value: 'CLAIMED' },
              { label: '已核销', value: 'REDEEMED' },
            ]"
          />
          <n-button @click="prizePage = 1; loadPrizes()">查询</n-button>
        </div>
      </div>
      <n-data-table :columns="columns" :data="prizes" :loading="prizeLoading" :row-key="(row: AdminPrizeRecord) => row.id" :scroll-x="940" />
      <div class="prize-pagination">
        <span>共 {{ prizeTotal }} 条记录</span>
        <n-pagination v-model:page="prizePage" :page-size="prizePageSize" :item-count="prizeTotal" />
      </div>
    </section>
  </section>
</template>

<style scoped>
.prize-section { margin-top: 8px; border: 1px solid var(--line); padding: 22px; background: var(--surface); }
.prize-filters { display: grid; grid-template-columns: minmax(220px, 1fr) 150px auto; gap: 10px; min-width: min(100%, 500px); }
.prize-pagination { display: flex; align-items: center; justify-content: space-between; gap: 16px; margin-top: 16px; color: var(--muted); font-size: 13px; }
:deep(.table-secondary) { display: block; margin-top: 3px; color: var(--muted); font-size: 12px; font-weight: 400; }
@media (max-width: 760px) {
  .prize-section { padding: 16px; }
  .prize-filters { grid-template-columns: 1fr; width: 100%; min-width: 0; }
  .prize-pagination { align-items: flex-start; flex-direction: column; }
}
</style>
