<script setup lang="ts">
import type { ChatMessage } from '../types/chat'

defineProps<{
  message: ChatMessage
}>()
</script>

<template>
  <article class="message-row" :class="[`is-${message.role}`, `is-${message.status}`]">
    <div class="message-card">
      <p class="message-text" :class="{ muted: message.status === 'pending' }">
        {{ message.content }}
      </p>
    </div>
  </article>
</template>
