<script setup lang="ts">
import { computed, ref } from 'vue'
import { SendHorizontal } from 'lucide-vue-next'
import { normalizeMessageContent } from '../utils/text'

const props = defineProps<{
  sending?: boolean
}>()

const emit = defineEmits<{
  send: [content: string]
}>()

const draft = ref('')
const canSend = computed(() => normalizeMessageContent(draft.value).length > 0 && !props.sending)

function submitMessage() {
  const content = normalizeMessageContent(draft.value)

  if (!content || props.sending) {
    return
  }

  draft.value = ''
  emit('send', content)
}

function handleEnter(event: KeyboardEvent) {
  if (event.shiftKey || event.isComposing) {
    return
  }

  event.preventDefault()
  submitMessage()
}
</script>

<template>
  <form class="composer" @submit.prevent="submitMessage">
    <textarea
      v-model="draft"
      rows="1"
      maxlength="1200"
      placeholder="输入消息..."
      aria-label="输入消息"
      @keydown.enter="handleEnter"
    ></textarea>
    <button type="submit" :disabled="!canSend" aria-label="发送消息">
      <SendHorizontal :size="21" />
    </button>
  </form>
</template>
