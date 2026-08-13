<script setup lang="ts">
import { nextTick, ref, watch } from 'vue'
import { gsap } from 'gsap'
import { useAutoScroll } from '../composables/useAutoScroll'
import type { ChatMessage } from '../types/chat'
import type { FeedbackRating } from '../types/chat'
import EmptyState from './EmptyState.vue'
import MessageItem from './MessageItem.vue'

const props = defineProps<{
  messages: ChatMessage[]
  feedbackEnabled?: boolean
  feedbackSubmittingId?: string | null
  loadingEarlier?: boolean
  hasMore?: boolean
}>()

const emit = defineEmits<{
  regenerate: [messageId: string]
  rate: [messageId: string, rating: FeedbackRating]
  feedback: [messageId: string, categories: string[], comment: string]
  loadEarlier: []
}>()

const messageList = ref<HTMLElement | null>(null)
const { autoScrollToBottom, handleScroll, scrollToBottom, shouldAutoScroll } = useAutoScroll(messageList)
let anchorHeight = 0
let anchorTop = 0
let anchorMessageId: string | null = null
let anchorOffset = 0
let awaitingEarlierPage = false
let paginationArmed = false

function waitForLayout() {
  return new Promise<void>((resolve) => {
    window.requestAnimationFrame(() => resolve())
  })
}

async function settleAtBottom() {
  const list = messageList.value
  if (!list) return
  let stableFrames = 0
  let previousHeight = -1
  for (let frame = 0; frame < 16 && stableFrames < 2; frame += 1) {
    await waitForLayout()
    list.scrollTop = list.scrollHeight
    const stable = list.scrollHeight === previousHeight
      && Math.abs(list.scrollHeight - list.clientHeight - list.scrollTop) < 2
    stableFrames = stable ? stableFrames + 1 : 0
    previousHeight = list.scrollHeight
  }
}

async function restoreAnchor(list: HTMLElement, anchor: HTMLElement) {
  let stableFrames = 0
  for (let frame = 0; frame < 12 && stableFrames < 2; frame += 1) {
    await waitForLayout()
    const delta = anchor.getBoundingClientRect().top
      - list.getBoundingClientRect().top
      - anchorOffset
    list.scrollTop += delta
    stableFrames = Math.abs(delta) < 1 ? stableFrames + 1 : 0
  }
}

// 新消息出现时：只在用户接近底部时自动跟随
watch(
  () => props.messages.length,
  async () => {
    if (awaitingEarlierPage) return
    if (!paginationArmed && props.messages.length > 0) {
      await nextTick()
      await scrollToBottom('auto')
      await settleAtBottom()
      animateLatestMessage()
      return
    }
    await autoScrollToBottom('auto')
    await nextTick()
    animateLatestMessage()
  },
  { flush: 'post' },
)

// 流式回复会不断替换最后一条消息的 content/status，但消息数量不变。
// 单独监听最后一条消息，才能在桌面端固定高度滚动容器中持续跟随内容增长。
// useAutoScroll 会在用户主动离开底部后暂停，因此不会抢走历史消息阅读位置。
watch(
  () => {
    const latest = props.messages.at(-1)
    return latest
      ? `${latest.id}\u0000${latest.status}\u0000${latest.content}`
      : ''
  },
  async (current, previous) => {
    if (!current || !previous || awaitingEarlierPage) return
    await autoScrollToBottom('auto')
  },
  { flush: 'post' },
)

watch(
  () => props.loadingEarlier,
  async (loading, previous) => {
    if (!previous || loading || !awaitingEarlierPage) return
    await nextTick()
    await waitForLayout()
    const list = messageList.value
    if (list) {
      const anchor = anchorMessageId
        ? [...list.querySelectorAll<HTMLElement>('[data-message-id]')]
            .find((item) => item.dataset.messageId === anchorMessageId)
        : undefined
      if (anchor) {
        await restoreAnchor(list, anchor)
      } else {
        list.scrollTop = anchorTop + (list.scrollHeight - anchorHeight)
      }
    }
    anchorMessageId = null
    awaitingEarlierPage = false
  },
)

function handleListScroll() {
  handleScroll()
  const list = messageList.value
  if (!paginationArmed || !list || list.scrollTop > 120
    || !props.hasMore || props.loadingEarlier || awaitingEarlierPage) return
  anchorHeight = list.scrollHeight
  anchorTop = list.scrollTop
  const listTop = list.getBoundingClientRect().top
  const anchor = [...list.querySelectorAll<HTMLElement>('[data-message-id]')]
    .find((item) => item.getBoundingClientRect().bottom > listTop)
  anchorMessageId = anchor?.dataset.messageId ?? null
  anchorOffset = anchor ? anchor.getBoundingClientRect().top - listTop : 0
  awaitingEarlierPage = true
  emit('loadEarlier')
}

function armPagination() {
  paginationArmed = true
}

function showDateSeparator(index: number) {
  if (index === 0) return true
  return dateKey(props.messages[index - 1]?.createdAt) !== dateKey(props.messages[index]?.createdAt)
}

function dateKey(value?: string) {
  if (!value) return ''
  const date = new Date(value)
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`
}

function formatMessageDate(value: string) {
  const date = new Date(value)
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(today.getDate() - 1)
  if (dateKey(value) === dateKey(today.toISOString())) return '今天'
  if (dateKey(value) === dateKey(yesterday.toISOString())) return '昨天'
  return new Intl.DateTimeFormat('zh-CN', { month: 'long', day: 'numeric', weekday: 'short' }).format(date)
}

function animateLatestMessage() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

  const list = messageList.value
  if (!list) return

  const latest = list.querySelector('.message-row:last-of-type')
  if (!latest) return

  gsap.fromTo(
    latest,
    { autoAlpha: 0, y: 18, scale: 0.985 },
    { autoAlpha: 1, y: 0, scale: 1, duration: 0.42, ease: 'power3.out', overwrite: 'auto' },
  )
}
</script>

<template>
  <section
    ref="messageList"
    class="message-list"
    aria-live="polite"
    @scroll="handleListScroll"
    @wheel.passive="armPagination"
    @touchstart.passive="armPagination"
    @pointerdown="armPagination"
  >
    <template v-if="messages.length === 0">
      <EmptyState
        title="想聊点什么？"
        description="这里是陶攀的聊天空间，有什么想说的都可以直接告诉我。"
      />
    </template>
    <template v-else>
      <p v-if="loadingEarlier" class="earlier-message-status">正在加载更早的消息…</p>
      <template v-for="(message, index) in messages" :key="message.id">
        <div v-if="showDateSeparator(index)" class="message-date-separator">
          <span>{{ formatMessageDate(message.createdAt) }}</span>
        </div>
        <MessageItem
          :message="message"
          :grouped="index > 0 && message.role === 'assistant' && messages[index - 1]?.role === 'assistant'"
          :can-regenerate="message.role === 'assistant'
            && index === messages.length - 1
            && (message.status === 'failed' || message.status === 'stopped')"
          :feedback-enabled="feedbackEnabled"
          :feedback-submitting="feedbackSubmittingId === message.id"
          @regenerate="emit('regenerate', $event)"
          @rate="(messageId, rating) => emit('rate', messageId, rating)"
          @feedback="(messageId, categories, comment) => emit('feedback', messageId, categories, comment)"
        />
      </template>
      <button v-if="!shouldAutoScroll" class="back-to-bottom" type="button" @click="scrollToBottom()">
        回到底部
      </button>
    </template>
  </section>
</template>
