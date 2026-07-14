<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, type ComponentPublicInstance } from 'vue'
import * as Matter from 'matter-js'
import { ArrowRight, Eye, EyeOff, LoaderCircle, LogOut, Sparkles, UserRound, X } from 'lucide-vue-next'
import avatarUrl from './assets/pan-avatar.png'
import { getCurrentUser, login, logout, register, type UserInfo } from './api/auth'
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

const apps: PortalApp[] = [
  {
    id: 'lucky-draw',
    name: '陶攀问答局',
    href: luckyDrawRoute,
  },
]

const activeDecoration = ref<DecorKey | ''>('')
const activeBubble = ref<DecorKey | ''>('')
const isGiftIntroOpen = ref(true)
const authMode = ref<'login' | 'register'>('login')
const isAuthOpen = ref(false)
const isAuthSubmitting = ref(false)
const isSessionLoading = ref(true)
const showPassword = ref(false)
const authError = ref('')
const currentUser = ref<UserInfo | null>(null)
const authForm = reactive({
  displayName: '',
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
let giftIntroTimer: number | undefined
let engine: Matter.Engine | undefined
let runner: Matter.Runner | undefined
let resizeObserver: ResizeObserver | undefined
let rebuildTimer: number | undefined

const authTitle = computed(() => (authMode.value === 'login' ? '欢迎回来' : '创建账户'))
const authSubmitText = computed(() => (authMode.value === 'login' ? '登录' : '注册并登录'))

function openAuth(mode: 'login' | 'register' = 'login') {
  authMode.value = mode
  authError.value = ''
  showPassword.value = false
  isAuthOpen.value = true
  nextTick(() => document.querySelector<HTMLInputElement>('#auth-email')?.focus())
}

function closeAuth() {
  if (!isAuthSubmitting.value) {
    isAuthOpen.value = false
    authError.value = ''
  }
}

function switchAuthMode(mode: 'login' | 'register') {
  authMode.value = mode
  authError.value = ''
}

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
            password: authForm.password,
          })
    authForm.password = ''
    authForm.confirmPassword = ''
    isAuthOpen.value = false
  } catch (error) {
    authError.value = error instanceof Error ? error.message : '操作失败，请稍后再试'
  } finally {
    isAuthSubmitting.value = false
  }
}

async function signOut() {
  try {
    await logout()
  } finally {
    currentUser.value = null
  }
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
  getCurrentUser()
    .then((user) => {
      currentUser.value = user
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
  giftIntroTimer = window.setTimeout(() => {
    isGiftIntroOpen.value = false
  }, 2400)

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
  window.clearTimeout(giftIntroTimer)
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
      :class="{
        'is-gift-intro-open': isGiftIntroOpen,
      }"
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
            <span class="account-name" :title="currentUser.email">
              <UserRound :size="16" />{{ currentUser.displayName }}
            </span>
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
  </main>
</template>
