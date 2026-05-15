<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { Gift } from 'lucide-vue-next'
import { gsap } from 'gsap'

defineProps<{
  prize: string
  canClaimMore?: boolean
}>()

defineEmits<{
  close: []
  'claim-more': []
}>()

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
      <strong class="prize-name">{{ prize }}</strong>
      <p class="prize-note">当前是测试版，奖品兑现等到正式版才生效。</p>
      <div class="modal-actions center">
        <button class="primary-action small" type="button" @click="$emit('close')">
          <Gift :size="17" />
          <span>收下奖品</span>
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
