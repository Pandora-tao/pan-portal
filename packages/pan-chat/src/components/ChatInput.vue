<script setup lang="ts">
import { computed, nextTick, onUnmounted, ref, useTemplateRef } from 'vue'
import { FileText, Image as ImageIcon, Paperclip, SendHorizontal, X } from 'lucide-vue-next'
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
  send: [content: string, attachment: ChatAttachmentInput | null]
}>()

const draft = ref('')
const toolNotice = ref('')
const uploading = ref(false)
const pendingAttachment = ref<{
  file: File
  kind: ChatAttachmentInput['kind']
  fileName: string
} | null>(null)
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
  () => (normalizedContent.value.length > 0 || pendingAttachment.value !== null)
    && !isTooLong.value && !props.sending && !props.disabled
    && !uploading.value,
)
const toolsDisabled = computed(
  () => props.disabled || props.sending || uploading.value || !props.attachmentsEnabled,
)

async function submitMessage() {
  const content = normalizedContent.value
  const attachmentDraft = pendingAttachment.value

  if ((!content && !attachmentDraft) || isTooLong.value || props.sending || props.disabled || uploading.value) {
    return
  }

  uploading.value = attachmentDraft !== null
  if (attachmentDraft) toolNotice.value = '正在上传…'

  try {
    const attachment = attachmentDraft
      ? await uploadChatAttachment(attachmentDraft.file, attachmentDraft.kind, attachmentDraft.fileName)
      : null

    draft.value = ''
    pendingAttachment.value = null
    toolNotice.value = ''
    resetTextareaHeight()
    emit('send', content, attachment)
  } catch (caught) {
    showNotice(caught instanceof Error ? caught.message : '上传失败，请稍后再试')
  } finally {
    uploading.value = false
  }
}

function handleKeydown(event: KeyboardEvent) {
  if (event.isComposing) return
  if (event.key !== 'Enter') return
  if (event.shiftKey) return

  event.preventDefault()
  void submitMessage()
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

function handleFilePicked(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return
  if (file.size > MAX_ATTACHMENT_BYTES) {
    showNotice('文件太大，最大支持 20MB')
    return
  }
  stageAttachment(file, 'FILE', file.name)
}

function handleImagePicked(event: Event) {
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
  stageAttachment(file, 'FILE', file.name)
}

function stageAttachment(
  file: File,
  kind: ChatAttachmentInput['kind'],
  fileName: string,
) {
  if (!props.attachmentsEnabled || uploading.value) return
  pendingAttachment.value = { file, kind, fileName }
  toolNotice.value = ''
  void nextTick(() => textareaRef.value?.focus())
}

function removePendingAttachment() {
  if (uploading.value) return
  pendingAttachment.value = null
  void nextTick(() => textareaRef.value?.focus())
}

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.ceil(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
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
        :placeholder="pendingAttachment ? '补充说明（可选）...' : '问陶攀点什么...'"
        aria-label="输入消息"
        @keydown="handleKeydown"
        @input="handleInput"
      ></textarea>
      <div v-if="pendingAttachment" class="composer-pending-attachment" role="status">
        <FileText :size="18" aria-hidden="true" />
        <span class="composer-pending-meta">
          <strong>{{ pendingAttachment.fileName }}</strong>
          <small>{{ formatFileSize(pendingAttachment.file.size) }} · 待发送</small>
        </span>
        <button
          type="button"
          class="composer-pending-remove"
          :disabled="uploading"
          aria-label="移除待发送附件"
          title="移除附件"
          @click="removePendingAttachment"
        >
          <X :size="16" aria-hidden="true" />
        </button>
      </div>
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
