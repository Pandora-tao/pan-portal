<script setup lang="ts">
import { MessageSquarePlus } from 'lucide-vue-next'

defineProps<{
  title?: string
  description?: string
  actionText?: string
}>()

const emit = defineEmits<{
  action: []
}>()
</script>

<template>
  <div class="empty-state">
    <div class="empty-icon" aria-hidden="true">
      <MessageSquarePlus :size="36" :stroke-width="1.6" />
    </div>
    <p class="empty-title">{{ title ?? '还没有消息' }}</p>
    <p v-if="description" class="empty-desc">{{ description }}</p>
    <button v-if="actionText" class="empty-action" @click="emit('action')">
      {{ actionText }}
    </button>
  </div>
</template>
