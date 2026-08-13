<script setup lang="ts">
import { nextTick, onBeforeUpdate, onMounted, ref } from 'vue'
import { Gift } from 'lucide-vue-next'
import { gsap } from 'gsap'
import confetti from 'canvas-confetti'
import { prizeTiles } from '../data/activity'

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

const tileRefs = ref<HTMLElement[]>([])
const openingId = ref<number | null>(null)
const isOpening = ref(false)

onBeforeUpdate(() => {
  tileRefs.value = []
})

const setTileRef = (element: Element | null) => {
  if (element) {
    tileRefs.value.push(element as HTMLElement)
  }
}

const animateEntrance = async () => {
  await nextTick()

  gsap.fromTo(
    tileRefs.value,
    {
      y: 18,
      opacity: 0,
      rotate: -2,
    },
    {
      y: 0,
      opacity: 1,
      rotate: (index) => prizeTiles[index]?.rotate ?? 0,
      duration: 0.32,
      ease: 'power2.out',
      stagger: 0.045,
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
    particleCount: 46,
    spread: 64,
    startVelocity: 22,
    scalar: 0.72,
    ticks: 68,
    gravity: 0.9,
    origin,
    colors: ['#002FA7', '#111827', '#FFFFFF', '#D8DCE3'],
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

  const number = target.querySelector('.tile-number')
  const icon = target.querySelector('.tile-icon')
  const label = target.querySelector('.tile-label')

  gsap
    .timeline({
      defaults: { ease: 'power2.out' },
      onComplete: () => {
        emit('open')
      },
    })
    .to(target, { y: -8, scale: 1.04, rotate: 0, duration: 0.18 })
    .to(target, { backgroundColor: '#002FA7', color: '#FFFFFF', duration: 0.16 }, 0)
    .to(number, { scale: 1.16, duration: 0.18 }, 0.02)
    .to(icon, { rotate: 12, scale: 1.16, duration: 0.2 }, 0.05)
    .to(label, { y: -2, duration: 0.18 }, 0.08)
    .to(target, { scale: 1, y: -4, duration: 0.2 }, 0.26)
}

const tiltItem = (event: PointerEvent, scale: number) => {
  const target = event.currentTarget as HTMLButtonElement

  if (target.disabled || isOpening.value) {
    return
  }

  gsap.to(target, {
    scale,
    y: scale > 1 ? -4 : 0,
    duration: 0.18,
    ease: 'power2.out',
  })
}

onMounted(animateEntrance)
</script>

<template>
  <section class="draw-stage" aria-label="奖品格抽奖区">
    <header class="stage-header">
      <p>选一个奖品格</p>
      <span>点一下开奖</span>
    </header>

    <div class="tile-grid">
      <button
        v-for="(item, index) in prizeTiles"
        :key="item.id"
        :ref="setTileRef"
        class="prize-tile"
        :class="{ 'is-opening': openingId === item.id }"
        type="button"
        :disabled="disabled"
        :aria-label="item.label"
        @click="openItem($event, item.id)"
        @pointerenter="tiltItem($event, 1.04)"
        @pointerleave="tiltItem($event, 1)"
      >
        <span class="tile-number">{{ String(index + 1).padStart(2, '0') }}</span>
        <Gift class="tile-icon" :size="24" />
        <span class="tile-label">奖品格</span>
      </button>
    </div>
  </section>
</template>

<style scoped>
.draw-stage {
  position: relative;
  z-index: 1;
  width: min(100%, 820px);
  margin: 0 auto;
  display: grid;
  gap: 18px;
  border: 1px solid var(--line-strong);
  padding: 26px;
  color: var(--ink);
  background: var(--surface);
  box-shadow: 16px 16px 0 rgb(0 47 167 / 10%);
}

.stage-header {
  display: flex;
  align-items: end;
  justify-content: space-between;
  gap: 18px;
  border-bottom: 1px solid var(--line);
  padding-bottom: 14px;
}

.stage-header p,
.stage-header span {
  margin: 0;
}

.stage-header p {
  color: var(--ink);
  font-size: clamp(28px, 6vw, 54px);
  font-weight: 900;
  line-height: 0.98;
}

.stage-header span {
  color: var(--accent);
  font-size: 14px;
  font-weight: 900;
}

.tile-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
}

.prize-tile {
  position: relative;
  display: grid;
  min-height: 132px;
  align-content: space-between;
  justify-items: start;
  border: 1px solid var(--line-strong);
  padding: 14px;
  color: var(--ink);
  background: var(--surface);
  cursor: pointer;
  transform-origin: center;
  will-change: transform;
}

.prize-tile::after {
  position: absolute;
  right: 10px;
  bottom: 10px;
  width: 28px;
  height: 28px;
  content: "";
  border-right: 1px solid currentColor;
  border-bottom: 1px solid currentColor;
  opacity: 0.22;
}

.prize-tile:hover,
.prize-tile.is-opening {
  color: var(--surface);
  background: var(--accent);
}

.prize-tile:disabled {
  cursor: default;
}

.tile-number {
  font-size: 28px;
  font-weight: 900;
  line-height: 1;
}

.tile-icon {
  color: currentColor;
}

.tile-label {
  color: currentColor;
  font-size: 13px;
  font-weight: 900;
}

@media (max-width: 760px) {
  .draw-stage {
    width: min(100%, 430px);
    min-height: calc(100svh - 96px);
    align-content: center;
    padding: 20px;
    box-shadow: 8px 8px 0 rgb(0 47 167 / 10%);
  }

  .stage-header {
    display: grid;
    gap: 6px;
  }

  .stage-header p {
    font-size: clamp(34px, 11vw, 48px);
  }

  .tile-grid {
    gap: 8px;
  }

  .prize-tile {
    min-height: 104px;
    padding: 11px;
  }

  .tile-number {
    font-size: 24px;
  }
}

@media (max-width: 380px) {
  .prize-tile {
    min-height: 92px;
  }
}
</style>
