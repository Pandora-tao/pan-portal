<script setup lang="ts">
import { computed } from 'vue'
import { Home, MessageCircle, Sparkles } from 'lucide-vue-next'
import ChatInput from './components/ChatInput.vue'
import ChatSidebar from './components/ChatSidebar.vue'
import MessageList from './components/MessageList.vue'
import { useChat } from './composables/useChat'

const portalHref = import.meta.env.VITE_PORTAL_ROUTE ?? '/'
const {
  sessions,
  currentSessionId,
  messages,
  sending,
  streaming,
  error,
  streamError,
  sendMessage,
  sendMessageStream,
  stopGenerating,
  regenerateMessage,
  clearError,
  createSession,
  selectSession,
  deleteSession,
  renameSession,
} = useChat()

const hasSessions = computed(() => sessions.value.length > 0)
const noCurrentSession = computed(() => !currentSessionId.value)

const lastAssistantId = computed(() => {
  const reversed = [...messages.value].reverse()
  return reversed.find((msg) => msg.role === 'assistant')?.id ?? null
})

function handleSend(content: string) {
  void sendMessageStream(content)
}

function handleResend(content: string) {
  void sendMessage(content)
}

function handleRegenerate() {
  regenerateMessage()
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

      <div class="chat-body">
        <ChatSidebar
          :sessions="sessions"
          :current-session-id="currentSessionId"
          @create-session="createSession"
          @select-session="selectSession"
          @delete-session="deleteSession"
          @rename-session="renameSession"
        />

        <section class="chat-main" aria-label="当前聊天">
          <MessageList
            :messages="messages"
            :last-assistant-id="lastAssistantId"
            :has-sessions="hasSessions"
            :current-session-id="currentSessionId"
            @resend="handleResend"
            @regenerate="handleRegenerate"
            @create-session="createSession"
          />

          <p v-if="error || streamError" class="chat-error" role="alert">
            {{ error || streamError }}
          </p>

          <ChatInput
            :sending="sending || streaming"
            :disabled="noCurrentSession"
            @send="handleSend"
          />
        </section>
      </div>
    </section>
  </main>
</template>
