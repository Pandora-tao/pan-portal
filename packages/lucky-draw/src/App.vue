<script setup lang="ts">
import { computed, ref } from 'vue'
import { Home, RefreshCcw } from 'lucide-vue-next'
import AdvancedChallengeModal, { type AdvancedAnswerResult } from './components/AdvancedChallengeModal.vue'
import CorrectAnswerAnimation from './components/CorrectAnswerAnimation.vue'
import DrawStage from './components/DrawStage.vue'
import HeroSection from './components/HeroSection.vue'
import PrizeModal from './components/PrizeModal.vue'
import QuizModal from './components/QuizModal.vue'
import WrongAnswerAnimation from './components/WrongAnswerAnimation.vue'
import { advancedQuizzes, basicQuizzes, title, type Quiz } from './data/activity'
import { useLuckyDraw } from './composables/useLuckyDraw'
import { usePrizeCelebration } from './composables/usePrizeCelebration'
import { normalizeAnswer } from './utils/answer'

interface QuizResult {
  ok: boolean
  message?: string
}

const {
  state: drawState,
  canDraw,
  drawPrize,
  claimBonusChance,
  recordBasicFailure,
  recordAdvancedAnswer,
  resetDrawState,
} = useLuckyDraw()
const { launchPrizeCelebration } = usePrizeCelebration()

const showBasicQuiz = ref(false)
const currentBasicQuiz = ref<Quiz | null>(null)
const showAdvancedChallenge = ref(false)
const currentAdvancedQuiz = ref<Quiz | null>(null)
const advancedAnswerResult = ref<AdvancedAnswerResult | null>(null)
const isDrawing = ref(false)
const openedPrize = ref('')
const showCorrectAnswer = ref(false)
const showWrongAnswer = ref(false)
const shouldAskNextBasicAfterPenalty = ref(false)
const showFriendshipMessage = ref(false)
const portalHref = import.meta.env.VITE_PORTAL_ROUTE ?? '/'
const isDevResetEnabled = import.meta.env.DEV

const availableBasicQuizzes = computed(() =>
  basicQuizzes.filter((quiz) => !drawState.value.basicFailedQuestionIds.includes(quiz.id)),
)

const availableAdvancedQuizzes = computed(() =>
  advancedQuizzes.filter((quiz) => !drawState.value.advancedAnsweredQuestionIds.includes(quiz.id)),
)

const hasAvailableAdvancedQuestions = computed(() => availableAdvancedQuizzes.value.length > 0)

const primaryActionLabel = computed(() => {
  if (drawState.value.friendshipSunk) {
    return '友谊的小船已翻'
  }

  if (canDraw.value) {
    return '开始抽奖'
  }

  return hasAvailableAdvancedQuestions.value ? '进阶挑战' : '今日机会已用完'
})

const chooseRandomQuiz = (quizzes: Quiz[]) => quizzes[Math.floor(Math.random() * quizzes.length)] ?? null

const closeBasicQuiz = () => {
  showBasicQuiz.value = false
}

const openRandomBasicQuiz = () => {
  const available = availableBasicQuizzes.value

  if (!available.length || drawState.value.friendshipSunk) {
    showFriendshipMessage.value = true
    return
  }

  currentBasicQuiz.value = chooseRandomQuiz(available)
  showBasicQuiz.value = true
}

const setNextAdvancedQuestion = () => {
  advancedAnswerResult.value = null
  currentAdvancedQuiz.value = chooseRandomQuiz(availableAdvancedQuizzes.value)
}

const openAdvancedChallenge = () => {
  showAdvancedChallenge.value = true
  setNextAdvancedQuestion()
}

const closeAdvancedChallenge = () => {
  showAdvancedChallenge.value = false
  advancedAnswerResult.value = null
}

const startEntry = () => {
  if (drawState.value.friendshipSunk) {
    showFriendshipMessage.value = true
    return
  }

  if (canDraw.value) {
    openRandomBasicQuiz()
    return
  }

  if (hasAvailableAdvancedQuestions.value) {
    openAdvancedChallenge()
  }
}

const submitBasicQuiz = (answer: string, done?: (result: QuizResult) => void) => {
  const finish = (result: QuizResult) => {
    done?.(result)
    return result
  }

  const quiz = currentBasicQuiz.value

  if (!quiz) {
    return finish({ ok: false, message: '题目加载失败，请重新开始。' })
  }

  if (normalizeAnswer(answer) !== normalizeAnswer(quiz.answer)) {
    const friendshipSunk = recordBasicFailure(quiz.id)
    shouldAskNextBasicAfterPenalty.value = !friendshipSunk
    closeBasicQuiz()
    isDrawing.value = false
    showWrongAnswer.value = true
    return finish({ ok: true })
  }

  closeBasicQuiz()
  showCorrectAnswer.value = true
  return finish({ ok: true })
}

const submitAdvancedAnswer = (answer: string) => {
  const quiz = currentAdvancedQuiz.value

  if (!quiz || advancedAnswerResult.value) {
    return
  }

  const correct = normalizeAnswer(answer) === normalizeAnswer(quiz.answer)
  recordAdvancedAnswer(quiz.id, correct)

  advancedAnswerResult.value = {
    correct,
    selected: answer,
    gainedChance: correct ? claimBonusChance() : false,
  }
}

const openZongzi = () => {
  if (!isDrawing.value || openedPrize.value) {
    return
  }

  const prize = drawPrize()
  if (!prize) {
    isDrawing.value = false
    return
  }

  openedPrize.value = prize
  launchPrizeCelebration()
}

const finishPrize = () => {
  openedPrize.value = ''
  isDrawing.value = false
}

const claimMoreChance = () => {
  openedPrize.value = ''
  isDrawing.value = false
  openAdvancedChallenge()
}

const finishCorrectAnswer = () => {
  showCorrectAnswer.value = false
  isDrawing.value = true
}

const returnHomeAfterWrongAnswer = () => {
  showWrongAnswer.value = false
  isDrawing.value = false
  openedPrize.value = ''

  if (shouldAskNextBasicAfterPenalty.value) {
    shouldAskNextBasicAfterPenalty.value = false
    openRandomBasicQuiz()
    return
  }

  showFriendshipMessage.value = drawState.value.friendshipSunk
}

const resetDevState = () => {
  if (!isDevResetEnabled) {
    return
  }

  const confirmed = window.confirm('重置开发测试状态？会清空抽奖次数、答错记录和友谊翻船状态。')

  if (!confirmed) {
    return
  }

  resetDrawState()
  showBasicQuiz.value = false
  currentBasicQuiz.value = null
  showAdvancedChallenge.value = false
  currentAdvancedQuiz.value = null
  advancedAnswerResult.value = null
  isDrawing.value = false
  openedPrize.value = ''
  showCorrectAnswer.value = false
  showWrongAnswer.value = false
  shouldAskNextBasicAfterPenalty.value = false
  showFriendshipMessage.value = false
}
</script>

<template>
  <main class="festival-page" :class="{ 'is-drawing': isDrawing }">
    <a class="portal-link" :href="portalHref" aria-label="返回门户">
      <Home :size="17" />
    </a>

    <button
      v-if="isDevResetEnabled"
      class="dev-reset-button"
      type="button"
      title="重置开发测试状态"
      aria-label="重置开发测试状态"
      @click="resetDevState"
    >
      <RefreshCcw :size="16" />
      <span>重置</span>
    </button>

    <HeroSection
      v-if="!isDrawing"
      :title="title"
      :action-label="primaryActionLabel"
      :action-disabled="drawState.friendshipSunk || (!canDraw && !hasAvailableAdvancedQuestions)"
      :chances="drawState.chances"
      :basic-failed-count="drawState.basicFailedQuestionIds.length"
      :basic-total-count="basicQuizzes.length"
      :advanced-answered-count="drawState.advancedAnsweredQuestionIds.length"
      :advanced-total-count="advancedQuizzes.length"
      @start="startEntry"
    />

    <DrawStage v-if="isDrawing" :disabled="Boolean(openedPrize)" @open="openZongzi" />

    <QuizModal
      v-if="showBasicQuiz && currentBasicQuiz"
      :quiz="currentBasicQuiz"
      @close="closeBasicQuiz"
      @submit="submitBasicQuiz"
    />

    <AdvancedChallengeModal
      v-if="showAdvancedChallenge"
      :quiz="currentAdvancedQuiz"
      :result="advancedAnswerResult"
      :answered-count="drawState.advancedAnsweredQuestionIds.length"
      :total-count="advancedQuizzes.length"
      :can-next="hasAvailableAdvancedQuestions"
      @answer="submitAdvancedAnswer"
      @next="setNextAdvancedQuestion"
      @close="closeAdvancedChallenge"
    />

    <PrizeModal
      v-if="openedPrize"
      :prize="openedPrize"
      :can-claim-more="hasAvailableAdvancedQuestions && !drawState.friendshipSunk"
      @close="finishPrize"
      @claim-more="claimMoreChance"
    />

    <div v-if="showFriendshipMessage" class="modal-backdrop friendship-backdrop" role="presentation">
      <section class="modal friendship-modal" role="status" aria-live="polite">
        <p class="modal-kicker">答题结束</p>
        <h2>友谊的小船已经翻了</h2>
        <p>基础问题已经全部答错，本次不再拥有抽奖机会。</p>
        <button class="primary-action small" type="button" @click="showFriendshipMessage = false">知道了</button>
      </section>
    </div>

    <CorrectAnswerAnimation v-if="showCorrectAnswer" @done="finishCorrectAnswer" />
    <WrongAnswerAnimation v-if="showWrongAnswer" @done="returnHomeAfterWrongAnswer" />
  </main>
</template>

<style scoped>
.festival-page {
  position: relative;
  min-height: 100vh;
  overflow: hidden;
  display: grid;
  align-content: center;
  gap: 24px;
  padding: 32px 20px;
  color: var(--ink);
  background:
    linear-gradient(90deg, rgb(17 24 39 / 5%) 1px, transparent 1px),
    linear-gradient(180deg, rgb(17 24 39 / 5%) 1px, transparent 1px),
    var(--page);
  background-size: 32px 32px;
}

.festival-page::before {
  position: absolute;
  inset: 0;
  content: "";
  pointer-events: none;
  border: 12px solid var(--surface);
}

.portal-link {
  position: fixed;
  z-index: 12;
  top: calc(18px + env(safe-area-inset-top));
  left: calc(18px + env(safe-area-inset-left));
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border: 1px solid var(--line-strong);
  color: var(--ink);
  background: var(--surface);
  text-decoration: none;
  transition:
    transform 0.2s ease,
    background 0.2s ease,
    color 0.2s ease;
}

.portal-link:hover {
  color: var(--accent);
  background: var(--accent-soft);
  transform: translateY(-2px);
}

.dev-reset-button {
  position: fixed;
  z-index: 24;
  right: calc(14px + env(safe-area-inset-right));
  bottom: calc(14px + env(safe-area-inset-bottom));
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  min-width: 74px;
  min-height: 44px;
  border: 1px solid var(--line-strong);
  color: var(--ink);
  background: var(--surface);
  cursor: pointer;
  font-size: 14px;
  font-weight: 800;
  transition:
    transform 0.2s ease,
    background 0.2s ease,
    color 0.2s ease;
}

.dev-reset-button:hover {
  color: var(--accent);
  background: var(--accent-soft);
  transform: translateY(-2px);
}

.dev-reset-button:active {
  transform: translateY(0);
}

.friendship-backdrop {
  z-index: 22;
}

.friendship-modal {
  display: grid;
  justify-items: center;
  gap: 14px;
  text-align: center;
}

.friendship-modal h2,
.friendship-modal p {
  margin: 0;
}

.friendship-modal h2 {
  color: var(--ink);
  font-size: 26px;
}

.friendship-modal p:not(.modal-kicker) {
  color: var(--muted);
  line-height: 1.7;
}

.modal-kicker {
  color: var(--accent);
  font-size: 13px;
  font-weight: 800;
}

@media (max-width: 760px) {
  .festival-page {
    height: 100svh;
    min-height: 100svh;
    align-content: center;
    padding: 74px 16px 18px;
  }

  .festival-page.is-drawing {
    padding: 74px 16px 16px;
  }

  .portal-link {
    top: calc(12px + env(safe-area-inset-top));
    left: calc(12px + env(safe-area-inset-left));
    width: 36px;
    height: 36px;
  }

  .dev-reset-button {
    right: calc(12px + env(safe-area-inset-right));
    bottom: calc(12px + env(safe-area-inset-bottom));
    min-width: 68px;
    min-height: 42px;
    font-size: 13px;
  }
}
</style>
