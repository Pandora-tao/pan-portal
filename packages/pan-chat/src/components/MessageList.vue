<script setup lang="ts">
import { ref, watch } from 'vue'
import { LoaderCircle } from 'lucide-vue-next'
import { useAutoScroll } from '../composables/useAutoScroll'
import type { ChatMessage } from '../types/chat'
import MessageItem from './MessageItem.vue'

const props = defineProps<{
  messages: ChatMessage[]
  sending?: boolean
}>()

const messageList = ref<HTMLElement | null>(null)
const { scrollToBottom } = useAutoScroll(messageList)

watch(
  () => [props.messages.length, props.sending] as const,
  () => {
    void scrollToBottom()
  },
  { flush: 'post' },
)
</script>

<template>
  <section ref="messageList" class="message-list" aria-live="polite">
    <MessageItem v-for="message in messages" :key="message.id" :message="message" />

    <article v-if="sending" class="message-row is-assistant">
      <div class="message-avatar" aria-hidden="true">
        <LoaderCircle class="spin" :size="17" />
      </div>
      <p class="message-bubble muted">正在想怎么回你...</p>
    </article>
  </section>
</template>
