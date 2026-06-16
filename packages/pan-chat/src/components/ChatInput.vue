<script setup lang="ts">
import { computed, nextTick, ref, useTemplateRef } from 'vue'
import { SendHorizontal } from 'lucide-vue-next'
import { chatConfig } from '../config/chat'
import { isMessageTooLong, normalizeMessageContent } from '../utils/text'

const WARN_RATIO = 0.9

const props = defineProps<{
  sending?: boolean
  disabled?: boolean
  maxLength?: number
}>()

const emit = defineEmits<{
  send: [content: string]
}>()

const draft = ref('')
const textareaRef = useTemplateRef<HTMLTextAreaElement>('textareaEl')

const maxLength = computed(() => props.maxLength ?? chatConfig.maxInputLength)
const warnLength = computed(() => Math.floor(maxLength.value * WARN_RATIO))

const normalizedContent = computed(() => normalizeMessageContent(draft.value))
const isTooLong = computed(() => isMessageTooLong(draft.value, maxLength.value))
const isNearLimit = computed(() => draft.value.length >= warnLength.value && !isTooLong.value)
const canSend = computed(
  () => normalizedContent.value.length > 0 && !isTooLong.value && !props.sending && !props.disabled,
)

function submitMessage() {
  const content = normalizedContent.value

  if (!content || isTooLong.value || props.sending || props.disabled) {
    return
  }

  draft.value = ''
  resetTextareaHeight()
  emit('send', content)
}

function handleKeydown(event: KeyboardEvent) {
  if (event.isComposing) return
  if (event.key !== 'Enter') return
  if (event.shiftKey) return

  event.preventDefault()
  submitMessage()
}

function handleInput() {
  void nextTick(adjustTextareaHeight)
}

function adjustTextareaHeight() {
  const el = textareaRef.value
  if (!el) return

  el.style.height = 'auto'
  el.style.height = `${Math.min(el.scrollHeight, 160)}px`
}

function resetTextareaHeight() {
  const el = textareaRef.value
  if (!el) return
  el.style.height = 'auto'
}
</script>

<template>
  <form class="composer" @submit.prevent="submitMessage">
    <div class="composer-input-wrap">
      <textarea
        ref="textareaEl"
        v-model="draft"
        rows="1"
        :maxlength="maxLength + 100"
        :disabled="disabled"
        placeholder="输入消息..."
        aria-label="输入消息"
        @keydown="handleKeydown"
        @input="handleInput"
      ></textarea>
      <span v-if="isTooLong" class="composer-hint error">消息太长了，请缩短后再发送</span>
      <span v-else-if="isNearLimit" class="composer-hint warn">{{ draft.length }} / {{ maxLength }}</span>
    </div>
    <button type="submit" :disabled="!canSend" aria-label="发送消息">
      <SendHorizontal :size="21" />
    </button>
  </form>
</template>
