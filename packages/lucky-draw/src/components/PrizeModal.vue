<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { Gift, Sparkles } from 'lucide-vue-next'
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
      <p class="modal-kicker"><Sparkles :size="15" />抽奖完成</p>
      <h2 id="prize-title">提示信息</h2>
      <p class="result-label">你抽到的奖品是</p>
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
  background:
    radial-gradient(circle at 50% 38%, rgb(192 142 58 / 24%), transparent 32%),
    rgb(48 54 34 / 58%);
}

.prize-modal {
  text-align: center;
}

.modal-kicker {
  margin: 0 0 10px;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: var(--duanwu-terracotta);
  font-size: 13px;
  font-weight: 800;
}

.prize-modal h2 {
  margin: 0;
  color: var(--duanwu-ink);
  font-size: 24px;
  line-height: 1.35;
}

.result-label {
  margin: 18px 0 0;
  color: rgb(48 54 34 / 68%);
  font-size: 14px;
  font-weight: 800;
}

.prize-name {
  display: block;
  margin: 8px auto 6px;
  color: var(--duanwu-terracotta);
  font-size: clamp(28px, 9vw, 44px);
  line-height: 1.2;
}

.prize-note {
  max-width: 320px;
  margin: 12px auto 0;
  color: rgb(48 54 34 / 68%);
  font-size: 14px;
  line-height: 1.7;
}

.modal-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  justify-content: center;
  margin-top: 24px;
}

@media (max-width: 420px) {
  .modal-actions {
    display: grid;
  }
}
</style>
