<script setup lang="ts">
import { ref } from 'vue'
import { gsap } from 'gsap'

interface Charm {
  id: number
  text: string
  className: string
  message: string
}

const charms: Charm[] = [
  {
    id: 1,
    text: '安康',
    className: 'charm-left',
    message: '端午安康，好运已靠岸',
  },
  {
    id: 2,
    text: '粽香',
    className: 'charm-right',
    message: '粽香一动，惊喜在路上',
  },
  {
    id: 3,
    text: '龙舟',
    className: 'charm-bottom',
    message: '龙舟划过，奖品更近一步',
  },
]

const toast = ref('')
let toastTimer: number | undefined

const triggerCharm = (event: MouseEvent, charm: Charm) => {
  const target = event.currentTarget as HTMLElement

  gsap.fromTo(
    target,
    { y: 0, rotate: 0, scale: 1 },
    { y: -8, rotate: 4, scale: 1.08, duration: 0.18, yoyo: true, repeat: 1, ease: 'power2.out' },
  )

  toast.value = charm.message
  if (toastTimer) {
    window.clearTimeout(toastTimer)
  }
  toastTimer = window.setTimeout(() => {
    toast.value = ''
  }, 1600)
}
</script>

<template>
  <div class="festival-interactions" aria-label="端午互动装饰">
    <button
      v-for="charm in charms"
      :key="charm.id"
      class="blessing-charm"
      :class="charm.className"
      type="button"
      @click="triggerCharm($event, charm)"
    >
      {{ charm.text }}
    </button>
    <p v-if="toast" class="interaction-toast" role="status">{{ toast }}</p>
  </div>
</template>

<style scoped>
.festival-interactions {
  position: absolute;
  z-index: 3;
  inset: 0;
  pointer-events: none;
}

.blessing-charm {
  position: absolute;
  width: 58px;
  height: 58px;
  border: 1px solid rgb(96 108 56 / 24%);
  border-radius: 24px 24px 28px 18px;
  color: var(--duanwu-moss);
  background:
    radial-gradient(circle at 32% 25%, rgb(247 239 216 / 78%), transparent 30%),
    linear-gradient(160deg, var(--duanwu-sand), var(--duanwu-sage));
  box-shadow:
    inset 0 1px 0 rgb(247 239 216 / 50%),
    0 14px 32px rgb(48 54 34 / 14%);
  cursor: pointer;
  font-size: 14px;
  font-weight: 900;
  pointer-events: auto;
}

.charm-left {
  left: 12%;
  top: 42%;
}

.charm-right {
  right: 11%;
  top: 43%;
}

.charm-bottom {
  left: 50%;
  bottom: 16%;
  transform: translateX(-50%);
}

.interaction-toast {
  position: absolute;
  left: 50%;
  bottom: 24%;
  width: max-content;
  max-width: min(78vw, 360px);
  margin: 0;
  padding: 10px 14px;
  border: 1px solid rgb(96 108 56 / 20%);
  border-radius: 24px;
  color: var(--duanwu-moss);
  background: rgb(232 220 199 / 90%);
  box-shadow: 0 18px 42px rgb(48 54 34 / 16%);
  font-size: 14px;
  font-weight: 800;
  text-align: center;
  transform: translateX(-50%);
  pointer-events: none;
}

@media (max-width: 760px) {
  .blessing-charm {
    width: 48px;
    height: 48px;
    font-size: 12px;
  }

  .charm-left {
    left: 7%;
    top: 44%;
  }

  .charm-right {
    right: 7%;
    top: 44%;
  }

  .charm-bottom {
    bottom: 18%;
  }

  .interaction-toast {
    bottom: 25%;
    font-size: 13px;
  }
}
</style>
