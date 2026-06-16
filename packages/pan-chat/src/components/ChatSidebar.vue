<script setup lang="ts">
import { MessageSquare, Pencil, Plus, Trash2 } from 'lucide-vue-next'
import type { ChatSession } from '../types/chat'

const props = defineProps<{
  sessions: ChatSession[]
  currentSessionId: string | null
}>()

const emit = defineEmits<{
  createSession: []
  selectSession: [sessionId: string]
  deleteSession: [sessionId: string]
  renameSession: [sessionId: string, title: string]
}>()

function handleDelete(session: ChatSession) {
  if (!window.confirm(`删除「${session.title}」？`)) {
    return
  }

  emit('deleteSession', session.id)
}

function handleRename(session: ChatSession) {
  const title = window.prompt('重命名会话', session.title)

  if (title === null) {
    return
  }

  emit('renameSession', session.id, title)
}
</script>

<template>
  <aside class="chat-sidebar" aria-label="聊天会话">
    <div class="sidebar-head">
      <span>会话</span>
      <button type="button" aria-label="新建聊天" @click="emit('createSession')">
        <Plus :size="17" />
      </button>
    </div>

    <div v-if="props.sessions.length === 0" class="session-empty">
      <p>还没有会话。</p>
      <button type="button" @click="emit('createSession')">开始新聊天</button>
    </div>

    <ul v-else class="session-list">
      <li v-for="session in props.sessions" :key="session.id">
        <button
          type="button"
          class="session-item"
          :class="{ active: session.id === props.currentSessionId }"
          @click="emit('selectSession', session.id)"
        >
          <MessageSquare :size="15" />
          <span>
            <strong>{{ session.title }}</strong>
            <small>{{ session.lastMessagePreview || '还没有消息' }}</small>
          </span>
        </button>
        <div class="session-actions">
          <button type="button" aria-label="重命名会话" @click="handleRename(session)">
            <Pencil :size="14" />
          </button>
          <button type="button" aria-label="删除会话" @click="handleDelete(session)">
            <Trash2 :size="14" />
          </button>
        </div>
      </li>
    </ul>
  </aside>
</template>
