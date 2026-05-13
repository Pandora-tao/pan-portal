<script setup lang="ts">
import { ExternalLink, Gift, Home, Layers, PlayCircle } from 'lucide-vue-next'

interface PortalApp {
  id: string
  name: string
  description: string
  href: string
  devPort: number
  status: string
}

const luckyDrawUrl = import.meta.env.VITE_LUCKY_DRAW_URL ?? 'http://localhost:5173'

const apps: PortalApp[] = [
  {
    id: 'lucky-draw',
    name: '陶攀的端午节赠礼',
    description: '端午节答题、抽粽子与奖品领取活动。',
    href: luckyDrawUrl,
    devPort: 5173,
    status: '可访问',
  },
]
</script>

<template>
  <main class="portal-page">
    <section class="hero-panel" aria-label="端午活动门户">
      <div class="river-scene" aria-hidden="true">
        <span class="river-line line-one"></span>
        <span class="river-line line-two"></span>
        <span class="boat">
          <span class="boat-body"></span>
          <span class="boat-head"></span>
          <span class="boat-tail"></span>
        </span>
        <span class="zongzi zongzi-one"></span>
        <span class="zongzi zongzi-two"></span>
      </div>

      <div class="portal-heading">
        <p><Home :size="16" />活动门户</p>
        <h1>端午节活动导航</h1>
      </div>

      <div class="summary-strip" aria-label="应用概览">
        <span><Layers :size="16" />{{ apps.length }} 个子应用</span>
        <span><PlayCircle :size="16" />Portal 端口 80</span>
      </div>
    </section>

    <section class="apps-section" aria-label="子应用列表">
      <article v-for="app in apps" :key="app.id" class="app-card">
        <div class="app-icon" aria-hidden="true">
          <Gift :size="25" />
        </div>
        <div class="app-content">
          <div class="app-title-row">
            <h2>{{ app.name }}</h2>
            <span>{{ app.status }}</span>
          </div>
          <p>{{ app.description }}</p>
          <dl>
            <div>
              <dt>开发端口</dt>
              <dd>{{ app.devPort }}</dd>
            </div>
            <div>
              <dt>包名</dt>
              <dd>@dragon-boat/{{ app.id }}</dd>
            </div>
          </dl>
        </div>
        <a class="primary-action app-link" :href="app.href">
          <span>进入应用</span>
          <ExternalLink :size="17" />
        </a>
      </article>
    </section>
  </main>
</template>
