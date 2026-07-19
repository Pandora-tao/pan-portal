<script setup lang="ts">
import { nextTick, ref, watch } from 'vue'
import { gsap } from 'gsap'
import { useAutoScroll } from '../composables/useAutoScroll'
import type { ChatMessage } from '../types/chat'
import type { FeedbackRating } from '../types/chat'
import EmptyState from './EmptyState.vue'
import MessageItem from './MessageItem.vue'

const props = defineProps<{
  messages: ChatMessage[]
  feedbackEnabled?: boolean
  feedbackSubmittingId?: string | null
}>()

const emit = defineEmits<{
  regenerate: [messageId: string]
  rate: [messageId: string, rating: FeedbackRating]
  feedback: [messageId: string, categories: string[], comment: string]
}>()

const messageList = ref<HTMLElement | null>(null)
const { autoScrollToBottom, handleScroll } = useAutoScroll(messageList)

// 新消息出现时：只在用户接近底部时自动跟随
watch(
  () => props.messages.length,
  async () => {
    void autoScrollToBottom()
    await nextTick()
    animateLatestMessage()
  },
  { flush: 'post' },
)

function animateLatestMessage() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

  const list = messageList.value
  if (!list) return

  const latest = list.querySelector('.message-row:last-of-type')
  if (!latest) return

  gsap.fromTo(
    latest,
    { autoAlpha: 0, y: 18, scale: 0.985 },
    { autoAlpha: 1, y: 0, scale: 1, duration: 0.42, ease: 'power3.out', overwrite: 'auto' },
  )
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
        title="你好，我是陶攀。"
        description="这里是我的聊天空间，想聊什么都可以直接告诉我。"
      />
    </template>
    <template v-else>
      <MessageItem
        v-for="(message, index) in messages"
        :key="message.id"
        :message="message"
        :grouped="index > 0 && message.role === 'assistant' && messages[index - 1]?.role === 'assistant'"
        :can-regenerate="message.role === 'assistant'
          && index === messages.length - 1
          && (message.status === 'failed' || message.status === 'stopped')"
        :feedback-enabled="feedbackEnabled"
        :feedback-submitting="feedbackSubmittingId === message.id"
        @regenerate="emit('regenerate', $event)"
        @rate="(messageId, rating) => emit('rate', messageId, rating)"
        @feedback="(messageId, categories, comment) => emit('feedback', messageId, categories, comment)"
      />
    </template>
  </section>
</template>
