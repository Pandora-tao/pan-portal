<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { gsap } from 'gsap'
import { CloudOff, Home, LoaderCircle, Square, Trash2 } from 'lucide-vue-next'
import avatarUrl from '../../portal/src/assets/pan-avatar.png'
import ChatInput from './components/ChatInput.vue'
import MessageList from './components/MessageList.vue'
import { useChat } from './composables/useChat'

const pageRef = ref<HTMLElement | null>(null)
const KEYBOARD_OFFSET_PROPERTY = '--keyboard-offset'
const portalHref = import.meta.env.VITE_PORTAL_ROUTE ?? '/'
const {
  messages,
  sending,
  clearing,
  loading,
  isGuest,
  error,
  guestNotice,
  loginHref,
  sendMessage,
  stopGenerating,
  clearMessages,
} = useChat()

let ctx: ReturnType<typeof gsap.context> | null = null

const hasMessages = computed(() => messages.value.length > 0)

function handleSend(content: string) {
  void sendMessage(content)
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
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

  ctx = gsap.context(() => {
    gsap.from('.chat-shell', {
      autoAlpha: 0,
      y: 24,
      scale: 0.985,
      duration: 0.72,
      ease: 'power3.out',
      clearProps: 'transform,opacity,visibility',
    })
  }, pageRef.value)
})

onUnmounted(() => {
  ctx?.revert()
  unbindKeyboardViewport()
})
</script>

<template>
  <main ref="pageRef" class="chat-page">
    <section class="chat-shell" aria-label="和 Pan 聊天">
      <header class="chat-header">
        <div class="app-mark" aria-hidden="true">
          <img :src="avatarUrl" alt="" />
        </div>
        <div class="chat-title">
          <p>Pan's chat</p>
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
            v-if="hasMessages && !sending"
            type="button"
            class="icon-action"
            aria-label="清空当前对话"
            title="清空当前对话"
            :disabled="clearing"
            @click="void clearMessages()"
          >
            <Trash2 :size="15" />
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

          <div v-if="loading" class="chat-loading" role="status">
            <LoaderCircle :size="20" class="spin" />
            <span>正在读取对话...</span>
          </div>
          <MessageList v-else :messages="messages" />

          <p v-if="error" class="chat-error" role="alert">
            {{ error }}
          </p>

          <ChatInput
            :sending="sending"
            :disabled="loading || clearing"
            @send="handleSend"
          />
        </section>
      </div>
    </section>
  </main>
</template>
