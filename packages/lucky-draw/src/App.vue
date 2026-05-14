<script setup lang="ts">
import { computed, ref } from 'vue'
import { Home } from 'lucide-vue-next'
import AdvancedChallengeModal, { type AdvancedAnswerResult } from './components/AdvancedChallengeModal.vue'
import CorrectAnswerAnimation from './components/CorrectAnswerAnimation.vue'
import DrawStage from './components/DrawStage.vue'
import FestivalBackground from './components/FestivalBackground.vue'
import FestivalInteractions from './components/FestivalInteractions.vue'
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
</script>

<template>
  <main class="festival-page" :class="{ 'is-drawing': isDrawing }">
    <FestivalBackground />

    <a class="portal-link" :href="portalHref" aria-label="返回门户">
      <Home :size="17" />
      <span>返回门户</span>
    </a>

    <HeroSection
      v-if="!isDrawing"
      :title="title"
      :action-label="primaryActionLabel"
      :action-disabled="drawState.friendshipSunk || (!canDraw && !hasAvailableAdvancedQuestions)"
      @start="startEntry"
    />

    <FestivalInteractions v-if="!isDrawing" />

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
      :score="drawState.advancedScore"
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
  padding: 32px;
  background:
    linear-gradient(180deg, rgb(232 220 199 / 48%), rgb(212 184 149 / 22%)),
    url("./assets/duanwu-riverbank.png") center / cover,
    linear-gradient(145deg, var(--duanwu-sand) 0%, var(--duanwu-oat) 100%);
}

.festival-page::before {
  position: absolute;
  inset: 0;
  content: "";
  pointer-events: none;
  opacity: 0.22;
  background-image:
    radial-gradient(circle, rgb(48 54 34 / 18%) 0 1px, transparent 1px),
    radial-gradient(circle, rgb(247 239 216 / 34%) 0 1px, transparent 1px);
  background-position:
    0 0,
    8px 10px;
  background-size:
    18px 18px,
    22px 22px;
  mix-blend-mode: multiply;
}

.portal-link {
  position: fixed;
  z-index: 12;
  top: calc(18px + env(safe-area-inset-top));
  left: calc(18px + env(safe-area-inset-left));
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  min-height: 38px;
  padding: 0 13px;
  border: 1px solid rgb(96 108 56 / 28%);
  border-radius: 22px;
  color: var(--duanwu-moss);
  background: rgb(232 220 199 / 86%);
  box-shadow:
    inset 0 1px 0 rgb(247 239 216 / 54%),
    0 14px 34px rgb(48 54 34 / 16%);
  font-size: 14px;
  font-weight: 900;
  text-decoration: none;
  backdrop-filter: blur(12px);
  transition:
    transform 0.2s ease,
    box-shadow 0.2s ease,
    background 0.2s ease;
}

.portal-link:hover {
  background: rgb(247 239 216 / 92%);
  box-shadow:
    inset 0 1px 0 rgb(247 239 216 / 64%),
    0 18px 40px rgb(48 54 34 / 20%);
  transform: translateY(-2px);
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
  color: var(--duanwu-moss);
  font-size: 26px;
}

.friendship-modal p:not(.modal-kicker) {
  color: rgb(48 54 34 / 72%);
  line-height: 1.7;
}

.modal-kicker {
  color: var(--duanwu-terracotta);
  font-size: 13px;
  font-weight: 800;
}

@media (max-width: 760px) {
  .festival-page {
    height: 100svh;
    min-height: 100svh;
    align-content: center;
    padding: 88px 18px 22px;
  }

  .festival-page.is-drawing {
    padding: 74px 16px 16px;
  }

  .portal-link {
    top: calc(12px + env(safe-area-inset-top));
    left: calc(12px + env(safe-area-inset-left));
    min-height: 34px;
    padding-inline: 11px;
    font-size: 12px;
  }
}
</style>
