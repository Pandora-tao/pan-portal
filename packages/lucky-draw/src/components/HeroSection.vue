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
  width: min(100%, 760px);
  min-height: 500px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
}

h1 {
  position: relative;
  z-index: 2;
  max-width: min(100%, 860px);
  margin: 32px 0 174px;
  color: #073a29;
  font-family: "Ma Shan Zheng", "STKaiti", "KaiTi", serif;
  font-size: clamp(42px, 7.8vw, 82px);
  font-weight: 400;
  line-height: 1;
  letter-spacing: 0;
  white-space: nowrap;
  text-shadow:
    0 2px 0 rgb(255 255 255 / 58%),
    0 18px 36px rgb(8 40 28 / 20%);
}

h1::before,
h1::after {
  position: absolute;
  top: 50%;
  width: 54px;
  height: 2px;
  content: "";
  border-radius: 999px;
  background: linear-gradient(90deg, transparent, #0b4d36, transparent);
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
}

.title-ribbon {
  position: absolute;
  z-index: 1;
  top: 78px;
  left: 50%;
  width: min(88vw, 680px);
  height: 18px;
  border-radius: 999px;
  background:
    radial-gradient(circle at 24% 50%, rgb(233 188 82 / 42%), transparent 13%),
    radial-gradient(circle at 76% 50%, rgb(233 188 82 / 42%), transparent 13%),
    linear-gradient(90deg, transparent, rgb(47 126 86 / 16), transparent);
  transform: translateX(-50%);
}

.title-ornament {
  position: absolute;
  z-index: 1;
  top: 30px;
  width: 86px;
  height: 54px;
  opacity: 0.82;
  filter: drop-shadow(0 12px 14px rgb(35 84 50 / 12%));
}

.title-ornament::before,
.title-ornament::after {
  position: absolute;
  content: "";
  border-radius: 80% 0 80% 0;
  background: linear-gradient(135deg, #2f7e56, #8eb95e);
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
    min-height: 70svh;
    padding-top: 0;
  }

  h1 {
    margin: 18px 0 162px;
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
    top: 54px;
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
