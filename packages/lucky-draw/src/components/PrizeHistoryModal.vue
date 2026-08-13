<script setup lang="ts">
import { CheckCircle2, Gift, LoaderCircle, X } from 'lucide-vue-next'
import type { DrawRecord, PrizeClaimStatus } from '../composables/drawState'

defineProps<{
  prizes: DrawRecord[]
  claimingId?: string
}>()

defineEmits<{
  close: []
  claim: [prize: DrawRecord]
}>()

const statusLabel: Record<PrizeClaimStatus, string> = {
  UNCLAIMED: '待领取',
  CLAIMED: '待核销',
  REDEEMED: '已核销',
}

const formatTime = (value: string) =>
  new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(value))
</script>

<template>
  <div class="modal-backdrop history-backdrop" role="presentation" @click.self="$emit('close')">
    <section class="modal history-modal" role="dialog" aria-modal="true" aria-labelledby="history-title">
      <button class="icon-button close-button" type="button" aria-label="关闭" @click="$emit('close')">
        <X :size="18" />
      </button>
      <header>
        <p class="modal-kicker"><Gift :size="15" />我的奖品</p>
        <h2 id="history-title">领取与核销状态</h2>
      </header>

      <div v-if="prizes.length" class="prize-list">
        <article v-for="prize in prizes" :key="prize.id" class="prize-row">
          <div class="prize-copy">
            <strong>{{ prize.prizeDisplayName }}</strong>
            <time :datetime="prize.createdAt">{{ formatTime(prize.createdAt) }}</time>
          </div>
          <span class="status-chip" :class="prize.claimStatus.toLowerCase()">
            <CheckCircle2 :size="14" />{{ statusLabel[prize.claimStatus] }}
          </span>
          <button
            v-if="prize.claimStatus === 'UNCLAIMED'"
            class="primary-action small claim-button"
            type="button"
            :disabled="claimingId === prize.id"
            @click="$emit('claim', prize)"
          >
            <LoaderCircle v-if="claimingId === prize.id" class="spin" :size="15" />
            <span>{{ claimingId === prize.id ? '领取中' : '领取' }}</span>
          </button>
        </article>
      </div>
      <p v-else class="empty-state">还没有中奖记录。</p>
    </section>
  </div>
</template>

<style scoped>
.history-backdrop { z-index: 23; }
.history-modal { width: min(100%, 560px); }
.close-button { position: absolute; top: 14px; right: 14px; }
.modal-kicker { width: fit-content; margin: 0 0 10px; display: flex; align-items: center; gap: 6px; color: var(--accent); font-size: 13px; font-weight: 900; }
h2 { margin: 0; padding-right: 36px; font-size: 26px; }
.prize-list { max-height: min(56vh, 460px); margin-top: 22px; overflow-y: auto; border-top: 1px solid var(--line-strong); }
.prize-row { display: grid; grid-template-columns: minmax(0, 1fr) auto auto; align-items: center; gap: 12px; border-bottom: 1px solid var(--line); padding: 14px 0; }
.prize-copy { display: grid; gap: 5px; min-width: 0; }
.prize-copy strong { overflow-wrap: anywhere; font-size: 16px; }
.prize-copy time { color: var(--muted); font-size: 12px; }
.status-chip { display: inline-flex; align-items: center; gap: 5px; border: 1px solid var(--line-strong); padding: 6px 8px; font-size: 12px; font-weight: 900; white-space: nowrap; }
.status-chip.claimed,
.status-chip.redeemed { color: var(--accent); background: var(--accent-soft); }
.claim-button { min-height: 34px; padding-inline: 12px; font-size: 13px; }
.empty-state { margin: 28px 0 4px; color: var(--muted); text-align: center; }
.spin { animation: spin 0.9s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

@media (max-width: 520px) {
  .history-modal { padding: 24px 18px; }
  .prize-row { grid-template-columns: minmax(0, 1fr) auto; }
  .claim-button { grid-column: 1 / -1; width: 100%; }
}
</style>
