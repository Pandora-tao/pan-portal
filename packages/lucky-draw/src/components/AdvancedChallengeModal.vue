<script setup lang="ts">
import { ArrowRight, CheckCircle2, LogOut, Trophy, X, XCircle } from 'lucide-vue-next'
import type { Quiz } from '../data/activity'

export interface AdvancedAnswerResult {
  correct: boolean
  selected: string
  gainedChance: boolean
}

const props = defineProps<{
  quiz: Quiz | null
  result: AdvancedAnswerResult | null
  score: number
  answeredCount: number
  totalCount: number
  canNext: boolean
}>()

const emit = defineEmits<{
  answer: [answer: string]
  next: []
  close: []
}>()

const optionClass = (label: string) => ({
  selected: props.result?.selected === label,
  correct: Boolean(props.result && label === props.quiz?.answer),
  wrong: Boolean(props.result && props.result.selected === label && !props.result.correct),
})
</script>

<template>
  <div class="modal-backdrop" role="presentation" @click.self="$emit('close')">
    <section class="modal challenge-modal" role="dialog" aria-modal="true" aria-label="进阶挑战">
      <button class="icon-button close-button" type="button" aria-label="关闭" @click="$emit('close')">
        <X :size="18" />
      </button>

      <header class="challenge-header">
        <p class="modal-kicker">游园加试</p>
        <div class="score-pill">
          <Trophy :size="15" />
          <span>{{ score }} 分</span>
        </div>
      </header>

      <template v-if="quiz">
        <h2>{{ quiz.question }}</h2>

        <div class="choice-grid" role="radiogroup" :aria-label="quiz.question">
          <button
            v-for="option in quiz.options"
            :key="option.label"
            class="choice-option"
            :class="optionClass(option.label)"
            type="button"
            role="radio"
            :aria-checked="result?.selected === option.label"
            :disabled="Boolean(result)"
            @click="$emit('answer', option.label)"
          >
            <span class="choice-label">{{ option.label }}</span>
            <span class="choice-text">{{ option.text }}</span>
          </button>
        </div>

        <div v-if="result" class="answer-result" :class="{ correct: result.correct }">
          <CheckCircle2 v-if="result.correct" :size="18" />
          <XCircle v-else :size="18" />
          <span v-if="result.correct">
            回答正确，+1 分<span v-if="result.gainedChance">，已获得 1 次额外抽奖机会</span>
          </span>
          <span v-else>回答错误，不扣分也没有惩罚</span>
        </div>
      </template>

      <template v-else>
        <div class="challenge-complete">
          <Trophy :size="34" />
          <h2>进阶挑战已完成</h2>
          <p>当前得分 {{ score }} 分，后面会派上用场。</p>
        </div>
      </template>

      <footer class="challenge-footer">
        <span>已答 {{ answeredCount }} / {{ totalCount }}</span>
        <div class="challenge-actions">
          <button class="secondary-action" type="button" @click="$emit('close')">
            <LogOut :size="16" />
            <span>退出挑战</span>
          </button>
          <button v-if="result && canNext" class="primary-action small" type="button" @click="$emit('next')">
            <ArrowRight :size="16" />
            <span>下一题</span>
          </button>
          <button v-else-if="result" class="primary-action small" type="button" @click="$emit('next')">完成</button>
        </div>
      </footer>
    </section>
  </div>
</template>

<style scoped>
.close-button {
  position: absolute;
  top: 14px;
  right: 14px;
}

.challenge-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 14px;
  padding-right: 34px;
}

.modal-kicker {
  width: fit-content;
  margin: 0;
  border: 1px solid rgb(198 107 61 / 20%);
  border-radius: 999px;
  padding: 6px 10px;
  color: var(--duanwu-terracotta);
  background: rgb(232 220 199 / 58%);
  font-size: 13px;
  font-weight: 900;
}

.score-pill {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  min-height: 32px;
  border: 1px solid rgb(96 108 56 / 22%);
  border-radius: 14px;
  padding: 0 11px;
  color: var(--duanwu-moss);
  background:
    repeating-linear-gradient(-8deg, transparent 0 16px, rgb(96 108 56 / 8%) 16px 18px),
    rgb(232 220 199 / 72%);
  font-size: 13px;
  font-weight: 900;
}

h2 {
  margin: 0 0 22px;
  color: var(--duanwu-ink);
  font-family: Fraunces, "Microsoft YaHei", serif;
  font-size: 25px;
  font-weight: 700;
  line-height: 1.35;
}

.choice-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.choice-option {
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

.choice-option:not(:disabled):hover {
  border-color: var(--duanwu-moss);
  box-shadow: 0 14px 30px rgb(48 54 34 / 14%);
  transform: translateY(-2px);
}

.choice-option:disabled {
  cursor: default;
}

.choice-option.correct {
  border-color: var(--duanwu-moss);
  background: linear-gradient(160deg, rgb(232 220 199 / 88%), rgb(139 157 131 / 34%));
}

.choice-option.wrong {
  border-color: var(--duanwu-terracotta);
  background: linear-gradient(160deg, rgb(232 220 199 / 88%), rgb(198 107 61 / 18%));
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

.choice-option.wrong .choice-label {
  background: var(--duanwu-terracotta);
}

.choice-text {
  min-width: 0;
  font-size: 16px;
  font-weight: 800;
  line-height: 1.35;
}

.answer-result {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 14px;
  border: 1px solid rgb(198 107 61 / 20%);
  border-radius: 16px;
  padding: 12px 13px;
  color: #7b412e;
  background: rgb(232 220 199 / 72%);
  font-size: 14px;
  font-weight: 800;
  line-height: 1.45;
}

.answer-result.correct {
  border-color: rgb(96 108 56 / 20%);
  color: var(--duanwu-moss);
  background: rgb(139 157 131 / 22%);
}

.challenge-complete {
  display: grid;
  justify-items: center;
  gap: 10px;
  padding: 22px 0 8px;
  color: var(--duanwu-moss);
  text-align: center;
}

.challenge-complete h2,
.challenge-complete p {
  margin: 0;
}

.challenge-complete p {
  color: rgb(48 54 34 / 72%);
  line-height: 1.7;
}

.challenge-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-top: 22px;
  border-top: 1px dashed rgb(96 108 56 / 24%);
  padding-top: 16px;
  color: rgb(48 54 34 / 68%);
  font-size: 13px;
  font-weight: 800;
}

.challenge-actions {
  display: flex;
  gap: 10px;
}

@media (max-width: 420px) {
  .choice-grid {
    grid-template-columns: 1fr;
  }

  .challenge-footer,
  .challenge-actions {
    display: grid;
    width: 100%;
  }
}
</style>
