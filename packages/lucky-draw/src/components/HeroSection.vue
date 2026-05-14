<script setup lang="ts">
import { Gift } from 'lucide-vue-next'

defineProps<{
  title: string
  actionLabel: string
  actionDisabled?: boolean
}>()

defineEmits<{
  start: []
}>()
</script>

<template>
  <section class="hero" aria-label="端午节抽奖首页">
    <span class="title-ornament ornament-left" aria-hidden="true"></span>
    <span class="title-ornament ornament-right" aria-hidden="true"></span>
    <span class="title-ribbon" aria-hidden="true"></span>
    <h1>{{ title }}</h1>
    <button class="primary-action" type="button" :disabled="actionDisabled" @click="$emit('start')">
      <Gift :size="18" />
      <span>{{ actionLabel }}</span>
    </button>
  </section>
</template>

<style scoped>
.hero {
  position: relative;
  z-index: 2;
  width: min(100%, 680px);
  min-height: 480px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  justify-content: center;
  border: 1px solid rgb(96 108 56 / 22%);
  border-radius: 32px;
  padding: 56px 34px 48px;
  background:
    radial-gradient(circle at 18% 8%, rgb(247 239 216 / 82%), transparent 28%),
    linear-gradient(135deg, rgb(232 220 199 / 92%), rgb(212 184 149 / 76%));
  box-shadow:
    inset 0 1px 0 rgb(247 239 216 / 56%),
    0 26px 70px rgb(48 54 34 / 20%);
  overflow: hidden;
}

.hero::before,
.hero::after {
  position: absolute;
  content: "";
  pointer-events: none;
}

.hero::before {
  inset: 18px;
  border: 1px solid rgb(96 108 56 / 18%);
  border-radius: 26px;
}

.hero::after {
  right: -70px;
  bottom: -88px;
  width: 280px;
  height: 220px;
  border-radius: 68% 32% 66% 34%;
  background:
    linear-gradient(115deg, rgb(139 157 131 / 26%), rgb(96 108 56 / 16)),
    radial-gradient(circle at 28% 30%, rgb(247 239 216 / 28%), transparent 32%);
  transform: rotate(-18deg);
}

h1 {
  position: relative;
  z-index: 2;
  max-width: min(100%, 860px);
  margin: 0 0 118px;
  color: var(--duanwu-moss);
  font-family: "Ma Shan Zheng", "STKaiti", "KaiTi", serif;
  font-size: clamp(42px, 7.8vw, 82px);
  font-weight: 400;
  line-height: 1;
  letter-spacing: 0;
  white-space: nowrap;
  text-shadow:
    0 2px 0 rgb(247 239 216 / 62%),
    0 18px 34px rgb(48 54 34 / 18%);
}

h1::before,
h1::after {
  position: absolute;
  top: 50%;
  width: 54px;
  height: 2px;
  content: "";
  border-radius: 999px;
  background: linear-gradient(90deg, transparent, var(--duanwu-moss), transparent);
}

h1::before {
  left: -68px;
}

h1::after {
  right: -68px;
}

.primary-action {
  min-width: 188px;
  min-height: 54px;
  padding-inline: 30px;
  font-size: 18px;
  position: relative;
  z-index: 3;
}

.title-ribbon {
  position: absolute;
  z-index: 1;
  top: 128px;
  left: 50%;
  width: min(88vw, 680px);
  height: 18px;
  border-radius: 999px;
  background:
    radial-gradient(circle at 24% 50%, rgb(192 142 58 / 35%), transparent 13%),
    radial-gradient(circle at 76% 50%, rgb(192 142 58 / 35%), transparent 13%),
    linear-gradient(90deg, transparent, rgb(96 108 56 / 18), transparent);
  transform: translateX(-50%);
}

.title-ornament {
  position: absolute;
  z-index: 1;
  top: 42px;
  width: 86px;
  height: 54px;
  opacity: 0.82;
  filter: drop-shadow(0 12px 14px rgb(48 54 34 / 14%));
}

.title-ornament::before,
.title-ornament::after {
  position: absolute;
  content: "";
  border-radius: 80% 0 80% 0;
  background: linear-gradient(135deg, var(--duanwu-moss), var(--duanwu-sage));
}

.title-ornament::before {
  inset: 0 28px 12px 0;
  transform: rotate(-10deg);
}

.title-ornament::after {
  inset: 16px 0 0 26px;
  transform: rotate(18deg);
  opacity: 0.76;
}

.ornament-left {
  left: 2%;
  transform: rotate(-14deg);
}

.ornament-right {
  right: 2%;
  transform: scaleX(-1) rotate(-14deg);
}

@media (max-width: 760px) {
  .hero {
    min-height: 64svh;
    padding: 46px 22px 34px;
  }

  h1 {
    margin: 0 0 126px;
    font-size: clamp(32px, 9.4vw, 44px);
  }

  h1::before,
  h1::after {
    width: 26px;
  }

  h1::before {
    left: -36px;
  }

  h1::after {
    right: -36px;
  }

  .primary-action {
    width: min(100%, 250px);
  }

  .title-ribbon {
    top: 94px;
    height: 14px;
  }

  .title-ornament {
    top: 8px;
    width: 58px;
    height: 38px;
  }

  .ornament-left {
    left: -6px;
  }

  .ornament-right {
    right: -6px;
  }
}
</style>
