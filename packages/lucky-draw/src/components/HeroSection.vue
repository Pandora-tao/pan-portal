<script setup lang="ts">
import { computed } from 'vue'
import { CircleHelp, Gift, ScrollText, Sparkles, Ticket } from 'lucide-vue-next'

const props = defineProps<{
  title: string
  actionLabel: string
  actionDisabled?: boolean
  chances: number
  basicFailedCount: number
  basicTotalCount: number
  advancedAnsweredCount: number
  advancedTotalCount: number
  advancedScore: number
}>()

defineEmits<{
  start: []
}>()

const basicProgress = computed(() => `${props.basicFailedCount}/${props.basicTotalCount}`)
const advancedProgress = computed(() => `${props.advancedAnsweredCount}/${props.advancedTotalCount}`)
</script>

<template>
  <section class="hero" aria-label="端午游园抽奖首页">
    <div class="hero-copy">
      <p class="festival-label">
        <Sparkles :size="16" />
        <span>端午游园会</span>
      </p>
      <h1>{{ title }}</h1>
      <p class="hero-lead">先答入场题，再挑一个粽子开奖。答错会触发小惩罚，进阶挑战可以争取额外机会。</p>
    </div>

    <div class="ticket-board" aria-label="当前活动状态">
      <article class="status-ticket is-primary">
        <span class="ticket-icon"><Ticket :size="18" /></span>
        <span class="ticket-label">抽奖机会</span>
        <strong>{{ chances }}</strong>
      </article>
      <article class="status-ticket">
        <span class="ticket-icon"><CircleHelp :size="18" /></span>
        <span class="ticket-label">基础题失败</span>
        <strong>{{ basicProgress }}</strong>
      </article>
      <article class="status-ticket">
        <span class="ticket-icon"><ScrollText :size="18" /></span>
        <span class="ticket-label">进阶挑战</span>
        <strong>{{ advancedProgress }}</strong>
      </article>
      <article class="status-ticket">
        <span class="ticket-icon"><Gift :size="18" /></span>
        <span class="ticket-label">挑战得分</span>
        <strong>{{ advancedScore }}</strong>
      </article>
    </div>

    <div class="hero-actions">
      <button class="primary-action" type="button" :disabled="actionDisabled" @click="$emit('start')">
        <Gift :size="19" />
        <span>{{ actionLabel }}</span>
      </button>
      <p class="rule-note">基础题答对后进入粽子摊；进阶题答错不扣分。</p>
    </div>

    <span class="leaf-mark mark-one" aria-hidden="true"></span>
    <span class="leaf-mark mark-two" aria-hidden="true"></span>
  </section>
</template>

<style scoped>
.hero {
  position: relative;
  z-index: 2;
  width: min(100%, 920px);
  margin: 0 auto;
  display: grid;
  grid-template-columns: minmax(0, 1.05fr) minmax(280px, 0.95fr);
  align-items: center;
  gap: 28px;
  padding: clamp(28px, 5vw, 48px);
  border: 1px solid rgb(96 108 56 / 24%);
  border-radius: 28px;
  background:
    radial-gradient(circle at 8% 4%, rgb(232 220 199 / 66%), transparent 28%),
    radial-gradient(circle at 88% 90%, rgb(139 157 131 / 28%), transparent 36%),
    linear-gradient(135deg, rgb(232 220 199 / 90%), rgb(212 184 149 / 70%));
  box-shadow:
    inset 0 1px 0 rgb(232 220 199 / 62%),
    0 28px 78px rgb(48 54 34 / 19%);
  overflow: hidden;
}

.hero::before,
.hero::after {
  position: absolute;
  content: "";
  pointer-events: none;
}

.hero::before {
  inset: 16px;
  border: 1px dashed rgb(96 108 56 / 22%);
  border-radius: 22px;
}

.hero::after {
  right: -70px;
  bottom: -84px;
  width: 240px;
  height: 240px;
  border-radius: 52% 48% 44% 56%;
  background:
    repeating-linear-gradient(42deg, rgb(232 220 199 / 16%) 0 8px, transparent 8px 18px),
    linear-gradient(135deg, rgb(96 108 56 / 20%), rgb(139 157 131 / 18%));
  transform: rotate(-18deg);
}

.hero-copy,
.ticket-board,
.hero-actions {
  position: relative;
  z-index: 2;
}

.festival-label {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  width: fit-content;
  margin: 0 0 14px;
  border: 1px solid rgb(96 108 56 / 24%);
  border-radius: 999px;
  padding: 7px 12px;
  color: var(--duanwu-moss);
  background: rgb(232 220 199 / 74%);
  font-size: 13px;
  font-weight: 900;
}

h1 {
  max-width: 620px;
  margin: 0;
  color: var(--duanwu-moss);
  font-family: "Ma Shan Zheng", "STKaiti", "KaiTi", serif;
  font-size: clamp(48px, 9vw, 90px);
  font-weight: 400;
  line-height: 0.98;
  letter-spacing: 0;
  text-shadow:
    0 2px 0 rgb(232 220 199 / 74%),
    0 18px 36px rgb(48 54 34 / 18%);
}

.hero-lead {
  max-width: 460px;
  margin: 18px 0 0;
  color: rgb(48 54 34 / 74%);
  font-size: 16px;
  font-weight: 700;
  line-height: 1.8;
}

.ticket-board {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
  padding: 14px;
  border-radius: 24px;
  background:
    repeating-linear-gradient(-8deg, transparent 0 28px, rgb(96 108 56 / 8%) 28px 30px),
    rgb(232 220 199 / 48%);
  box-shadow: inset 0 0 0 1px rgb(96 108 56 / 16%);
}

.status-ticket {
  position: relative;
  display: grid;
  min-height: 118px;
  align-content: space-between;
  gap: 8px;
  border: 1px solid rgb(96 108 56 / 20%);
  border-radius: 18px;
  padding: 14px;
  color: var(--duanwu-ink);
  background:
    radial-gradient(circle at 18% 0%, rgb(232 220 199 / 82%), transparent 34%),
    linear-gradient(160deg, rgb(232 220 199 / 82%), rgb(139 157 131 / 20%));
  box-shadow:
    inset 0 1px 0 rgb(232 220 199 / 52%),
    0 12px 28px rgb(48 54 34 / 10%);
  overflow: hidden;
}

.status-ticket::before,
.status-ticket::after {
  position: absolute;
  top: 50%;
  width: 14px;
  height: 14px;
  content: "";
  border-radius: 999px;
  background: rgb(218 198 160 / 78%);
  transform: translateY(-50%);
}

.status-ticket::before {
  left: -8px;
}

.status-ticket::after {
  right: -8px;
}

.status-ticket.is-primary {
  color: var(--duanwu-sand);
  background:
    radial-gradient(circle at 18% 6%, rgb(232 220 199 / 24%), transparent 32%),
    linear-gradient(155deg, var(--duanwu-moss), var(--duanwu-leaf));
}

.ticket-icon {
  display: inline-grid;
  place-items: center;
  width: 34px;
  height: 34px;
  border-radius: 14px;
  color: var(--duanwu-moss);
  background: rgb(232 220 199 / 76%);
}

.is-primary .ticket-icon {
  color: var(--duanwu-terracotta);
}

.ticket-label {
  color: currentColor;
  font-size: 13px;
  font-weight: 900;
  opacity: 0.78;
}

.status-ticket strong {
  display: block;
  font-family: Fraunces, "Times New Roman", serif;
  font-size: clamp(28px, 5vw, 42px);
  font-weight: 700;
  line-height: 1;
}

.hero-actions {
  grid-column: 1 / -1;
  display: flex;
  align-items: center;
  gap: 16px;
  margin-top: -4px;
}

.primary-action {
  min-width: 196px;
  min-height: 56px;
  padding-inline: 30px;
  font-size: 18px;
}

.rule-note {
  max-width: 420px;
  margin: 0;
  color: rgb(48 54 34 / 66%);
  font-size: 14px;
  font-weight: 700;
  line-height: 1.65;
}

.leaf-mark {
  position: absolute;
  z-index: 1;
  width: 92px;
  height: 54px;
  opacity: 0.52;
  filter: drop-shadow(0 12px 14px rgb(48 54 34 / 12%));
}

.leaf-mark::before,
.leaf-mark::after {
  position: absolute;
  content: "";
  border-radius: 80% 0 80% 0;
  background: linear-gradient(135deg, var(--duanwu-moss), var(--duanwu-sage));
}

.leaf-mark::before {
  inset: 0 30px 13px 0;
}

.leaf-mark::after {
  inset: 18px 0 0 28px;
  opacity: 0.78;
}

.mark-one {
  left: 28px;
  bottom: 26px;
  transform: rotate(-19deg);
}

.mark-two {
  top: 30px;
  right: 34px;
  transform: scaleX(-1) rotate(-16deg);
}

@media (max-width: 760px) {
  .hero {
    grid-template-columns: 1fr;
    gap: 18px;
    width: min(100%, 430px);
    min-height: calc(100svh - 96px);
    align-content: center;
    padding: 28px 18px 22px;
    border-radius: 24px;
  }

  .hero::before {
    inset: 10px;
    border-radius: 18px;
  }

  .festival-label {
    margin-bottom: 10px;
  }

  h1 {
    font-size: clamp(38px, 13.5vw, 58px);
  }

  .hero-lead {
    margin-top: 12px;
    font-size: 14px;
    line-height: 1.65;
  }

  .ticket-board {
    gap: 9px;
    padding: 10px;
    border-radius: 20px;
  }

  .status-ticket {
    min-height: 96px;
    border-radius: 16px;
    padding: 11px;
  }

  .ticket-icon {
    width: 30px;
    height: 30px;
    border-radius: 12px;
  }

  .status-ticket strong {
    font-size: 30px;
  }

  .hero-actions {
    display: grid;
    gap: 10px;
    margin-top: 0;
  }

  .primary-action {
    width: 100%;
  }

  .rule-note {
    text-align: center;
    font-size: 13px;
  }

  .mark-one {
    left: 12px;
    bottom: 18px;
  }

  .mark-two {
    top: 12px;
    right: 14px;
  }
}

@media (max-width: 380px) {
  .hero {
    padding-inline: 14px;
  }

  .ticket-board {
    grid-template-columns: 1fr 1fr;
  }

  .status-ticket {
    min-height: 88px;
  }

  .hero-lead,
  .rule-note {
    font-size: 12px;
  }
}

@media (max-width: 760px) and (max-height: 680px) {
  .hero {
    gap: 12px;
    padding-block: 20px 16px;
  }

  .festival-label {
    margin-bottom: 6px;
  }

  h1 {
    font-size: clamp(34px, 11vw, 48px);
  }

  .hero-lead {
    margin-top: 8px;
    line-height: 1.45;
  }

  .ticket-board {
    gap: 7px;
    padding: 8px;
  }

  .status-ticket {
    min-height: 82px;
    padding: 9px;
  }

  .ticket-icon {
    width: 28px;
    height: 28px;
  }

  .status-ticket strong {
    font-size: 26px;
  }

  .rule-note {
    display: none;
  }
}
</style>
