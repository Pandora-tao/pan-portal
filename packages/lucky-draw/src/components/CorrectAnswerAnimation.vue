<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { Check, Sparkles } from 'lucide-vue-next'
import { gsap } from 'gsap'
import confetti, { type Options } from 'canvas-confetti'

const emit = defineEmits<{
  done: []
}>()

const cardRef = ref<HTMLElement | null>(null)
const ringRef = ref<HTMLElement | null>(null)
let doneTimer: number | undefined

const launchCorrectConfetti = () => {
  const base: Options = {
    particleCount: 34,
    spread: 58,
    startVelocity: 28,
    ticks: 76,
    gravity: 0.82,
    scalar: 0.82,
    colors: ['#002FA7', '#111827', '#FFFFFF', '#D8DCE3'],
  }

  confetti({
    ...base,
    origin: { x: 0.38, y: 0.42 },
    angle: 70,
  })

  confetti({
    ...base,
    origin: { x: 0.62, y: 0.42 },
    angle: 110,
  })
}

onMounted(() => {
  const card = cardRef.value
  const ring = ringRef.value

  if (card && ring) {
    gsap
      .timeline({ defaults: { ease: 'power2.out' } })
      .fromTo(card, { y: 18, scale: 0.86, opacity: 0 }, { y: 0, scale: 1, opacity: 1, duration: 0.28 })
      .fromTo(ring, { scale: 0.45, opacity: 0 }, { scale: 1.08, opacity: 1, duration: 0.24, ease: 'back.out(2)' }, '-=0.12')
      .to(ring, { scale: 1, duration: 0.16 })
  }

  launchCorrectConfetti()
  doneTimer = window.setTimeout(() => emit('done'), 980)
})

onBeforeUnmount(() => {
  if (doneTimer) {
    window.clearTimeout(doneTimer)
  }
})
</script>

<template>
  <div class="correct-backdrop" role="status" aria-live="polite">
    <section ref="cardRef" class="correct-card">
      <span ref="ringRef" class="correct-ring" aria-hidden="true">
        <Check :size="46" stroke-width="3.3" />
      </span>
      <p><Sparkles :size="17" />回答正确</p>
      <h2>去开奖</h2>
    </section>
  </div>
</template>

<style scoped>
.correct-backdrop {
  position: fixed;
  z-index: 24;
  inset: 0;
  display: grid;
  place-items: center;
  padding: 24px;
  background: rgb(17 24 39 / 22%);
  pointer-events: none;
  backdrop-filter: blur(4px);
}

.correct-card {
  display: grid;
  justify-items: center;
  gap: 10px;
  width: min(78vw, 320px);
  padding: 28px 24px;
  border: 1px solid var(--line-strong);
  color: var(--ink);
  background: var(--surface);
  box-shadow: 10px 10px 0 rgb(0 47 167 / 10%);
  text-align: center;
}

.correct-ring {
  display: grid;
  place-items: center;
  width: 82px;
  height: 82px;
  border: 1px solid var(--accent);
  border-radius: 999px;
  color: var(--surface);
  background: var(--accent);
}

.correct-card p {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin: 6px 0 0;
  color: var(--accent);
  font-size: 14px;
  font-weight: 900;
}

.correct-card h2 {
  margin: 0;
  font-size: 26px;
  line-height: 1.2;
}
</style>
