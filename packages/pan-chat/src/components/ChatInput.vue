<script setup lang="ts">
import { computed, nextTick, onUnmounted, ref, useTemplateRef } from 'vue'
import { Image as ImageIcon, Mic, Paperclip, SendHorizontal, X } from 'lucide-vue-next'
import { uploadChatAttachment } from '../api/chatPersistence'
import { chatConfig } from '../config/chat'
import type { ChatAttachmentInput } from '../types/chat'
import { isMessageTooLong, normalizeMessageContent } from '../utils/text'

const WARN_RATIO = 0.9
const VOICE_MIME_CANDIDATES = [
  'audio/webm;codecs=opus',
  'audio/webm',
  'audio/mp4',
  'audio/ogg;codecs=opus',
  'audio/ogg',
]
const MAX_ATTACHMENT_BYTES = 20 * 1024 * 1024
const MAX_VOICE_BYTES = 10 * 1024 * 1024

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
const isRecording = ref(false)
const startingRecording = ref(false)
const recordSeconds = ref(0)
const textareaRef = useTemplateRef<HTMLTextAreaElement>('textareaEl')
const fileInputRef = useTemplateRef<HTMLInputElement>('fileInputEl')
const imageInputRef = useTemplateRef<HTMLInputElement>('imageInputEl')
let toolNoticeTimer: number | null = null
let mediaRecorder: MediaRecorder | null = null
let recordedChunks: Blob[] = []
let recordingStream: MediaStream | null = null
let recordingStartedAt = 0
let recordTimer: number | null = null

const maxLength = computed(() => props.maxLength ?? chatConfig.maxInputLength)
const warnLength = computed(() => Math.floor(maxLength.value * WARN_RATIO))

const normalizedContent = computed(() => normalizeMessageContent(draft.value))
const isTooLong = computed(() => isMessageTooLong(draft.value, maxLength.value))
const isNearLimit = computed(() => draft.value.length >= warnLength.value && !isTooLong.value)
const canSend = computed(
  () => normalizedContent.value.length > 0 && !isTooLong.value && !props.sending && !props.disabled
    && !uploading.value && !isRecording.value,
)
const toolsDisabled = computed(
  () => props.disabled || props.sending || uploading.value || !props.attachmentsEnabled,
)
const recordLabel = computed(() => {
  const minutes = Math.floor(recordSeconds.value / 60)
  const seconds = recordSeconds.value % 60
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
})

function submitMessage() {
  const content = normalizedContent.value

  if (!content || isTooLong.value || props.sending || props.disabled || uploading.value || isRecording.value) {
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
  if (toolsDisabled.value || isRecording.value) return
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
  if (file.size > MAX_ATTACHMENT_BYTES) {
    showNotice('图片太大，最大支持 20MB')
    return
  }
  await uploadAndSend(file, 'FILE', file.name)
}

async function uploadAndSend(
  blob: Blob,
  kind: ChatAttachmentInput['kind'],
  fileName: string,
  durationMs?: number | null,
) {
  if (!props.attachmentsEnabled || uploading.value) return
  uploading.value = true
  toolNotice.value = kind === 'VOICE' ? '正在上传语音…' : '正在上传…'
  try {
    const attachment = await uploadChatAttachment(blob, kind, fileName, durationMs)
    toolNotice.value = ''
    emit('sendAttachment', attachment)
  } catch (caught) {
    showNotice(caught instanceof Error ? caught.message : '上传失败，请稍后再试')
  } finally {
    uploading.value = false
  }
}

function toggleRecording() {
  if (isRecording.value) return
  if (startingRecording.value) return
  if (!props.attachmentsEnabled) {
    showNotice('登录后才能发送语音')
    return
  }
  if (uploading.value || props.sending || props.disabled) return
  void startRecording()
}

async function startRecording() {
  if (typeof window.MediaRecorder === 'undefined') {
    showNotice('当前浏览器不支持录音')
    return
  }
  startingRecording.value = true
  let stream: MediaStream
  try {
    stream = await navigator.mediaDevices.getUserMedia({ audio: true })
  } catch {
    showNotice('无法使用麦克风，请检查浏览器权限')
    startingRecording.value = false
    return
  }
  const mimeType = pickVoiceMimeType()
  let recorder: MediaRecorder
  try {
    recorder = mimeType
      ? new MediaRecorder(stream, { mimeType })
      : new MediaRecorder(stream)
  } catch {
    stream.getTracks().forEach((track) => track.stop())
    showNotice('无法启动录音，请重试')
    startingRecording.value = false
    return
  }
  startingRecording.value = false
  mediaRecorder = recorder
  recordingStream = stream
  recordedChunks = []
  recorder.ondataavailable = (event) => {
    if (event.data.size > 0) recordedChunks.push(event.data)
  }
  recorder.start()
  isRecording.value = true
  recordingStartedAt = Date.now()
  recordSeconds.value = 0
  recordTimer = window.setInterval(() => {
    recordSeconds.value = Math.floor((Date.now() - recordingStartedAt) / 1000)
  }, 500)
  showNotice('正在录音，点击“发送”完成')
}

function stopRecording(send: boolean) {
  const recorder = mediaRecorder
  const stream = recordingStream
  const startedAt = recordingStartedAt
  stopRecordingUi()
  if (!recorder) return
  recorder.onstop = () => {
    stream?.getTracks().forEach((track) => track.stop())
    if (!send) return
    const durationMs = Math.max(1, Date.now() - startedAt)
    const blob = new Blob(recordedChunks, { type: recorder.mimeType || 'audio/webm' })
    if (blob.size === 0) {
      showNotice('录音内容为空，请重试')
      return
    }
    if (blob.size > MAX_VOICE_BYTES) {
      showNotice('语音太大，请缩短录音')
      return
    }
    void uploadAndSend(blob, 'VOICE', voiceFileName(recorder.mimeType), durationMs)
  }
  try {
    recorder.stop()
  } catch {
    stream?.getTracks().forEach((track) => track.stop())
  }
}

function cancelRecording() {
  stopRecording(false)
}

function stopRecordingUi() {
  isRecording.value = false
  recordSeconds.value = 0
  if (recordTimer) window.clearInterval(recordTimer)
  recordTimer = null
  mediaRecorder = null
  recordingStream = null
}

function pickVoiceMimeType(): string | undefined {
  for (const mime of VOICE_MIME_CANDIDATES) {
    if (window.MediaRecorder.isTypeSupported(mime)) return mime
  }
  return undefined
}

function voiceFileName(mimeType: string): string {
  if (mimeType.includes('mp4')) return '语音消息.m4a'
  if (mimeType.includes('ogg')) return '语音消息.ogg'
  return '语音消息.webm'
}

onUnmounted(() => {
  if (toolNoticeTimer) window.clearTimeout(toolNoticeTimer)
  stopRecordingUi()
  recordingStream?.getTracks().forEach((track) => track.stop())
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
            accept="image/*"
            aria-hidden="true"
            tabindex="-1"
            @change="handleImagePicked"
          />
          <button
            type="button"
            class="composer-tool"
            :disabled="toolsDisabled || isRecording"
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
            :disabled="toolsDisabled || isRecording"
            aria-label="发送图片"
            title="发送图片"
            @click="pickFile('IMAGE')"
          >
            <ImageIcon :size="15" aria-hidden="true" />
            <span>图片</span>
          </button>
          <button
            type="button"
            class="composer-tool"
            :class="{ 'is-recording': isRecording }"
            :disabled="toolsDisabled"
            aria-label="发送语音"
            :title="isRecording ? '正在录音' : '发送语音'"
            @click="toggleRecording"
          >
            <Mic :size="15" aria-hidden="true" />
            <span>{{ isRecording ? '录音中' : '语音' }}</span>
          </button>
        </div>
        <div v-if="isRecording" class="recording-strip" role="status" aria-label="正在录音">
          <span class="recording-dot" aria-hidden="true"></span>
          <span class="recording-time">{{ recordLabel }}</span>
          <button type="button" class="recording-cancel" aria-label="取消录音" @click="cancelRecording">
            <X :size="13" aria-hidden="true" />
            <span>取消</span>
          </button>
          <button type="button" class="recording-send" aria-label="发送录音" @click="stopRecording(true)">
            <SendHorizontal :size="13" aria-hidden="true" />
            <span>发送</span>
          </button>
        </div>
        <span v-else-if="isTooLong" class="composer-hint error">消息太长了，请缩短后再发送</span>
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
