<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import { gsap } from 'gsap'
import { BadgeCheck, Brain, CloudOff, Home, LoaderCircle, Square } from 'lucide-vue-next'
import avatarUrl from '../../portal/src/assets/pan-avatar.png'
import ChatInput from './components/ChatInput.vue'
import MessageList from './components/MessageList.vue'
import RelationshipPanel from './components/RelationshipPanel.vue'
import { useChat } from './composables/useChat'
import type { ChatAttachmentInput } from './types/chat'

const pageRef = ref<HTMLElement | null>(null)
const relationshipOpen = ref(false)
const KEYBOARD_OFFSET_PROPERTY = '--keyboard-offset'
const portalHref = import.meta.env.VITE_PORTAL_ROUTE ?? '/'
const {
  messages,
  sending,
  loading,
  isGuest,
  continuityLabel,
  feedbackEnabled,
  feedbackSubmittingId,
  loadingEarlier,
  hasEarlierMessages,
  error,
  guestNotice,
  loginHref,
  identityHref,
  personalizationEnabled,
  personalizationNotice,
  sendMessage,
  loadEarlierMessages,
  regenerateMessage,
  rateMessage,
  submitProblemFeedback,
  stopGenerating,
} = useChat()

let motionMatch: ReturnType<typeof gsap.matchMedia> | null = null

function handleSend(content: string) {
  void sendMessage(content)
}

function handleSendAttachment(attachment: ChatAttachmentInput) {
  void sendMessage('', attachment)
}

function handleRelationshipDeleted() {
  window.location.reload()
}

function updateKeyboardOffset() {
  const viewport = window.visualViewport
  const offset = viewport
    ? Math.max(0, window.innerHeight - viewport.height - viewport.offsetTop)
    : 0

  document.documentElement.style.setProperty(KEYBOARD_OFFSET_PROPERTY, `${Math.round(offset)}px`)
}

function bindKeyboardViewport() {
  updateKeyboardOffset()
  window.addEventListener('resize', updateKeyboardOffset)
  window.visualViewport?.addEventListener('resize', updateKeyboardOffset)
  window.visualViewport?.addEventListener('scroll', updateKeyboardOffset)
}

function unbindKeyboardViewport() {
  window.removeEventListener('resize', updateKeyboardOffset)
  window.visualViewport?.removeEventListener('resize', updateKeyboardOffset)
  window.visualViewport?.removeEventListener('scroll', updateKeyboardOffset)
  document.documentElement.style.removeProperty(KEYBOARD_OFFSET_PROPERTY)
}

onMounted(() => {
  bindKeyboardViewport()

  if (!pageRef.value) return

  motionMatch = gsap.matchMedia()
  motionMatch.add('(prefers-reduced-motion: no-preference)', () => {
    const ctx = gsap.context(() => {
      gsap.fromTo(
        '.chat-shell',
        { autoAlpha: 0, y: 22 },
        {
          autoAlpha: 1,
          y: 0,
          duration: 0.72,
          ease: 'power3.out',
          clearProps: 'transform,opacity,visibility',
        },
      )
      gsap.fromTo(
        ['.chat-header', '.chat-main'],
        { autoAlpha: 0, y: 14 },
        {
          autoAlpha: 1,
          y: 0,
          duration: 0.56,
          stagger: 0.1,
          delay: 0.12,
          ease: 'power3.out',
          clearProps: 'transform,opacity,visibility',
        },
      )
      gsap.fromTo(
        ['.page-folio__label', '.page-folio__number'],
        { autoAlpha: 0, x: 18 },
        {
          autoAlpha: 1,
          x: 0,
          duration: 0.64,
          stagger: 0.08,
          delay: 0.26,
          ease: 'power3.out',
          clearProps: 'transform,opacity,visibility',
        },
      )
    }, pageRef.value!)

    return () => ctx.revert()
  })
})

onUnmounted(() => {
  motionMatch?.revert()
  unbindKeyboardViewport()
})
</script>

<template>
  <main ref="pageRef" class="chat-page">
    <div class="ambient" aria-hidden="true">
      <i></i>
      <i></i>
    </div>
    <div class="page-folio" aria-hidden="true">
      <span class="page-folio__label">PAN CHAT</span>
      <span class="page-folio__number">01</span>
    </div>
    <section class="chat-shell" aria-label="和陶攀聊天">
      <header class="chat-header">
        <div class="chat-identity">
          <div class="app-mark" aria-hidden="true">
            <img :src="avatarUrl" alt="" />
          </div>
          <div class="chat-title">
            <span class="chat-kicker">PAN CHAT / 私人频道</span>
            <p>陶攀</p>
            <span class="chat-status">
              <i aria-hidden="true"></i>
              {{ sending ? '正在输入…' : continuityLabel }}
            </span>
          </div>
        </div>
        <div class="header-actions">
          <button
            v-if="sending"
            type="button"
            class="icon-action"
            aria-label="停止生成"
            title="停止生成"
            @click="stopGenerating"
          >
            <Square :size="15" />
          </button>
          <button
            v-if="personalizationEnabled && !loading"
            type="button"
            class="icon-action"
            aria-label="查看记忆与关系数据"
            title="记忆与关系"
            @click="relationshipOpen = true"
          >
            <Brain :size="16" />
          </button>
          <a class="portal-link" :href="portalHref" aria-label="返回门户" title="返回门户">
            <Home :size="16" />
          </a>
        </div>
      </header>

      <div class="chat-body">
        <section class="chat-main" aria-label="当前聊天">
          <div v-if="isGuest && !loading" class="chat-mode-notice" role="status">
            <CloudOff :size="15" aria-hidden="true" />
            <span>{{ guestNotice }}</span>
            <a :href="loginHref">登录</a>
          </div>
          <div v-else-if="!loading && !personalizationEnabled" class="chat-mode-notice identity-notice" role="status">
            <BadgeCheck :size="15" aria-hidden="true" />
            <span>{{ personalizationNotice }}</span>
            <a :href="identityHref">实名认证</a>
          </div>

          <div v-if="loading" class="chat-loading" role="status">
            <LoaderCircle :size="20" class="spin" />
            <span>正在读取对话...</span>
          </div>
          <MessageList
            v-else
            :messages="messages"
            :feedback-enabled="feedbackEnabled"
            :feedback-submitting-id="feedbackSubmittingId"
            :loading-earlier="loadingEarlier"
            :has-more="hasEarlierMessages"
            @load-earlier="loadEarlierMessages"
            @regenerate="regenerateMessage"
            @rate="rateMessage"
            @feedback="submitProblemFeedback"
          />

          <p v-if="error" class="chat-error" role="alert">
            {{ error }}
          </p>

          <ChatInput
            :sending="sending"
            :disabled="loading"
            :attachments-enabled="!isGuest"
            @send="handleSend"
            @send-attachment="handleSendAttachment"
          />
        </section>
      </div>
    </section>
    <RelationshipPanel
      :open="relationshipOpen"
      @close="relationshipOpen = false"
      @deleted="handleRelationshipDeleted"
    />
  </main>
</template>
