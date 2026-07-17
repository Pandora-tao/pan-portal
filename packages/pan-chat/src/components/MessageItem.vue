<script setup lang="ts">
import { nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { gsap } from 'gsap'
import {
  Check,
  Copy,
  MessageSquareWarning,
  RefreshCw,
  Send,
  ThumbsDown,
  ThumbsUp,
  X,
} from 'lucide-vue-next'
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
const copied = ref(false)
const feedbackOpen = ref(false)
const selectedProblems = ref<string[]>(props.message.feedback?.categories ?? [])
const feedbackComment = ref(props.message.feedback?.comment ?? '')
let thinkingContext: ReturnType<typeof gsap.context> | null = null
let copiedTimer: number | null = null

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

async function copyMessage() {
  try {
    await navigator.clipboard.writeText(props.message.content)
  } catch {
    const textarea = document.createElement('textarea')
    textarea.value = props.message.content
    textarea.style.position = 'fixed'
    textarea.style.opacity = '0'
    document.body.appendChild(textarea)
    textarea.select()
    document.execCommand('copy')
    textarea.remove()
  }
  copied.value = true
  if (copiedTimer) window.clearTimeout(copiedTimer)
  copiedTimer = window.setTimeout(() => { copied.value = false }, 1600)
}

function toggleProblem(problem: string) {
  selectedProblems.value = selectedProblems.value.includes(problem)
    ? selectedProblems.value.filter((item) => item !== problem)
    : [...selectedProblems.value, problem]
}

function rate(rating: FeedbackRating) {
  if (!props.feedbackEnabled) return
  emit('rate', props.message.id, rating)
  if (rating === 'dislike') feedbackOpen.value = true
  if (rating === 'like') feedbackOpen.value = false
}

function submitFeedback() {
  if (!props.feedbackEnabled || props.feedbackSubmitting) return
  emit('feedback', props.message.id, selectedProblems.value, feedbackComment.value.trim())
  feedbackOpen.value = false
}

onMounted(() => { void startThinkingAnimation() })
watch(() => props.message.status, () => { void startThinkingAnimation() }, { flush: 'post' })
onUnmounted(() => {
  stopThinkingAnimation()
  if (copiedTimer) window.clearTimeout(copiedTimer)
})
</script>

<template>
  <article
    ref="rowRef"
    class="message-row"
    :class="[`is-${message.role}`, `is-${message.status}`, { 'is-grouped': grouped }]"
  >
    <div class="message-stack">
      <div class="message-card">
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
        <p v-else class="message-text" :class="{ 'is-streaming': message.status === 'streaming' }">
          {{ message.content }}
        </p>
      </div>

      <div v-if="message.status !== 'pending' && message.content" class="message-actions">
        <button type="button" class="message-action" :aria-label="copied ? '已复制' : '复制消息'" @click="void copyMessage()">
          <Check v-if="copied" :size="14" />
          <Copy v-else :size="14" />
          <span>{{ copied ? '已复制' : '复制' }}</span>
        </button>

        <template v-if="message.role === 'assistant'">
          <button
            v-if="canRegenerate"
            type="button"
            class="message-action"
            :disabled="message.status === 'streaming'"
            @click="emit('regenerate', message.id)"
          >
            <RefreshCw :size="14" />
            <span>{{ message.status === 'failed' || message.status === 'stopped' ? '重试' : '重新生成' }}</span>
          </button>
          <button
            type="button"
            class="message-action is-icon"
            :class="{ 'is-selected': message.feedback?.rating === 'like' }"
            :disabled="!feedbackEnabled || feedbackSubmitting"
            :title="feedbackEnabled ? '有帮助' : '登录后可评价'"
            aria-label="点赞"
            @click="rate('like')"
          >
            <ThumbsUp :size="14" />
          </button>
          <button
            type="button"
            class="message-action is-icon"
            :class="{ 'is-selected is-negative': message.feedback?.rating === 'dislike' }"
            :disabled="!feedbackEnabled || feedbackSubmitting"
            :title="feedbackEnabled ? '没有帮助' : '登录后可评价'"
            aria-label="点踩"
            @click="rate('dislike')"
          >
            <ThumbsDown :size="14" />
          </button>
          <button
            type="button"
            class="message-action is-icon"
            :disabled="!feedbackEnabled || feedbackSubmitting"
            :title="feedbackEnabled ? '反馈问题' : '登录后可反馈'"
            aria-label="反馈问题"
            @click="feedbackOpen = !feedbackOpen"
          >
            <MessageSquareWarning :size="14" />
          </button>
        </template>
      </div>

      <form v-if="feedbackOpen && message.role === 'assistant'" class="feedback-panel" @submit.prevent="submitFeedback">
        <div class="feedback-heading">
          <div>
            <strong>这条回复有什么问题？</strong>
            <span>你的反馈会帮助后续改进回答质量。</span>
          </div>
          <button type="button" aria-label="关闭反馈" @click="feedbackOpen = false"><X :size="15" /></button>
        </div>
        <div class="feedback-options">
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
        <textarea v-model="feedbackComment" maxlength="1000" placeholder="可以补充具体情况（选填）"></textarea>
        <button class="feedback-submit" type="submit" :disabled="feedbackSubmitting">
          <Send :size="14" />
          <span>{{ feedbackSubmitting ? '提交中...' : '提交反馈' }}</span>
        </button>
      </form>
    </div>
  </article>
</template>
