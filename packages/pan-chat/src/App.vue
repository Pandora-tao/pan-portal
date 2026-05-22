<script setup lang="ts">
import { Home, MessageCircle, Sparkles } from 'lucide-vue-next'
import ChatInput from './components/ChatInput.vue'
import MessageList from './components/MessageList.vue'
import { useChat } from './composables/useChat'

const portalHref = import.meta.env.VITE_PORTAL_ROUTE ?? '/'
const { messages, sending, error, sendMessage } = useChat()
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

      <MessageList :messages="messages" :sending="sending" />

      <p v-if="error" class="chat-error" role="alert">{{ error }}</p>

      <ChatInput :sending="sending" @send="sendMessage" />
    </section>
  </main>
</template>
