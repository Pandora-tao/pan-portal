<script setup lang="ts">
import { ArrowRight, CheckCircle2, LogOut, X, XCircle } from 'lucide-vue-next'
import type { Quiz } from '../data/activity'

export interface AdvancedAnswerResult {
  correct: boolean
  selected: string
  gainedChance: boolean
}

const props = defineProps<{
  quiz: Quiz | null
  result: AdvancedAnswerResult | null
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
        <p class="modal-kicker">加试题</p>
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
            回答正确<span v-if="result.gainedChance">，已获得额外抽奖机会</span>
          </span>
          <span v-else>回答错误，不扣分也没有惩罚</span>
        </div>
      </template>

      <template v-else>
        <div class="challenge-complete">
          <h2>进阶挑战已完成</h2>
          <p>可以回到抽奖入口了。</p>
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
  border: 1px solid var(--line-strong);
  padding: 6px 10px;
  color: var(--accent);
  background: var(--accent-soft);
  font-size: 13px;
  font-weight: 900;
}

h2 {
  margin: 0 0 22px;
  color: var(--ink);
  font-size: 25px;
  font-weight: 900;
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
  border: 1px solid var(--line-strong);
  padding: 11px 13px;
  color: var(--ink);
  background: var(--surface);
  cursor: pointer;
  text-align: left;
  transition:
    border-color 0.2s ease,
    box-shadow 0.2s ease,
    transform 0.2s ease,
    background 0.2s ease;
}

.choice-option:not(:disabled):hover {
  border-color: var(--accent);
  color: var(--accent);
  background: var(--accent-soft);
  transform: translateY(-2px);
}

.choice-option:disabled {
  cursor: default;
}

.choice-option.correct {
  border-color: var(--accent);
  color: var(--accent);
  background: var(--accent-soft);
}

.choice-option.wrong {
  color: var(--muted);
  background: var(--soft);
}

.choice-label {
  display: grid;
  flex: 0 0 auto;
  place-items: center;
  width: 28px;
  height: 28px;
  border: 1px solid currentColor;
  color: currentColor;
  background: transparent;
  font-weight: 900;
}

.choice-option.wrong .choice-label {
  color: var(--muted);
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
  border: 1px solid var(--line-strong);
  padding: 12px 13px;
  color: var(--ink);
  background: var(--surface);
  font-size: 14px;
  font-weight: 800;
  line-height: 1.45;
}

.answer-result.correct {
  border-color: var(--accent);
  color: var(--accent);
  background: var(--accent-soft);
}

.challenge-complete {
  display: grid;
  justify-items: center;
  gap: 10px;
  padding: 22px 0 8px;
  color: var(--ink);
  text-align: center;
}

.challenge-complete h2,
.challenge-complete p {
  margin: 0;
}

.challenge-complete p {
  color: var(--muted);
  line-height: 1.7;
}

.challenge-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-top: 22px;
  border-top: 1px solid var(--line);
  padding-top: 16px;
  color: var(--muted);
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
