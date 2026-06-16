<script setup lang="ts">
import { ref, watch } from 'vue'
import { useAutoScroll } from '../composables/useAutoScroll'
import type { ChatMessage } from '../types/chat'
import EmptyState from './EmptyState.vue'
import MessageItem from './MessageItem.vue'

const props = defineProps<{
  messages: ChatMessage[]
  lastAssistantId?: string | null
  hasSessions?: boolean
  currentSessionId?: string | null
}>()

const emit = defineEmits<{
  resend: [content: string]
  regenerate: []
  createSession: []
}>()

const messageList = ref<HTMLElement | null>(null)
const { scrollToBottom, autoScrollToBottom, handleScroll } = useAutoScroll(messageList)

// 新消息出现时：只在用户接近底部时自动跟随
watch(
  () => props.messages.length,
  () => {
    void autoScrollToBottom()
  },
  { flush: 'post' },
)

// 会话切换时：强制滚动到底部
watch(
  () => props.currentSessionId,
  () => {
    void scrollToBottom('instant')
  },
)

function handleResend(content: string) {
  emit('resend', content)
}

function handleRegenerate() {
  emit('regenerate')
}
</script>

<template>
  <section
    ref="messageList"
    class="message-list"
    aria-live="polite"
    @scroll="handleScroll"
  >
    <template v-if="messages.length === 0">
      <EmptyState
        v-if="!hasSessions"
        title="还没有会话"
        description="开始新聊天，和 Pan 说点什么吧。"
        action-text="开始新聊天"
        @action="emit('createSession')"
      />
      <EmptyState
        v-else
        title="发送第一条消息"
        description="在下方输入框输入内容，开始对话。"
      />
    </template>
    <template v-else>
      <MessageItem
        v-for="message in messages"
        :key="message.id"
        :message="message"
        :can-regenerate="message.role === 'assistant' && message.id === lastAssistantId && message.status !== 'pending' && message.status !== 'streaming'"
        @resend="handleResend"
        @regenerate="handleRegenerate"
      />
    </template>
  </section>
</template>
