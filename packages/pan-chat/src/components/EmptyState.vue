<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import { gsap } from 'gsap'
import avatarUrl from '../../../portal/src/assets/pan-avatar.png'

defineProps<{
  title?: string
  description?: string
  actionText?: string
}>()

const emit = defineEmits<{
  action: []
}>()

const rootRef = ref<HTMLElement | null>(null)
let animationContext: ReturnType<typeof gsap.context> | null = null

onMounted(() => {
  if (!rootRef.value) return
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

  animationContext = gsap.context(() => {
    gsap.timeline({ defaults: { ease: 'power3.out' } })
      .fromTo(
        ['.welcome-wordmark', '.welcome-number'],
        { y: 28, autoAlpha: 0 },
        { y: 0, autoAlpha: 1, duration: 0.64, stagger: 0.08 },
      )
      .fromTo(
        '.welcome-avatar',
        { scale: 0.88, x: -14, autoAlpha: 0 },
        { scale: 1, x: 0, autoAlpha: 1, duration: 0.52 },
        '-=0.42',
      )
      .fromTo(
        ['.welcome-rule', '.welcome-eyebrow', '.empty-title', '.empty-desc'],
        { y: 14, autoAlpha: 0 },
        { y: 0, autoAlpha: 1, duration: 0.46, stagger: 0.08 },
        '-=0.3',
      )
  }, rootRef.value)
})

onUnmounted(() => {
  animationContext?.revert()
})
</script>

<template>
  <div ref="rootRef" class="empty-state">
    <div class="welcome-masthead" aria-hidden="true">
      <span class="welcome-wordmark">PAN</span>
      <span class="welcome-number">01</span>
      <div class="welcome-avatar">
        <img :src="avatarUrl" alt="" />
      </div>
    </div>

    <div class="welcome-copy">
      <span class="welcome-rule" aria-hidden="true"></span>
      <span class="welcome-eyebrow">PRIVATE CONVERSATION</span>
      <p v-if="title" class="empty-title">{{ title }}</p>
      <p v-if="description" class="empty-desc">{{ description }}</p>
    </div>

    <button v-if="actionText" class="empty-action" @click="emit('action')">
      {{ actionText }}
    </button>
  </div>
</template>
