<script setup lang="ts">
import { computed, defineAsyncComponent, onMounted, ref } from 'vue'
import { NButton, NInput, NSpin, useMessage } from 'naive-ui'
import {
  BarChart3,
  CircleUserRound,
  LayoutDashboard,
  LogOut,
  MessagesSquare,
  ScrollText,
  ShieldCheck,
  UsersRound,
} from 'lucide-vue-next'
import { adminApi, HttpError } from '../api/admin'
import type { AdminMe } from '../types/admin'

const DashboardView = defineAsyncComponent(() => import('../views/DashboardView.vue'))
const UsersView = defineAsyncComponent(() => import('../views/UsersView.vue'))
const ConversationsView = defineAsyncComponent(() => import('../views/ConversationsView.vue'))
const AnalyticsView = defineAsyncComponent(() => import('../views/AnalyticsView.vue'))
const PermissionsView = defineAsyncComponent(() => import('../views/PermissionsView.vue'))
const AuditView = defineAsyncComponent(() => import('../views/AuditView.vue'))

type PageKey = 'dashboard' | 'users' | 'conversations' | 'analytics' | 'permissions' | 'audit'

const message = useMessage()
const loading = ref(true)
const signingIn = ref(false)
const denied = ref(false)
const me = ref<AdminMe | null>(null)
const activePage = ref<PageKey>('dashboard')
const email = ref('')
const password = ref('')
const loginError = ref('')

const navigation = [
  { key: 'dashboard' as const, label: '数据概览', folio: '01', icon: LayoutDashboard },
  { key: 'users' as const, label: '用户管理', folio: '02', icon: UsersRound },
  { key: 'conversations' as const, label: '对话管理', folio: '03', icon: MessagesSquare },
  { key: 'analytics' as const, label: '数据分析', folio: '04', icon: BarChart3 },
  { key: 'permissions' as const, label: '权限管理', folio: '05', icon: ShieldCheck },
  { key: 'audit' as const, label: '审计日志', folio: '06', icon: ScrollText },
]

const activeMeta = computed(() => navigation.find((item) => item.key === activePage.value) ?? navigation[0]!)

async function loadSession() {
  loading.value = true
  denied.value = false
  try {
    me.value = await adminApi.me()
  } catch (error) {
    me.value = null
    denied.value = error instanceof HttpError && error.status === 403
  } finally {
    loading.value = false
  }
}

async function signIn() {
  if (!email.value.trim() || !password.value) {
    loginError.value = '请输入邮箱和密码'
    return
  }
  signingIn.value = true
  loginError.value = ''
  try {
    await adminApi.login(email.value.trim(), password.value)
    await loadSession()
    if (!me.value) loginError.value = denied.value ? '当前账号不是超级管理员' : '登录失败'
  } catch (error) {
    loginError.value = error instanceof Error ? error.message : '登录失败'
  } finally {
    signingIn.value = false
  }
}

async function signOut() {
  try {
    await adminApi.logout()
  } finally {
    me.value = null
    denied.value = false
    password.value = ''
    message.success('已退出登录')
  }
}

onMounted(loadSession)
</script>

<template>
  <div v-if="loading" class="gate-screen">
    <n-spin size="large" />
    <p>正在确认管理权限</p>
  </div>

  <main v-else-if="!me" class="login-screen">
    <section class="login-grid" aria-labelledby="login-title">
      <div class="login-masthead">
        <span class="login-folio">A</span>
        <p>Pan Portal</p>
        <h1 id="login-title">管理后台</h1>
        <div class="login-rule"></div>
        <p class="login-note">仅超级管理员可以访问用户、对话和审计数据。</p>
      </div>
      <form class="login-form" @submit.prevent="signIn">
        <div class="field-block">
          <label for="admin-email">邮箱</label>
          <n-input id="admin-email" v-model:value="email" size="large" placeholder="请输入注册邮箱" />
        </div>
        <div class="field-block">
          <label for="admin-password">密码</label>
          <n-input
            id="admin-password"
            v-model:value="password"
            type="password"
            show-password-on="click"
            size="large"
            placeholder="请输入密码"
          />
        </div>
        <p v-if="loginError" class="form-error" role="alert">{{ loginError }}</p>
        <p v-else-if="denied" class="form-error" role="alert">当前登录账号没有管理权限。</p>
        <n-button type="primary" size="large" attr-type="submit" :loading="signingIn" block>登录</n-button>
        <a href="/">返回 Pan Portal</a>
      </form>
    </section>
  </main>

  <div v-else class="admin-layout">
    <aside class="admin-sidebar">
      <header class="brand-block">
        <span>Pan Portal</span>
        <strong>Admin</strong>
      </header>
      <nav aria-label="管理后台导航">
        <button
          v-for="item in navigation"
          :key="item.key"
          type="button"
          :class="['nav-item', { 'is-active': activePage === item.key }]"
          @click="activePage = item.key"
        >
          <span class="nav-folio">{{ item.folio }}</span>
          <component :is="item.icon" :size="18" :stroke-width="1.8" />
          <span>{{ item.label }}</span>
        </button>
      </nav>
      <footer class="sidebar-account">
        <CircleUserRound :size="20" />
        <div>
          <strong>{{ me.displayName }}</strong>
          <span>{{ me.email }}</span>
        </div>
        <button type="button" aria-label="退出登录" @click="signOut">
          <LogOut :size="18" />
        </button>
      </footer>
    </aside>

    <main class="admin-main">
      <header class="page-heading">
        <span class="page-folio">{{ activeMeta.folio }}</span>
        <div>
          <p>Pan Portal 管理后台</p>
          <h1>{{ activeMeta.label }}</h1>
        </div>
      </header>
      <DashboardView v-if="activePage === 'dashboard'" />
      <UsersView v-else-if="activePage === 'users'" :current-user-id="me.id" />
      <ConversationsView v-else-if="activePage === 'conversations'" />
      <AnalyticsView v-else-if="activePage === 'analytics'" />
      <PermissionsView v-else-if="activePage === 'permissions'" />
      <AuditView v-else />
    </main>
  </div>
</template>
