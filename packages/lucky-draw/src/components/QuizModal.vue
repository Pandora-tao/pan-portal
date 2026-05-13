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
      <p class="modal-kicker">入场问题</p>
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
.modal {
  position: relative;
}

.close-button {
  position: absolute;
  top: 14px;
  right: 14px;
}

.modal-kicker {
  margin: 0 0 10px;
  color: #b8402f;
  font-size: 13px;
  font-weight: 800;
}

.modal h2 {
  margin: 0 0 22px;
  padding-right: 26px;
  color: #183027;
  font-size: 24px;
  line-height: 1.35;
}

.choice-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.choice-option {
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 52px;
  border: 1px solid rgb(46 124 85 / 20%);
  border-radius: 8px;
  padding: 10px 12px;
  color: #1a3f30;
  background:
    radial-gradient(circle at 20% 15%, rgb(255 255 255 / 84%), transparent 32%),
    linear-gradient(160deg, #f9fcf4, #edf6e8);
  box-shadow: 0 10px 24px rgb(35 84 50 / 8%);
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
  border-color: #2e7c55;
  background:
    radial-gradient(circle at 20% 15%, rgb(255 255 255 / 90%), transparent 32%),
    linear-gradient(160deg, #f7f2d8, #dceecf);
  box-shadow: 0 14px 30px rgb(35 84 50 / 14%);
  transform: translateY(-2px);
}

.choice-label {
  display: grid;
  flex: 0 0 auto;
  place-items: center;
  width: 28px;
  height: 28px;
  border-radius: 999px;
  color: #fffdf4;
  background: #2e7c55;
  font-weight: 900;
}

.choice-text {
  min-width: 0;
  font-size: 16px;
  font-weight: 800;
}

.form-error {
  margin: 12px 0 0;
  color: #b8402f;
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
