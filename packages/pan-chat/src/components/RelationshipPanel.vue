<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import {
  ArchiveRestore,
  Brain,
  CalendarClock,
  Check,
  Download,
  LoaderCircle,
  Pencil,
  Plus,
  Save,
  Sparkles,
  Trash2,
  X,
} from 'lucide-vue-next'
import { relationshipApi } from '../api/relationship'
import type {
  MemoryStatus,
  MemoryType,
  ProactiveFrequency,
  RelationshipMemory,
  RelationshipOverview,
  RelationshipPreferences,
} from '../types/relationship'

const props = defineProps<{ open: boolean }>()
const emit = defineEmits<{ close: []; deleted: [] }>()

type PanelTab = 'memories' | 'proactive' | 'data'

const MEMORY_LABELS: Record<MemoryType, string> = {
  PERSON: '关于你',
  PREFERENCE: '偏好',
  SHARED_EVENT: '共同经历',
  OPEN_LOOP: '以后再聊',
  RELATIONSHIP: '关系变化',
}

const FREQUENCY_OPTIONS: Array<{ value: ProactiveFrequency; label: string; detail: string }> = [
  { value: 'LOW', label: '偶尔', detail: '至少间隔 7 天' },
  { value: 'NORMAL', label: '适中', detail: '至少间隔 3 天' },
  { value: 'HIGH', label: '经常', detail: '至少间隔 1 天' },
]

const activeTab = ref<PanelTab>('memories')
const memoryStatus = ref<MemoryStatus>('ACTIVE')
const loading = ref(false)
const saving = ref(false)
const error = ref('')
const success = ref('')
const overview = ref<RelationshipOverview | null>(null)
const memories = ref<RelationshipMemory[]>([])
const editorOpen = ref(false)
const editingId = ref<string | null>(null)
const deleteConfirmation = ref('')
const preferenceForm = reactive<RelationshipPreferences>({
  proactiveEnabled: false,
  proactiveFrequency: 'LOW',
  quietStart: '22:00:00',
  quietEnd: '08:00:00',
  timezone: 'Asia/Shanghai',
  lastProactiveAt: null,
  updatedAt: null,
})
const memoryForm = reactive<{
  memoryType: MemoryType
  content: string
  occurredDate: string
}>({
  memoryType: 'PERSON',
  content: '',
  occurredDate: '',
})

const title = computed(() => activeTab.value === 'memories'
  ? '他记得的你'
  : activeTab.value === 'proactive'
    ? '主动联系'
    : '关系数据')

async function load() {
  if (!props.open) return
  loading.value = true
  error.value = ''
  try {
    const [nextOverview, nextMemories] = await Promise.all([
      relationshipApi.overview(),
      relationshipApi.memories(memoryStatus.value),
    ])
    overview.value = nextOverview
    memories.value = nextMemories
    Object.assign(preferenceForm, nextOverview.preferences, {
      quietStart: nextOverview.preferences.quietStart.slice(0, 5),
      quietEnd: nextOverview.preferences.quietEnd.slice(0, 5),
    })
  } catch (caught) {
    error.value = caught instanceof Error ? caught.message : '关系数据加载失败'
  } finally {
    loading.value = false
  }
}

async function loadMemories(status: MemoryStatus) {
  memoryStatus.value = status
  loading.value = true
  error.value = ''
  try {
    memories.value = await relationshipApi.memories(status)
  } catch (caught) {
    error.value = caught instanceof Error ? caught.message : '记忆加载失败'
  } finally {
    loading.value = false
  }
}

function openCreate() {
  editingId.value = null
  memoryForm.memoryType = 'PERSON'
  memoryForm.content = ''
  memoryForm.occurredDate = ''
  editorOpen.value = true
}

function openEdit(memory: RelationshipMemory) {
  editingId.value = memory.id
  memoryForm.memoryType = memory.memoryType
  memoryForm.content = memory.content
  memoryForm.occurredDate = memory.occurredAt?.slice(0, 10) ?? ''
  editorOpen.value = true
}

async function saveMemory() {
  const content = memoryForm.content.trim()
  if (!content) {
    error.value = '请填写要记住的内容'
    return
  }
  saving.value = true
  error.value = ''
  try {
    const body = {
      memoryType: memoryForm.memoryType,
      content,
      occurredAt: memoryForm.occurredDate
        ? new Date(`${memoryForm.occurredDate}T00:00:00+08:00`).toISOString()
        : null,
    }
    if (editingId.value) {
      await relationshipApi.updateMemory(editingId.value, body)
      success.value = '记忆已纠正'
    } else {
      await relationshipApi.createMemory({ ...body, confidence: 1 })
      success.value = '已经记住了'
    }
    editorOpen.value = false
    await load()
  } catch (caught) {
    error.value = caught instanceof Error ? caught.message : '记忆保存失败'
  } finally {
    saving.value = false
  }
}

async function forget(memory: RelationshipMemory) {
  if (!window.confirm('让数字分身忘记这件事？聊天原文不会因此删除。')) return
  error.value = ''
  try {
    await relationshipApi.forgetMemory(memory.id)
    memories.value = memories.value.filter((item) => item.id !== memory.id)
    if (overview.value) overview.value.activeMemoryCount = Math.max(0, overview.value.activeMemoryCount - 1)
    success.value = '这条记忆已被遗忘'
  } catch (caught) {
    error.value = caught instanceof Error ? caught.message : '操作失败'
  }
}

async function restore(memory: RelationshipMemory) {
  error.value = ''
  try {
    await relationshipApi.restoreMemory(memory.id)
    memories.value = memories.value.filter((item) => item.id !== memory.id)
    success.value = '这条记忆已恢复'
  } catch (caught) {
    error.value = caught instanceof Error ? caught.message : '恢复失败'
  }
}

async function savePreferences() {
  saving.value = true
  error.value = ''
  try {
    const updated = await relationshipApi.updatePreferences({
      proactiveEnabled: preferenceForm.proactiveEnabled,
      proactiveFrequency: preferenceForm.proactiveFrequency,
      quietStart: normalizeTime(preferenceForm.quietStart),
      quietEnd: normalizeTime(preferenceForm.quietEnd),
      timezone: preferenceForm.timezone,
    })
    Object.assign(preferenceForm, updated, {
      quietStart: updated.quietStart.slice(0, 5),
      quietEnd: updated.quietEnd.slice(0, 5),
    })
    success.value = '主动联系设置已保存'
  } catch (caught) {
    error.value = caught instanceof Error ? caught.message : '设置保存失败'
  } finally {
    saving.value = false
  }
}

async function exportRelationship() {
  error.value = ''
  try {
    const data = await relationshipApi.exportData()
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `pan-relationship-${new Date().toISOString().slice(0, 10)}.json`
    anchor.click()
    URL.revokeObjectURL(url)
    success.value = '关系数据已导出'
  } catch (caught) {
    error.value = caught instanceof Error ? caught.message : '导出失败'
  }
}

async function deleteRelationship() {
  if (deleteConfirmation.value.trim() !== '删除全部关系数据') {
    error.value = '请输入完整确认文字'
    return
  }
  if (!window.confirm('这会永久删除全部聊天、长期记忆和主动联系设置，且无法恢复。确认继续？')) return
  saving.value = true
  error.value = ''
  try {
    await relationshipApi.deleteAll(deleteConfirmation.value.trim())
    emit('deleted')
    emit('close')
  } catch (caught) {
    error.value = caught instanceof Error ? caught.message : '删除失败'
  } finally {
    saving.value = false
  }
}

function formatDate(value: string | null) {
  if (!value) return '时间未记录'
  return new Intl.DateTimeFormat('zh-CN', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
}

function normalizeTime(value: string) {
  return value.length === 5 ? `${value}:00` : value
}

function clearNoticeSoon() {
  window.setTimeout(() => { success.value = '' }, 2200)
}

watch(success, (value) => {
  if (value) clearNoticeSoon()
})
watch(() => props.open, (value) => {
  if (value) void load()
  else editorOpen.value = false
})
</script>

<template>
  <Teleport to="body">
    <Transition name="relationship-panel">
      <div v-if="open" class="relationship-overlay" @mousedown.self="emit('close')">
        <section class="relationship-panel" role="dialog" aria-modal="true" :aria-labelledby="'relationship-title'">
          <header class="relationship-header">
            <div class="relationship-heading-mark"><Brain :size="22" /></div>
            <div>
              <p>你和陶攀之间</p>
              <h2 id="relationship-title">{{ title }}</h2>
            </div>
            <button type="button" aria-label="关闭" @click="emit('close')"><X :size="20" /></button>
          </header>

          <nav class="relationship-tabs" aria-label="关系设置">
            <button :class="{ 'is-active': activeTab === 'memories' }" @click="activeTab = 'memories'">
              <Brain :size="16" />记忆
            </button>
            <button :class="{ 'is-active': activeTab === 'proactive' }" @click="activeTab = 'proactive'">
              <Sparkles :size="16" />主动联系
            </button>
            <button :class="{ 'is-active': activeTab === 'data' }" @click="activeTab = 'data'">
              <Download :size="16" />数据
            </button>
          </nav>

          <p v-if="error" class="relationship-notice is-error" role="alert">{{ error }}</p>
          <p v-if="success" class="relationship-notice is-success" role="status"><Check :size="15" />{{ success }}</p>

          <div v-if="loading" class="relationship-loading"><LoaderCircle class="spin" /><span>正在读取关系数据</span></div>

          <main v-else class="relationship-content">
            <template v-if="activeTab === 'memories'">
              <section class="memory-summary">
                <div>
                  <strong>{{ overview?.activeMemoryCount ?? 0 }}</strong>
                  <span>条正在使用的记忆</span>
                </div>
                <button type="button" @click="openCreate"><Plus :size="16" />告诉他一件事</button>
              </section>

              <div class="memory-filter">
                <button :class="{ 'is-active': memoryStatus === 'ACTIVE' }" @click="void loadMemories('ACTIVE')">记得的事</button>
                <button :class="{ 'is-active': memoryStatus === 'FORGOTTEN' }" @click="void loadMemories('FORGOTTEN')">已经忘记</button>
              </div>

              <section class="memory-timeline">
                <article v-for="memory in memories" :key="memory.id" class="memory-card">
                  <span class="memory-dot" aria-hidden="true"></span>
                  <header>
                    <span>{{ MEMORY_LABELS[memory.memoryType] }}</span>
                    <small>{{ memory.userCorrected ? '由你确认' : `可信度 ${Math.round(memory.confidence * 100)}%` }}</small>
                  </header>
                  <p>{{ memory.content }}</p>
                  <blockquote v-if="memory.sourceExcerpt">“{{ memory.sourceExcerpt }}”</blockquote>
                  <footer>
                    <span><CalendarClock :size="13" />{{ formatDate(memory.sourceAt || memory.createdAt) }}</span>
                    <div>
                      <button v-if="memory.status === 'ACTIVE'" type="button" @click="openEdit(memory)"><Pencil :size="14" />纠正</button>
                      <button v-if="memory.status === 'ACTIVE'" type="button" @click="forget(memory)"><Trash2 :size="14" />忘记</button>
                      <button v-else type="button" @click="restore(memory)"><ArchiveRestore :size="14" />恢复</button>
                    </div>
                  </footer>
                </article>
                <p v-if="!memories.length" class="relationship-empty">
                  {{ memoryStatus === 'ACTIVE' ? '还没有长期记忆。继续聊天后，值得记住的事会出现在这里。' : '没有已经遗忘的记忆。' }}
                </p>
              </section>
            </template>

            <template v-else-if="activeTab === 'proactive'">
              <section class="preference-card">
                <div class="preference-lead">
                  <div><strong>允许陶攀主动联系你</strong><span>只在有自然话题且不处于安静时段时发送。</span></div>
                  <label class="relationship-switch">
                    <input v-model="preferenceForm.proactiveEnabled" type="checkbox" />
                    <span aria-hidden="true"></span>
                  </label>
                </div>

                <fieldset :disabled="!preferenceForm.proactiveEnabled">
                  <legend>联系频率</legend>
                  <label v-for="option in FREQUENCY_OPTIONS" :key="option.value" class="frequency-option">
                    <input v-model="preferenceForm.proactiveFrequency" type="radio" :value="option.value" />
                    <span><strong>{{ option.label }}</strong><small>{{ option.detail }}</small></span>
                  </label>
                </fieldset>

                <div class="quiet-grid" :class="{ 'is-disabled': !preferenceForm.proactiveEnabled }">
                  <label>安静开始<input v-model="preferenceForm.quietStart" type="time" :disabled="!preferenceForm.proactiveEnabled" /></label>
                  <label>安静结束<input v-model="preferenceForm.quietEnd" type="time" :disabled="!preferenceForm.proactiveEnabled" /></label>
                  <label>时区<input v-model="preferenceForm.timezone" type="text" :disabled="!preferenceForm.proactiveEnabled" /></label>
                </div>

                <button class="relationship-primary" type="button" :disabled="saving" @click="savePreferences">
                  <LoaderCircle v-if="saving" class="spin" :size="16" />
                  <Save v-else :size="16" />保存设置
                </button>
              </section>
            </template>

            <template v-else>
              <section class="data-card">
                <Download :size="23" />
                <div><strong>导出关系数据</strong><p>包含长期记忆、主动联系设置和全部聊天内容，文件格式为 JSON。</p></div>
                <button type="button" @click="exportRelationship">导出</button>
              </section>

              <section class="danger-card">
                <Trash2 :size="23" />
                <div>
                  <strong>删除全部关系数据</strong>
                  <p>永久删除聊天内容、长期记忆和主动联系设置。账户与活动奖品记录不会被删除。</p>
                  <label>输入“删除全部关系数据”确认<input v-model="deleteConfirmation" type="text" autocomplete="off" /></label>
                </div>
                <button type="button" :disabled="saving || deleteConfirmation.trim() !== '删除全部关系数据'" @click="deleteRelationship">永久删除</button>
              </section>
            </template>
          </main>

          <div v-if="editorOpen" class="memory-editor-backdrop" @mousedown.self="editorOpen = false">
            <form class="memory-editor" @submit.prevent="saveMemory">
              <header><strong>{{ editingId ? '纠正这条记忆' : '告诉他一件事' }}</strong><button type="button" aria-label="关闭" @click="editorOpen = false"><X :size="18" /></button></header>
              <label>类型
                <select v-model="memoryForm.memoryType">
                  <option v-for="(label, value) in MEMORY_LABELS" :key="value" :value="value">{{ label }}</option>
                </select>
              </label>
              <label>内容<textarea v-model="memoryForm.content" maxlength="2000" rows="4" placeholder="例如：我不喜欢别人突然取消约定。"></textarea></label>
              <label>发生日期（选填）<input v-model="memoryForm.occurredDate" type="date" /></label>
              <button class="relationship-primary" type="submit" :disabled="saving"><Save :size="16" />{{ editingId ? '保存纠正' : '记住这件事' }}</button>
            </form>
          </div>
        </section>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.relationship-overlay {
  position: fixed;
  z-index: 80;
  inset: 0;
  display: grid;
  justify-items: end;
  background: rgb(45 52 43 / 38%);
  backdrop-filter: blur(8px);
}

.relationship-panel {
  --rel-sage: #8b9d83;
  --rel-moss: #606c38;
  --rel-clay: #b08b6e;
  --rel-terracotta: #c66b3d;
  --rel-sand: #e8dcc7;
  --rel-oat: #d4b895;
  --rel-ink: #30372e;
  --rel-muted: #687064;

  position: relative;
  width: min(100%, 660px);
  height: 100%;
  overflow: hidden;
  display: grid;
  grid-template-rows: auto auto auto minmax(0, 1fr);
  color: var(--rel-ink);
  background:
    radial-gradient(circle at 82% 8%, rgb(198 107 61 / 13%), transparent 30%),
    linear-gradient(150deg, var(--rel-sand), #d9c8ad 72%, var(--rel-oat));
  box-shadow: -28px 0 80px rgb(48 55 46 / 24%);
  font-family: "Helvetica Neue", "PingFang SC", system-ui, sans-serif;
}

.relationship-panel::before {
  position: absolute;
  inset: 0;
  pointer-events: none;
  content: "";
  opacity: 0.025;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 180 180' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='.8'/%3E%3C/svg%3E");
}

.relationship-header,
.relationship-tabs,
.relationship-notice,
.relationship-content,
.relationship-loading { position: relative; z-index: 1; }
.relationship-header { display: grid; grid-template-columns: auto 1fr auto; align-items: center; gap: 13px; padding: 24px 26px 16px; }
.relationship-heading-mark { display: grid; place-items: center; width: 46px; height: 46px; border-radius: 17px; color: var(--rel-sand); background: var(--rel-moss); }
.relationship-header p, .relationship-header h2 { margin: 0; }
.relationship-header p { color: var(--rel-muted); font-size: 12px; }
.relationship-header h2 { margin-top: 2px; font-size: 24px; letter-spacing: -.02em; }
.relationship-header > button, .memory-editor header button { display: grid; place-items: center; width: 38px; height: 38px; border-radius: 14px; color: var(--rel-ink); background: rgb(232 220 199 / 72%); }

.relationship-tabs { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; padding: 0 26px 16px; }
.relationship-tabs button { display: inline-flex; align-items: center; justify-content: center; gap: 7px; min-height: 42px; border: 1px solid rgb(96 108 56 / 16%); border-radius: 15px; color: var(--rel-muted); background: rgb(232 220 199 / 52%); font-weight: 680; }
.relationship-tabs button.is-active { color: var(--rel-sand); background: var(--rel-moss); }

.relationship-notice { display: flex; align-items: center; gap: 7px; margin: 0 26px 10px; padding: 10px 12px; border-radius: 14px; font-size: 13px; }
.relationship-notice.is-error { color: #7a3523; background: rgb(198 107 61 / 16%); }
.relationship-notice.is-success { color: #445027; background: rgb(139 157 131 / 24%); }
.relationship-loading { display: flex; align-items: center; justify-content: center; gap: 10px; color: var(--rel-muted); }
.relationship-content { min-height: 0; overflow-y: auto; padding: 0 26px 34px; }

.memory-summary { display: flex; align-items: center; justify-content: space-between; gap: 16px; padding: 19px; border-radius: 22px; background: rgb(232 220 199 / 62%); }
.memory-summary div { display: grid; }
.memory-summary strong { font-size: 30px; line-height: 1; }
.memory-summary span { margin-top: 5px; color: var(--rel-muted); font-size: 12px; }
.memory-summary button, .relationship-primary { display: inline-flex; align-items: center; justify-content: center; gap: 7px; min-height: 42px; padding: 0 15px; border-radius: 15px; color: var(--rel-sand); background: var(--rel-moss); font-weight: 700; }

.memory-filter { display: flex; gap: 8px; margin: 18px 0; }
.memory-filter button { min-height: 34px; padding: 0 12px; border-radius: 999px; color: var(--rel-muted); background: rgb(232 220 199 / 55%); font-size: 12px; }
.memory-filter button.is-active { color: var(--rel-ink); background: var(--rel-sage); }
.memory-timeline { position: relative; display: grid; gap: 14px; padding-left: 20px; }
.memory-timeline::before { position: absolute; top: 4px; bottom: 4px; left: 5px; width: 2px; content: ""; background: rgb(96 108 56 / 24%); }
.memory-card { position: relative; padding: 17px; border-radius: 20px; background: rgb(232 220 199 / 72%); box-shadow: 0 12px 26px rgb(48 55 46 / 7%); }
.memory-dot { position: absolute; top: 22px; left: -20px; width: 12px; height: 12px; border: 3px solid var(--rel-sand); border-radius: 50%; background: var(--rel-terracotta); }
.memory-card header, .memory-card footer { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
.memory-card header span { color: var(--rel-moss); font-size: 12px; font-weight: 760; }
.memory-card header small { color: var(--rel-muted); }
.memory-card p { margin: 12px 0 0; font-size: 15px; line-height: 1.65; user-select: text; }
.memory-card blockquote { margin: 12px 0 0; padding-left: 11px; border-left: 3px solid var(--rel-clay); color: var(--rel-muted); font-size: 12px; line-height: 1.6; user-select: text; }
.memory-card footer { align-items: flex-end; margin-top: 14px; }
.memory-card footer > span { display: inline-flex; align-items: center; gap: 5px; color: var(--rel-muted); font-size: 11px; }
.memory-card footer div { display: flex; gap: 5px; }
.memory-card footer button { display: inline-flex; align-items: center; gap: 4px; min-height: 29px; padding: 0 8px; border-radius: 10px; color: var(--rel-muted); background: rgb(212 184 149 / 35%); font-size: 11px; }
.relationship-empty { margin: 22px 0; color: var(--rel-muted); line-height: 1.7; text-align: center; }

.preference-card, .data-card, .danger-card { padding: 20px; border-radius: 22px; background: rgb(232 220 199 / 68%); }
.preference-lead { display: flex; align-items: center; justify-content: space-between; gap: 18px; }
.preference-lead div { display: grid; gap: 5px; }
.preference-lead span { color: var(--rel-muted); font-size: 12px; line-height: 1.55; }
.relationship-switch input { position: absolute; opacity: 0; }
.relationship-switch span { position: relative; display: block; width: 48px; height: 29px; border-radius: 999px; background: var(--rel-clay); transition: background .3s ease; }
.relationship-switch span::after { position: absolute; top: 4px; left: 4px; width: 21px; height: 21px; border-radius: 50%; content: ""; background: var(--rel-sand); transition: transform .3s ease; }
.relationship-switch input:checked + span { background: var(--rel-moss); }
.relationship-switch input:checked + span::after { transform: translateX(19px); }
.preference-card fieldset { display: grid; grid-template-columns: repeat(3, 1fr); gap: 9px; margin: 22px 0 0; padding: 0; border: 0; }
.preference-card legend { grid-column: 1 / -1; margin-bottom: 8px; color: var(--rel-muted); font-size: 12px; }
.frequency-option input { position: absolute; opacity: 0; }
.frequency-option > span { display: grid; gap: 3px; min-height: 64px; padding: 12px; border: 1px solid rgb(96 108 56 / 16%); border-radius: 15px; background: rgb(232 220 199 / 48%); }
.frequency-option small { color: var(--rel-muted); }
.frequency-option input:checked + span { border-color: var(--rel-moss); background: rgb(139 157 131 / 28%); }
.quiet-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 11px; margin-top: 17px; }
.quiet-grid label:last-child { grid-column: 1 / -1; }
.quiet-grid label, .memory-editor label, .danger-card label { display: grid; gap: 6px; color: var(--rel-muted); font-size: 12px; }
.quiet-grid input, .memory-editor input, .memory-editor select, .memory-editor textarea, .danger-card input { width: 100%; border: 1px solid rgb(96 108 56 / 18%); border-radius: 13px; padding: 10px 11px; color: var(--rel-ink); outline: none; background: rgb(232 220 199 / 66%); font: inherit; user-select: text; }
.quiet-grid.is-disabled { opacity: .45; }
.preference-card .relationship-primary { margin-top: 18px; }

.data-card, .danger-card { display: grid; grid-template-columns: auto 1fr auto; align-items: start; gap: 14px; }
.data-card div, .danger-card div { display: grid; gap: 7px; }
.data-card p, .danger-card p { margin: 0; color: var(--rel-muted); font-size: 12px; line-height: 1.6; }
.data-card > button, .danger-card > button { min-height: 38px; padding: 0 12px; border-radius: 13px; color: var(--rel-sand); background: var(--rel-moss); font-weight: 700; }
.danger-card { margin-top: 16px; color: #6c2f20; background: rgb(198 107 61 / 16%); }
.danger-card > button { background: var(--rel-terracotta); }
.danger-card > button:disabled { cursor: not-allowed; opacity: .42; }

.memory-editor-backdrop { position: absolute; z-index: 4; inset: 0; display: grid; place-items: center; padding: 22px; background: rgb(48 55 46 / 34%); backdrop-filter: blur(6px); }
.memory-editor { width: min(100%, 440px); display: grid; gap: 15px; padding: 21px; border-radius: 24px; background: var(--rel-sand); box-shadow: 0 26px 70px rgb(48 55 46 / 28%); }
.memory-editor header { display: flex; align-items: center; justify-content: space-between; }
.memory-editor textarea { resize: vertical; line-height: 1.6; }

.relationship-panel-enter-active, .relationship-panel-leave-active { transition: opacity .3s ease; }
.relationship-panel-enter-active .relationship-panel, .relationship-panel-leave-active .relationship-panel { transition: transform .38s ease; }
.relationship-panel-enter-from, .relationship-panel-leave-to { opacity: 0; }
.relationship-panel-enter-from .relationship-panel, .relationship-panel-leave-to .relationship-panel { transform: translateX(100%); }

@media (max-width: 680px) {
  .relationship-panel { width: 100%; }
  .relationship-header { padding: calc(16px + env(safe-area-inset-top)) 16px 12px; }
  .relationship-tabs { padding: 0 16px 12px; }
  .relationship-content { padding: 0 16px calc(24px + env(safe-area-inset-bottom)); }
  .relationship-notice { margin-inline: 16px; }
  .preference-card fieldset { grid-template-columns: 1fr; }
  .quiet-grid { grid-template-columns: 1fr; }
  .quiet-grid label:last-child { grid-column: auto; }
  .data-card, .danger-card { grid-template-columns: auto 1fr; }
  .data-card > button, .danger-card > button { grid-column: 1 / -1; }
  .memory-card footer { align-items: flex-start; flex-direction: column; }
}
</style>
