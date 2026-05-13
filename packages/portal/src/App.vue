<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import * as Matter from 'matter-js'
import { Sparkles } from 'lucide-vue-next'
import avatarUrl from './assets/pan-avatar.png'
import luluUrl from './assets/lulu-cutout.png'
import puddingUrl from './assets/pudding-dog.svg'
import appleUrl from './assets/apple-smile.svg'
import bananaUrl from './assets/banana-smile.svg'
import watermelonUrl from './assets/watermelon-smile.svg'
import strawberryUrl from './assets/strawberry-smile.svg'


interface PortalApp {
  id: string
  name: string
  href: string
  icon: 'festival'
}

type DecorKey = 'lulu' | 'grape' | 'pudding' | 'watermelon' | 'banana' | 'apple' | 'strawberry'

const luckyDrawRoute = import.meta.env.VITE_LUCKY_DRAW_ROUTE ?? '/lucky-draw/'
const chatRoute = import.meta.env.VITE_CHAT_ROUTE ?? '/chat/'

const apps: PortalApp[] = [
  {
    id: 'lucky-draw',
    name: '端午赠礼',
    href: luckyDrawRoute,
    icon: 'festival',
  },
]

const activeDecoration = ref('')
const portalShell = ref<HTMLElement | null>(null)
const decorLayer = ref<HTMLElement | null>(null)
const luluDecor = ref<HTMLElement | null>(null)
const grapeDecor = ref<HTMLElement | null>(null)
const puddingDecor = ref<HTMLElement | null>(null)
const watermelonDecor = ref<HTMLElement | null>(null)
const bananaDecor = ref<HTMLElement | null>(null)
const appleDecor = ref<HTMLElement | null>(null)

const decorStyles = reactive<Record<DecorKey, Record<string, string>>>({
  lulu: {},
  grape: {},
  pudding: {},
  watermelon: {},
  banana: {},
  apple: {},
  strawberry: {},
})

const decorBodies = new Map<DecorKey, Matter.Body>()
let decorationTimer: number | undefined
let engine: Matter.Engine | undefined
let runner: Matter.Runner | undefined
let resizeObserver: ResizeObserver | undefined
let rebuildTimer: number | undefined

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
  key: DecorKey,
  element: HTMLElement,
  width: number,
  height: number,
  index: number,
) {
  const elementWidth = element.offsetWidth
  const elementHeight = element.offsetHeight
  const isRound = key === 'grape' || key === 'apple'
  const xPositions = {
    lulu: width * 0.84,
    grape: width * 0.74,
    pudding: width * 0.6,
    watermelon: width * 0.26,
    banana: width * 0.42,
    apple: width * 0.88,
    strawberry: width * 0.5,
  }
  const yPositions = {
    lulu: height * 0.72,
    grape: height * 0.18,
    pudding: height * 0.78,
    watermelon: height * 0.68,
    banana: height * 0.25,
    apple: height * 0.42,
    strawberry: height * 0.5,
  }
  const bodyScales = {
    lulu: { width: 0.62, height: 0.72 },
    grape: { width: 0.84, height: 0.84 },
    pudding: { width: 0.74, height: 0.68 },
    watermelon: { width: 0.74, height: 0.62 },
    banana: { width: 0.86, height: 0.44 },
    apple: { width: 0.78, height: 0.78 },
    strawberry: { width: 0.5, height: 0.5 },
  }

  const body = isRound
    ? Matter.Bodies.circle(xPositions[key], yPositions[key], Math.max(elementWidth, elementHeight) * 0.42, {
        restitution: 0.96,
        friction: 0,
        frictionAir: 0.008,
      })
    : Matter.Bodies.rectangle(
        xPositions[key],
        yPositions[key],
        elementWidth * bodyScales[key].width,
        elementHeight * bodyScales[key].height,
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
  decorBodies.set(key, body)
  return body
}

async function setupPhysics() {
  await nextTick()
  const shell = portalShell.value
  const physicsLayer = decorLayer.value
  const decorElements: Array<[DecorKey, HTMLElement | null]> = [
    ['lulu', luluDecor.value],
    ['grape', grapeDecor.value],
    ['pudding', puddingDecor.value],
    ['watermelon', watermelonDecor.value],
    ['banana', bananaDecor.value],
    ['apple', appleDecor.value],
  ]

  if (!shell || !physicsLayer || decorElements.some(([, element]) => !element)) {
    return
  }

  cleanupPhysics()

  const width = shell.clientWidth
  const height = shell.clientHeight
  engine = Matter.Engine.create({ gravity: { x: 0, y: 0 } })
  runner = Matter.Runner.create()

  const bodies = decorElements.map(([key, element], index) =>
    createDecorBody(key, element as HTMLElement, width, height, index),
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
    decorElements.forEach(([key, element]) => {
      const body = decorBodies.get(key)
      if (body && element) {
        syncDecorStyle(key, body, element)
      }
    })
  })

  Matter.Runner.run(runner, engine)
}

onMounted(() => {
  setupPhysics()

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
  resizeObserver?.disconnect()
  cleanupPhysics()
})
</script>

<template>
  <main class="portal-page">
    <section ref="portalShell" class="portal-shell" aria-label="个人门户">
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
        ref="luluDecor"
        type="button"
        class="decor decor-lulu"
        :class="{ 'is-active': activeDecoration === 'lulu' }"
        :style="decorStyles.lulu"
        aria-label="噜噜"
        @click="popDecoration('lulu')"
      >
        <img :src="luluUrl" alt="" />
        <span class="decor-pop"></span>
      </button>

      <button
        ref="grapeDecor"
        type="button"
        class="decor decor-grape"
        :class="{ 'is-active': activeDecoration === 'grape' }"
        :style="decorStyles.grape"
        aria-label="葡萄"
        @click="popDecoration('grape')"
      >
        <span class="grape-leaf"></span>
        <span class="grape-dot dot-one"></span>
        <span class="grape-dot dot-two"></span>
        <span class="grape-dot dot-three"></span>
        <span class="grape-dot dot-four"></span>
        <span class="grape-dot dot-five"></span>
        <span class="grape-dot dot-six"></span>
        <span class="decor-pop"></span>
      </button>

      <button
        ref="puddingDecor"
        type="button"
        class="decor decor-pudding"
        :class="{ 'is-active': activeDecoration === 'pudding' }"
        :style="decorStyles.pudding"
        aria-label="布丁小狗"
        @click="popDecoration('pudding')"
      >
        <img :src="puddingUrl" alt="" />
        <span class="decor-pop"></span>
      </button>

      <button
        ref="watermelonDecor"
        type="button"
        class="decor decor-watermelon"
        :class="{ 'is-active': activeDecoration === 'watermelon' }"
        :style="decorStyles.watermelon"
        aria-label="西瓜"
        @click="popDecoration('watermelon')"
      >
        <img :src="watermelonUrl" alt="" />
        <span class="decor-pop"></span>
      </button>

      <button
        ref="strawberryDecor"
        type="button"
        class="decor decor-strawberry"
        :class="{ 'is-active': activeDecoration === 'strawberry' }"
        :style="decorStyles.strawberry"
        aria-label="草莓"
        @click="popDecoration('strawberry')"
      >
        <img :src="strawberryUrl" alt="" />
        <span class="decor-pop"></span>
      </button>

      <button
        ref="bananaDecor"
        type="button"
        class="decor decor-banana"
        :class="{ 'is-active': activeDecoration === 'banana' }"
        :style="decorStyles.banana"
        aria-label="香蕉"
        @click="popDecoration('banana')"
      >
        <img :src="bananaUrl" alt="" />
        <span class="decor-pop"></span>
      </button>

      <button
        ref="appleDecor"
        type="button"
        class="decor decor-apple"
        :class="{ 'is-active': activeDecoration === 'apple' }"
        :style="decorStyles.apple"
        aria-label="苹果"
        @click="popDecoration('apple')"
      >
        <img :src="appleUrl" alt="" />
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
          <span class="app-visual" :class="`app-visual-${app.icon}`" aria-hidden="true">
            <span class="leaf leaf-left"></span>
            <span class="leaf leaf-right"></span>
            <span class="zongzi">
              <span class="wrap-line line-a"></span>
              <span class="wrap-line line-b"></span>
              <span class="knot"></span>
            </span>
            <span class="spark spark-one"></span>
            <span class="spark spark-two"></span>
          </span>
          <span class="app-name">{{ app.name }}</span>
        </a>
      </section>
    </section>
  </main>
</template>
