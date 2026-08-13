<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { CheckCircle2, Gift, LoaderCircle } from 'lucide-vue-next'
import { gsap } from 'gsap'
import type { DrawRecord } from '../composables/drawState'

const props = defineProps<{
  prize: DrawRecord
  canClaimMore?: boolean
  claiming?: boolean
  claimError?: string
}>()

defineEmits<{
  close: []
  claim: []
  'claim-more': []
}>()

const statusLabel = () => {
  if (props.prize.claimStatus === 'REDEEMED') return '已核销'
  if (props.prize.claimStatus === 'CLAIMED') return '已领取，等待核销'
  return '待领取'
}

const modalRef = ref<HTMLElement | null>(null)

onMounted(() => {
  if (!modalRef.value) {
    return
  }

  gsap.fromTo(
    modalRef.value,
    { y: 18, scale: 0.96, opacity: 0 },
    { y: 0, scale: 1, opacity: 1, duration: 0.42, ease: 'back.out(1.7)' },
  )
})
</script>

<template>
  <div class="modal-backdrop prize-backdrop" role="presentation">
    <section ref="modalRef" class="modal prize-modal" role="dialog" aria-modal="true" aria-labelledby="prize-title">
      <p class="modal-kicker"><Gift :size="15" />开奖完成</p>
      <h2 id="prize-title">开奖结果</h2>
      <p class="result-label">你的奖品</p>
      <strong class="prize-name">{{ prize.prizeDisplayName }}</strong>
      <p class="claim-status" :class="prize.claimStatus.toLowerCase()">
        <CheckCircle2 :size="16" />{{ statusLabel() }}
      </p>
      <p class="prize-note">当前是测试版，奖品兑现等到正式版才生效。</p>
      <p v-if="claimError" class="claim-error" role="alert">{{ claimError }}</p>
      <div class="modal-actions center">
        <button
          v-if="prize.claimStatus === 'UNCLAIMED'"
          class="primary-action small"
          type="button"
          :disabled="claiming"
          @click="$emit('claim')"
        >
          <LoaderCircle v-if="claiming" class="spin" :size="17" />
          <Gift v-else :size="17" />
          <span>{{ claiming ? '领取中' : '确认领取' }}</span>
        </button>
        <button v-else class="primary-action small" type="button" @click="$emit('close')">
          <CheckCircle2 :size="17" />
          <span>关闭</span>
        </button>
        <button v-if="canClaimMore" class="secondary-action" type="button" @click="$emit('claim-more')">
          进阶挑战
        </button>
      </div>
    </section>
  </div>
</template>

<style scoped>
.prize-backdrop {
  background: rgb(17 24 39 / 48%);
}

.prize-modal {
  text-align: center;
  overflow: hidden;
}

.modal-kicker {
  margin: 0 auto 12px;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  border: 1px solid var(--line-strong);
  padding: 6px 10px;
  color: var(--accent);
  background: var(--accent-soft);
  font-size: 13px;
  font-weight: 900;
}

.prize-modal h2 {
  margin: 0;
  color: var(--ink);
  font-size: 26px;
  font-weight: 900;
  line-height: 1.35;
}

.result-label {
  margin: 18px 0 0;
  color: var(--muted);
  font-size: 14px;
  font-weight: 900;
}

.prize-name {
  position: relative;
  display: block;
  width: min(100%, 340px);
  margin: 10px auto 8px;
  border: 1px solid var(--line-strong);
  padding: 18px 16px;
  color: var(--accent);
  background: var(--accent-soft);
  font-size: clamp(28px, 9vw, 46px);
  font-weight: 900;
  line-height: 1.2;
}

.prize-note {
  max-width: 320px;
  margin: 14px auto 0;
  color: var(--muted);
  font-size: 14px;
  line-height: 1.7;
}

.claim-status {
  width: fit-content;
  margin: 12px auto 0;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  border: 1px solid var(--line-strong);
  padding: 7px 10px;
  color: var(--ink);
  background: var(--surface);
  font-size: 13px;
  font-weight: 900;
}

.claim-status.claimed,
.claim-status.redeemed {
  color: var(--accent);
  background: var(--accent-soft);
}

.claim-error {
  margin: 12px auto 0;
  color: #b42318;
  font-size: 13px;
  font-weight: 700;
}

.spin {
  animation: spin 0.9s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.modal-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  justify-content: center;
  margin-top: 24px;
  border-top: 1px solid var(--line);
  padding-top: 18px;
}

@media (max-width: 420px) {
  .modal-actions {
    display: grid;
  }
}
</style>
