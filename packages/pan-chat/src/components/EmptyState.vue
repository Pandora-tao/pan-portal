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
    const glowLoop = gsap.timeline({
      paused: true,
      repeat: -1,
      yoyo: true,
      defaults: { ease: 'sine.inOut' },
    })
      .to('.welcome-glow.is-outer', {
        scale: 1.08,
        autoAlpha: 0.58,
        duration: 2.8,
      }, 0)
      .to('.welcome-glow.is-inner', {
        scale: 1.06,
        autoAlpha: 0.78,
        duration: 2.2,
      }, 0)

    const dotLoop = gsap.timeline({
      paused: true,
      repeat: -1,
      yoyo: true,
      defaults: { ease: 'sine.inOut' },
    })
      .to('.welcome-dot', {
        y: -3,
        autoAlpha: 0.92,
        duration: 0.78,
        stagger: 0.16,
      })

    gsap.timeline({ defaults: { ease: 'power3.out' } })
      .fromTo(
        '.welcome-glow',
        { scale: 0.72, autoAlpha: 0 },
        { scale: 1, autoAlpha: 0.46, duration: 0.7, stagger: 0.08 },
      )
      .fromTo(
        '.welcome-avatar',
        { scale: 0.82, y: 12, autoAlpha: 0 },
        { scale: 1, y: 0, autoAlpha: 1, duration: 0.56 },
        '-=0.52',
      )
      .fromTo(
        ['.empty-title', '.empty-desc'],
        { y: 14, autoAlpha: 0 },
        { y: 0, autoAlpha: 1, duration: 0.48, stagger: 0.12 },
        '-=0.22',
      )
      .fromTo(
        '.welcome-dot',
        { y: 5, scale: 0.6, autoAlpha: 0 },
        { y: 0, scale: 1, autoAlpha: 0.56, duration: 0.36, stagger: 0.1 },
        '-=0.18',
      )
      .call(() => {
        glowLoop.play(0)
        dotLoop.play(0)
      })
  }, rootRef.value)
})

onUnmounted(() => {
  animationContext?.revert()
})
</script>

<template>
  <div ref="rootRef" class="empty-state">
    <div class="welcome-portrait" aria-hidden="true">
      <span class="welcome-glow is-outer"></span>
      <span class="welcome-glow is-inner"></span>
      <div class="welcome-avatar">
        <img :src="avatarUrl" alt="" />
      </div>
    </div>

    <div class="welcome-copy">
      <p v-if="title" class="empty-title">{{ title }}</p>
      <p v-if="description" class="empty-desc">{{ description }}</p>
    </div>

    <div class="welcome-dots" aria-hidden="true">
      <span v-for="index in 3" :key="index" class="welcome-dot"></span>
    </div>

    <button v-if="actionText" class="empty-action" @click="emit('action')">
      {{ actionText }}
    </button>
  </div>
</template>
