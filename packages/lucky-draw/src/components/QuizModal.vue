<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { X } from 'lucide-vue-next'
import type { Quiz } from '../data/activity'

interface SubmitResult {
  ok: boolean
  message?: string
}

const props = defineProps<{
  quiz: Quiz
}>()

const emit = defineEmits<{
  close: []
  submit: [answer: string, done: (result: SubmitResult) => void]
}>()

const answer = ref('')
const error = ref('')

const isChoiceQuiz = computed(() => Boolean(props.quiz.options.length))

watch(
  () => props.quiz.id,
  () => {
    answer.value = ''
    error.value = ''
  },
)

watch(answer, () => {
  error.value = ''
})

const selectOption = (value: string) => {
  answer.value = value

  if (isChoiceQuiz.value) {
    emit('submit', value, (result) => {
      if (result.ok === false) {
        error.value = result.message ?? '答案不对，再试一次。'
      }
    })
  }
}
</script>

<template>
  <div class="modal-backdrop" role="presentation" @click.self="$emit('close')">
    <form class="modal quiz-modal" @submit.prevent>
      <button class="icon-button close-button" type="button" aria-label="关闭" @click="$emit('close')">
        <X :size="18" />
      </button>
      <p class="modal-kicker">游园入场题</p>
      <h2>{{ quiz.question }}</h2>

      <div class="choice-grid" role="radiogroup" :aria-label="quiz.question">
        <button
          v-for="option in quiz.options"
          :key="option.label"
          class="choice-option"
          :class="{ selected: answer === option.label }"
          type="button"
          role="radio"
          :aria-checked="answer === option.label"
          @click="selectOption(option.label)"
        >
          <span class="choice-label">{{ option.label }}</span>
          <span class="choice-text">{{ option.text }}</span>
        </button>
      </div>

      <p v-if="error" class="form-error">{{ error }}</p>
    </form>
  </div>
</template>

<style scoped>
.close-button {
  position: absolute;
  top: 14px;
  right: 14px;
}

.modal-kicker {
  width: fit-content;
  margin: 0 0 12px;
  border: 1px solid rgb(198 107 61 / 20%);
  border-radius: 999px;
  padding: 6px 10px;
  color: var(--duanwu-terracotta);
  background: rgb(232 220 199 / 58%);
  font-size: 13px;
  font-weight: 900;
}

.modal h2 {
  margin: 0 0 24px;
  padding-right: 26px;
  color: var(--duanwu-ink);
  font-family: Fraunces, "Microsoft YaHei", serif;
  font-size: 26px;
  font-weight: 700;
  line-height: 1.35;
}

.choice-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.choice-option {
  position: relative;
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 58px;
  border: 1px solid rgb(96 108 56 / 22%);
  border-radius: 16px;
  padding: 11px 13px;
  color: var(--duanwu-ink);
  background:
    radial-gradient(circle at 20% 15%, rgb(232 220 199 / 80%), transparent 32%),
    linear-gradient(160deg, rgb(232 220 199 / 84%), rgb(139 157 131 / 24%));
  box-shadow:
    inset 0 1px 0 rgb(232 220 199 / 48%),
    0 10px 24px rgb(48 54 34 / 8%);
  cursor: pointer;
  text-align: left;
  transition:
    border-color 0.2s ease,
    box-shadow 0.2s ease,
    transform 0.2s ease,
    background 0.2s ease;
}

.choice-option:hover,
.choice-option.selected {
  border-color: var(--duanwu-moss);
  background:
    radial-gradient(circle at 20% 15%, rgb(232 220 199 / 90%), transparent 32%),
    linear-gradient(160deg, rgb(232 220 199 / 90%), rgb(192 142 58 / 20%));
  box-shadow: 0 14px 30px rgb(48 54 34 / 14%);
  transform: translateY(-2px);
}

.choice-label {
  display: grid;
  flex: 0 0 auto;
  place-items: center;
  width: 28px;
  height: 28px;
  border-radius: 11px;
  color: var(--duanwu-sand);
  background: linear-gradient(135deg, var(--duanwu-moss), var(--duanwu-leaf));
  font-weight: 900;
}

.choice-text {
  min-width: 0;
  font-size: 16px;
  font-weight: 800;
  line-height: 1.35;
}

.form-error {
  margin: 12px 0 0;
  color: var(--duanwu-terracotta);
  font-size: 14px;
}

@media (max-width: 420px) {
  .quiz-modal {
    padding: 24px 20px;
  }

  .choice-grid {
    grid-template-columns: 1fr;
  }
}
</style>
