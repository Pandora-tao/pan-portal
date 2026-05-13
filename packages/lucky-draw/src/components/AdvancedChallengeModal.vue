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
        <p class="modal-kicker">进阶挑战</p>
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
.challenge-modal {
  position: relative;
}

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
  margin-bottom: 12px;
  padding-right: 34px;
}

.modal-kicker {
  margin: 0;
  color: #b8402f;
  font-size: 13px;
  font-weight: 900;
}

.score-pill {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  min-height: 30px;
  border: 1px solid rgb(46 124 85 / 20%);
  border-radius: 999px;
  padding: 0 11px;
  color: #19563d;
  background: #edf6e8;
  font-size: 13px;
  font-weight: 900;
}

h2 {
  margin: 0 0 20px;
  color: #183027;
  font-size: 23px;
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

.choice-option:not(:disabled):hover {
  border-color: #2e7c55;
  box-shadow: 0 14px 30px rgb(35 84 50 / 14%);
  transform: translateY(-2px);
}

.choice-option:disabled {
  cursor: default;
}

.choice-option.correct {
  border-color: #2e7c55;
  background: linear-gradient(160deg, #f7f2d8, #dceecf);
}

.choice-option.wrong {
  border-color: #c15b43;
  background: linear-gradient(160deg, #fff5ea, #f8dfd2);
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

.choice-option.wrong .choice-label {
  background: #b8402f;
}

.choice-text {
  min-width: 0;
  font-size: 16px;
  font-weight: 800;
}

.answer-result {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 14px;
  border: 1px solid rgb(184 64 47 / 18%);
  border-radius: 8px;
  padding: 11px 12px;
  color: #934330;
  background: #fff3ea;
  font-size: 14px;
  font-weight: 800;
  line-height: 1.45;
}

.answer-result.correct {
  border-color: rgb(46 124 85 / 18%);
  color: #19563d;
  background: #eff8e8;
}

.challenge-complete {
  display: grid;
  justify-items: center;
  gap: 10px;
  padding: 20px 0 8px;
  color: #19563d;
  text-align: center;
}

.challenge-complete h2,
.challenge-complete p {
  margin: 0;
}

.challenge-complete p {
  color: #5b7165;
  line-height: 1.7;
}

.challenge-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-top: 22px;
  color: #6a7b70;
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
