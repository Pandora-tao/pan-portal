<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { gsap } from 'gsap'
import {
  Download,
  FileText,
  MessageSquareWarning,
  Pause,
  Play,
  RefreshCw,
  Send,
  ThumbsDown,
  ThumbsUp,
  X,
} from 'lucide-vue-next'
import crabSticker from '../../../portal/src/assets/draggable-material/crab.png'
import luluSticker from '../../../portal/src/assets/draggable-material/lulu.png'
import puddingDogSticker from '../../../portal/src/assets/draggable-material/pudding-dog.png'
import type { ChatMessage, FeedbackRating } from '../types/chat'

const props = defineProps<{
  message: ChatMessage
  grouped?: boolean
  canRegenerate?: boolean
  feedbackEnabled?: boolean
  feedbackSubmitting?: boolean
}>()

const emit = defineEmits<{
  regenerate: [messageId: string]
  rate: [messageId: string, rating: FeedbackRating]
  feedback: [messageId: string, categories: string[], comment: string]
}>()

const PROBLEM_OPTIONS = ['内容不准确', '没有帮助', '不符合语境', '表达不友好', '其他问题']
const rowRef = ref<HTMLElement | null>(null)
const audioRef = ref<HTMLAudioElement | null>(null)
const contextMenuOpen = ref(false)
const feedbackOpen = ref(false)
const selectedRating = ref<FeedbackRating | undefined>(props.message.feedback?.rating)
const selectedProblems = ref<string[]>(props.message.feedback?.categories ?? [])
const feedbackComment = ref(props.message.feedback?.comment ?? '')
const voicePlaying = ref(false)
const voiceCurrentTime = ref(0)
const stickerUrl = computed(() => {
  const stickers: Record<string, string> = {
    lulu: luluSticker,
    'pudding-dog': puddingDogSticker,
    crab: crabSticker,
  }
  return props.message.stickerKey ? stickers[props.message.stickerKey] : undefined
})
const canOpenMessageMenu = computed(() => (
  props.message.role === 'assistant'
  && props.message.contentType !== 'STICKER'
  && props.message.status !== 'pending'
  && props.message.status !== 'streaming'
  && Boolean(props.message.content)
))
const isImageAttachment = computed(() => Boolean(
  props.message.attachment?.mime.startsWith('image/'),
))
const voiceDurationLabel = computed(() => formatVoiceDuration(props.message.attachment?.durationMs))
const voiceCurrentLabel = computed(() => formatVoiceDuration(Math.round(voiceCurrentTime.value * 1000)))
const toolExecutionLabel = computed(() => {
  const executions = props.message.metadata?.toolExecutions
  if (!executions?.length) return ''
  const names = [...new Set(executions.map((execution) => execution.name))]
  return `调用了 ${executions.length} 个工具：${names.join('、')}`
})

function toggleVoice() {
  const audio = audioRef.value
  if (!audio) return
  if (voicePlaying.value) {
    audio.pause()
    return
  }
  void audio.play().catch(() => {
    voicePlaying.value = false
  })
}

function handleVoiceTimeUpdate() {
  const audio = audioRef.value
  if (!audio) return
  voiceCurrentTime.value = audio.currentTime
}

function handleVoiceEnded() {
  voicePlaying.value = false
  voiceCurrentTime.value = 0
  const audio = audioRef.value
  if (audio) audio.currentTime = 0
}

function openImageAttachment() {
  if (props.message.attachment?.url) {
    window.open(props.message.attachment.url, '_blank', 'noopener,noreferrer')
  }
}

function formatFileSize(bytes: number | undefined): string {
  if (!bytes || bytes <= 0) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

function formatVoiceDuration(durationMs: number | null | undefined): string {
  if (!durationMs || durationMs <= 0) return '0:00'
  const totalSeconds = Math.round(durationMs / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}:${String(seconds).padStart(2, '0')}`
}
let thinkingContext: ReturnType<typeof gsap.context> | null = null
let longPressTimer: number | null = null
let longPressStart = { x: 0, y: 0 }

function stopThinkingAnimation() {
  thinkingContext?.revert()
  thinkingContext = null
}

async function startThinkingAnimation() {
  stopThinkingAnimation()
  if (props.message.status !== 'pending') return
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

  await nextTick()
  if (!rowRef.value || props.message.status !== 'pending') return
  thinkingContext = gsap.context(() => {
    gsap.timeline({ repeat: -1 })
      .to('.thinking-dot', {
        y: -3,
        scale: 1.18,
        autoAlpha: 1,
        duration: 0.42,
        ease: 'sine.inOut',
        stagger: 0.12,
      })
      .to('.thinking-dot', {
        y: 0,
        scale: 1,
        autoAlpha: 0.42,
        duration: 0.42,
        ease: 'sine.inOut',
        stagger: 0.12,
      }, '-=0.2')
  }, rowRef.value)
}

function toggleProblem(problem: string) {
  selectedProblems.value = selectedProblems.value.includes(problem)
    ? selectedProblems.value.filter((item) => item !== problem)
    : [...selectedProblems.value, problem]
}

function cancelLongPress() {
  if (longPressTimer) window.clearTimeout(longPressTimer)
  longPressTimer = null
}

function openMessageMenu() {
  if (!canOpenMessageMenu.value) return
  contextMenuOpen.value = true
}

function handlePointerDown(event: PointerEvent) {
  if (event.pointerType === 'mouse' || !canOpenMessageMenu.value) return
  cancelLongPress()
  longPressStart = { x: event.clientX, y: event.clientY }
  longPressTimer = window.setTimeout(() => {
    openMessageMenu()
    navigator.vibrate?.(8)
    longPressTimer = null
  }, 480)
}

function handlePointerMove(event: PointerEvent) {
  if (!longPressTimer) return
  if (Math.hypot(event.clientX - longPressStart.x, event.clientY - longPressStart.y) > 10) {
    cancelLongPress()
  }
}

function handleContextMenu(event: MouseEvent) {
  if (!canOpenMessageMenu.value) return
  event.preventDefault()
  openMessageMenu()
}

function handleMessageKeydown(event: KeyboardEvent) {
  if (event.target !== event.currentTarget) return
  if (event.key === 'ContextMenu' || (event.shiftKey && event.key === 'F10')) {
    event.preventDefault()
    openMessageMenu()
  }
}

function handleDocumentPointerDown() {
  contextMenuOpen.value = false
}

function handleDocumentKeydown(event: KeyboardEvent) {
  if (event.key !== 'Escape') return
  contextMenuOpen.value = false
  feedbackOpen.value = false
}

function openFeedbackPanel() {
  if (!props.feedbackEnabled || props.feedbackSubmitting) return
  contextMenuOpen.value = false
  selectedRating.value = props.message.feedback?.rating
  selectedProblems.value = props.message.feedback?.categories ?? []
  feedbackComment.value = props.message.feedback?.comment ?? ''
  feedbackOpen.value = true
}

function submitFeedback() {
  if (!props.feedbackEnabled || props.feedbackSubmitting || !selectedRating.value) return
  if (selectedRating.value === 'like') {
    emit('rate', props.message.id, 'like')
  } else {
    emit('feedback', props.message.id, selectedProblems.value, feedbackComment.value.trim())
  }
  feedbackOpen.value = false
}

onMounted(() => {
  document.addEventListener('pointerdown', handleDocumentPointerDown)
  document.addEventListener('keydown', handleDocumentKeydown)
  void startThinkingAnimation()
})
watch(() => props.message.status, () => { void startThinkingAnimation() }, { flush: 'post' })
watch(() => props.message.feedback, (feedback) => {
  selectedRating.value = feedback?.rating
  selectedProblems.value = feedback?.categories ?? []
  feedbackComment.value = feedback?.comment ?? ''
}, { deep: true })
onUnmounted(() => {
  stopThinkingAnimation()
  cancelLongPress()
  audioRef.value?.pause()
  document.removeEventListener('pointerdown', handleDocumentPointerDown)
  document.removeEventListener('keydown', handleDocumentKeydown)
})
</script>

<template>
  <article
    ref="rowRef"
    class="message-row"
    :data-message-id="message.id"
    :class="[`is-${message.role}`, `is-${message.status}`, {
      'is-grouped': grouped,
      'is-sticker': message.contentType === 'STICKER',
    }]"
  >
    <div class="message-stack">
      <span v-if="!grouped" class="message-author">
        {{ message.role === 'assistant' ? '陶攀' : '你' }}
      </span>
      <div
        class="message-card"
        :class="{ 'has-message-menu': canOpenMessageMenu }"
        :tabindex="canOpenMessageMenu ? 0 : undefined"
        :aria-haspopup="canOpenMessageMenu ? 'menu' : undefined"
        :aria-expanded="canOpenMessageMenu ? contextMenuOpen : undefined"
        @pointerdown="handlePointerDown"
        @pointermove="handlePointerMove"
        @pointerup="cancelLongPress"
        @pointercancel="cancelLongPress"
        @contextmenu="handleContextMenu"
        @keydown="handleMessageKeydown"
      >
        <div
          v-if="message.status === 'pending'"
          class="thinking-indicator"
          role="status"
          aria-label="正在思考"
        >
          <span class="thinking-label">正在思考</span>
          <span class="thinking-dots" aria-hidden="true">
            <span v-for="index in 3" :key="index" class="thinking-dot"></span>
          </span>
        </div>
        <img
          v-else-if="message.contentType === 'STICKER' && stickerUrl"
          class="message-sticker"
          :src="stickerUrl"
          alt="陶攀发来的贴纸"
        />
        <div
          v-else-if="message.contentType === 'FILE' && message.attachment"
          class="attachment-card"
        >
          <a
            v-if="isImageAttachment"
            class="attachment-image-link"
            :href="message.attachment.url"
            target="_blank"
            rel="noreferrer"
            aria-label="查看图片附件"
            @click.prevent="openImageAttachment"
          >
            <img
              class="attachment-image"
              :src="message.attachment.url"
              :alt="message.attachment.name"
              loading="lazy"
            />
          </a>
          <div v-else class="attachment-file">
            <span class="attachment-file-icon" aria-hidden="true">
              <FileText :size="18" />
            </span>
            <span class="attachment-file-meta">
              <span class="attachment-file-name">{{ message.attachment.name }}</span>
              <span class="attachment-file-size">{{ formatFileSize(message.attachment.size) }}</span>
            </span>
            <a
              class="attachment-download"
              :href="message.attachment.url"
              download
              aria-label="下载文件"
              title="下载文件"
            >
              <Download :size="15" />
            </a>
          </div>
        </div>
        <div
          v-else-if="message.contentType === 'VOICE' && message.attachment"
          class="voice-bubble"
        >
          <button
            type="button"
            class="voice-play"
            :aria-label="voicePlaying ? '暂停语音' : '播放语音'"
            :title="voicePlaying ? '暂停' : '播放'"
            @click="toggleVoice"
          >
            <Pause v-if="voicePlaying" :size="16" aria-hidden="true" />
            <Play v-else :size="16" aria-hidden="true" />
          </button>
          <div class="voice-track" aria-hidden="true">
            <span
              v-for="index in 24"
              :key="index"
              class="voice-bar"
              :class="{ 'is-playing': voicePlaying }"
            ></span>
          </div>
          <span class="voice-time" role="timer" :aria-label="voicePlaying ? '语音播放进度' : '语音时长'">
            {{ voicePlaying ? voiceCurrentLabel : voiceDurationLabel }}
          </span>
          <audio
            ref="audioRef"
            :src="message.attachment.url"
            preload="metadata"
            @timeupdate="handleVoiceTimeUpdate"
            @ended="handleVoiceEnded"
            @play="voicePlaying = true"
            @pause="voicePlaying = false"
          ></audio>
        </div>
        <p v-else class="message-text" :class="{ 'is-streaming': message.status === 'streaming' }">
          {{ message.content }}
        </p>
        <span
          v-if="toolExecutionLabel && message.role === 'assistant' && message.status === 'completed'"
          class="message-tool-executions"
          role="note"
        >
          ⚙ {{ toolExecutionLabel }}
        </span>

        <Transition name="message-menu">
          <div
            v-if="contextMenuOpen"
            class="message-context-menu"
            role="menu"
            aria-label="消息操作"
            @pointerdown.stop
          >
            <button
              type="button"
              role="menuitem"
              :disabled="!feedbackEnabled || feedbackSubmitting"
              @click="openFeedbackPanel"
            >
              <MessageSquareWarning :size="16" />
              <span>反馈这句话</span>
              <small v-if="!feedbackEnabled">登录后可用</small>
            </button>
          </div>
        </Transition>
      </div>

      <div
        v-if="message.role === 'assistant' && canRegenerate"
        class="message-actions"
      >
        <button
          type="button"
          class="message-action"
          :disabled="message.status === 'streaming'"
          @click="emit('regenerate', message.id)"
        >
          <RefreshCw :size="14" />
          <span>重试</span>
        </button>
      </div>

      <form v-if="feedbackOpen && message.role === 'assistant'" class="feedback-panel" @submit.prevent="submitFeedback">
        <div class="feedback-heading">
          <div>
            <strong>反馈这句话</strong>
            <span>这句话对你有帮助吗？</span>
          </div>
          <button type="button" aria-label="关闭反馈" @click="feedbackOpen = false"><X :size="15" /></button>
        </div>

        <div class="feedback-rating-options" role="group" aria-label="选择反馈类型">
          <button
            type="button"
            :class="{ 'is-selected': selectedRating === 'like' }"
            :aria-pressed="selectedRating === 'like'"
            @click="selectedRating = 'like'"
          >
            <ThumbsUp :size="15" />
            <span>有帮助</span>
          </button>
          <button
            type="button"
            class="is-negative"
            :class="{ 'is-selected': selectedRating === 'dislike' }"
            :aria-pressed="selectedRating === 'dislike'"
            @click="selectedRating = 'dislike'"
          >
            <ThumbsDown :size="15" />
            <span>有问题</span>
          </button>
        </div>

        <div v-if="selectedRating === 'dislike'" class="feedback-options">
          <button
            v-for="problem in PROBLEM_OPTIONS"
            :key="problem"
            type="button"
            :class="{ 'is-selected': selectedProblems.includes(problem) }"
            @click="toggleProblem(problem)"
          >
            {{ problem }}
          </button>
        </div>
        <textarea
          v-if="selectedRating === 'dislike'"
          v-model="feedbackComment"
          maxlength="1000"
          placeholder="可以补充具体情况（选填）"
        ></textarea>
        <button class="feedback-submit" type="submit" :disabled="feedbackSubmitting || !selectedRating">
          <Send :size="14" />
          <span>{{ feedbackSubmitting ? '提交中...' : '提交反馈' }}</span>
        </button>
      </form>
    </div>
  </article>
</template>
