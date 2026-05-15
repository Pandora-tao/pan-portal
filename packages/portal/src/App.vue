<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, reactive, ref, type ComponentPublicInstance } from 'vue'
import * as Matter from 'matter-js'
import { Sparkles } from 'lucide-vue-next'
import avatarUrl from './assets/pan-avatar.png'
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
  window.addEventListener('pointerup', handleWindowPointerEnd)
  window.addEventListener('pointercancel', handleWindowPointerEnd)
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
  </main>
</template>
