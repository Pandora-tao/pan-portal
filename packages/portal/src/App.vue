<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch, type ComponentPublicInstance } from 'vue'
import * as Matter from 'matter-js'
import { ArrowRight, BadgeCheck, Eye, EyeOff, LoaderCircle, LogOut, Sparkles, UserRound, X } from 'lucide-vue-next'
import avatarUrl from './assets/pan-avatar.png'
import { completePasswordReset, getCurrentUser, login, logout, register, submitRealName, type UserInfo } from './api/auth'
import {
  isFeatureUnlocked,
  isFeatureGuidePending,
  LUCKY_DRAW_FEATURE_KEY,
  useFeatureEntitlements,
} from './composables/useFeatureEntitlements'
import DraggableDecoration from './draggable-decorations/DraggableDecoration.vue'
import {
  createDecorationStyles,
  draggableDecorations,
  type DecorKey,
  type DraggableDecorationDefinition,
} from './draggable-decorations'

interface PortalApp {
  id: string
  name: string
  href: string
}

const luckyDrawRoute = import.meta.env.VITE_LUCKY_DRAW_ROUTE ?? '/lucky-draw/'
const chatRoute = import.meta.env.VITE_CHAT_ROUTE ?? '/chat/'
const profileRoute = import.meta.env.VITE_PROFILE_ROUTE ?? '/profile/'
const peopleRoute = import.meta.env.VITE_PEOPLE_ROUTE ?? '/people/'

const { entitlements, loadEntitlements, ackGuide } = useFeatureEntitlements()

const apps = computed<PortalApp[]>(() => [
  {
    id: 'people',
    name: '人物主页',
    href: peopleRoute,
  },
  ...(isFeatureUnlocked(entitlements.value, LUCKY_DRAW_FEATURE_KEY)
    ? [
        {
          id: 'lucky-draw',
          name: '陶攀问答局',
          href: luckyDrawRoute,
        },
      ]
    : []),
])

const activeDecoration = ref<DecorKey | ''>('')
const activeBubble = ref<DecorKey | ''>('')
const authMode = ref<'login' | 'register'>('login')
const isAuthOpen = ref(false)
const isAuthSubmitting = ref(false)
const isSessionLoading = ref(true)
const isGuideOpen = ref(false)
const pendingRoute = ref<string | null>(null)
const showPassword = ref(false)
const authError = ref('')
const currentUser = ref<UserInfo | null>(null)
const isIdentityOpen = ref(false)
const isIdentitySubmitting = ref(false)
const identityName = ref('')
const identityError = ref('')
const identityMessage = ref('')
const isResetOpen = ref(false)
const isResetSubmitting = ref(false)
const resetToken = ref('')
const resetError = ref('')
const resetSuccess = ref(false)
const resetForm = reactive({ password: '', confirmPassword: '' })
const authForm = reactive({
  displayName: '',
  realName: '',
  email: '',
  password: '',
  confirmPassword: '',
})
const portalShell = ref<HTMLElement | null>(null)
const decorLayer = ref<HTMLElement | null>(null)
const decorElementRefs = new Map<DecorKey, HTMLElement>()
const decorStyles = reactive(createDecorationStyles())

const decorBodies = new Map<DecorKey, Matter.Body>()
let decorationTimer: number | undefined
let engine: Matter.Engine | undefined
let runner: Matter.Runner | undefined
let resizeObserver: ResizeObserver | undefined
let rebuildTimer: number | undefined

const authTitle = computed(() => (authMode.value === 'login' ? '欢迎回来' : '创建账户'))
const authSubmitText = computed(() => (authMode.value === 'login' ? '登录' : '注册并登录'))
const identityStatusCopy = computed(() => {
  switch (currentUser.value?.realNameVerificationStatus) {
    case 'PENDING': return { label: '等待审核', copy: '真实姓名已经提交。超级管理员审核通过后，个人记忆和个人主页会自动启用。' }
    case 'APPROVED': return { label: '已通过', copy: '实名认证已通过，个人记忆和个人主页均已启用。' }
    case 'REJECTED': return { label: '未通过', copy: currentUser.value.realNameReviewReason || '本次申请未通过，请核对真实姓名后重新提交。' }
    default: return { label: '尚未提交', copy: '提交真实姓名后将进入超级管理员审核。审核通过前不会产生个人记忆，也不能维护个人主页。' }
  }
})

function openIdentity() {
  identityName.value = currentUser.value?.realName || ''
  identityError.value = ''
  identityMessage.value = ''
  isIdentityOpen.value = true
}

function closeIdentity() {
  if (isIdentitySubmitting.value) return
  isIdentityOpen.value = false
  const url = new URL(window.location.href)
  url.searchParams.delete('identity')
  window.history.replaceState(null, '', `${url.pathname}${url.search}${url.hash}`)
}

async function submitIdentity() {
  const name = identityName.value.trim()
  if (name.length < 2 || name.length > 80) {
    identityError.value = '真实姓名需要填写 2 至 80 个字符'
    return
  }
  isIdentitySubmitting.value = true
  identityError.value = ''
  try {
    currentUser.value = await submitRealName(name)
    identityMessage.value = '已提交审核。审核通过后会自动开放个人记忆和个人主页。'
  } catch (error) {
    identityError.value = error instanceof Error ? error.message : '提交失败，请稍后再试'
  } finally {
    isIdentitySubmitting.value = false
  }
}

function openAuth(mode: 'login' | 'register' = 'login', nextRoute: string | null = null) {
  authMode.value = mode
  pendingRoute.value = nextRoute
  authError.value = ''
  showPassword.value = false
  isAuthOpen.value = true
  nextTick(() => document.querySelector<HTMLInputElement>('#auth-email')?.focus())
}

function closeAuth() {
  if (!isAuthSubmitting.value) {
    isAuthOpen.value = false
    authError.value = ''
    pendingRoute.value = null
    clearAuthQuery()
  }
}

function switchAuthMode(mode: 'login' | 'register') {
  authMode.value = mode
  authError.value = ''
}

async function refreshEntitlements() {
  try {
    const list = await loadEntitlements()
    if (isFeatureGuidePending(list, LUCKY_DRAW_FEATURE_KEY)) {
      await nextTick()
      isGuideOpen.value = true
    }
  } catch {
    // 资格读取失败时保守隐藏入口，不阻断门户其余功能。
  }
}

function closeGuide() {
  isGuideOpen.value = false
}

function goToLuckyDraw() {
  window.location.assign(luckyDrawRoute)
}

watch(isGuideOpen, (open) => {
  if (!open) {
    return
  }
  nextTick(() => {
    ackGuide(LUCKY_DRAW_FEATURE_KEY).catch(() => {
      // 展示成功后 ACK 失败不打断用户；服务端保持 pending，下次上线可重试。
    })
  })
})

function validateAuthForm() {
  if (!authForm.email.trim() || !authForm.email.includes('@')) {
    return '请输入有效的邮箱地址'
  }
  if (authMode.value === 'register' && authForm.displayName.trim().length < 2) {
    return '昵称至少需要 2 个字符'
  }
  if (authForm.password.length < 8) {
    return '密码至少需要 8 个字符'
  }
  if (authMode.value === 'register' && authForm.password !== authForm.confirmPassword) {
    return '两次输入的密码不一致'
  }
  return ''
}

async function submitAuth() {
  const validationMessage = validateAuthForm()
  if (validationMessage) {
    authError.value = validationMessage
    return
  }

  isAuthSubmitting.value = true
  authError.value = ''
  try {
    currentUser.value =
      authMode.value === 'login'
        ? await login({ email: authForm.email, password: authForm.password })
        : await register({
            email: authForm.email,
            displayName: authForm.displayName,
            realName: authForm.realName.trim() || undefined,
            password: authForm.password,
          })
    authForm.password = ''
    authForm.confirmPassword = ''
    isAuthOpen.value = false
    void refreshEntitlements()
    if (new URLSearchParams(window.location.search).get('identity') === '1'
      && currentUser.value.realNameVerificationStatus !== 'APPROVED') {
      openIdentity()
    }
    const nextRoute = pendingRoute.value
    pendingRoute.value = null
    if (nextRoute) {
      window.location.assign(nextRoute)
    }
  } catch (error) {
    authError.value = error instanceof Error ? error.message : '操作失败，请稍后再试'
  } finally {
    isAuthSubmitting.value = false
  }
}

function getRequestedNextRoute(): string | null {
  const params = new URLSearchParams(window.location.search)
  const nextRoute = params.get('next')
  const allowedRoutes = new Set([chatRoute, luckyDrawRoute, profileRoute])
  return nextRoute && allowedRoutes.has(nextRoute) && nextRoute.startsWith('/') && !nextRoute.startsWith('//')
    ? nextRoute
    : null
}

function clearAuthQuery() {
  const url = new URL(window.location.href)
  if (!url.searchParams.has('login') && !url.searchParams.has('next')) return
  url.searchParams.delete('login')
  url.searchParams.delete('next')
  window.history.replaceState(null, '', `${url.pathname}${url.search}${url.hash}`)
}

async function signOut() {
  try {
    await logout()
  } finally {
    currentUser.value = null
    entitlements.value = []
    isGuideOpen.value = false
  }
}

async function submitPasswordReset() {
  if (resetForm.password.length < 8) {
    resetError.value = '密码至少需要 8 个字符'
    return
  }
  if (resetForm.password !== resetForm.confirmPassword) {
    resetError.value = '两次输入的密码不一致'
    return
  }
  isResetSubmitting.value = true
  resetError.value = ''
  try {
    await completePasswordReset(resetToken.value, resetForm.password)
    resetSuccess.value = true
    resetForm.password = ''
    resetForm.confirmPassword = ''
    const url = new URL(window.location.href)
    url.searchParams.delete('reset')
    window.history.replaceState(null, '', `${url.pathname}${url.search}${url.hash}`)
  } catch (error) {
    resetError.value = error instanceof Error ? error.message : '密码重置失败'
  } finally {
    isResetSubmitting.value = false
  }
}

function finishPasswordReset() {
  isResetOpen.value = false
  resetSuccess.value = false
  openAuth('login')
}

function handleEscape(event: KeyboardEvent) {
  if (event.key === 'Escape' && isAuthOpen.value) {
    closeAuth()
  }
}

function setDecorElementRef(key: DecorKey, element: Element | ComponentPublicInstance | null) {
  if (element instanceof HTMLElement) {
    decorElementRefs.set(key, element)
    return
  }

  decorElementRefs.delete(key)
}

function showDecorationBubble(id: DecorKey, event?: PointerEvent) {
  activeBubble.value = id

  if (event?.currentTarget instanceof HTMLElement) {
    event.currentTarget.setPointerCapture(event.pointerId)
  }
}

function hideDecorationBubble(id?: DecorKey) {
  if (!id || activeBubble.value === id) {
    activeBubble.value = ''
  }
}

function handleWindowPointerEnd() {
  hideDecorationBubble()
}

function popDecoration(id: DecorKey) {
  activeDecoration.value = id
  window.clearTimeout(decorationTimer)
  decorationTimer = window.setTimeout(() => {
    activeDecoration.value = ''
  }, 620)

  const body = decorBodies.get(id)
  if (body) {
    Matter.Body.applyForce(body, body.position, {
      x: (Math.random() - 0.5) * 0.035,
      y: -0.035,
    })
  }
}

function cleanupPhysics() {
  if (runner && engine) {
    Matter.Runner.stop(runner)
    Matter.Composite.clear(engine.world, false)
    Matter.Engine.clear(engine)
  }

  runner = undefined
  engine = undefined
  decorBodies.clear()
}

function syncDecorStyle(key: DecorKey, body: Matter.Body, element: HTMLElement) {
  const width = element.offsetWidth
  const height = element.offsetHeight
  decorStyles[key] = {
    transform: `translate3d(${body.position.x - width / 2}px, ${body.position.y - height / 2}px, 0) rotate(${body.angle}rad)`,
  }
}

function createBounds(width: number, height: number) {
  const wall = 90
  return [
    Matter.Bodies.rectangle(width / 2, -wall / 2, width + wall * 2, wall, { isStatic: true }),
    Matter.Bodies.rectangle(width / 2, height + wall / 2, width + wall * 2, wall, { isStatic: true }),
    Matter.Bodies.rectangle(-wall / 2, height / 2, wall, height + wall * 2, { isStatic: true }),
    Matter.Bodies.rectangle(width + wall / 2, height / 2, wall, height + wall * 2, {
      isStatic: true,
    }),
  ]
}

function createDecorBody(
  decoration: DraggableDecorationDefinition,
  element: HTMLElement,
  width: number,
  height: number,
  index: number,
) {
  const elementWidth = element.offsetWidth
  const elementHeight = element.offsetHeight
  const x = width * decoration.start.x
  const y = height * decoration.start.y

  const body =
    decoration.body.shape === 'circle'
      ? Matter.Bodies.circle(x, y, Math.max(elementWidth, elementHeight) * decoration.body.radiusScale, {
          restitution: 0.96,
          friction: 0,
          frictionAir: 0.008,
        })
      : Matter.Bodies.rectangle(
          x,
          y,
          elementWidth * decoration.body.widthScale,
          elementHeight * decoration.body.heightScale,
          {
            restitution: 0.96,
            friction: 0,
            frictionAir: 0.008,
          },
        )

  Matter.Body.setVelocity(body, {
    x: index % 2 === 0 ? 1.1 : -1,
    y: index === 1 ? 0.8 : -0.7,
  })
  Matter.Body.setAngularVelocity(body, index % 2 === 0 ? 0.01 : -0.012)
  decorBodies.set(decoration.id, body)
  return body
}

async function setupPhysics() {
  await nextTick()
  const shell = portalShell.value
  const physicsLayer = decorLayer.value
  const decorElements = draggableDecorations.map((decoration) => [
    decoration,
    decorElementRefs.get(decoration.id) ?? null,
  ] as const)

  if (!shell || !physicsLayer || decorElements.some(([, element]) => !element)) {
    return
  }

  cleanupPhysics()

  const width = shell.clientWidth
  const height = shell.clientHeight
  engine = Matter.Engine.create({ gravity: { x: 0, y: 0 } })
  runner = Matter.Runner.create()

  const bodies = decorElements.map(([decoration, element], index) =>
    createDecorBody(decoration, element as HTMLElement, width, height, index),
  )

  const mouse = Matter.Mouse.create(physicsLayer)
  const mouseConstraint = Matter.MouseConstraint.create(engine, {
    mouse,
    constraint: {
      stiffness: 0.18,
      damping: 0.08,
      render: { visible: false },
    },
  })

  Matter.Composite.add(engine.world, [...createBounds(width, height), ...bodies, mouseConstraint])

  Matter.Events.on(engine, 'beforeUpdate', () => {
    bodies.forEach((body, index) => {
      const speed = Matter.Vector.magnitude(body.velocity)
      const time = performance.now() / 1000 + index * 1.7

      if (speed < 0.7) {
        Matter.Body.applyForce(body, body.position, {
          x: Math.cos(time) * 0.0018,
          y: Math.sin(time * 0.8) * 0.0018,
        })
      }

      if (speed > 3.4) {
        Matter.Body.setVelocity(body, Matter.Vector.mult(Matter.Vector.normalise(body.velocity), 3.4))
      }
    })
  })

  Matter.Events.on(engine, 'afterUpdate', () => {
    decorElements.forEach(([decoration, element]) => {
      const body = decorBodies.get(decoration.id)
      if (body && element) {
        syncDecorStyle(decoration.id, body, element)
      }
    })
  })

  Matter.Runner.run(runner, engine)
}

onMounted(() => {
  setupPhysics()
  const reset = new URLSearchParams(window.location.search).get('reset')
  if (reset) {
    resetToken.value = reset
    isResetOpen.value = true
  }
  const requestedNextRoute = getRequestedNextRoute()
  const shouldOpenAuth = new URLSearchParams(window.location.search).get('login') === '1'
  const shouldOpenIdentity = new URLSearchParams(window.location.search).get('identity') === '1'
  getCurrentUser()
    .then((user) => {
      currentUser.value = user
      if (user) {
        void refreshEntitlements()
      }
      if (user && shouldOpenIdentity && user.realNameVerificationStatus !== 'APPROVED') {
        openIdentity()
      }
      if (requestedNextRoute && user) {
        window.location.assign(requestedNextRoute)
        return
      }
      if (!user && (shouldOpenAuth || shouldOpenIdentity || requestedNextRoute)) {
        openAuth('login', requestedNextRoute)
      }
    })
    .catch(() => {
      currentUser.value = null
    })
    .finally(() => {
      isSessionLoading.value = false
    })
  window.addEventListener('pointerup', handleWindowPointerEnd)
  window.addEventListener('pointercancel', handleWindowPointerEnd)
  window.addEventListener('keydown', handleEscape)

  if (portalShell.value) {
    resizeObserver = new ResizeObserver(() => {
      window.clearTimeout(rebuildTimer)
      rebuildTimer = window.setTimeout(setupPhysics, 120)
    })
    resizeObserver.observe(portalShell.value)
  }
})

onBeforeUnmount(() => {
  window.clearTimeout(decorationTimer)
  window.clearTimeout(rebuildTimer)
  window.removeEventListener('pointerup', handleWindowPointerEnd)
  window.removeEventListener('pointercancel', handleWindowPointerEnd)
  window.removeEventListener('keydown', handleEscape)
  resizeObserver?.disconnect()
  hideDecorationBubble()
  cleanupPhysics()
})
</script>

<template>
  <main class="portal-page">
    <section
      ref="portalShell"
      class="portal-shell"
      aria-label="个人门户"
    >
      <h1 class="sr-only">Pan's space</h1>
      <div class="simple-patterns" aria-hidden="true">
        <span class="pattern-ring ring-one"></span>
        <span class="pattern-ring ring-two"></span>
        <span class="pattern-line line-one"></span>
        <span class="pattern-line line-two"></span>
        <span class="pattern-star star-one"></span>
        <span class="pattern-star star-two"></span>
      </div>

      <div ref="decorLayer" class="decor-layer">
        <button
          v-for="decoration in draggableDecorations"
          :key="decoration.id"
          :ref="(element) => setDecorElementRef(decoration.id, element)"
          type="button"
          class="decor"
          :class="[
            decoration.className,
            {
              'is-active': activeDecoration === decoration.id,
              'has-bubble': activeBubble === decoration.id && decoration.introText,
            },
          ]"
          :style="decorStyles[decoration.id]"
          :aria-label="decoration.ariaLabel"
          @click="popDecoration(decoration.id)"
          @pointerdown="showDecorationBubble(decoration.id, $event)"
          @pointerup="hideDecorationBubble(decoration.id)"
          @pointercancel="hideDecorationBubble(decoration.id)"
          @focus="showDecorationBubble(decoration.id)"
          @blur="hideDecorationBubble(decoration.id)"
          @contextmenu.prevent
        >
          <DraggableDecoration :decoration="decoration" />
          <span v-if="decoration.introText" class="decor-bubble" aria-hidden="true">
            {{ decoration.introText }}
          </span>
          <span class="decor-pop"></span>
        </button>
      </div>

      <header class="portal-header">
        <a
          class="profile-mark"
          :href="chatRoute"
          aria-label="和我聊天"
          @click.stop
          @mousedown.stop
          @touchstart.stop
          @touchmove.stop
          @touchend.stop
        >
          <img :src="avatarUrl" alt="" />
        </a>
        <p><Sparkles :size="15" />Pan's space</p>
        <div class="account-slot">
          <span v-if="isSessionLoading" class="account-loading" aria-label="正在读取登录状态">
            <LoaderCircle :size="18" />
          </span>
          <template v-else-if="currentUser">
            <a v-if="currentUser.realNameVerificationStatus === 'APPROVED'" class="account-name" :href="profileRoute" :title="`${currentUser.email} · 维护个人主页`">
              <UserRound :size="16" />{{ currentUser.displayName }}
            </a>
            <button v-else type="button" class="account-name identity-trigger" :title="`${currentUser.email} · 实名认证`" @click="openIdentity">
              <BadgeCheck :size="16" />{{ currentUser.displayName }}
            </button>
            <button type="button" class="account-logout" aria-label="退出登录" @click="signOut">
              <LogOut :size="16" />
            </button>
          </template>
          <button v-else type="button" class="account-trigger" @click="openAuth('login')">
            <UserRound :size="16" />
            <span>登录 / 注册</span>
          </button>
        </div>
      </header>

      <section class="app-grid" aria-label="子应用列表">
        <a
          v-for="app in apps"
          :key="app.id"
          class="app-entry"
          :href="app.href"
          :aria-label="`进入${app.name}`"
          @click.stop
          @mousedown.stop
          @touchstart.stop
          @touchmove.stop
          @touchend.stop
        >
          <span class="app-visual" aria-hidden="true">
            <span class="quiz-card">
              <span class="quiz-staple"></span>
              <span class="quiz-rule"></span>
              <span class="quiz-rule"></span>
              <span class="quiz-rule"></span>
              <span class="quiz-bubble"></span>
            </span>
          </span>
          <span class="app-name">{{ app.name }}</span>
          <span class="app-state">进入</span>
        </a>
      </section>
    </section>

    <div v-if="isAuthOpen" class="auth-overlay" @mousedown.self="closeAuth">
      <section class="auth-card" role="dialog" aria-modal="true" :aria-labelledby="'auth-title'">
        <span class="auth-staple" aria-hidden="true"></span>
        <button type="button" class="auth-close" aria-label="关闭" @click="closeAuth">
          <X :size="20" />
        </button>

        <header class="auth-heading">
          <span class="auth-folio">01</span>
          <div>
            <h2 id="auth-title">{{ authTitle }}</h2>
            <p>登录后可以在不同设备继续使用你的账户。</p>
          </div>
        </header>

        <div class="auth-tabs" role="tablist" aria-label="账户操作">
          <button
            type="button"
            role="tab"
            :aria-selected="authMode === 'login'"
            :class="{ 'is-active': authMode === 'login' }"
            @click="switchAuthMode('login')"
          >
            登录
          </button>
          <button
            type="button"
            role="tab"
            :aria-selected="authMode === 'register'"
            :class="{ 'is-active': authMode === 'register' }"
            @click="switchAuthMode('register')"
          >
            注册
          </button>
        </div>

        <form class="auth-form" @submit.prevent="submitAuth">
          <label v-if="authMode === 'register'" class="auth-field">
            <span>昵称</span>
            <input
              v-model.trim="authForm.displayName"
              name="displayName"
              type="text"
              autocomplete="nickname"
              minlength="2"
              maxlength="40"
              placeholder="你的称呼"
            />
          </label>

          <label v-if="authMode === 'register'" class="auth-field">
            <span>真实姓名（选填，填写后进入审核）</span>
            <input
              v-model.trim="authForm.realName"
              name="realName"
              type="text"
              autocomplete="name"
              maxlength="80"
              placeholder="填写后由超级管理员审核"
            />
          </label>

          <label class="auth-field">
            <span>邮箱</span>
            <input
              id="auth-email"
              v-model.trim="authForm.email"
              name="email"
              type="email"
              inputmode="email"
              autocomplete="email"
              maxlength="254"
              placeholder="name@example.com"
            />
          </label>

          <label class="auth-field">
            <span>密码</span>
            <span class="password-input">
              <input
                v-model="authForm.password"
                name="password"
                :type="showPassword ? 'text' : 'password'"
                :autocomplete="authMode === 'login' ? 'current-password' : 'new-password'"
                minlength="8"
                maxlength="128"
                placeholder="至少 8 个字符"
              />
              <button
                type="button"
                class="password-toggle"
                :aria-label="showPassword ? '隐藏密码' : '显示密码'"
                @click="showPassword = !showPassword"
              >
                <EyeOff v-if="showPassword" :size="18" />
                <Eye v-else :size="18" />
              </button>
            </span>
          </label>

          <label v-if="authMode === 'register'" class="auth-field">
            <span>确认密码</span>
            <input
              v-model="authForm.confirmPassword"
              name="confirmPassword"
              :type="showPassword ? 'text' : 'password'"
              autocomplete="new-password"
              minlength="8"
              maxlength="128"
              placeholder="再次输入密码"
            />
          </label>

          <p v-if="authError" class="auth-error" role="alert">{{ authError }}</p>

          <button type="submit" class="auth-submit" :disabled="isAuthSubmitting">
            <LoaderCircle v-if="isAuthSubmitting" class="is-spinning" :size="19" />
            <template v-else>
              <span>{{ authSubmitText }}</span>
              <ArrowRight :size="19" />
            </template>
          </button>
        </form>
      </section>
    </div>

    <div v-if="isIdentityOpen && currentUser" class="auth-overlay" @mousedown.self="closeIdentity">
      <section class="auth-card identity-card" role="dialog" aria-modal="true" aria-labelledby="identity-title">
        <span class="auth-staple" aria-hidden="true"></span>
        <button type="button" class="auth-close" aria-label="关闭" @click="closeIdentity"><X :size="20" /></button>
        <header class="auth-heading">
          <span class="auth-folio">ID</span>
          <div>
            <h2 id="identity-title">实名认证</h2>
            <p>通过后才会启用聊天个人记忆，并开放个人主页维护。</p>
          </div>
        </header>
        <div class="identity-status" :data-status="currentUser.realNameVerificationStatus">
          <span>{{ identityStatusCopy.label }}</span>
          <p>{{ identityStatusCopy.copy }}</p>
        </div>
        <form v-if="currentUser.realNameVerificationStatus !== 'APPROVED'" class="auth-form" @submit.prevent="submitIdentity">
          <label class="auth-field">
            <span>真实姓名</span>
            <input v-model="identityName" type="text" autocomplete="name" minlength="2" maxlength="80" placeholder="请输入真实姓名" />
          </label>
          <p v-if="identityError" class="auth-error" role="alert">{{ identityError }}</p>
          <p v-if="identityMessage" class="identity-success" role="status">{{ identityMessage }}</p>
          <button type="submit" class="auth-submit" :disabled="isIdentitySubmitting">
            <LoaderCircle v-if="isIdentitySubmitting" class="is-spinning" :size="19" />
            <template v-else><span>{{ currentUser.realNameVerificationStatus === 'PENDING' ? '更新并重新提交' : '提交审核' }}</span><ArrowRight :size="19" /></template>
          </button>
        </form>
      </section>
    </div>

    <div v-if="isResetOpen" class="auth-overlay">
      <section class="auth-card reset-card" role="dialog" aria-modal="true" aria-labelledby="reset-title">
        <span class="auth-staple" aria-hidden="true"></span>
        <header class="auth-heading">
          <span class="auth-folio">02</span>
          <div>
            <h2 id="reset-title">重置密码</h2>
            <p>{{ resetSuccess ? '密码已更新，旧登录会话已经失效。' : '设置一个新的账户密码。' }}</p>
          </div>
        </header>
        <div v-if="resetSuccess" class="auth-form">
          <button type="button" class="auth-submit" @click="finishPasswordReset">
            <span>返回登录</span><ArrowRight :size="19" />
          </button>
        </div>
        <form v-else class="auth-form" @submit.prevent="submitPasswordReset">
          <label class="auth-field"><span>新密码</span><input v-model="resetForm.password" type="password" autocomplete="new-password" minlength="8" maxlength="128" placeholder="至少 8 个字符" /></label>
          <label class="auth-field"><span>确认新密码</span><input v-model="resetForm.confirmPassword" type="password" autocomplete="new-password" minlength="8" maxlength="128" placeholder="再次输入新密码" /></label>
          <p v-if="resetError" class="auth-error" role="alert">{{ resetError }}</p>
          <button type="submit" class="auth-submit" :disabled="isResetSubmitting">
            <LoaderCircle v-if="isResetSubmitting" class="is-spinning" :size="19" />
            <template v-else><span>确认重置</span><ArrowRight :size="19" /></template>
          </button>
        </form>
      </section>
    </div>

    <div v-if="isGuideOpen" class="auth-overlay guide-overlay" @mousedown.self="closeGuide">
      <section class="auth-card guide-card" role="dialog" aria-modal="true" aria-labelledby="guide-title">
        <span class="auth-staple" aria-hidden="true"></span>
        <button type="button" class="auth-close" aria-label="关闭" @click="closeGuide">
          <X :size="20" />
        </button>
        <header class="auth-heading">
          <span class="auth-folio">NEW</span>
          <div>
            <h2 id="guide-title">陶攀问答局已解锁</h2>
            <p>你的账号已满足注册满 7 天的条件，新入口已经出现在门户中。</p>
          </div>
        </header>
        <div class="auth-form guide-actions">
          <button type="button" class="auth-submit" @click="goToLuckyDraw">
            <span>去看看</span>
            <ArrowRight :size="19" />
          </button>
          <button type="button" class="guide-later" @click="closeGuide">知道了</button>
        </div>
      </section>
    </div>
  </main>
</template>
