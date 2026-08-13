<script setup lang="ts">
import { ref, watch } from 'vue'
import { NButton, NDrawer, NDrawerContent, NInput, NModal, NSpin, NTag, useMessage } from 'naive-ui'
import { Copy, Trash2 } from 'lucide-vue-next'
import { adminApi } from '../api/admin'
import type { ConversationDetail } from '../types/admin'

const props = defineProps<{ open: boolean; conversationId: string | null }>()
const emit = defineEmits<{ 'update:open': [value: boolean]; deleted: [] }>()
const message = useMessage()
const loading = ref(false)
const detail = ref<ConversationDetail | null>(null)
const deleteOpen = ref(false)
const deleteReason = ref('')
const deleting = ref(false)

async function load() {
  if (!props.open || !props.conversationId) return
  loading.value = true
  try {
    detail.value = await adminApi.conversation(props.conversationId)
  } catch (error) {
    message.error(error instanceof Error ? error.message : '对话详情加载失败')
  } finally {
    loading.value = false
  }
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat('zh-CN', { dateStyle: 'medium', timeStyle: 'medium' }).format(new Date(value))
}

async function copyContent(messageId: string, content: string) {
  if (!detail.value) return
  try {
    await adminApi.auditConversationCopy(detail.value.session.id, messageId)
    await navigator.clipboard.writeText(content)
    message.success('消息正文已复制，操作已受审计保护')
  } catch (error) {
    message.error(error instanceof Error ? error.message : '复制失败')
  }
}

async function remove() {
  if (!detail.value || !deleteReason.value.trim()) {
    message.warning('请填写删除原因')
    return
  }
  deleting.value = true
  try {
    await adminApi.deleteConversation(detail.value.session.id, deleteReason.value.trim())
    message.success('对话已删除')
    deleteOpen.value = false
    emit('update:open', false)
    emit('deleted')
  } catch (error) {
    message.error(error instanceof Error ? error.message : '删除失败')
  } finally {
    deleting.value = false
  }
}

watch(() => [props.open, props.conversationId], load)
</script>

<template>
  <n-drawer :show="open" :width="820" placement="right" @update:show="emit('update:open', $event)">
    <n-drawer-content :title="detail?.session.title || '对话详情'" closable>
      <div v-if="loading" class="loading-panel"><n-spin size="large" /></div>
      <template v-else-if="detail">
        <header class="conversation-meta">
          <div><span>所属用户</span><strong>{{ detail.session.userDisplayName }}</strong><small>{{ detail.session.userEmail }}</small></div>
          <div><span>消息 / Token</span><strong>{{ detail.session.messageCount }} / {{ detail.session.tokenCount.toLocaleString('zh-CN') }}</strong><small>平均 {{ detail.session.averageDurationMs }} ms</small></div>
          <n-button type="error" secondary @click="deleteReason = ''; deleteOpen = true"><template #icon><Trash2 /></template>删除对话</n-button>
        </header>
        <div class="privacy-banner">完整对话仅超级管理员可见。本次查看已写入审计日志。</div>
        <div class="message-stream">
          <article v-for="item in detail.messages" :key="item.id" :class="['message-record', `is-${item.role}`]">
            <header>
              <div><n-tag :bordered="false" :type="item.role === 'user' ? 'default' : 'info'">{{ item.role === 'user' ? '用户' : 'AI' }}</n-tag><span>{{ formatTime(item.createdAt) }}</span></div>
              <n-button quaternary circle aria-label="复制消息正文" @click="copyContent(item.id, item.content)"><template #icon><Copy /></template></n-button>
            </header>
            <p>{{ item.content }}</p>
            <footer><span>状态 {{ item.status }}</span><span v-if="item.metadata.model">模型 {{ item.metadata.model }}</span><span v-if="item.metadata.tokens != null">Token {{ item.metadata.tokens }}</span><span v-if="item.metadata.durationMs != null">耗时 {{ item.metadata.durationMs }} ms</span></footer>
          </article>
          <p v-if="!detail.messages.length" class="empty-copy">这个对话还没有消息。</p>
        </div>
      </template>
    </n-drawer-content>
  </n-drawer>

  <n-modal v-model:show="deleteOpen" preset="card" title="删除对话" class="action-modal">
    <p>删除后，该会话及全部消息将永久移除。此操作不可撤销。</p>
    <label class="modal-field">删除原因<n-input v-model:value="deleteReason" type="textarea" maxlength="500" show-count /></label>
    <div class="modal-actions"><n-button @click="deleteOpen = false">取消</n-button><n-button type="error" :loading="deleting" @click="remove">确认删除</n-button></div>
  </n-modal>
</template>
