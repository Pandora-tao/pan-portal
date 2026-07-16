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
import { Copy, KeyRound, LogOut, Save, ShieldCheck, ShieldOff, UserCheck, UserX } from 'lucide-vue-next'
import { adminApi } from '../api/admin'
import type { ConversationSummary, UserDetail } from '../types/admin'

const props = defineProps<{
  open: boolean
  userId: string | null
  currentUserId: string
}>()
const emit = defineEmits<{ 'update:open': [value: boolean]; changed: [] }>()

type ActionType = 'disable' | 'enable' | 'revoke' | 'reset' | 'promote' | 'demote'

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
const profile = reactive({ displayName: '', realName: '' })

const isSelf = computed(() => detail.value?.user.id === props.currentUserId)
const actionMeta: Record<ActionType, { title: string; description: string; confirm: string }> = {
  disable: { title: '禁用账号', description: '用户将立即下线，并且不能再次登录。', confirm: '确认禁用' },
  enable: { title: '启用账号', description: '用户可以重新登录，但旧会话不会恢复。', confirm: '确认启用' },
  revoke: { title: '强制下线', description: '该用户的全部有效登录会话将被撤销。', confirm: '确认下线' },
  reset: { title: '生成密码重置链接', description: '旧链接会失效，新链接仅可使用一次，有效期 30 分钟。', confirm: '生成链接' },
  promote: { title: '设为超级管理员', description: '该用户将获得完整后台和对话访问权限。', confirm: '确认提升' },
  demote: { title: '降为普通用户', description: '该用户会立即失去后台权限并退出登录。', confirm: '确认降级' },
}

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

function formatTime(value: string | null) {
  if (!value) return '—'
  return new Intl.DateTimeFormat('zh-CN', { dateStyle: 'medium', timeStyle: 'medium' }).format(new Date(value))
}

function openAction(type: ActionType) {
  actionType.value = type
  actionReason.value = ''
  resetLink.value = ''
  actionOpen.value = true
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
    message.warning('请填写操作原因')
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

watch(() => [props.open, props.userId], load)
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
          </div>
        </div>

        <n-tabs type="line" animated>
          <n-tab-pane name="profile" tab="基本资料">
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
      <label class="modal-field">操作原因<n-input v-model:value="actionReason" type="textarea" maxlength="500" show-count placeholder="请说明本次操作原因" /></label>
      <div class="modal-actions">
        <n-button @click="actionOpen = false">取消</n-button>
        <n-button type="primary" :loading="actionLoading" @click="confirmAction">{{ actionMeta[actionType].confirm }}</n-button>
      </div>
    </template>
  </n-modal>
</template>
