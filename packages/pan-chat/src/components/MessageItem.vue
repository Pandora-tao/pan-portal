<script setup lang="ts">
import { Sparkles, UserRound } from 'lucide-vue-next'
import type { ChatMessage } from '../types/chat'

defineProps<{
  message: ChatMessage
}>()
</script>

<template>
  <article class="message-row" :class="`is-${message.role}`">
    <div class="message-avatar" aria-hidden="true">
      <UserRound v-if="message.role === 'user'" :size="17" />
      <Sparkles v-else :size="17" />
    </div>
    <p class="message-bubble">{{ message.content }}</p>
  </article>
</template>
