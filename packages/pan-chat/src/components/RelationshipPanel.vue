<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import {
  ArchiveRestore,
  Brain,
  CalendarClock,
  Check,
  CircleAlert,
  Download,
  GitBranch,
  Link2,
  LoaderCircle,
  Pencil,
  Plus,
  Save,
  Trash2,
  X,
} from 'lucide-vue-next'
import { relationshipApi } from '../api/relationship'
import type {
  MemoryStatus,
  MemoryType,
  RelationshipMemory,
  RelationshipOverview,
} from '../types/relationship'

const props = defineProps<{ open: boolean }>()
const emit = defineEmits<{ close: []; deleted: [] }>()

type PanelTab = 'memories' | 'data'

const MEMORY_LABELS: Record<MemoryType, string> = {
  PERSON: '关于你',
  PREFERENCE: '偏好',
  SHARED_EVENT: '共同经历',
  OPEN_LOOP: '以后再聊',
  RELATIONSHIP: '关系变化',
}

const EVIDENCE_LABELS: Record<string, string> = {
  CHAT_EXTRACTION: '聊天原话',
  USER_STATEMENT: '你主动告诉他的',
  USER_CORRECTION: '你的确认或纠正',
  ADMIN_ACTION: '受审计的管理操作',
}

const OPEN_LOOP_LABELS: Record<string, string> = {
  OPEN: '等待自然接续',
  COMPLETED: '已完成',
  CANCELLED: '已取消',
  EXPIRED: '已失效',
}

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

async function resolveConflict(memory: RelationshipMemory, accept: boolean) {
  error.value = ''
  try {
    if (accept) await relationshipApi.confirmMemory(memory.id)
    else await relationshipApi.rejectMemory(memory.id)
    success.value = accept ? '已采用新说法，旧版本仍可追溯' : '已保留原来的说法'
    await load()
  } catch (caught) {
    error.value = caught instanceof Error ? caught.message : '确认失败'
  }
}

async function setOpenLoopStatus(
  memory: RelationshipMemory,
  status: 'OPEN' | 'COMPLETED' | 'CANCELLED' | 'EXPIRED',
) {
  error.value = ''
  try {
    await relationshipApi.updateOpenLoopStatus(memory.id, status)
    success.value = status === 'OPEN' ? '已重新打开这个话题' : `已标记为${OPEN_LOOP_LABELS[status]}`
    await loadMemories(memoryStatus.value)
  } catch (caught) {
    error.value = caught instanceof Error ? caught.message : '话题状态更新失败'
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
  if (!window.confirm('这会永久删除全部聊天和长期记忆，且无法恢复。确认继续？')) return
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

function evidenceLabel(value: string) {
  return EVIDENCE_LABELS[value] ?? '来源记录'
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

              <section class="memory-reliability" aria-label="记忆可靠性">
                <span><Link2 :size="14" /><strong>{{ overview?.reliability.evidenceCount ?? 0 }}</strong> 条来源证据</span>
                <span><GitBranch :size="14" /><strong>{{ overview?.reliability.usageCount ?? 0 }}</strong> 次回答引用</span>
                <span :class="{ 'has-warning': (overview?.reliability.failedExtractionCount ?? 0) > 0 }">
                  <CircleAlert :size="14" />
                  <strong>{{ overview?.reliability.pendingExtractionCount ?? 0 }}</strong> 条待提取
                  <template v-if="overview?.reliability.failedExtractionCount">· {{ overview.reliability.failedExtractionCount }} 条失败</template>
                </span>
              </section>

              <div class="memory-filter">
                <button :class="{ 'is-active': memoryStatus === 'ACTIVE' }" @click="void loadMemories('ACTIVE')">记得的事</button>
                <button :class="{ 'is-active': memoryStatus === 'NEEDS_CONFIRMATION' }" @click="void loadMemories('NEEDS_CONFIRMATION')">
                  需要你确认<span v-if="overview?.needsConfirmationCount"> {{ overview.needsConfirmationCount }}</span>
                </button>
                <button :class="{ 'is-active': memoryStatus === 'FORGOTTEN' }" @click="void loadMemories('FORGOTTEN')">已经忘记</button>
              </div>

              <section class="memory-timeline">
                <article
                  v-for="memory in memories"
                  :key="memory.id"
                  class="memory-card"
                  :class="{ 'is-conflict': memory.confirmationStatus === 'NEEDS_CONFIRMATION' }"
                >
                  <span class="memory-dot" aria-hidden="true"></span>
                  <header>
                    <span>{{ MEMORY_LABELS[memory.memoryType] }}</span>
                    <small v-if="memory.confirmationStatus === 'NEEDS_CONFIRMATION'">需要你确认</small>
                    <small v-else>{{ memory.userCorrected ? '由你确认' : `可信度 ${Math.round(memory.confidence * 100)}%` }}</small>
                  </header>
                  <p>{{ memory.content }}</p>

                  <section v-if="memory.confirmationStatus === 'NEEDS_CONFIRMATION'" class="memory-conflict">
                    <span>他发现了一个和已有记忆不同的新说法</span>
                    <div v-if="memory.supersedesContent">
                      <small>原来的说法</small>
                      <p>{{ memory.supersedesContent }}</p>
                    </div>
                    <div>
                      <small>新说法</small>
                      <p>{{ memory.content }}</p>
                    </div>
                    <footer>
                      <button type="button" @click="void resolveConflict(memory, false)"><X :size="14" />保留原说法</button>
                      <button class="is-primary" type="button" @click="void resolveConflict(memory, true)"><Check :size="14" />采用新说法</button>
                    </footer>
                  </section>

                  <div v-if="memory.memoryType === 'OPEN_LOOP' && memory.openLoopStatus" class="open-loop-state">
                    <span>{{ OPEN_LOOP_LABELS[memory.openLoopStatus] }}</span>
                    <div v-if="memory.confirmationStatus !== 'NEEDS_CONFIRMATION'">
                      <button v-if="memory.openLoopStatus !== 'OPEN'" type="button" @click="void setOpenLoopStatus(memory, 'OPEN')">重新打开</button>
                      <template v-else>
                        <button type="button" @click="void setOpenLoopStatus(memory, 'COMPLETED')">标记完成</button>
                        <button type="button" @click="void setOpenLoopStatus(memory, 'CANCELLED')">取消话题</button>
                      </template>
                    </div>
                  </div>

                  <details v-if="memory.evidence.length" class="memory-evidence">
                    <summary><Link2 :size="13" />{{ memory.evidence.length }} 条来源证据 · 已用于 {{ memory.usageCount }} 条回答</summary>
                    <ol>
                      <li v-for="evidence in memory.evidence" :key="evidence.id ?? `${evidence.evidenceType}-${evidence.createdAt}`">
                        <span>{{ evidenceLabel(evidence.evidenceType) }} · {{ formatDate(evidence.sourceAt || evidence.createdAt) }}</span>
                        <blockquote>“{{ evidence.excerpt }}”</blockquote>
                      </li>
                    </ol>
                  </details>
                  <blockquote v-else-if="memory.sourceExcerpt">“{{ memory.sourceExcerpt }}”</blockquote>
                  <footer>
                    <span><CalendarClock :size="13" />{{ formatDate(memory.sourceAt || memory.createdAt) }}</span>
                    <div v-if="memory.confirmationStatus !== 'NEEDS_CONFIRMATION'">
                      <button v-if="memory.status === 'ACTIVE'" type="button" @click="openEdit(memory)"><Pencil :size="14" />纠正</button>
                      <button v-if="memory.status === 'ACTIVE'" type="button" @click="forget(memory)"><Trash2 :size="14" />忘记</button>
                      <button v-else-if="memory.status === 'FORGOTTEN'" type="button" @click="restore(memory)"><ArchiveRestore :size="14" />恢复</button>
                    </div>
                  </footer>
                </article>
                <p v-if="!memories.length" class="relationship-empty">
                  {{ memoryStatus === 'ACTIVE'
                    ? '还没有长期记忆。继续聊天后，值得记住的事会出现在这里。'
                    : memoryStatus === 'NEEDS_CONFIRMATION'
                      ? '目前没有相互冲突、需要你确认的记忆。'
                      : '没有已经遗忘的记忆。' }}
                </p>
              </section>
            </template>

            <template v-else>
              <section class="data-card">
                <Download :size="23" />
                <div><strong>导出关系数据</strong><p>包含长期记忆、来源证据、使用记录和全部聊天内容，文件格式为 JSON。</p></div>
                <button type="button" @click="exportRelationship">导出</button>
              </section>

              <section class="danger-card">
                <Trash2 :size="23" />
                <div>
                  <strong>删除全部关系数据</strong>
                  <p>永久删除聊天内容、长期记忆、来源证据和使用记录。账户与活动奖品记录不会被删除。</p>
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
  background: var(--pp-overlay);
}

.relationship-panel {
  --rel-ink: var(--pp-ink);
  --rel-muted: var(--pp-muted);
  --rel-line: var(--pp-line);
  --rel-soft-line: var(--pp-soft-line);
  --rel-paper: var(--pp-paper);
  --rel-blue: var(--pp-accent);
  --rel-blue-dark: var(--pp-accent-dark);
  --rel-danger: var(--pp-danger);
  --rel-danger-soft: var(--pp-danger-soft);

  position: relative;
  width: min(100%, 660px);
  height: 100%;
  overflow: hidden;
  display: grid;
  grid-template-rows: auto auto auto minmax(0, 1fr);
  border-left: 1px solid var(--rel-ink);
  color: var(--rel-ink);
  background: var(--rel-paper);
  box-shadow: -16px 0 0 var(--pp-shadow-accent);
  font-family: var(--pp-font);
}

.relationship-panel::before {
  display: none;
}

.relationship-header,
.relationship-tabs,
.relationship-notice,
.relationship-content,
.relationship-loading { position: relative; z-index: 1; }
.relationship-header {
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: 15px;
  padding: 22px 26px 18px;
  border-bottom: 1px solid var(--rel-ink);
}
.relationship-heading-mark {
  display: grid;
  place-items: center;
  width: 48px;
  height: 48px;
  border: 1px solid var(--rel-ink);
  color: var(--rel-blue);
  background: var(--rel-paper);
  box-shadow: 4px 4px 0 var(--rel-blue);
}
.relationship-header p, .relationship-header h2 { margin: 0; }
.relationship-header p {
  color: var(--rel-muted);
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.16em;
}
.relationship-header h2 {
  margin-top: 4px;
  font-size: 26px;
  font-weight: 800;
  letter-spacing: -0.035em;
}
.relationship-header > button, .memory-editor header button {
  display: grid;
  place-items: center;
  width: 40px;
  height: 40px;
  border: 1px solid var(--rel-line);
  border-radius: var(--pp-radius-sm);
  color: var(--rel-ink);
  background: var(--rel-paper);
}
.relationship-header > button:hover, .memory-editor header button:hover {
  color: var(--rel-paper);
  background: var(--rel-blue);
}

.relationship-tabs {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 0;
  border-bottom: 1px solid var(--rel-ink);
}
.relationship-tabs button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  min-height: 46px;
  border: 0;
  border-right: 1px solid var(--rel-ink);
  border-radius: 0;
  color: var(--rel-muted);
  background: var(--rel-paper);
  font-size: 12px;
  font-weight: 750;
}
.relationship-tabs button:last-child { border-right: 0; }
.relationship-tabs button.is-active { color: var(--rel-paper); background: var(--rel-blue); }

.relationship-notice {
  display: flex;
  align-items: center;
  gap: 7px;
  margin: 14px 26px 0;
  padding: 9px 11px;
  border: 1px solid var(--rel-line);
  font-size: 12px;
  font-weight: 650;
}
.relationship-notice.is-error { border-color: var(--rel-danger); color: #8f1d14; background: var(--rel-danger-soft); }
.relationship-notice.is-success { border-color: var(--rel-blue); color: var(--rel-blue); background: var(--pp-accent-soft); }
.relationship-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  color: var(--rel-muted);
  font-size: 13px;
  font-weight: 650;
}
.relationship-content { min-height: 0; overflow-y: auto; padding: 20px 26px 36px; }

.memory-summary {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  gap: 18px;
  padding: 18px 20px;
  border: 1px solid var(--rel-ink);
  background: var(--rel-paper);
  box-shadow: 6px 6px 0 var(--pp-shadow-accent);
}
.memory-summary div { display: grid; }
.memory-summary strong {
  font-size: 32px;
  font-weight: 800;
  font-variant-numeric: tabular-nums;
  line-height: 1;
}
.memory-summary span { margin-top: 5px; color: var(--rel-muted); font-size: 11px; }
.memory-summary button, .relationship-primary {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  min-height: 40px;
  padding: 0 14px;
  border: 1px solid var(--rel-blue);
  border-radius: var(--pp-radius-sm);
  color: var(--rel-paper);
  background: var(--rel-blue);
  font-size: 11px;
  font-weight: 800;
}
.memory-summary button:hover, .relationship-primary:hover { background: var(--rel-blue-dark); }

.memory-reliability {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 18px;
  margin-top: 14px;
  padding: 10px 0;
  border-top: 1px solid var(--rel-soft-line);
  border-bottom: 1px solid var(--rel-soft-line);
  color: var(--rel-muted);
  font-size: 10px;
  font-weight: 750;
  letter-spacing: 0.03em;
}
.memory-reliability span { display: inline-flex; align-items: center; gap: 5px; }
.memory-reliability strong { color: var(--rel-ink); font-size: 12px; font-variant-numeric: tabular-nums; }
.memory-reliability .has-warning { color: var(--rel-danger); }

.memory-filter { display: flex; gap: 6px; margin: 16px 0; }
.memory-filter button {
  min-height: 32px;
  padding: 0 12px;
  border: 1px solid var(--rel-line);
  border-radius: var(--pp-radius-sm);
  color: var(--rel-muted);
  background: var(--rel-paper);
  font-size: 11px;
  font-weight: 750;
}
.memory-filter button.is-active { border-color: var(--rel-blue); color: var(--rel-paper); background: var(--rel-blue); }
.memory-timeline { position: relative; display: grid; gap: 16px; padding-left: 22px; }
.memory-timeline::before {
  position: absolute;
  top: 6px;
  bottom: 6px;
  left: 4px;
  width: 1px;
  content: "";
  background: var(--rel-ink);
}
.memory-card {
  position: relative;
  padding: 16px 18px;
  border: 1px solid var(--rel-line);
  border-radius: var(--pp-radius);
  background: var(--rel-paper);
  box-shadow: 4px 4px 0 var(--pp-shadow);
}
.memory-card.is-conflict { border-color: var(--rel-danger); border-left: 4px solid var(--rel-danger); background: var(--rel-danger-soft); }
.memory-card.is-conflict .memory-dot { background: var(--rel-danger); }
.memory-dot {
  position: absolute;
  top: 20px;
  left: -22px;
  width: 9px;
  height: 9px;
  border: 1px solid var(--rel-paper);
  border-radius: 0;
  background: var(--rel-blue);
  box-shadow: 2px 2px 0 rgb(0 47 167 / 35%);
}
.memory-card > header, .memory-card > footer { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
.memory-card > header span { color: var(--rel-blue); font-size: 10px; font-weight: 800; letter-spacing: 0.14em; }
.memory-card > header small { color: var(--rel-muted); }
.memory-card p { margin: 12px 0 0; font-size: 15px; font-weight: 450; line-height: 1.7; user-select: text; }
.memory-card blockquote { margin: 12px 0 0; padding-left: 11px; border-left: 3px solid var(--rel-blue); color: var(--rel-muted); font-size: 12px; line-height: 1.6; user-select: text; }
.memory-card > footer { align-items: flex-end; margin-top: 14px; }
.memory-card > footer > span { display: inline-flex; align-items: center; gap: 5px; color: var(--rel-muted); font-size: 10px; }
.memory-card > footer > div { display: flex; gap: 5px; }
.memory-card > footer button {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  min-height: 28px;
  padding: 0 8px;
  border: 1px solid var(--rel-line);
  border-radius: var(--pp-radius-sm);
  color: var(--rel-muted);
  background: var(--rel-paper);
  font-size: 10px;
  font-weight: 750;
}
.memory-card > footer button:hover { border-color: var(--rel-blue); color: var(--rel-paper); background: var(--rel-blue); }

.memory-conflict {
  display: grid;
  gap: 8px;
  margin-top: 14px;
  padding: 13px;
  border: 1px dashed var(--rel-danger);
  background: var(--rel-danger-soft);
}
.memory-conflict > span { color: #8f1d14; font-size: 12px; font-weight: 800; }
.memory-conflict > div { padding: 10px 11px; border: 1px solid var(--rel-soft-line); background: var(--rel-paper); }
.memory-conflict small { color: var(--rel-muted); font-size: 10px; }
.memory-conflict p { margin-top: 3px; font-size: 13px; }
.memory-conflict footer { display: flex; justify-content: flex-end; gap: 7px; margin-top: 3px; }
.memory-conflict button, .open-loop-state button {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  min-height: 30px;
  padding: 0 9px;
  border: 1px solid var(--rel-line);
  border-radius: var(--pp-radius-sm);
  color: var(--rel-muted);
  background: var(--rel-paper);
  font-size: 10px;
  font-weight: 750;
}
.memory-conflict button:hover, .open-loop-state button:hover { border-color: var(--rel-blue); color: var(--rel-paper); background: var(--rel-blue); }
.memory-conflict button.is-primary { border-color: var(--rel-blue); color: var(--rel-paper); background: var(--rel-blue); }

.open-loop-state {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-top: 12px;
  padding: 9px 11px;
  border: 1px dashed var(--rel-blue);
}
.open-loop-state > span { color: var(--rel-blue); font-size: 10px; font-weight: 800; letter-spacing: 0.08em; }
.open-loop-state > div { display: flex; flex-wrap: wrap; justify-content: flex-end; gap: 5px; }

.memory-evidence { margin-top: 12px; border-top: 1px solid var(--rel-soft-line); padding-top: 10px; }
.memory-evidence summary { display: inline-flex; align-items: center; gap: 5px; color: var(--rel-muted); cursor: pointer; font-size: 10px; font-weight: 750; list-style: none; }
.memory-evidence summary::-webkit-details-marker { display: none; }
.memory-evidence ol { display: grid; gap: 8px; margin: 10px 0 0; padding: 0; list-style: none; }
.memory-evidence li { padding: 9px 10px; border: 1px solid var(--rel-soft-line); background: var(--rel-paper); }
.memory-evidence li > span { color: var(--rel-muted); font-size: 10px; }
.memory-evidence li blockquote { margin-top: 5px; }
.relationship-empty { margin: 24px 0; color: var(--rel-muted); font-size: 13px; line-height: 1.7; text-align: center; }

.data-card, .danger-card {
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: start;
  gap: 15px;
  padding: 18px 20px;
  border: 1px solid var(--rel-ink);
  border-radius: var(--pp-radius);
  background: var(--rel-paper);
}
.data-card svg { color: var(--rel-blue); }
.data-card div, .danger-card div { display: grid; gap: 7px; }
.data-card p, .danger-card p { margin: 0; color: var(--rel-muted); font-size: 12px; line-height: 1.6; }
.data-card > button, .danger-card > button {
  min-height: 38px;
  padding: 0 12px;
  border: 1px solid var(--rel-blue);
  border-radius: var(--pp-radius-sm);
  color: var(--rel-paper);
  background: var(--rel-blue);
  font-size: 11px;
  font-weight: 800;
}
.danger-card { margin-top: 16px; border-color: var(--rel-danger); color: #8f1d14; background: var(--rel-danger-soft); }
.danger-card svg { color: var(--rel-danger); }
.danger-card > button { border-color: var(--rel-danger); background: var(--rel-danger); }
.danger-card > button:disabled { cursor: not-allowed; opacity: 0.42; }

.memory-editor label, .danger-card label { display: grid; gap: 6px; color: var(--rel-muted); font-size: 11px; font-weight: 650; }
.memory-editor input, .memory-editor select, .memory-editor textarea, .danger-card input {
  width: 100%;
  border: 1px solid var(--rel-line);
  border-radius: var(--pp-radius-sm);
  padding: 9px 10px;
  color: var(--rel-ink);
  outline: none;
  background: var(--rel-paper);
  font: inherit;
  font-size: 13px;
  user-select: text;
}
.memory-editor input:focus, .memory-editor select:focus, .memory-editor textarea:focus, .danger-card input:focus {
  border-color: var(--rel-blue);
  box-shadow: 0 0 0 2px rgb(0 47 167 / 10%);
}

.memory-editor-backdrop {
  position: absolute;
  z-index: 4;
  inset: 0;
  display: grid;
  place-items: center;
  padding: 22px;
  background: var(--pp-overlay);
}
.memory-editor {
  width: min(100%, 440px);
  display: grid;
  gap: 15px;
  padding: 22px;
  border: 1px solid var(--rel-ink);
  border-radius: var(--pp-radius);
  background: var(--rel-paper);
  box-shadow: 10px 10px 0 var(--pp-shadow-accent);
}
.memory-editor header { display: flex; align-items: center; justify-content: space-between; }
.memory-editor textarea { resize: vertical; line-height: 1.6; }

.relationship-panel-enter-active, .relationship-panel-leave-active { transition: opacity 0.3s ease; }
.relationship-panel-enter-active .relationship-panel, .relationship-panel-leave-active .relationship-panel { transition: transform 0.38s ease; }
.relationship-panel-enter-from, .relationship-panel-leave-to { opacity: 0; }
.relationship-panel-enter-from .relationship-panel, .relationship-panel-leave-to .relationship-panel { transform: translateX(100%); }

@media (max-width: 680px) {
  .relationship-panel { width: 100%; }
  .relationship-header { padding: calc(16px + env(safe-area-inset-top)) 16px 14px; }
  .relationship-tabs { border-bottom: 0; }
  .relationship-content { padding: 16px 16px calc(26px + env(safe-area-inset-bottom)); }
  .relationship-notice { margin: 12px 16px 0; }
  .memory-summary { grid-template-columns: 1fr; gap: 12px; }
  .memory-summary button { justify-self: start; }
  .data-card, .danger-card { grid-template-columns: auto 1fr; }
  .data-card > button, .danger-card > button { grid-column: 1 / -1; }
  .memory-card > footer { align-items: flex-start; flex-direction: column; }
  .memory-conflict footer { align-items: stretch; flex-direction: column; }
}
</style>
