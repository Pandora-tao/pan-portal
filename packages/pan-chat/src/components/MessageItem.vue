<script setup lang="ts">
import { nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { gsap } from 'gsap'
import type { ChatMessage } from '../types/chat'

const props = defineProps<{
  message: ChatMessage
}>()

const rowRef = ref<HTMLElement | null>(null)
let thinkingContext: ReturnType<typeof gsap.context> | null = null

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
    const timeline = gsap.timeline({ repeat: -1 })

    timeline
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

onMounted(() => {
  void startThinkingAnimation()
})

watch(
  () => props.message.status,
  () => {
    void startThinkingAnimation()
  },
  { flush: 'post' },
)

onUnmounted(stopThinkingAnimation)
</script>

<template>
  <article ref="rowRef" class="message-row" :class="[`is-${message.role}`, `is-${message.status}`]">
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
      <p v-else class="message-text">
        {{ message.content }}
      </p>
    </div>
  </article>
</template>
