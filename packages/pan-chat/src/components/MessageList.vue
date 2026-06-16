<script setup lang="ts">
import { nextTick, ref, watch } from 'vue'
import { gsap } from 'gsap'
import { useAutoScroll } from '../composables/useAutoScroll'
import type { ChatMessage } from '../types/chat'
import EmptyState from './EmptyState.vue'
import MessageItem from './MessageItem.vue'

const props = defineProps<{
  messages: ChatMessage[]
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
        title="开始一段即时对话"
        description="这里不会显示历史会话。刷新页面后，对话会回到空白状态。"
      />
    </template>
    <template v-else>
      <MessageItem
        v-for="message in messages"
        :key="message.id"
        :message="message"
      />
    </template>
  </section>
</template>
