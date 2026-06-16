<script setup lang="ts">
import { ref } from 'vue'
import { Copy, LoaderCircle, RefreshCw, RotateCcw, Sparkles, UserRound } from 'lucide-vue-next'
import type { ChatMessage } from '../types/chat'

const props = defineProps<{
  message: ChatMessage
  canRegenerate?: boolean
}>()

const emit = defineEmits<{
  resend: [content: string]
  regenerate: []
}>()

const justCopied = ref(false)

async function handleCopy() {
  try {
    await navigator.clipboard.writeText(props.message.content)
    justCopied.value = true
    setTimeout(() => {
      justCopied.value = false
    }, 1500)
  } catch {
    // 降级处理
    const textarea = document.createElement('textarea')
    textarea.value = props.message.content
    textarea.style.position = 'fixed'
    textarea.style.opacity = '0'
    document.body.appendChild(textarea)
    textarea.select()
    document.execCommand('copy')
    document.body.removeChild(textarea)
    justCopied.value = true
    setTimeout(() => {
      justCopied.value = false
    }, 1500)
  }
}

function handleResend() {
  emit('resend', props.message.content)
}

function handleRegenerate() {
  emit('regenerate')
}

const showResend = props.message.role === 'user' && (props.message.status === 'failed' || props.message.status === 'stopped')
</script>

<template>
  <article class="message-row" :class="[`is-${message.role}`, `is-${message.status}`]">
    <div class="message-avatar" aria-hidden="true">
      <UserRound v-if="message.role === 'user'" :size="17" />
      <LoaderCircle v-else-if="message.status === 'pending' || message.status === 'streaming'" class="spin" :size="17" />
      <Sparkles v-else :size="17" />
    </div>
    <div class="message-body">
      <p class="message-bubble" :class="{ muted: message.status === 'pending' }">
        {{ message.content }}
      </p>
      <div class="message-actions">
        <span v-if="justCopied" class="copy-toast">已复制</span>
        <button
          v-if="!justCopied"
          class="action-btn"
          title="复制"
          aria-label="复制消息"
          @click="handleCopy"
        >
          <Copy :size="14" />
        </button>
        <button
          v-if="showResend"
          class="action-btn"
          title="重新发送"
          aria-label="重新发送"
          @click="handleResend"
        >
          <RotateCcw :size="14" />
        </button>
        <button
          v-if="canRegenerate"
          class="action-btn"
          title="重新生成"
          aria-label="重新生成"
          @click="handleRegenerate"
        >
          <RefreshCw :size="14" />
        </button>
      </div>
    </div>
  </article>
</template>
