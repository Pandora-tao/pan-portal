<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { gsap } from 'gsap'
import luluImage from '../assets/lulu.png'

const emit = defineEmits<{
  done: []
}>()
const sceneRef = ref<HTMLElement | null>(null)
const mascotRef = ref<HTMLElement | null>(null)
const hammerRef = ref<HTMLElement | null>(null)
const bubbleRef = ref<HTMLElement | null>(null)
const tapRef = ref<HTMLElement | null>(null)

onMounted(() => {
  const scene = sceneRef.value
  const mascot = mascotRef.value
  const hammer = hammerRef.value
  const bubble = bubbleRef.value
  const tap = tapRef.value

  if (!scene || !mascot || !hammer || !bubble || !tap) {
    emit('done')
    return
  }

  const timeline = gsap.timeline({
    defaults: { ease: 'power2.out' },
    onComplete: () => emit('done'),
  })

  timeline
    .fromTo(scene, { opacity: 0 }, { opacity: 1, duration: 0.16 })
    .fromTo(
      mascot,
      { y: 220, scale: 0.9 },
      { y: 0, scale: 1, duration: 0.58, ease: 'back.out(1.25)' },
      '-=0.02',
    )
    .fromTo(bubble, { y: 8, scale: 0.82, opacity: 0 }, { y: 0, scale: 1, opacity: 1, duration: 0.22 }, '-=0.14')
    .fromTo(
      hammer,
      { rotate: 18, x: 0, y: 0, scale: 0.92 },
      { rotate: -16, x: -46, y: 86, scale: 2.45, duration: 0.22, ease: 'power4.in' },
      '+=0.18',
    )
    .fromTo(tap, { scale: 0.3, opacity: 0 }, { scale: 1.2, opacity: 1, duration: 0.1 }, '-=0.03')
    .to(scene, { x: -8, duration: 0.035, yoyo: true, repeat: 5 }, '-=0.02')
    .to(tap, { scale: 2.35, opacity: 0, duration: 0.22 })
    .to(hammer, { rotate: 18, x: 0, y: 0, scale: 0.92, duration: 0.3, ease: 'back.out(2.2)' }, '-=0.18')
    .to(bubble, { y: -8, opacity: 0, duration: 0.18 }, '+=0.36')
    .to(mascot, { y: 220, scale: 0.92, duration: 0.46, ease: 'power2.in' }, '-=0.02')
    .to(scene, { opacity: 0, duration: 0.18 }, '-=0.14')
})
</script>

<template>
  <div ref="sceneRef" class="wrong-scene" role="status" aria-live="polite">
    <span class="cloud cloud-left" aria-hidden="true"></span>
    <span class="cloud cloud-right" aria-hidden="true"></span>
    <div ref="bubbleRef" class="speech">假烟假酒假朋友！</div>

    <div ref="mascotRef" class="lulu-stage" aria-hidden="true">
      <img class="lulu-image" :src="luluImage" alt="" />
      <span ref="tapRef" class="tap-burst">咚！</span>
      <div ref="hammerRef" class="screen-hammer">
        <span class="hammer-handle"></span>
        <span class="hammer-head"></span>
        <span class="hammer-face"></span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.wrong-scene {
  position: fixed;
  z-index: 30;
  inset: 0;
  display: grid;
  place-items: center;
  overflow: hidden;
  background:
    radial-gradient(circle at 50% 18%, rgb(232 220 199 / 34%), transparent 26%),
    linear-gradient(180deg, #8b9d83 0%, #d4b895 62%, #e8dcc7 100%);
  pointer-events: none;
  perspective: 720px;
}

.cloud {
  position: absolute;
  width: 150px;
  height: 52px;
  border-radius: 999px;
  background: rgb(247 239 216 / 70%);
  filter: blur(0.2px);
}

.cloud::before,
.cloud::after {
  position: absolute;
  content: "";
  border-radius: 999px;
  background: inherit;
}

.cloud::before {
  left: 24px;
  bottom: 20px;
  width: 62px;
  height: 62px;
}

.cloud::after {
  right: 20px;
  bottom: 14px;
  width: 76px;
  height: 76px;
}

.cloud-left {
  left: -42px;
  bottom: 15%;
}

.cloud-right {
  right: -36px;
  top: 26%;
}

.speech {
  position: absolute;
  z-index: 3;
  top: min(12vh, 100px);
  max-width: min(82vw, 340px);
  padding: 12px 16px;
  border: 1px solid rgb(198 107 61 / 24%);
  border-radius: 22px;
  color: #7b412e;
  background: rgb(232 220 199 / 94%);
  box-shadow: 0 18px 45px rgb(48 54 34 / 18%);
  font-weight: 900;
  text-align: center;
}

.lulu-stage {
  position: relative;
  width: min(86vw, 340px);
  height: min(110vw, 430px);
  margin-top: 78px;
  transform-origin: center bottom;
}

.lulu-image {
  position: absolute;
  z-index: 1;
  left: 50%;
  bottom: 0;
  width: 100%;
  height: auto;
  filter: drop-shadow(0 24px 34px rgb(48 54 34 / 20%));
  transform: translateX(-50%);
}

.screen-hammer {
  position: absolute;
  z-index: 5;
  top: 68px;
  right: -38px;
  width: 172px;
  height: 184px;
  transform-origin: 62% 88%;
  transform-style: preserve-3d;
}

.hammer-handle {
  position: absolute;
  right: 78px;
  bottom: 8px;
  width: 16px;
  height: 126px;
  border-radius: 999px;
  background:
    linear-gradient(90deg, rgb(247 239 216 / 18%), transparent 28%),
    linear-gradient(180deg, #b08b6e, #6e4d35);
  box-shadow: 0 8px 16px rgb(55 34 20 / 18%);
  transform: rotate(34deg);
}

.hammer-head {
  position: absolute;
  right: 8px;
  top: 6px;
  width: 128px;
  height: 84px;
  border-radius: 30px;
  background:
    radial-gradient(ellipse at 35% 24%, rgb(247 239 216 / 36%) 0 20%, transparent 44%),
    linear-gradient(160deg, #c08e3a, #c66b3d 70%, #b08b6e);
  box-shadow:
    inset -16px -14px 20px rgb(195 78 28 / 18%),
    0 18px 34px rgb(82 45 17 / 24%);
  transform: rotate(-8deg) translateZ(56px);
}

.hammer-face {
  position: absolute;
  right: 20px;
  top: 19px;
  width: 98px;
  height: 58px;
  border-radius: 26px;
  border: 3px solid rgb(232 220 199 / 72%);
  transform: rotate(-8deg) translateZ(84px);
}

.tap-burst {
  position: absolute;
  z-index: 6;
  top: 20%;
  right: 18%;
  display: grid;
  place-items: center;
  width: 58px;
  height: 58px;
  border-radius: 999px;
  color: var(--duanwu-terracotta);
  background: rgb(232 220 199 / 90%);
  box-shadow: 0 0 0 12px rgb(232 220 199 / 30%);
  font-size: 18px;
  font-weight: 900;
  opacity: 0;
}

@media (max-width: 420px) {
  .speech {
    top: 11vh;
  }

  .lulu-stage {
    width: 304px;
    height: 384px;
    margin-top: 68px;
  }

  .screen-hammer {
    top: 64px;
    right: -42px;
    width: 156px;
    height: 168px;
  }
}
</style>
