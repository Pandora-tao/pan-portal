<script setup lang="ts">
import { computed, nextTick, onUnmounted, ref, useTemplateRef } from 'vue'
import { Image as ImageIcon, Paperclip, SendHorizontal } from 'lucide-vue-next'
import { uploadChatAttachment } from '../api/chatPersistence'
import { chatConfig } from '../config/chat'
import type { ChatAttachmentInput } from '../types/chat'
import { isMessageTooLong, normalizeMessageContent } from '../utils/text'

const WARN_RATIO = 0.9
const MAX_ATTACHMENT_BYTES = 20 * 1024 * 1024
// 图片入口与 PanPilot /v1/media 对齐：仅 PNG/JPEG/WebP/GIF，且 ≤10MB。
const MAX_IMAGE_BYTES = 10 * 1024 * 1024
const SUPPORTED_IMAGE_MIME_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/gif',
])
const SUPPORTED_IMAGE_EXTENSIONS = /\.(png|jpe?g|webp|gif)$/i

const props = defineProps<{
  sending?: boolean
  disabled?: boolean
  maxLength?: number
  attachmentsEnabled?: boolean
}>()

const emit = defineEmits<{
  send: [content: string]
  sendAttachment: [attachment: ChatAttachmentInput]
}>()

const draft = ref('')
const toolNotice = ref('')
const uploading = ref(false)
const textareaRef = useTemplateRef<HTMLTextAreaElement>('textareaEl')
const fileInputRef = useTemplateRef<HTMLInputElement>('fileInputEl')
const imageInputRef = useTemplateRef<HTMLInputElement>('imageInputEl')
let toolNoticeTimer: number | null = null

const maxLength = computed(() => props.maxLength ?? chatConfig.maxInputLength)
const warnLength = computed(() => Math.floor(maxLength.value * WARN_RATIO))

const normalizedContent = computed(() => normalizeMessageContent(draft.value))
const isTooLong = computed(() => isMessageTooLong(draft.value, maxLength.value))
const isNearLimit = computed(() => draft.value.length >= warnLength.value && !isTooLong.value)
const canSend = computed(
  () => normalizedContent.value.length > 0 && !isTooLong.value && !props.sending && !props.disabled
    && !uploading.value,
)
const toolsDisabled = computed(
  () => props.disabled || props.sending || uploading.value || !props.attachmentsEnabled,
)

function submitMessage() {
  const content = normalizedContent.value

  if (!content || isTooLong.value || props.sending || props.disabled || uploading.value) {
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

function showNotice(label: string) {
  toolNotice.value = label
  if (toolNoticeTimer) window.clearTimeout(toolNoticeTimer)
  toolNoticeTimer = window.setTimeout(() => {
    toolNotice.value = ''
    toolNoticeTimer = null
  }, 3200)
}

function pickFile(kind: 'FILE' | 'IMAGE') {
  if (toolsDisabled.value) return
  if (!props.attachmentsEnabled) {
    showNotice('登录后才能发送文件和图片')
    return
  }
  const input = kind === 'IMAGE' ? imageInputRef.value : fileInputRef.value
  input?.click()
}

async function handleFilePicked(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return
  if (file.size > MAX_ATTACHMENT_BYTES) {
    showNotice('文件太大，最大支持 20MB')
    return
  }
  await uploadAndSend(file, 'FILE', file.name)
}

async function handleImagePicked(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return
  const supportedType = file.type
    ? SUPPORTED_IMAGE_MIME_TYPES.has(file.type)
    : SUPPORTED_IMAGE_EXTENSIONS.test(file.name)
  if (!supportedType) {
    showNotice('仅支持 PNG/JPEG/WebP/GIF 图片')
    return
  }
  if (file.size > MAX_IMAGE_BYTES) {
    showNotice('图片太大，最大支持 10MB')
    return
  }
  await uploadAndSend(file, 'FILE', file.name)
}

async function uploadAndSend(
  blob: Blob,
  kind: ChatAttachmentInput['kind'],
  fileName: string,
) {
  if (!props.attachmentsEnabled || uploading.value) return
  uploading.value = true
  toolNotice.value = '正在上传…'
  try {
    const attachment = await uploadChatAttachment(blob, kind, fileName)
    toolNotice.value = ''
    emit('sendAttachment', attachment)
  } catch (caught) {
    showNotice(caught instanceof Error ? caught.message : '上传失败，请稍后再试')
  } finally {
    uploading.value = false
  }
}

onUnmounted(() => {
  if (toolNoticeTimer) window.clearTimeout(toolNoticeTimer)
})
</script>

<template>
  <form class="composer" @submit.prevent="submitMessage">
    <div class="composer-input-wrap">
      <label class="composer-label" for="chat-message-input">MESSAGE</label>
      <textarea
        id="chat-message-input"
        ref="textareaEl"
        v-model="draft"
        rows="1"
        :maxlength="maxLength + 100"
        :disabled="disabled"
        placeholder="问陶攀点什么..."
        aria-label="输入消息"
        @keydown="handleKeydown"
        @input="handleInput"
      ></textarea>
      <div class="composer-footer">
        <div class="composer-tools" role="group" aria-label="更多发送方式">
          <input
            ref="fileInputEl"
            class="visually-hidden"
            type="file"
            aria-hidden="true"
            tabindex="-1"
            @change="handleFilePicked"
          />
          <input
            ref="imageInputEl"
            class="visually-hidden"
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif"
            aria-hidden="true"
            tabindex="-1"
            @change="handleImagePicked"
          />
          <button
            type="button"
            class="composer-tool"
            :disabled="toolsDisabled"
            aria-label="发送文件"
            title="发送文件"
            @click="pickFile('FILE')"
          >
            <Paperclip :size="15" aria-hidden="true" />
            <span>文件</span>
          </button>
          <button
            type="button"
            class="composer-tool"
            :disabled="toolsDisabled"
            aria-label="发送图片"
            title="发送图片"
            @click="pickFile('IMAGE')"
          >
            <ImageIcon :size="15" aria-hidden="true" />
            <span>图片</span>
          </button>
        </div>
        <span v-if="isTooLong" class="composer-hint error">消息太长了，请缩短后再发送</span>
        <span v-else-if="isNearLimit" class="composer-hint warn">{{ draft.length }} / {{ maxLength }}</span>
        <span v-else-if="uploading" class="composer-tool-notice" role="status">正在上传…</span>
        <span v-else-if="toolNotice" class="composer-tool-notice" role="status">{{ toolNotice }}</span>
        <span v-else class="composer-shortcut">Enter 发送 · Shift + Enter 换行</span>
      </div>
    </div>
    <button
      type="submit"
      class="composer-send"
      :class="{ 'is-ready': canSend }"
      :disabled="!canSend"
      aria-label="发送消息"
    >
      <span>发送</span>
      <SendHorizontal :size="21" />
    </button>
  </form>
</template>
