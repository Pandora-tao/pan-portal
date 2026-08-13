<script setup lang="ts">
import { computed } from 'vue'
import { CircleHelp, Gift, Ticket } from 'lucide-vue-next'

const props = defineProps<{
  title: string
  actionLabel: string
  actionDisabled?: boolean
  chances: number
  basicFailedCount: number
  basicTotalCount: number
  advancedAnsweredCount: number
  advancedTotalCount: number
}>()

defineEmits<{
  start: []
}>()

const basicProgress = computed(() => `${props.basicFailedCount}/${props.basicTotalCount}`)
const advancedProgress = computed(() => `${props.advancedAnsweredCount}/${props.advancedTotalCount}`)
</script>

<template>
  <section class="hero" aria-label="问答抽奖首页">
    <div class="hero-copy">
      <p class="party-label">朋友局 01</p>
      <h1>{{ title }}</h1>
      <p class="hero-lead">答对基础题，选一个奖品格开奖。</p>
    </div>

    <div class="status-board" aria-label="当前状态">
      <article class="status-card is-primary">
        <span class="status-index">01</span>
        <Ticket :size="18" />
        <span>机会</span>
        <strong>{{ chances }}</strong>
      </article>
      <article class="status-card">
        <span class="status-index">02</span>
        <CircleHelp :size="18" />
        <span>基础题</span>
        <strong>{{ basicProgress }}</strong>
      </article>
      <article class="status-card">
        <span class="status-index">03</span>
        <Gift :size="18" />
        <span>加试题</span>
        <strong>{{ advancedProgress }}</strong>
      </article>
    </div>

    <button class="primary-action hero-action" type="button" :disabled="actionDisabled" @click="$emit('start')">
      <Gift :size="19" />
      <span>{{ actionLabel }}</span>
    </button>
  </section>
</template>

<style scoped>
.hero {
  position: relative;
  z-index: 2;
  width: min(100%, 900px);
  margin: 0 auto;
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(260px, 0.72fr);
  gap: 26px;
  border: 1px solid var(--line-strong);
  padding: clamp(28px, 5vw, 48px);
  background: var(--surface);
  box-shadow: 16px 16px 0 rgb(0 47 167 / 10%);
}

.hero::before {
  position: absolute;
  top: 18px;
  right: 18px;
  width: 78px;
  height: 78px;
  content: "";
  border-top: 1px solid var(--accent);
  border-right: 1px solid var(--accent);
}

.hero-copy,
.status-board,
.hero-action {
  position: relative;
  z-index: 1;
}

.party-label {
  width: fit-content;
  margin: 0 0 16px;
  border: 1px solid var(--line-strong);
  padding: 6px 9px;
  color: var(--accent);
  background: var(--accent-soft);
  font-size: 12px;
  font-weight: 900;
  letter-spacing: 0;
}

h1 {
  max-width: 560px;
  margin: 0;
  color: var(--ink);
  font-size: clamp(44px, 8vw, 84px);
  font-weight: 900;
  line-height: 0.98;
  letter-spacing: 0;
}

.hero-lead {
  max-width: 360px;
  margin: 18px 0 0;
  color: var(--muted);
  font-size: 17px;
  font-weight: 700;
  line-height: 1.55;
}

.status-board {
  display: grid;
  gap: 10px;
}

.status-card {
  display: grid;
  grid-template-columns: auto auto 1fr auto;
  align-items: center;
  gap: 10px;
  min-height: 74px;
  border: 1px solid var(--line-strong);
  padding: 14px;
  color: var(--ink);
  background: var(--surface);
}

.status-card.is-primary {
  color: var(--surface);
  background: var(--accent);
}

.status-index {
  color: currentColor;
  font-size: 12px;
  font-weight: 900;
  opacity: 0.68;
}

.status-card span:not(.status-index) {
  color: currentColor;
  font-size: 14px;
  font-weight: 800;
}

.status-card strong {
  color: currentColor;
  font-size: 30px;
  font-weight: 900;
  line-height: 1;
}

.hero-action {
  grid-column: 1 / -1;
  width: fit-content;
  min-width: 196px;
  min-height: 56px;
  font-size: 18px;
}

@media (max-width: 760px) {
  .hero {
    grid-template-columns: 1fr;
    gap: 20px;
    width: min(100%, 430px);
    min-height: calc(100svh - 96px);
    align-content: center;
    padding: 28px 18px 22px;
    box-shadow: 8px 8px 0 rgb(0 47 167 / 10%);
  }

  .hero::before {
    width: 52px;
    height: 52px;
  }

  .party-label {
    margin-bottom: 12px;
  }

  h1 {
    font-size: clamp(42px, 14vw, 62px);
  }

  .hero-lead {
    margin-top: 12px;
    font-size: 15px;
  }

  .status-card {
    min-height: 62px;
    padding: 12px;
  }

  .status-card strong {
    font-size: 26px;
  }

  .hero-action {
    width: 100%;
  }
}

@media (max-width: 760px) and (max-height: 680px) {
  .hero {
    gap: 14px;
    padding-block: 22px 18px;
  }

  h1 {
    font-size: clamp(36px, 12vw, 52px);
  }

  .hero-lead {
    line-height: 1.4;
  }

  .status-card {
    min-height: 54px;
  }
}
</style>
