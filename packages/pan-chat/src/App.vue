<script setup lang="ts">
import { computed, nextTick, ref } from 'vue'
import { Home, LoaderCircle, MessageCircle, SendHorizontal, Sparkles, UserRound } from 'lucide-vue-next'

interface ChatMessage {
  id: number
  role: 'assistant' | 'user'
  content: string
}

const messages = ref<ChatMessage[]>([
  {
    id: 1,
    role: 'assistant',
    content: '嗨，想聊点什么？你可以慢慢说，我会认真听。',
  },
])
const draft = ref('')
const isSending = ref(false)
const errorMessage = ref('')
const messageList = ref<HTMLElement | null>(null)
const portalHref = import.meta.env.VITE_PORTAL_ROUTE ?? '/'

const apiUrl = new URL('api/chat', window.location.origin + import.meta.env.BASE_URL).pathname
const canSend = computed(() => draft.value.trim().length > 0 && !isSending.value)

async function sendMessage() {
  const content = draft.value.trim()

  if (!content || isSending.value) {
    return
  }

  errorMessage.value = ''
  draft.value = ''
  messages.value.push({ id: Date.now(), role: 'user', content })
  await scrollToBottom()
  isSending.value = true

  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messages: messages.value.map(({ role, content: messageContent }) => ({
          role,
          content: messageContent,
        })),
      }),
    })

    const data = await response.json().catch(() => null)

    if (!response.ok) {
      throw new Error(data?.error ?? '消息发送失败，请稍后再试。')
    }

    messages.value.push({
      id: Date.now() + 1,
      role: 'assistant',
      content: data.answer,
    })
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : '消息发送失败，请稍后再试。'
  } finally {
    isSending.value = false
    await scrollToBottom()
  }
}

function handleEnter(event: KeyboardEvent) {
  if (event.shiftKey || event.isComposing) {
    return
  }

  event.preventDefault()
  void sendMessage()
}

async function scrollToBottom() {
  await nextTick()
  messageList.value?.scrollTo({
    top: messageList.value.scrollHeight,
    behavior: 'smooth',
  })
}
</script>

<template>
  <main class="chat-page">
    <section class="chat-shell" aria-label="和 Pan 聊天">
      <header class="chat-header">
        <div class="avatar-mark" aria-hidden="true">
          <MessageCircle :size="25" :stroke-width="2.25" />
        </div>
        <div class="chat-title">
          <p><Sparkles :size="15" />Pan's chat</p>
          <h1>和我聊聊</h1>
        </div>
        <a class="portal-link" :href="portalHref" aria-label="返回门户">
          <Home :size="16" />
          <span>返回门户</span>
        </a>
      </header>

      <section ref="messageList" class="message-list" aria-live="polite">
        <article
          v-for="message in messages"
          :key="message.id"
          class="message-row"
          :class="`is-${message.role}`"
        >
          <div class="message-avatar" aria-hidden="true">
            <UserRound v-if="message.role === 'user'" :size="17" />
            <Sparkles v-else :size="17" />
          </div>
          <p class="message-bubble">{{ message.content }}</p>
        </article>

        <article v-if="isSending" class="message-row is-assistant">
          <div class="message-avatar" aria-hidden="true">
            <LoaderCircle class="spin" :size="17" />
          </div>
          <p class="message-bubble muted">正在想怎么回你...</p>
        </article>
      </section>

      <p v-if="errorMessage" class="chat-error" role="alert">{{ errorMessage }}</p>

      <form class="composer" @submit.prevent="sendMessage">
        <textarea
          v-model="draft"
          rows="1"
          maxlength="1200"
          placeholder="输入消息..."
          aria-label="输入消息"
          @keydown.enter="handleEnter"
        ></textarea>
        <button type="submit" :disabled="!canSend" aria-label="发送消息">
          <SendHorizontal :size="21" />
        </button>
      </form>
    </section>
  </main>
</template>
