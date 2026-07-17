<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { AlertCircle, Home, LoaderCircle, Trophy } from 'lucide-vue-next'
import AdvancedChallengeModal, { type AdvancedAnswerResult } from './components/AdvancedChallengeModal.vue'
import CorrectAnswerAnimation from './components/CorrectAnswerAnimation.vue'
import DrawStage from './components/DrawStage.vue'
import HeroSection from './components/HeroSection.vue'
import PrizeModal from './components/PrizeModal.vue'
import PrizeHistoryModal from './components/PrizeHistoryModal.vue'
import QuizModal from './components/QuizModal.vue'
import WrongAnswerAnimation from './components/WrongAnswerAnimation.vue'
import { advancedQuizzes, basicQuizzes, title, type Quiz } from './data/activity'
import { useLuckyDraw } from './composables/useLuckyDraw'
import type { DrawRecord } from './composables/drawState'
import { usePrizeCelebration } from './composables/usePrizeCelebration'
import { LuckyDrawHttpError } from './api/luckyDraw'

interface QuizResult {
  ok: boolean
  message?: string
}

const {
  state: drawState,
  canDraw,
  drawPrize,
  isLoading,
  initialize,
  recordBasicAnswer,
  recordAdvancedAnswer,
  claimPrize,
} = useLuckyDraw()
const { launchPrizeCelebration } = usePrizeCelebration()

const showBasicQuiz = ref(false)
const currentBasicQuiz = ref<Quiz | null>(null)
const showAdvancedChallenge = ref(false)
const currentAdvancedQuiz = ref<Quiz | null>(null)
const advancedAnswerResult = ref<AdvancedAnswerResult | null>(null)
const isDrawing = ref(false)
const isOpeningPrize = ref(false)
const openedPrize = ref<DrawRecord | null>(null)
const showCorrectAnswer = ref(false)
const showWrongAnswer = ref(false)
const shouldAskNextBasicAfterPenalty = ref(false)
const showFriendshipMessage = ref(false)
const showPrizeHistory = ref(false)
const claimingPrizeId = ref('')
const claimError = ref('')
const loadError = ref('')
const isAdvancedSubmitting = ref(false)
const portalHref = import.meta.env.VITE_PORTAL_ROUTE ?? '/'
const luckyDrawRoute = '/lucky-draw/'

const availableBasicQuizzes = computed(() =>
  basicQuizzes.filter((quiz) => !drawState.value.basicFailedQuestionIds.includes(quiz.id)),
)

const availableAdvancedQuizzes = computed(() =>
  advancedQuizzes.filter((quiz) => !drawState.value.advancedAnsweredQuestionIds.includes(quiz.id)),
)

const hasAvailableAdvancedQuestions = computed(() => availableAdvancedQuizzes.value.length > 0)

const primaryActionLabel = computed(() => {
  if (drawState.value.drawReady) {
    return '继续开奖'
  }
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

  if (drawState.value.drawReady) {
    isDrawing.value = true
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

const redirectToLogin = () => {
  const separator = portalHref.includes('?') ? '&' : '?'
  window.location.assign(`${portalHref}${separator}login=1&next=${encodeURIComponent(luckyDrawRoute)}`)
}

const handleApiError = (error: unknown, fallback: string) => {
  if (error instanceof LuckyDrawHttpError && error.status === 401) {
    redirectToLogin()
    return '请先登录'
  }
  return error instanceof Error ? error.message : fallback
}

const submitBasicQuiz = async (answer: string, done?: (result: QuizResult) => void) => {
  const finish = (result: QuizResult) => {
    done?.(result)
    return result
  }

  const quiz = currentBasicQuiz.value

  if (!quiz) {
    return finish({ ok: false, message: '题目加载失败，请重新开始。' })
  }

  try {
    const result = await recordBasicAnswer(quiz.id, answer)
    if (!result.correct) {
      shouldAskNextBasicAfterPenalty.value = !result.state.friendshipSunk
      closeBasicQuiz()
      isDrawing.value = false
      showWrongAnswer.value = true
      return finish({ ok: true })
    }

    closeBasicQuiz()
    showCorrectAnswer.value = true
    return finish({ ok: true })
  } catch (error) {
    return finish({ ok: false, message: handleApiError(error, '答案提交失败，请重试。') })
  }
}

const submitAdvancedAnswer = async (answer: string) => {
  const quiz = currentAdvancedQuiz.value

  if (!quiz || advancedAnswerResult.value) {
    return
  }

  isAdvancedSubmitting.value = true
  try {
    const result = await recordAdvancedAnswer(quiz.id, answer)
    advancedAnswerResult.value = {
      correct: result.correct,
      selected: answer,
      gainedChance: result.gainedChance,
    }
  } catch (error) {
    loadError.value = handleApiError(error, '答案提交失败，请重试。')
    closeAdvancedChallenge()
  } finally {
    isAdvancedSubmitting.value = false
  }
}

const openZongzi = async () => {
  if (!isDrawing.value || openedPrize.value) {
    return
  }
  isOpeningPrize.value = true
  try {
    const prize = await drawPrize()
    if (!prize) {
      isDrawing.value = false
      return
    }
    openedPrize.value = prize
    launchPrizeCelebration()
  } catch (error) {
    loadError.value = handleApiError(error, '开奖失败，请重试。')
    isDrawing.value = false
  } finally {
    isOpeningPrize.value = false
  }
}

const finishPrize = () => {
  openedPrize.value = null
  claimError.value = ''
  isDrawing.value = false
}

const claimMoreChance = () => {
  openedPrize.value = null
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
  openedPrize.value = null

  if (shouldAskNextBasicAfterPenalty.value) {
    shouldAskNextBasicAfterPenalty.value = false
    openRandomBasicQuiz()
    return
  }

  showFriendshipMessage.value = drawState.value.friendshipSunk
}

const claimDrawPrize = async (prize: DrawRecord) => {
  claimingPrizeId.value = prize.id
  claimError.value = ''
  try {
    const claimed = await claimPrize(prize.id)
    if (openedPrize.value?.id === claimed.id) {
      openedPrize.value = claimed
    }
  } catch (error) {
    claimError.value = handleApiError(error, '领取失败，请重试。')
  } finally {
    claimingPrizeId.value = ''
  }
}

const loadState = async () => {
  loadError.value = ''
  try {
    await initialize()
    isDrawing.value = drawState.value.drawReady
  } catch (error) {
    loadError.value = handleApiError(error, '活动状态加载失败，请重试。')
  }
}

onMounted(loadState)
</script>

<template>
  <main class="festival-page" :class="{ 'is-drawing': isDrawing }">
    <a class="portal-link" :href="portalHref" aria-label="返回门户">
      <Home :size="17" />
    </a>

    <button
      v-if="!isLoading && !loadError"
      class="prize-history-button"
      type="button"
      aria-label="查看我的奖品"
      @click="showPrizeHistory = true"
    >
      <Trophy :size="16" />
      <span>我的奖品</span>
    </button>

    <section v-if="isLoading" class="state-panel" role="status" aria-live="polite">
      <LoaderCircle class="spin" :size="28" />
      <h1>正在读取活动记录</h1>
      <p>答题、抽奖与奖品状态将从服务端同步。</p>
    </section>

    <section v-else-if="loadError" class="state-panel error-panel" role="alert">
      <AlertCircle :size="28" />
      <h1>暂时无法进入活动</h1>
      <p>{{ loadError }}</p>
      <button class="primary-action small" type="button" @click="loadState">重试</button>
    </section>

    <HeroSection
      v-if="!isLoading && !loadError && !isDrawing"
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

    <DrawStage
      v-if="!isLoading && !loadError && isDrawing"
      :disabled="Boolean(openedPrize) || isOpeningPrize"
      @open="openZongzi"
    />

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
      :submitting="isAdvancedSubmitting"
      @answer="submitAdvancedAnswer"
      @next="setNextAdvancedQuestion"
      @close="closeAdvancedChallenge"
    />

    <PrizeModal
      v-if="openedPrize"
      :prize="openedPrize"
      :claiming="claimingPrizeId === openedPrize.id"
      :claim-error="claimError"
      :can-claim-more="hasAvailableAdvancedQuestions && !drawState.friendshipSunk"
      @close="finishPrize"
      @claim="claimDrawPrize(openedPrize)"
      @claim-more="claimMoreChance"
    />

    <PrizeHistoryModal
      v-if="showPrizeHistory"
      :prizes="drawState.draws"
      :claiming-id="claimingPrizeId"
      @close="showPrizeHistory = false"
      @claim="claimDrawPrize"
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

.prize-history-button {
  position: fixed;
  z-index: 24;
  top: calc(18px + env(safe-area-inset-top));
  right: calc(18px + env(safe-area-inset-right));
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

.prize-history-button:hover {
  color: var(--accent);
  background: var(--accent-soft);
  transform: translateY(-2px);
}

.prize-history-button:active {
  transform: translateY(0);
}

.state-panel {
  position: relative;
  z-index: 2;
  width: min(100%, 520px);
  margin: 0 auto;
  display: grid;
  justify-items: start;
  gap: 12px;
  border: 1px solid var(--line-strong);
  padding: 30px;
  background: var(--surface);
  box-shadow: 12px 12px 0 rgb(0 47 167 / 10%);
}

.state-panel h1,
.state-panel p {
  margin: 0;
}

.state-panel h1 { font-size: 26px; }
.state-panel p { color: var(--muted); line-height: 1.7; }
.error-panel svg { color: #b42318; }
.spin { animation: spin 0.9s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

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

  .prize-history-button {
    top: calc(12px + env(safe-area-inset-top));
    right: calc(12px + env(safe-area-inset-right));
    min-width: 68px;
    min-height: 42px;
    font-size: 13px;
  }
}
</style>
