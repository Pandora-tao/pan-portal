<script setup lang="ts">
import { nextTick, onBeforeUpdate, onMounted, ref } from 'vue'
import { Sparkles } from 'lucide-vue-next'
import { gsap } from 'gsap'
import confetti from 'canvas-confetti'
import { zongziItems } from '../data/activity'

withDefaults(
  defineProps<{
    disabled?: boolean
  }>(),
  {
    disabled: false,
  },
)

const emit = defineEmits<{
  open: []
}>()
const zongziRefs = ref<HTMLElement[]>([])
const openingId = ref<number | null>(null)
const isOpening = ref(false)

onBeforeUpdate(() => {
  zongziRefs.value = []
})

const setZongziRef = (element: Element | null) => {
  if (element) {
    zongziRefs.value.push(element as HTMLElement)
  }
}

const animateEntrance = async () => {
  await nextTick()

  gsap.fromTo(
    zongziRefs.value,
    {
      y: 28,
      scale: 0.78,
      opacity: 0,
      rotate: -10,
    },
    {
      y: 0,
      scale: 1,
      opacity: 1,
      rotate: (index) => zongziItems[index]?.rotate ?? 0,
      duration: 0.56,
      ease: 'back.out(1.7)',
      stagger: 0.055,
    },
  )
}

const burstConfettiFrom = (target: HTMLElement) => {
  const bounds = target.getBoundingClientRect()
  const origin = {
    x: (bounds.left + bounds.width / 2) / window.innerWidth,
    y: (bounds.top + bounds.height / 2) / window.innerHeight,
  }

  confetti({
    particleCount: 54,
    spread: 74,
    startVelocity: 24,
    scalar: 0.76,
    ticks: 72,
    gravity: 0.88,
    origin,
    colors: ['#bd3f2f', '#f0c84d', '#2f8b57', '#f7f0d3', '#86b96a'],
  })
}

const openItem = (event: MouseEvent, itemId: number) => {
  const target = event.currentTarget as HTMLButtonElement

  if (target.disabled || isOpening.value) {
    return
  }

  isOpening.value = true
  openingId.value = itemId
  burstConfettiFrom(target)

  const zongzi = target.querySelector('.zongzi')
  const riceCore = target.querySelector('.rice-core')
  const leafTop = target.querySelector('.leaf-top')
  const leafLeft = target.querySelector('.leaf-left')
  const leafRight = target.querySelector('.leaf-right')
  const leafFront = target.querySelector('.leaf-front')
  const ropes = target.querySelectorAll('.rope')
  const knot = target.querySelector('.knot')
  const localConfetti = target.querySelectorAll('.confetti-bit')

  gsap
    .timeline({
      defaults: { ease: 'power2.out' },
      onComplete: () => {
        emit('open')
      },
    })
    .to(target, { scale: 1.1, rotate: 0, y: -8, duration: 0.18 })
    .to(ropes, { opacity: 0, scale: 0.2, duration: 0.16, stagger: 0.02 }, 0.05)
    .to(knot, { opacity: 0, scale: 0.15, duration: 0.16 }, 0.05)
    .to(zongzi, { rotateX: -8, rotateY: 12, duration: 0.24 }, 0.08)
    .to(leafTop, { y: -24, rotate: -30, rotateX: -58, duration: 0.44 }, 0.15)
    .to(leafLeft, { x: -26, y: 6, rotate: -44, rotateY: -42, duration: 0.46 }, 0.18)
    .to(leafRight, { x: 26, y: 5, rotate: 43, rotateY: 42, duration: 0.46 }, 0.18)
    .to(leafFront, { y: 26, rotateX: 58, scaleY: 0.82, duration: 0.44 }, 0.19)
    .to(riceCore, { opacity: 1, scale: 1.08, y: -10, duration: 0.42, ease: 'back.out(1.8)' }, 0.22)
    .to(localConfetti, { opacity: 1, y: -36, scale: 1, rotate: 'random(-90, 90)', duration: 0.48, stagger: 0.025 }, 0.22)
    .to(target, { scale: 1.03, y: -4, duration: 0.22 }, 0.54)
}

const tiltItem = (event: PointerEvent, scale: number) => {
  const target = event.currentTarget as HTMLButtonElement

  if (target.disabled || isOpening.value) {
    return
  }

  gsap.to(target, {
    scale,
    y: scale > 1 ? -6 : 0,
    duration: 0.22,
    ease: 'power2.out',
  })
}

onMounted(animateEntrance)
</script>

<template>
  <section class="draw-stage" aria-label="粽子抽奖区">
    <div class="stage-header">
      <p><Sparkles :size="16" />选一个粽子</p>
      <span>9 个粽子里藏着今日赠礼，点击一个立即开奖</span>
    </div>

    <div class="zongzi-grid">
      <button
        v-for="item in zongziItems"
        :key="item.id"
        :ref="setZongziRef"
        class="zongzi-pick"
        :class="{ 'is-opening': openingId === item.id }"
        type="button"
        :disabled="disabled"
        :aria-label="item.label"
        @click="openItem($event, item.id)"
        @pointerenter="tiltItem($event, 1.06)"
        @pointerleave="tiltItem($event, 1)"
      >
        <span class="zongzi-shadow"></span>
        <span class="zongzi" aria-hidden="true">
          <span class="rice-core">
            <span class="rice-grain grain-one"></span>
            <span class="rice-grain grain-two"></span>
            <span class="rice-grain grain-three"></span>
            <span class="eye eye-left"></span>
            <span class="eye eye-right"></span>
            <span class="mouth"></span>
            <span class="blush blush-left"></span>
            <span class="blush blush-right"></span>
          </span>
          <span class="leaf leaf-back"></span>
          <span class="leaf leaf-left"></span>
          <span class="leaf leaf-right"></span>
          <span class="leaf leaf-front"></span>
          <span class="leaf leaf-top"></span>
          <span class="leaf-ridge ridge-one"></span>
          <span class="leaf-ridge ridge-two"></span>
          <span class="leaf-ridge ridge-three"></span>
          <span class="rope rope-horizontal"></span>
          <span class="rope rope-vertical"></span>
          <span class="rope rope-diagonal"></span>
          <span class="knot">
            <span class="tassel tassel-left"></span>
            <span class="tassel tassel-right"></span>
          </span>
          <span class="gloss"></span>
          <span class="confetti-bit bit-one"></span>
          <span class="confetti-bit bit-two"></span>
          <span class="confetti-bit bit-three"></span>
          <span class="confetti-bit bit-four"></span>
        </span>
      </button>
    </div>
  </section>
</template>

<style scoped>
.draw-stage {
  position: relative;
  z-index: 1;
  width: min(100%, 720px);
  margin: 0 auto;
  display: grid;
  gap: 20px;
  padding: 26px;
  border: 1px solid rgb(70 116 84 / 24%);
  border-radius: 8px;
  background:
    radial-gradient(circle at 20% 18%, rgb(255 255 255 / 82%), transparent 34%),
    linear-gradient(180deg, rgb(255 255 255 / 72%), rgb(245 250 238 / 54%)),
    repeating-linear-gradient(90deg, transparent 0 80px, rgb(46 124 85 / 7%) 80px 82px);
  box-shadow:
    inset 0 -40px 80px rgb(71 125 89 / 12%),
    0 24px 80px rgb(42 66 52 / 12%);
  backdrop-filter: blur(14px);
}

.stage-header {
  display: grid;
  gap: 6px;
  color: #244836;
  text-align: center;
}

.stage-header p,
.stage-header span {
  margin: 0;
}

.stage-header p {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  font-size: 20px;
  font-weight: 900;
}

.stage-header span {
  color: #64786a;
  font-size: 14px;
  line-height: 1.6;
}

.zongzi-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 14px 16px;
  perspective: 760px;
}

.zongzi-pick {
  position: relative;
  min-height: 112px;
  border: 0;
  padding: 0;
  background: transparent;
  cursor: pointer;
  transform-origin: center;
  will-change: transform;
}

.zongzi-pick:disabled {
  cursor: default;
}

.zongzi-shadow {
  position: absolute;
  left: 50%;
  bottom: 8%;
  width: 68%;
  height: 17%;
  border-radius: 999px;
  background: radial-gradient(ellipse, rgb(24 48 35 / 34%), transparent 68%);
  transform: translateX(-50%);
  filter: blur(3px);
}

.zongzi {
  position: absolute;
  inset: 50% auto auto 50%;
  width: clamp(88px, 19vw, 118px);
  height: clamp(88px, 19vw, 118px);
  transform: translate(-50%, -55%) rotateX(7deg) rotateY(-9deg);
  transform-style: preserve-3d;
  filter: drop-shadow(0 14px 14px rgb(23 65 39 / 18%));
}

.leaf {
  position: absolute;
  display: block;
  overflow: hidden;
  border-radius: 18px 18px 22px 22px;
  transform-style: preserve-3d;
  will-change: transform;
}

.leaf::before,
.leaf::after {
  position: absolute;
  inset: 0;
  content: "";
}

.leaf::before {
  background:
    linear-gradient(105deg, transparent 0 45%, rgb(239 246 164 / 34%) 46% 48%, transparent 49%),
    repeating-linear-gradient(78deg, transparent 0 11px, rgb(255 255 255 / 15%) 11px 13px, transparent 13px 23px);
  mix-blend-mode: soft-light;
}

.leaf::after {
  background: radial-gradient(circle at 30% 20%, rgb(255 255 255 / 22%), transparent 24%);
}

.leaf-back {
  z-index: 1;
  inset: 4% 3% 7%;
  clip-path: polygon(50% 0, 99% 86%, 6% 91%);
  background:
    linear-gradient(116deg, #89b85b 0%, #276f41 52%, #0e442a 100%);
  box-shadow:
    inset -18px -20px 24px rgb(4 38 23 / 36%),
    inset 16px 9px 16px rgb(255 255 255 / 16%);
}

.leaf-left {
  z-index: 4;
  left: 3%;
  top: 8%;
  width: 56%;
  height: 81%;
  clip-path: polygon(86% 0, 100% 87%, 2% 92%, 10% 34%);
  transform-origin: 86% 76%;
  background:
    radial-gradient(circle at 35% 15%, rgb(255 255 255 / 20%), transparent 18%),
    linear-gradient(132deg, #a8c968 0%, #3d8c48 48%, #125132 100%);
  box-shadow:
    inset 13px 7px 16px rgb(255 255 255 / 14%),
    inset -13px -20px 18px rgb(8 59 32 / 26%);
}

.leaf-right {
  z-index: 4;
  right: 3%;
  top: 8%;
  width: 56%;
  height: 81%;
  clip-path: polygon(15% 0, 91% 34%, 99% 92%, 0 87%);
  transform-origin: 14% 76%;
  background:
    radial-gradient(circle at 68% 17%, rgb(255 255 255 / 18%), transparent 18%),
    linear-gradient(226deg, #8fbd58 0%, #2d7f42 54%, #0d482b 100%);
  box-shadow:
    inset -12px 8px 15px rgb(255 255 255 / 12%),
    inset 14px -20px 20px rgb(4 46 27 / 32%);
}

.leaf-front {
  z-index: 5;
  left: 9%;
  top: 51%;
  width: 82%;
  height: 39%;
  clip-path: polygon(0 28%, 50% 0, 100% 28%, 89% 100%, 11% 100%);
  transform-origin: 50% 20%;
  background:
    linear-gradient(156deg, #569b48 0%, #236e3d 48%, #0a4228 100%);
  box-shadow:
    inset 11px 8px 13px rgb(255 255 255 / 10%),
    inset -16px -13px 18px rgb(3 37 23 / 34%);
}

.leaf-top {
  z-index: 7;
  left: 21%;
  top: 5%;
  width: 59%;
  height: 28%;
  clip-path: polygon(50% 0, 100% 72%, 51% 100%, 0 72%);
  transform-origin: 50% 85%;
  background:
    linear-gradient(162deg, #d0d96f 0%, #6aa050 55%, #236a38 100%);
  box-shadow:
    inset 8px 6px 10px rgb(255 255 255 / 16%),
    inset -10px -11px 12px rgb(24 72 37 / 24%);
}

.rice-core {
  position: absolute;
  z-index: 3;
  left: 50%;
  top: 34%;
  width: 47%;
  height: 42%;
  border-radius: 46% 46% 40% 40%;
  opacity: 0;
  background:
    radial-gradient(circle at 29% 24%, #fffef4 0 15%, transparent 16%),
    radial-gradient(circle at 68% 31%, #fff8db 0 11%, transparent 12%),
    linear-gradient(148deg, #fff9df 0%, #f2dfaa 100%);
  box-shadow:
    inset -9px -11px 13px rgb(200 157 75 / 20%),
    inset 8px 7px 10px rgb(255 255 255 / 42%),
    0 8px 14px rgb(36 59 34 / 17%);
  transform: translateX(-50%) scale(0.78);
  will-change: transform, opacity;
}

.rice-grain {
  position: absolute;
  width: 11px;
  height: 5px;
  border-radius: 999px;
  background: rgb(223 190 118 / 42%);
}

.grain-one {
  left: 17%;
  top: 22%;
  transform: rotate(-24deg);
}

.grain-two {
  right: 18%;
  top: 50%;
  transform: rotate(24deg);
}

.grain-three {
  left: 42%;
  bottom: 14%;
  transform: rotate(-7deg);
}

.eye {
  position: absolute;
  z-index: 2;
  top: 38%;
  width: 5%;
  min-width: 4px;
  height: 13%;
  border-radius: 999px;
  background: #213025;
}

.eye-left {
  left: 31%;
}

.eye-right {
  right: 31%;
}

.mouth {
  position: absolute;
  left: 50%;
  top: 54%;
  width: 28%;
  height: 17%;
  border-bottom: 2px solid #213025;
  border-radius: 0 0 999px 999px;
  transform: translateX(-50%);
}

.blush {
  position: absolute;
  top: 59%;
  width: 18%;
  height: 11%;
  border-radius: 999px;
  background: #ef8c5b;
  opacity: 0.8;
}

.blush-left {
  left: 12%;
}

.blush-right {
  right: 12%;
}

.rope {
  position: absolute;
  z-index: 9;
  border-radius: 999px;
  background:
    repeating-linear-gradient(90deg, rgb(255 235 163 / 88%) 0 4px, rgb(142 94 42 / 88%) 4px 8px);
  box-shadow:
    0 2px 3px rgb(34 44 24 / 20%),
    inset 0 -1px 1px rgb(74 50 20 / 28%);
  transform-origin: center;
  will-change: transform, opacity;
}

.rope-horizontal {
  left: 12%;
  top: 64%;
  width: 77%;
  height: 5%;
  transform: rotate(-7deg);
}

.rope-vertical {
  left: 48%;
  top: 13%;
  width: 5%;
  height: 74%;
  transform: rotate(4deg);
}

.rope-diagonal {
  left: 14%;
  top: 50%;
  width: 74%;
  height: 5%;
  transform: rotate(20deg);
}

.knot {
  position: absolute;
  z-index: 10;
  left: 50%;
  top: 59%;
  width: 15%;
  height: 15%;
  border-radius: 48%;
  background:
    radial-gradient(circle at 32% 28%, #fff0b1 0 20%, transparent 21%),
    radial-gradient(circle at 58% 58%, #8b5e2b 0 28%, #d7af5c 29% 100%);
  box-shadow: 0 4px 7px rgb(20 46 28 / 24%);
  transform: translateX(-50%);
  will-change: transform, opacity;
}

.tassel {
  position: absolute;
  top: 65%;
  width: 44%;
  height: 88%;
  border-left: 2px solid #7b542a;
  border-right: 2px solid #7b542a;
  opacity: 0.8;
}

.tassel-left {
  left: -18%;
  transform: rotate(16deg);
}

.tassel-right {
  right: -18%;
  transform: rotate(-16deg);
}

.leaf-ridge {
  position: absolute;
  z-index: 8;
  height: 2px;
  border-radius: 999px;
  background: rgb(228 239 158 / 52%);
  box-shadow: 0 1px 1px rgb(19 55 32 / 12%);
}

.ridge-one {
  left: 26%;
  top: 27%;
  width: 48%;
  transform: rotate(-18deg);
}

.ridge-two {
  left: 17%;
  top: 47%;
  width: 66%;
  transform: rotate(19deg);
}

.ridge-three {
  left: 18%;
  top: 73%;
  width: 64%;
  transform: rotate(-7deg);
}

.gloss {
  position: absolute;
  z-index: 11;
  left: 30%;
  top: 18%;
  width: 14%;
  height: 28%;
  border-radius: 999px;
  background: linear-gradient(180deg, rgb(255 255 255 / 38%), transparent);
  filter: blur(1px);
  transform: rotate(29deg);
  pointer-events: none;
}

.confetti-bit {
  position: absolute;
  z-index: 12;
  left: 50%;
  top: 46%;
  width: 8px;
  height: 12px;
  border-radius: 2px;
  opacity: 0;
  transform: translate(-50%, -50%) scale(0.1);
  will-change: transform, opacity;
}

.bit-one {
  margin-left: -22px;
  background: #bd3f2f;
}

.bit-two {
  margin-left: 8px;
  background: #f0c84d;
}

.bit-three {
  margin-left: 26px;
  background: #2f8b57;
}

.bit-four {
  margin-left: -4px;
  background: #f7f0d3;
}

.zongzi-pick.is-opening .zongzi-shadow {
  animation: open-shadow 0.72s ease forwards;
}

@keyframes open-shadow {
  0% {
    width: 68%;
    opacity: 1;
  }

  55% {
    width: 82%;
    opacity: 0.72;
  }

  100% {
    width: 76%;
    opacity: 0.82;
  }
}

@media (max-width: 760px) {
  .draw-stage {
    width: min(100%, 420px);
    max-height: calc(100svh - 92px);
    gap: 12px;
    padding: 16px;
  }

  .stage-header p {
    font-size: 18px;
  }

  .stage-header span {
    font-size: 13px;
  }

  .zongzi-grid {
    gap: 6px 8px;
  }

  .zongzi-pick {
    min-height: clamp(82px, 25svh, 108px);
  }

  .zongzi {
    width: clamp(76px, 23vw, 92px);
    height: clamp(76px, 23vw, 92px);
  }
}

@media (max-width: 380px) {
  .draw-stage {
    padding: 14px;
  }

  .stage-header span {
    display: none;
  }

  .zongzi-pick {
    min-height: 78px;
  }

  .zongzi {
    width: 74px;
    height: 74px;
  }
}
</style>
