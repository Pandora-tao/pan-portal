<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import {
  NButton,
  NDescriptions,
  NDescriptionsItem,
  NDrawer,
  NDrawerContent,
  NInput,
  NModal,
  NSpin,
  NTabPane,
  NTabs,
  NTag,
  useMessage,
} from 'naive-ui'
import {
  BadgeCheck,
  BadgeX,
  Brain,
  Clock3,
  Copy,
  Download,
  Eye,
  EyeOff,
  FileUser,
  KeyRound,
  LogOut,
  RotateCcw,
  Save,
  ShieldCheck,
  ShieldOff,
  Trash2,
  UserCheck,
  UserX,
} from 'lucide-vue-next'
import { adminApi } from '../api/admin'
import type {
  AdminProfileData,
  AdminRelationshipData,
  ConversationSummary,
  RelationshipMemory,
  UserDetail,
} from '../types/admin'

const props = defineProps<{
  open: boolean
  userId: string | null
  currentUserId: string
}>()
const emit = defineEmits<{ 'update:open': [value: boolean]; changed: [] }>()

type ActionType =
  | 'disable'
  | 'enable'
  | 'revoke'
  | 'reset'
  | 'promote'
  | 'demote'
  | 'approveIdentity'
  | 'rejectIdentity'
  | 'exportPrivateProfile'
  | 'deletePrivateProfile'
  | 'exportRelationship'
  | 'deleteRelationship'
  | 'forgetMemory'
  | 'restoreMemory'

const message = useMessage()
const loading = ref(false)
const savingProfile = ref(false)
const detail = ref<UserDetail | null>(null)
const conversations = ref<ConversationSummary[]>([])
const actionOpen = ref(false)
const actionType = ref<ActionType>('disable')
const actionReason = ref('')
const actionLoading = ref(false)
const resetLink = ref('')
const resetExpiresAt = ref('')
const actionConfirmation = ref('')
const actionMemoryId = ref<string | null>(null)
const profile = reactive({ displayName: '', realName: '' })
const privateProfile = ref<AdminProfileData | null>(null)
const relationshipData = ref<AdminRelationshipData | null>(null)
const profileAccessPurpose = ref('')
const relationshipAccessPurpose = ref('')
const privateProfileLoading = ref(false)
const relationshipLoading = ref(false)

const isSelf = computed(() => detail.value?.user.id === props.currentUserId)
const actionMeta: Record<ActionType, { title: string; description: string; confirm: string }> = {
  disable: { title: '禁用账号', description: '用户将立即下线，并且不能再次登录。', confirm: '确认禁用' },
  enable: { title: '启用账号', description: '用户可以重新登录，但旧会话不会恢复。', confirm: '确认启用' },
  revoke: { title: '强制下线', description: '该用户的全部有效登录会话将被撤销。', confirm: '确认下线' },
  reset: { title: '生成密码重置链接', description: '旧链接会失效，新链接仅可使用一次，有效期 30 分钟。', confirm: '生成链接' },
  promote: { title: '设为超级管理员', description: '该用户将获得完整后台和对话访问权限。', confirm: '确认提升' },
  demote: { title: '降为普通用户', description: '该用户会立即失去后台权限并退出登录。', confirm: '确认降级' },
  approveIdentity: { title: '通过实名认证', description: '通过后将立即启用该用户的个人记忆和个人主页维护权限。', confirm: '确认通过' },
  rejectIdentity: { title: '驳回实名认证', description: '驳回后将继续关闭该用户的个人记忆和个人主页维护权限。', confirm: '确认驳回' },
  exportPrivateProfile: { title: '导出个人主页', description: '只导出主页字段，并为本次导出单独记录访问目的。', confirm: '生成 JSON 文件' },
  deletePrivateProfile: { title: '永久删除个人主页', description: '删除后无法从管理后台恢复，不影响账号、聊天、关系记忆或审计记录。', confirm: '永久删除' },
  exportRelationship: { title: '导出关系记忆', description: '只导出关系记忆及其来源状态，不包含聊天会话或消息正文。', confirm: '生成 JSON 文件' },
  deleteRelationship: { title: '永久删除全部关系记忆', description: '删除关系记忆、证据、使用记录和提取任务，不删除聊天历史、账号或审计记录。', confirm: '永久删除' },
  forgetMemory: { title: '忘记这条关系记忆', description: '记忆将停止参与关系上下文，仍可在后台恢复。', confirm: '确认忘记' },
  restoreMemory: { title: '恢复这条关系记忆', description: '记忆将重新参与关系上下文，并标记为人工确认。', confirm: '确认恢复' },
}

const destructiveAction = computed(() =>
  actionType.value === 'deletePrivateProfile' || actionType.value === 'deleteRelationship',
)

const sensitiveDataAction = computed(() =>
  [
    'exportPrivateProfile',
    'deletePrivateProfile',
    'exportRelationship',
    'deleteRelationship',
    'forgetMemory',
    'restoreMemory',
  ].includes(actionType.value),
)

const expectedConfirmation = computed(() => {
  if (!detail.value) return ''
  if (actionType.value === 'deletePrivateProfile') return `永久删除个人主页 ${detail.value.user.id}`
  if (actionType.value === 'deleteRelationship') return `永久删除全部关系记忆 ${detail.value.user.id}`
  return ''
})

const identityStatusMeta = computed(() => {
  const status = detail.value?.user.realNameVerificationStatus
  if (status === 'APPROVED') return { label: '已通过', copy: '个人记忆与个人主页已启用', icon: BadgeCheck }
  if (status === 'REJECTED') return { label: '已驳回', copy: '个人记忆与个人主页保持关闭', icon: BadgeX }
  if (status === 'PENDING') return { label: '待审核', copy: '等待超级管理员确认真实姓名', icon: Clock3 }
  return { label: '未提交', copy: '用户尚未填写真实姓名', icon: Clock3 }
})

async function load() {
  if (!props.open || !props.userId) return
  loading.value = true
  try {
    const [userDetail, conversationPage] = await Promise.all([
      adminApi.user(props.userId),
      adminApi.conversations({ userId: props.userId, page: 0, size: 50 }),
    ])
    detail.value = userDetail
    conversations.value = conversationPage.items
    profile.displayName = detail.value.user.displayName
    profile.realName = detail.value.user.realName || ''
  } catch (error) {
    message.error(error instanceof Error ? error.message : '用户详情加载失败')
  } finally {
    loading.value = false
  }
}

function resetPrivateData() {
  privateProfile.value = null
  relationshipData.value = null
  profileAccessPurpose.value = ''
  relationshipAccessPurpose.value = ''
  actionMemoryId.value = null
}

function formatTime(value: string | null) {
  if (!value) return '—'
  return new Intl.DateTimeFormat('zh-CN', { dateStyle: 'medium', timeStyle: 'medium' }).format(new Date(value))
}

function openAction(type: ActionType, memoryId: string | null = null) {
  actionType.value = type
  actionReason.value = ''
  actionConfirmation.value = ''
  actionMemoryId.value = memoryId
  resetLink.value = ''
  actionOpen.value = true
}

async function accessPrivateData(scope: 'profile' | 'relationship') {
  if (!detail.value) return
  const purpose = (scope === 'profile' ? profileAccessPurpose.value : relationshipAccessPurpose.value).trim()
  if (purpose.length < 5) {
    message.warning('请填写至少 5 个字符的具体访问目的')
    return
  }
  if (scope === 'profile') privateProfileLoading.value = true
  else relationshipLoading.value = true
  try {
    if (scope === 'profile') {
      privateProfile.value = await adminApi.accessPrivateProfile(detail.value.user.id, purpose)
    } else {
      relationshipData.value = await adminApi.accessRelationshipData(detail.value.user.id, purpose)
    }
    message.success('敏感数据已在本次访问会话中解锁，访问记录已写入审计')
  } catch (error) {
    message.error(error instanceof Error ? error.message : '敏感数据访问失败')
  } finally {
    if (scope === 'profile') privateProfileLoading.value = false
    else relationshipLoading.value = false
  }
}

function closePrivateAccess(scope: 'profile' | 'relationship') {
  if (scope === 'profile') {
    privateProfile.value = null
    profileAccessPurpose.value = ''
  } else {
    relationshipData.value = null
    relationshipAccessPurpose.value = ''
  }
}

function downloadJson(filename: string, value: unknown) {
  const blob = new Blob([JSON.stringify(value, null, 2)], { type: 'application/json;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

function memoryTypeLabel(memory: RelationshipMemory) {
  return {
    PERSON: '人物事实',
    PREFERENCE: '偏好',
    SHARED_EVENT: '共同经历',
    OPEN_LOOP: '待办约定',
    RELATIONSHIP: '关系理解',
  }[memory.memoryType]
}

function updateMemoryCounts(data: AdminRelationshipData) {
  data.activeMemoryCount = data.memories.filter((item) => item.status === 'ACTIVE').length
  data.forgottenMemoryCount = data.memories.length - data.activeMemoryCount
}

async function saveProfile() {
  if (!detail.value) return
  savingProfile.value = true
  try {
    await adminApi.updateProfile(detail.value.user.id, {
      displayName: profile.displayName.trim(),
      realName: profile.realName.trim() || null,
    })
    message.success('用户资料已更新')
    await load()
    emit('changed')
  } catch (error) {
    message.error(error instanceof Error ? error.message : '保存失败')
  } finally {
    savingProfile.value = false
  }
}

async function confirmAction() {
  if (!detail.value || !actionReason.value.trim()) {
    message.warning('请填写访问或操作目的')
    return
  }
  if (sensitiveDataAction.value && actionReason.value.trim().length < 5) {
    message.warning('敏感数据访问或操作目的至少填写 5 个字符')
    return
  }
  if (destructiveAction.value && actionConfirmation.value.trim() !== expectedConfirmation.value) {
    message.warning('确认文字与当前目标用户不一致')
    return
  }
  actionLoading.value = true
  const id = detail.value.user.id
  try {
    if (actionType.value === 'disable' || actionType.value === 'enable') {
      await adminApi.userAction(id, actionType.value, actionReason.value.trim())
    } else if (actionType.value === 'revoke') {
      await adminApi.userAction(id, 'sessions/revoke', actionReason.value.trim())
    } else if (actionType.value === 'reset') {
      const created = await adminApi.createPasswordReset(id, actionReason.value.trim())
      resetLink.value = created.resetUrl
      resetExpiresAt.value = created.expiresAt
      message.success('重置链接已生成')
      return
    } else if (actionType.value === 'approveIdentity' || actionType.value === 'rejectIdentity') {
      await adminApi.reviewRealName(id, actionType.value === 'approveIdentity' ? 'approve' : 'reject', actionReason.value.trim())
    } else if (actionType.value === 'exportPrivateProfile') {
      const exported = await adminApi.exportPrivateProfile(id, actionReason.value.trim())
      downloadJson(`pan-profile-${id}-${new Date().toISOString().slice(0, 10)}.json`, exported)
      actionOpen.value = false
      message.success('个人主页已导出，审计记录已生成')
      return
    } else if (actionType.value === 'deletePrivateProfile') {
      await adminApi.deletePrivateProfile(id, actionReason.value.trim(), actionConfirmation.value.trim())
      privateProfile.value = null
      profileAccessPurpose.value = ''
    } else if (actionType.value === 'exportRelationship') {
      const exported = await adminApi.exportRelationshipData(id, actionReason.value.trim())
      downloadJson(`pan-relationship-${id}-${new Date().toISOString().slice(0, 10)}.json`, exported)
      actionOpen.value = false
      message.success('关系记忆已导出；文件不包含聊天正文')
      return
    } else if (actionType.value === 'deleteRelationship') {
      await adminApi.deleteRelationshipData(id, actionReason.value.trim(), actionConfirmation.value.trim())
      relationshipData.value = relationshipData.value
        ? { ...relationshipData.value, memories: [], activeMemoryCount: 0, forgottenMemoryCount: 0 }
        : null
    } else if ((actionType.value === 'forgetMemory' || actionType.value === 'restoreMemory') && actionMemoryId.value) {
      const updated = await adminApi.setRelationshipMemoryStatus(
        id,
        actionMemoryId.value,
        actionType.value === 'forgetMemory' ? 'forget' : 'restore',
        actionReason.value.trim(),
      )
      if (relationshipData.value) {
        relationshipData.value.memories = relationshipData.value.memories.map((item) =>
          item.id === updated.id ? updated : item,
        )
        updateMemoryCounts(relationshipData.value)
      }
    } else {
      await adminApi.updateRole(id, actionType.value === 'promote' ? 'SUPER_ADMIN' : 'USER', actionReason.value.trim())
    }
    actionOpen.value = false
    message.success('操作已完成')
    await load()
    emit('changed')
  } catch (error) {
    message.error(error instanceof Error ? error.message : '操作失败')
  } finally {
    actionLoading.value = false
  }
}

async function copyResetLink() {
  await navigator.clipboard.writeText(resetLink.value)
  message.success('重置链接已复制')
}

watch(
  () => [props.open, props.userId],
  () => {
    resetPrivateData()
    load()
  },
)
</script>

<template>
  <n-drawer :show="open" :width="760" placement="right" @update:show="emit('update:open', $event)">
    <n-drawer-content :title="detail?.user.displayName || '用户详情'" closable>
      <div v-if="loading" class="loading-panel"><n-spin size="large" /></div>
      <template v-else-if="detail">
        <div class="drawer-identity">
          <div>
            <span>{{ detail.user.email }}</span>
            <strong>{{ detail.user.displayName }}</strong>
          </div>
          <div class="tag-row">
            <n-tag :type="detail.user.status === 'ACTIVE' ? 'success' : 'error'" :bordered="false">
              {{ detail.user.status === 'ACTIVE' ? '正常' : '禁用' }}
            </n-tag>
            <n-tag :type="detail.user.role === 'SUPER_ADMIN' ? 'info' : 'default'" :bordered="false">
              {{ detail.user.role === 'SUPER_ADMIN' ? '超级管理员' : '普通用户' }}
            </n-tag>
            <n-tag :type="detail.user.realNameVerificationStatus === 'APPROVED' ? 'success' : detail.user.realNameVerificationStatus === 'REJECTED' ? 'error' : 'warning'" :bordered="false">
              实名{{ identityStatusMeta.label }}
            </n-tag>
          </div>
        </div>

        <n-tabs type="line" animated>
          <n-tab-pane name="profile" tab="基本资料">
            <section class="identity-review-track" :data-status="detail.user.realNameVerificationStatus">
              <header>
                <component :is="identityStatusMeta.icon" :size="25" />
                <div><span>身份审核轨迹</span><strong>{{ identityStatusMeta.label }}</strong></div>
                <p>{{ identityStatusMeta.copy }}</p>
              </header>
              <dl>
                <div><dt>真实姓名</dt><dd>{{ detail.user.realName || '未填写' }}</dd></div>
                <div><dt>审核时间</dt><dd>{{ formatTime(detail.user.realNameReviewedAt) }}</dd></div>
                <div><dt>通过时间</dt><dd>{{ formatTime(detail.user.realNameVerifiedAt) }}</dd></div>
                <div><dt>审核人</dt><dd>{{ detail.user.realNameReviewedBy || '—' }}</dd></div>
              </dl>
              <p v-if="detail.user.realNameReviewReason" class="identity-review-reason">审核说明：{{ detail.user.realNameReviewReason }}</p>
              <div v-if="detail.user.realName" class="identity-review-actions">
                <n-button type="primary" @click="openAction('approveIdentity')"><template #icon><BadgeCheck /></template>通过</n-button>
                <n-button type="error" ghost @click="openAction('rejectIdentity')"><template #icon><BadgeX /></template>驳回</n-button>
              </div>
            </section>
            <div class="drawer-section form-grid">
              <label>昵称<n-input v-model:value="profile.displayName" maxlength="40" /></label>
              <label>真实姓名<n-input v-model:value="profile.realName" maxlength="80" placeholder="未填写" /></label>
              <n-button type="primary" :loading="savingProfile" @click="saveProfile"><template #icon><Save /></template>保存资料</n-button>
            </div>
            <n-descriptions class="drawer-section" label-placement="top" :column="2" bordered>
              <n-descriptions-item label="用户 UUID">{{ detail.user.id }}</n-descriptions-item>
              <n-descriptions-item label="注册时间">{{ formatTime(detail.user.createdAt) }}</n-descriptions-item>
              <n-descriptions-item label="最后登录">{{ formatTime(detail.user.lastLoginAt) }}</n-descriptions-item>
              <n-descriptions-item label="最近活跃">{{ formatTime(detail.user.lastSeenAt) }}</n-descriptions-item>
              <n-descriptions-item label="聊天会话">{{ detail.user.chatSessionCount }}</n-descriptions-item>
              <n-descriptions-item label="聊天消息">{{ detail.user.chatMessageCount }}</n-descriptions-item>
            </n-descriptions>
          </n-tab-pane>

          <n-tab-pane name="private-profile" tab="个人主页">
            <section v-if="!privateProfile" class="private-access-gate">
              <div class="private-access-mark"><FileUser :size="30" /></div>
              <div>
                <span>受控数据域 · 个人主页</span>
                <h3>填写目的后查看</h3>
                <p>本页不会随用户详情自动加载。成功查看将记录管理员、目标用户、访问目的和请求环境。</p>
              </div>
              <label>
                本次访问目的
                <n-input
                  v-model:value="profileAccessPurpose"
                  type="textarea"
                  maxlength="500"
                  show-count
                  placeholder="例如：处理用户提交的主页数据核对请求"
                />
              </label>
              <n-button
                type="primary"
                :loading="privateProfileLoading"
                :disabled="profileAccessPurpose.trim().length < 5"
                @click="accessPrivateData('profile')"
              >
                <template #icon><Eye /></template>
                授权本次查看
              </n-button>
            </section>

            <section v-else class="private-data-session">
              <header class="private-session-header">
                <div>
                  <span>本次访问已审计</span>
                  <strong>个人主页</strong>
                  <small>访问目的：{{ profileAccessPurpose.trim() }}</small>
                </div>
                <n-button quaternary @click="closePrivateAccess('profile')">
                  <template #icon><EyeOff /></template>
                  结束查看
                </n-button>
              </header>

              <div v-if="privateProfile.exists" class="private-profile-card">
                <div class="private-profile-heading">
                  <img
                    v-if="privateProfile.avatarDataUrl"
                    :src="privateProfile.avatarDataUrl"
                    alt=""
                    class="private-profile-avatar"
                  />
                  <div v-else class="private-profile-avatar is-empty"><FileUser /></div>
                  <div>
                    <span>{{ privateProfile.published ? '公开展示中' : '未公开' }}</span>
                    <h3>{{ privateProfile.name }}</h3>
                    <p>更新于 {{ formatTime(privateProfile.updatedAt) }}</p>
                  </div>
                </div>
                <dl class="private-profile-facts">
                  <div><dt>出生日期</dt><dd>{{ privateProfile.birthDate || '未填写' }}</dd></div>
                  <div><dt>兴趣数量</dt><dd>{{ privateProfile.interests.length }}</dd></div>
                  <div><dt>成就数量</dt><dd>{{ privateProfile.achievements.length }}</dd></div>
                </dl>
                <div class="private-copy-block">
                  <span>个人简介</span>
                  <p>{{ privateProfile.bio || '未填写' }}</p>
                </div>
                <div class="private-copy-block">
                  <span>兴趣爱好</span>
                  <div v-if="privateProfile.interests.length" class="private-chip-row">
                    <n-tag v-for="interest in privateProfile.interests" :key="interest" :bordered="false">
                      {{ interest }}
                    </n-tag>
                  </div>
                  <p v-else>未填写</p>
                </div>
                <div class="private-copy-block">
                  <span>成就</span>
                  <div v-if="privateProfile.achievements.length" class="private-achievement-list">
                    <article v-for="achievement in privateProfile.achievements" :key="`${achievement.title}-${achievement.date}`">
                      <div><strong>{{ achievement.title }}</strong><time>{{ achievement.date || '未填写日期' }}</time></div>
                      <p>{{ achievement.description || '无补充说明' }}</p>
                    </article>
                  </div>
                  <p v-else>未填写</p>
                </div>
              </div>
              <div v-else class="private-empty-state">
                <FileUser :size="28" />
                <strong>该用户尚未创建个人主页</strong>
                <p>这里只展示实际保存的数据，不生成默认资料。</p>
              </div>

              <footer class="private-boundary-actions">
                <div>
                  <strong>数据边界</strong>
                  <span>管理员不能代写主页；导出只包含主页字段。</span>
                </div>
                <n-button @click="openAction('exportPrivateProfile')">
                  <template #icon><Download /></template>
                  导出主页
                </n-button>
                <n-button type="error" ghost :disabled="!privateProfile.exists" @click="openAction('deletePrivateProfile')">
                  <template #icon><Trash2 /></template>
                  永久删除
                </n-button>
              </footer>
            </section>
          </n-tab-pane>

          <n-tab-pane name="relationship-memory" tab="关系记忆">
            <section v-if="!relationshipData" class="private-access-gate">
              <div class="private-access-mark"><Brain :size="30" /></div>
              <div>
                <span>受控数据域 · 关系记忆</span>
                <h3>填写目的后查看</h3>
                <p>记忆正文不会随用户详情自动加载。访问与后续导出、忘记、恢复、删除分别审计。</p>
              </div>
              <label>
                本次访问目的
                <n-input
                  v-model:value="relationshipAccessPurpose"
                  type="textarea"
                  maxlength="500"
                  show-count
                  placeholder="例如：核查用户反馈的错误关系记忆"
                />
              </label>
              <n-button
                type="primary"
                :loading="relationshipLoading"
                :disabled="relationshipAccessPurpose.trim().length < 5"
                @click="accessPrivateData('relationship')"
              >
                <template #icon><Eye /></template>
                授权本次查看
              </n-button>
            </section>

            <section v-else class="private-data-session">
              <header class="private-session-header">
                <div>
                  <span>本次访问已审计</span>
                  <strong>关系记忆</strong>
                  <small>访问目的：{{ relationshipAccessPurpose.trim() }}</small>
                </div>
                <n-button quaternary @click="closePrivateAccess('relationship')">
                  <template #icon><EyeOff /></template>
                  结束查看
                </n-button>
              </header>

              <div class="relationship-summary-grid">
                <article><span>有效记忆</span><strong>{{ relationshipData.activeMemoryCount }}</strong></article>
                <article><span>已忘记</span><strong>{{ relationshipData.forgottenMemoryCount }}</strong></article>
              </div>

              <div class="relationship-memory-list">
                <article v-for="memory in relationshipData.memories" :key="memory.id" :data-status="memory.status">
                  <header>
                    <div>
                      <n-tag :type="memory.status === 'ACTIVE' ? 'success' : 'default'" :bordered="false">
                        {{ memory.status === 'ACTIVE' ? '有效' : '已忘记' }}
                      </n-tag>
                      <span>{{ memoryTypeLabel(memory) }}</span>
                      <span>置信度 {{ Math.round(memory.confidence * 100) }}%</span>
                    </div>
                    <n-button
                      v-if="memory.status === 'ACTIVE'"
                      size="small"
                      @click="openAction('forgetMemory', memory.id)"
                    >
                      忘记
                    </n-button>
                    <n-button v-else size="small" @click="openAction('restoreMemory', memory.id)">
                      <template #icon><RotateCcw /></template>
                      恢复
                    </n-button>
                  </header>
                  <p>{{ memory.content }}</p>
                  <blockquote v-if="memory.sourceExcerpt">来源片段：{{ memory.sourceExcerpt }}</blockquote>
                  <footer>
                    <span>{{ memory.userCorrected ? '用户已确认或修正' : '自动提取' }}</span>
                    <time>更新于 {{ formatTime(memory.updatedAt) }}</time>
                  </footer>
                </article>
                <div v-if="!relationshipData.memories.length" class="private-empty-state">
                  <Brain :size="28" />
                  <strong>没有已保存的关系记忆</strong>
                  <p>聊天历史可能仍然存在，但不会在此数据域中展示。</p>
                </div>
              </div>

              <footer class="private-boundary-actions">
                <div>
                  <strong>数据边界</strong>
                  <span>导出不含聊天正文；永久删除也不会删除聊天历史。</span>
                </div>
                <n-button @click="openAction('exportRelationship')">
                  <template #icon><Download /></template>
                  导出关系数据
                </n-button>
                <n-button type="error" ghost @click="openAction('deleteRelationship')">
                  <template #icon><Trash2 /></template>
                  永久删除全部
                </n-button>
              </footer>
            </section>
          </n-tab-pane>

          <n-tab-pane name="sessions" tab="登录会话">
            <div class="session-list">
              <article v-for="session in detail.authSessions" :key="session.id">
                <div><strong>{{ session.revokedAt ? '已撤销' : '有效或已过期' }}</strong><span>{{ session.id }}</span></div>
                <dl><div><dt>创建</dt><dd>{{ formatTime(session.createdAt) }}</dd></div><div><dt>最近访问</dt><dd>{{ formatTime(session.lastSeenAt) }}</dd></div><div><dt>到期</dt><dd>{{ formatTime(session.expiresAt) }}</dd></div></dl>
              </article>
              <p v-if="!detail.authSessions.length" class="empty-copy">没有登录会话。</p>
            </div>
          </n-tab-pane>

          <n-tab-pane name="conversations" tab="对话记录">
            <div class="user-conversation-list">
              <article v-for="conversation in conversations" :key="conversation.id">
                <div><strong>{{ conversation.title }}</strong><span>{{ formatTime(conversation.updatedAt) }}</span></div>
                <p>{{ conversation.messageCount }} 条消息 · {{ conversation.tokenCount.toLocaleString('zh-CN') }} Token · 平均 {{ conversation.averageDurationMs }} ms</p>
                <small>{{ conversation.id }}</small>
              </article>
              <p v-if="!conversations.length" class="empty-copy">该用户没有对话记录。</p>
            </div>
          </n-tab-pane>

          <n-tab-pane name="actions" tab="账号操作">
            <div class="action-grid">
              <button v-if="detail.user.status === 'ACTIVE'" type="button" :disabled="isSelf" @click="openAction('disable')"><UserX /><span><strong>禁用账号</strong><small>立即阻止登录并撤销会话</small></span></button>
              <button v-else type="button" @click="openAction('enable')"><UserCheck /><span><strong>启用账号</strong><small>恢复用户登录资格</small></span></button>
              <button type="button" :disabled="isSelf" @click="openAction('revoke')"><LogOut /><span><strong>强制下线</strong><small>撤销全部有效登录会话</small></span></button>
              <button type="button" @click="openAction('reset')"><KeyRound /><span><strong>重置密码</strong><small>生成一次性重置链接</small></span></button>
              <button v-if="detail.user.role === 'USER'" type="button" @click="openAction('promote')"><ShieldCheck /><span><strong>设为超级管理员</strong><small>授予完整后台权限</small></span></button>
              <button v-else type="button" :disabled="isSelf" @click="openAction('demote')"><ShieldOff /><span><strong>降为普通用户</strong><small>移除全部后台权限</small></span></button>
            </div>
          </n-tab-pane>

          <n-tab-pane name="audit" tab="操作记录">
            <div class="audit-list compact-audit">
              <article v-for="audit in detail.auditLogs" :key="audit.id">
                <strong>{{ audit.action }}</strong><span>{{ formatTime(audit.createdAt) }}</span><p>{{ audit.reason || '未填写原因' }}</p>
              </article>
              <p v-if="!detail.auditLogs.length" class="empty-copy">还没有针对该用户的管理操作。</p>
            </div>
          </n-tab-pane>
        </n-tabs>
      </template>
    </n-drawer-content>
  </n-drawer>

  <n-modal v-model:show="actionOpen" preset="card" :title="actionMeta[actionType].title" class="action-modal">
    <p>{{ actionMeta[actionType].description }}</p>
    <template v-if="resetLink">
      <label class="modal-field">一次性重置链接<n-input :value="resetLink" readonly /></label>
      <p class="modal-hint">有效期至 {{ formatTime(resetExpiresAt) }}</p>
      <n-button type="primary" block @click="copyResetLink"><template #icon><Copy /></template>复制链接</n-button>
    </template>
    <template v-else>
      <label class="modal-field">
        访问或操作目的
        <n-input v-model:value="actionReason" type="textarea" maxlength="500" show-count placeholder="请说明本次访问或操作的具体目的" />
      </label>
      <div v-if="destructiveAction" class="confirmation-block">
        <span>输入以下文字确认目标与删除范围</span>
        <code>{{ expectedConfirmation }}</code>
        <n-input v-model:value="actionConfirmation" placeholder="请完整输入确认文字" />
      </div>
      <div class="modal-actions">
        <n-button @click="actionOpen = false">取消</n-button>
        <n-button
          :type="destructiveAction ? 'error' : 'primary'"
          :loading="actionLoading"
          @click="confirmAction"
        >
          {{ actionMeta[actionType].confirm }}
        </n-button>
      </div>
    </template>
  </n-modal>
</template>
