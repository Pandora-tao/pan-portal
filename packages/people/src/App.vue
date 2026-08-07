<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import {
  ArrowLeft,
  ArrowRight,
  Bell,
  BookOpen,
  Check,
  CircleUserRound,
  Download,
  Eye,
  EyeOff,
  Heart,
  ImageUp,
  LoaderCircle,
  LogOut,
  Mail,
  Menu,
  MessageCircle,
  Network,
  KeyRound,
  Plus,
  Save,
  Search,
  Settings,
  Send,
  ShieldCheck,
  Sparkles,
  Trash2,
  UserPlus,
  X,
} from 'lucide-vue-next'
import { ApiError, peopleApi } from './api'
import type { Account, AccountSession, Conversation, DirectMessage, NotificationItem, PrivateRelationship, Profile, ProfileSection, RelationshipInbox } from './types'

type View = 'discover' | 'profile' | 'network' | 'messages' | 'contribute' | 'notifications' | 'settings'

const loading = ref(true)
const busy = ref(false)
const account = ref<Account | null>(null)
const guestBrowsing = ref(false)
const view = ref<View>('discover')
const mobileNav = ref(false)
const error = ref('')
const notice = ref('')
const authMode = ref<'login' | 'register' | 'reset' | 'restore'>('register')
const authEmail = ref('')
const authPassword = ref('')

const profile = ref<Profile | null>(null)
const editor = ref({ displayName: '', bio: '', birthVisibility: 'YEAR_MONTH', allowFollowerDm: true })
const sections = ref<ProfileSection[]>([])
const avatarUploading = ref(false)

const searchQuery = ref('')
const searchResults = ref<Profile[]>([])
const selectedProfile = ref<Profile | null>(null)
const relationshipType = ref('FRIEND')
const conversations = ref<Conversation[]>([])
const activeConversation = ref<Conversation | null>(null)
const messages = ref<DirectMessage[]>([])
const messageCursor = ref<string | null>(null)
const selectedMessageIds = ref<string[]>([])
const failedMessages = ref<Array<{ clientMessageId: string; text: string }>>([])
const blockedAccountIds = ref<string[]>([])
const messageDraft = ref('')
const relationshipInbox = ref<RelationshipInbox[]>([])
const privateRelationships = ref<PrivateRelationship[]>([])
const notifications = ref<NotificationItem[]>([])
const sessions = ref<AccountSession[]>([])
const security = ref({ currentPassword: '', newPassword: '', deletePassword: '' })
const resetToken = ref('')
const resetPassword = ref('')
const testAccountLink = ref<string | null>(null)
const figure = ref({ legalName: '', summary: '', sourceTitle: '', sourceUrl: '' })

const navItems: Array<{ id: View; label: string; icon: typeof Search }> = [
  { id: 'discover', label: '搜索人物', icon: Search },
  { id: 'profile', label: '我的主页', icon: CircleUserRound },
  { id: 'network', label: '关系网络', icon: Network },
  { id: 'messages', label: '私信', icon: Mail },
  { id: 'notifications', label: '通知', icon: Bell },
  { id: 'contribute', label: '人物协作', icon: BookOpen },
  { id: 'settings', label: '账号', icon: Settings },
]

const visibleNavItems = computed(() => account.value?.verified
  ? navItems
  : navItems.filter(item => ['discover', 'profile', 'notifications', 'settings'].includes(item.id)))

const publicUrl = computed(() => profile.value?.status === 'PUBLISHED'
  ? `/people/p/${profile.value.pageId}/${profile.value.slug}`
  : '')

function showNotice(message: string) {
  notice.value = message
  window.setTimeout(() => { if (notice.value === message) notice.value = '' }, 3200)
}

function createUuid() {
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID()
  const bytes = crypto.getRandomValues(new Uint8Array(16))
  bytes[6] = (bytes[6]! & 0x0f) | 0x40
  bytes[8] = (bytes[8]! & 0x3f) | 0x80
  const hex = [...bytes].map(value => value.toString(16).padStart(2, '0')).join('')
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}

async function initialize() {
  loading.value = true
  try {
    account.value = await peopleApi.me()
    if (account.value.pageId) await loadProfile()
  } catch (reason) {
    if (!(reason instanceof ApiError && reason.status === 401)) error.value = messageOf(reason)
  } finally {
    loading.value = false
  }
}

async function authenticate() {
  error.value = ''
  busy.value = true
  try {
    account.value = authMode.value === 'register'
      ? await peopleApi.register(authEmail.value, authPassword.value)
      : await peopleApi.login(authEmail.value, authPassword.value)
    if (account.value.pageId) await loadProfile()
  } catch (reason) {
    error.value = messageOf(reason)
  } finally {
    busy.value = false
  }
}

async function submitAuth() {
  error.value = ''
  busy.value = true
  try {
    if (authMode.value === 'reset') await completeReset()
    else if (authMode.value === 'restore') await restoreAccount()
    else await authenticate()
  } catch (reason) {
    error.value = messageOf(reason)
  } finally {
    busy.value = false
  }
}

async function logout() {
  await peopleApi.logout().catch(() => undefined)
  account.value = null
  guestBrowsing.value = false
  profile.value = null
  selectedProfile.value = null
}

function browsePublic() {
  guestBrowsing.value = true
  view.value = 'discover'
  error.value = ''
}

async function loadProfile() {
  profile.value = await peopleApi.myProfile()
  editor.value = {
    displayName: profile.value.legalName,
    bio: profile.value.bio || '',
    birthVisibility: profile.value.birthVisibility,
    allowFollowerDm: profile.value.allowFollowerDm,
  }
  sections.value = profile.value.sections.map(section => ({ ...section, content: { ...section.content } }))
}

async function uploadAvatar(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return
  if (!['image/jpeg', 'image/png'].includes(file.type)) {
    error.value = '头像只支持 JPEG 或 PNG 图片'
    return
  }
  if (file.size > 5 * 1024 * 1024) {
    error.value = '头像不能超过 5 MB'
    return
  }
  error.value = ''
  avatarUploading.value = true
  try {
    const uploaded = await peopleApi.uploadAvatar(file)
    await loadProfile()
    showNotice(`头像已上传（${uploaded.width}×${uploaded.height}）`)
  } catch (reason) {
    error.value = messageOf(reason)
  } finally {
    avatarUploading.value = false
  }
}

async function deleteAvatar() {
  if (!profile.value?.avatarUrl || !window.confirm('删除头像后，已公开主页会自动停止公开。确认删除吗？')) return
  error.value = ''
  avatarUploading.value = true
  try {
    await peopleApi.deleteAvatar()
    await loadProfile()
    showNotice('头像已删除')
  } catch (reason) {
    error.value = messageOf(reason)
  } finally {
    avatarUploading.value = false
  }
}

async function saveProfile() {
  busy.value = true
  error.value = ''
  try {
    await peopleApi.saveProfile(editor.value)
    profile.value = await peopleApi.saveSections(sections.value.map((section, index) => ({
      ...section, position: index, schemaVersion: 1,
    })))
    await loadProfile()
    showNotice('主页草稿已保存')
  } catch (reason) {
    error.value = messageOf(reason)
  } finally {
    busy.value = false
  }
}

async function togglePublish() {
  busy.value = true
  error.value = ''
  try {
    if (profile.value?.status === 'PUBLISHED') {
      profile.value = await peopleApi.unpublish()
      showNotice('主页已取消公开，并从搜索和站点地图移除')
    } else {
      if (!window.confirm('公开后，匿名访客和搜索引擎都可以访问并缓存主页内容。确认发布吗？')) return
      await saveProfile()
      profile.value = await peopleApi.publish()
      showNotice('主页已公开')
    }
  } catch (reason) {
    error.value = messageOf(reason)
  } finally {
    busy.value = false
  }
}

function addSection() {
  sections.value.push({ type: 'CUSTOM_TEXT', title: '', content: { text: '' }, position: sections.value.length, schemaVersion: 1 })
}

function removeSection(index: number) {
  sections.value.splice(index, 1)
}

async function searchPeople() {
  error.value = ''
  busy.value = true
  try {
    searchResults.value = (await peopleApi.search(searchQuery.value)).items
  } catch (reason) {
    error.value = messageOf(reason)
  } finally {
    busy.value = false
  }
}

async function openProfile(item: Profile) {
  selectedProfile.value = await peopleApi.publicProfile(item.pageId)
}

async function toggleFollow() {
  if (!selectedProfile.value) return
  busy.value = true
  try {
    await peopleApi.follow(selectedProfile.value.pageId, !selectedProfile.value.followedByMe)
    selectedProfile.value = await peopleApi.publicProfile(selectedProfile.value.pageId)
  } catch (reason) {
    error.value = messageOf(reason)
  } finally {
    busy.value = false
  }
}

async function requestRelationship() {
  if (!selectedProfile.value) return
  busy.value = true
  try {
    await peopleApi.relationship(selectedProfile.value.pageId, relationshipType.value)
    showNotice('关系邀请已发送，需对方确认后才会成立')
  } catch (reason) {
    error.value = messageOf(reason)
  } finally {
    busy.value = false
  }
}

async function startConversation() {
  if (!selectedProfile.value) return
  busy.value = true
  try {
    activeConversation.value = await peopleApi.createConversation(selectedProfile.value.pageId)
    selectedProfile.value = null
    view.value = 'messages'
    await loadMessages()
  } catch (reason) {
    error.value = messageOf(reason)
  } finally {
    busy.value = false
  }
}

async function loadConversations() {
  if (!account.value?.verified) return
  ;[conversations.value, blockedAccountIds.value] = await Promise.all([peopleApi.conversations(), peopleApi.blocks()])
}

async function selectConversation(item: Conversation) {
  activeConversation.value = item
  await loadMessages()
}

async function loadMessages() {
  if (!activeConversation.value) return
  const page = await peopleApi.messages(activeConversation.value.conversationId)
  messages.value = page.items
  messageCursor.value = page.nextCursor
  selectedMessageIds.value = []
  const last = page.items.at(-1)
  if (last) await peopleApi.markRead(activeConversation.value.conversationId, last.messageId)
}

async function loadOlderMessages() {
  if (!activeConversation.value || !messageCursor.value) return
  const page = await peopleApi.messages(activeConversation.value.conversationId, messageCursor.value)
  const known = new Set(messages.value.map(item => item.messageId))
  messages.value = [...page.items.filter(item => !known.has(item.messageId)), ...messages.value]
  messageCursor.value = page.nextCursor
}

async function sendMessage() {
  const text = messageDraft.value.trim()
  if (!text || !activeConversation.value) return
  const clientMessageId = createUuid()
  messageDraft.value = ''
  const optimistic: DirectMessage = {
    messageId: `pending-${clientMessageId}`,
    conversationId: activeConversation.value.conversationId,
    senderAccountId: account.value?.id || null,
    clientMessageId,
    text,
    createdAt: new Date().toISOString(),
  }
  messages.value.push(optimistic)
  try {
    const message = await peopleApi.sendMessage(activeConversation.value.conversationId, clientMessageId, text)
    messages.value = messages.value.map(item => item.messageId === optimistic.messageId ? message : item)
    await loadConversations()
  } catch (reason) {
    messages.value = messages.value.filter(item => item.messageId !== optimistic.messageId)
    failedMessages.value.push({ clientMessageId, text })
    error.value = messageOf(reason)
  }
}

async function retryMessage(item: { clientMessageId: string; text: string }) {
  if (!activeConversation.value) return
  try {
    const message = await peopleApi.sendMessage(activeConversation.value.conversationId, item.clientMessageId, item.text)
    if (!messages.value.some(existing => existing.messageId === message.messageId)) messages.value.push(message)
    failedMessages.value = failedMessages.value.filter(failed => failed.clientMessageId !== item.clientMessageId)
  } catch (reason) { error.value = messageOf(reason) }
}

async function reportSelectedMessages() {
  if (!activeConversation.value || !selectedMessageIds.value.length) return
  const reason = window.prompt('请说明举报原因（只会提交选中的消息）')?.trim()
  if (!reason) return
  await peopleApi.reportMessages(activeConversation.value.conversationId, selectedMessageIds.value, reason)
  selectedMessageIds.value = []
  showNotice('举报已提交，仅包含你选中的消息')
}

async function blockConversationUser(blocked: boolean) {
  if (!activeConversation.value) return
  if (blocked && !window.confirm(`确认拉黑 ${activeConversation.value.otherLegalName}？关注和待处理关系邀请会一并清除。`)) return
  await peopleApi.block(activeConversation.value.otherAccountId, blocked)
  blockedAccountIds.value = blocked
    ? [...new Set([...blockedAccountIds.value, activeConversation.value.otherAccountId])]
    : blockedAccountIds.value.filter(id => id !== activeConversation.value?.otherAccountId)
  showNotice(blocked ? '已拉黑，对方无法继续与你互动' : '已解除拉黑')
}

async function loadNetwork() {
  if (!account.value?.verified) return
  ;[relationshipInbox.value, privateRelationships.value] = await Promise.all([
    peopleApi.relationshipInbox(), peopleApi.myRelationships(),
  ])
}

async function resolveRelationship(id: string, accept: boolean) {
  await peopleApi.resolveRelationship(id, accept)
  await Promise.all([loadNetwork(), loadProfile(), refreshAccount()])
  showNotice(accept ? '关系已确认，可分别设置公开状态' : '关系邀请已拒绝')
}

async function setRelationshipVisibility(item: PrivateRelationship, visible: boolean) {
  await peopleApi.setRelationshipVisibility(item.relationshipId, visible)
  await loadNetwork()
}

async function removeRelationship(item: PrivateRelationship) {
  if (!window.confirm(`确认解除与 ${item.legalName} 的关系？此操作不会删除对方账号。`)) return
  await peopleApi.deleteRelationship(item.relationshipId)
  await Promise.all([loadNetwork(), loadProfile()])
}

async function loadNotifications() {
  if (!account.value) return
  notifications.value = (await peopleApi.notifications()).items
}

async function readNotification(item: NotificationItem) {
  if (!item.readAt) await peopleApi.readNotification(item.notificationId)
  if (item.eventType === 'RELATIONSHIP_REQUEST') {
    view.value = 'network'
    await loadNetwork()
  }
  await refreshAccount()
  await loadNotifications()
}

async function readAllNotifications() {
  await peopleApi.readAllNotifications()
  await Promise.all([refreshAccount(), loadNotifications()])
}

async function refreshAccount() {
  account.value = await peopleApi.me()
}

async function requestEmailVerification() {
  const result = await peopleApi.requestEmailVerification()
  testAccountLink.value = result.path
  showNotice(result.testOnly ? '测试验证链接已生成' : '如果邮箱可用，验证邮件会发送到你的邮箱')
}

async function changePassword() {
  await peopleApi.changePassword(security.value.currentPassword, security.value.newPassword)
  account.value = null
  profile.value = null
  showNotice('密码已修改，请重新登录')
}

async function loadSessions() { sessions.value = await peopleApi.sessions() }

async function revokeSession(item: AccountSession) {
  await peopleApi.revokeSession(item.sessionId)
  if (item.current) { account.value = null; profile.value = null } else await loadSessions()
}

async function requestDeletion() {
  if (!window.confirm('注销申请会立即隐藏主页并退出所有设备，30 天内可用邮箱和密码恢复。确认继续？')) return
  await peopleApi.requestDeletion(security.value.deletePassword)
  account.value = null
  profile.value = null
  authMode.value = 'restore'
  showNotice('注销冷静期已开始，可在 30 天内恢复账号')
}

async function requestResetLink() {
  const result = await peopleApi.requestPasswordReset(authEmail.value)
  testAccountLink.value = result.path
  showNotice(result.testOnly ? '测试重置链接已生成' : '如果账号存在，重置邮件会发送到对应邮箱')
}

async function completeReset() {
  await peopleApi.resetPassword(resetToken.value, resetPassword.value)
  authMode.value = 'login'
  showNotice('密码已重置，请重新登录')
}

async function restoreAccount() {
  account.value = await peopleApi.restoreDeletion(authEmail.value, authPassword.value)
  if (account.value.pageId) await loadProfile()
  showNotice('账号已恢复，主页仍保持私密')
}

async function submitFigure() {
  busy.value = true
  try {
    await peopleApi.proposeFigure({
      legalName: figure.value.legalName,
      summary: figure.value.summary,
      citations: [{ type: 'WEB', title: figure.value.sourceTitle, locator: figure.value.sourceUrl }],
    })
    figure.value = { legalName: '', summary: '', sourceTitle: '', sourceUrl: '' }
    showNotice('人物建页提案已提交，线上内容不会被直接覆盖')
  } catch (reason) {
    error.value = messageOf(reason)
  } finally {
    busy.value = false
  }
}

async function exportData() {
  try {
    const data = await peopleApi.exportAccount()
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `people-export-${new Date().toISOString().slice(0, 10)}.json`
    link.click()
    URL.revokeObjectURL(link.href)
  } catch (reason) {
    error.value = messageOf(reason)
  }
}

async function switchView(next: View) {
  view.value = next
  mobileNav.value = false
  error.value = ''
  if (next === 'profile' && account.value?.pageId) await loadProfile()
  if (next === 'network') await loadNetwork()
  if (next === 'messages') await loadConversations()
  if (next === 'notifications') await loadNotifications()
  if (next === 'settings') await loadSessions()
}

function sectionText(section: ProfileSection) {
  const value = section.content.text
  return typeof value === 'string' ? value : ''
}

function setSectionText(section: ProfileSection, value: string) {
  section.content = { ...section.content, text: value }
}

function messageOf(reason: unknown) {
  return reason instanceof Error ? reason.message : '操作失败，请稍后再试'
}

function relationLabel(type: string) {
  return ({ PARENT: '父母', CHILD: '子女', SPOUSE: '配偶', SIBLING: '兄弟姐妹', RELATIVE: '亲属', FRIEND: '朋友' } as Record<string, string>)[type] || type
}

function relationPoint(index: number, total: number) {
  const angle = (-Math.PI / 2) + ((Math.PI * 2 * index) / Math.max(total, 1))
  return {
    x: 50 + Math.cos(angle) * 38,
    y: 50 + Math.sin(angle) * 35,
  }
}

onMounted(async () => {
  const params = new URLSearchParams(window.location.search)
  const verifyEmail = params.get('verifyEmail')
  resetToken.value = params.get('resetPassword') || ''
  if (verifyEmail) {
    try { await peopleApi.verifyEmail(verifyEmail); showNotice('邮箱已验证') } catch (reason) { error.value = messageOf(reason) }
    window.history.replaceState({}, '', '/people/')
  }
  if (resetToken.value) authMode.value = 'reset'
  await initialize()
})
</script>

<template>
  <main class="people-app">
    <div class="grid-field" aria-hidden="true" />

    <section v-if="loading" class="center-state" aria-live="polite">
      <LoaderCircle class="spinner" :size="36" />
      <p>正在打开人物主页</p>
    </section>

    <section v-else-if="!account && !guestBrowsing" class="auth-shell">
      <a class="back-home" href="/"><ArrowLeft :size="18" /> 返回 Pan Portal</a>
      <div class="auth-story">
        <h1>每个人，<br><span class="auth-title-line">都是一张坐标。</span></h1>
        <p>独立维护个人主页，只公开你确认的信息与双方同意的关系。</p>
        <div class="auth-constellation" aria-hidden="true">
          <div class="auth-orbit auth-orbit-outer" />
          <div class="auth-orbit auth-orbit-inner" />
          <svg viewBox="0 0 100 100" preserveAspectRatio="none">
            <line x1="42" y1="50" x2="17" y2="18" />
            <line x1="42" y1="50" x2="82" y2="16" />
            <line x1="42" y1="50" x2="84" y2="82" />
            <line x1="42" y1="50" x2="14" y2="80" />
          </svg>
          <span class="auth-star-core"><b>人物主页</b><small>独立公开坐标</small></span>
          <span class="auth-star-node auth-star-one"><b>人生经历</b><small>自主公开</small></span>
          <span class="auth-star-node auth-star-two"><b>确认关系</b><small>双方同意</small></span>
          <span class="auth-star-node auth-star-three"><b>协作记录</b><small>来源可追溯</small></span>
          <span class="auth-star-node auth-star-four"><b>私信</b><small>仅参与者可见</small></span>
        </div>
      </div>
      <form class="auth-card" @submit.prevent="submitAuth">
        <div class="auth-tabs" role="tablist" aria-label="账号操作">
          <button type="button" :class="{ active: authMode === 'register' }" @click="authMode = 'register'">注册</button>
          <button type="button" :class="{ active: authMode === 'login' }" @click="authMode = 'login'">登录</button>
        </div>
        <p v-if="authMode === 'reset'" class="legal-note">为此账号设置新密码。</p>
        <p v-else-if="authMode === 'restore'" class="legal-note">注销冷静期内，可使用原邮箱和密码恢复账号；主页恢复后仍保持私密。</p>
        <label v-if="authMode !== 'reset'">邮箱<input v-model="authEmail" type="email" autocomplete="email" required></label>
        <label v-if="authMode === 'reset'">新密码<input v-model="resetPassword" type="password" autocomplete="new-password" minlength="7" required><small>至少 7 个字符</small></label>
        <label v-else>密码<input v-model="authPassword" type="password" :autocomplete="authMode === 'login' || authMode === 'restore' ? 'current-password' : 'new-password'" minlength="7" required><small>至少 7 个字符</small></label>
        <p v-if="error" class="form-error">{{ error }}</p>
        <button class="primary-button" type="submit" :disabled="busy">
          <LoaderCircle v-if="busy" class="spinner" :size="18" />
          {{ authMode === 'register' ? '创建独立账号' : authMode === 'reset' ? '重置密码' : authMode === 'restore' ? '恢复账号' : '登录' }}
        </button>
        <button v-if="authMode === 'login'" class="text-button" type="button" @click="requestResetLink">忘记密码，生成重置链接</button>
        <button v-if="authMode === 'login'" class="text-button" type="button" @click="authMode = 'restore'">恢复注销冷静期账号</button>
        <a v-if="testAccountLink" class="test-link" :href="testAccountLink">打开测试环境一次性链接</a>
        <button class="secondary-button" type="button" @click="browsePublic">浏览公开人物</button>
        <p class="legal-note">注册不等于实名认证。公开主页及社交功能需年满 18 岁并完成认证。</p>
      </form>
    </section>

    <template v-else>
      <header class="app-header">
        <a class="brand" href="/people/"><span>人物</span><strong>主页</strong></a>
        <nav :class="{ open: mobileNav }" aria-label="人物主页功能">
          <button v-for="item in visibleNavItems" :key="item.id" type="button" :class="{ active: view === item.id }" @click="switchView(item.id)">
            <component :is="item.icon" :size="18" /> {{ item.label }}
          </button>
        </nav>
        <div class="header-actions">
          <a href="/" aria-label="返回 Pan Portal"><ArrowLeft :size="18" /></a>
          <button v-if="account" type="button" aria-label="退出" @click="logout"><LogOut :size="18" /></button>
          <button v-else class="login-action" type="button" @click="guestBrowsing = false">登录 / 注册</button>
          <button class="menu-button" type="button" aria-label="打开导航" @click="mobileNav = !mobileNav"><Menu :size="21" /></button>
        </div>
      </header>

      <div v-if="notice" class="notice" role="status"><Check :size="18" /> {{ notice }}</div>
      <div v-if="error" class="error-banner" role="alert"><span>{{ error }}</span><button type="button" aria-label="关闭" @click="error = ''"><X :size="17" /></button></div>
      <aside v-if="account && !account.verified" class="draft-banner"><ShieldCheck :size="20" /><div><strong>实名认证暂未开放，当前为私密草稿</strong><p>可以编辑显示名称、简介、模块和头像；发布、关系、关注、私信与人物协作仍保持关闭。</p></div></aside>

      <section v-if="view === 'discover'" class="view-shell discover-view">
        <header class="view-intro">
          <h1>人物与关系，<br><span class="keep-together">汇成可信坐标。</span></h1>
          <p>只搜索已公开的人物主页，不展示邮箱、账号标识或关注名单。</p>
        </header>
        <form class="search-bar" @submit.prevent="searchPeople">
          <Search :size="22" />
          <input v-model="searchQuery" aria-label="搜索真实姓名" placeholder="输入真实姓名" maxlength="80">
          <button type="submit" :disabled="busy">搜索</button>
        </form>
        <div v-if="searchResults.length" class="result-grid">
          <button v-for="item in searchResults" :key="item.pageId" class="person-card" type="button" @click="openProfile(item)">
            <span class="avatar" :class="{ image: item.avatarUrl }"><img v-if="item.avatarUrl" :src="item.avatarUrl" alt=""><span v-else>{{ item.legalName.slice(0, 1) }}</span></span>
            <span class="person-main"><strong>{{ item.legalName }}</strong><small>{{ item.pageType === 'FIGURE' ? '公共人物协作页' : '实名个人主页' }}</small><span>{{ item.bio || '暂未填写个人简介' }}</span></span>
            <ArrowRight :size="20" />
          </button>
        </div>
        <div v-else class="empty-grove">
          <div class="empty-orbit" aria-hidden="true">
            <svg viewBox="0 0 100 100" preserveAspectRatio="none"><line x1="50" y1="50" x2="18" y2="20" /><line x1="50" y1="50" x2="84" y2="18" /><line x1="50" y1="50" x2="83" y2="82" /><line x1="50" y1="50" x2="16" y2="80" /></svg>
            <span class="empty-core">人物索引</span>
            <span class="empty-node empty-node-one">人生经历</span>
            <span class="empty-node empty-node-two">确认关系</span>
            <span class="empty-node empty-node-three">协作记录</span>
            <span class="empty-node empty-node-four">公开主页</span>
          </div>
          <h2>搜索已公开的人物主页</h2><p>未输入姓名时不会展示推荐名单，也不会公开关注者或粉丝名单。</p>
        </div>
      </section>

      <section v-else-if="view === 'profile' && profile" class="view-shell owner-view">
        <header class="view-intro split-intro">
          <div><p class="mark">{{ account?.verified ? '我的实名主页' : '我的私密草稿' }}</p><h1>{{ profile.legalName }}</h1><p>{{ account?.verified ? '实名姓名、出生日期和性别来自认证结果，只能通过重新认证变更。' : '显示名称只保存在草稿中；完成实名认证后会由认证姓名替换。' }}</p></div>
          <div class="publish-state"><span :class="profile.status.toLowerCase()">{{ profile.status === 'PUBLISHED' ? '已公开' : '未公开' }}</span><a v-if="publicUrl" :href="publicUrl" target="_blank" rel="noreferrer"><Eye :size="17" /> 查看公开页</a></div>
        </header>
        <div class="owner-grid">
          <form class="editor-card" @submit.prevent="saveProfile">
            <label v-if="!account?.verified">草稿显示名称<input v-model="editor.displayName" minlength="2" maxlength="80" required></label>
            <section class="avatar-editor" aria-labelledby="avatar-editor-title">
              <span class="avatar-editor-preview"><img v-if="profile.avatarUrl" :src="profile.avatarUrl" alt="当前头像"><span v-else>{{ profile.legalName.slice(0, 1) }}</span></span>
              <div><strong id="avatar-editor-title">主页头像</strong><small>选择 128×128 至 4096×4096 的 JPEG 或 PNG，最大 5 MB。服务端会验证真实文件格式。</small>
                <div class="avatar-actions">
                  <label class="avatar-upload-button"><ImageUp :size="17" />{{ avatarUploading ? '上传中…' : (profile.avatarUrl ? '更换头像' : '上传头像') }}<input type="file" accept="image/jpeg,image/png" :disabled="avatarUploading" @change="uploadAvatar"></label>
                  <button v-if="profile.avatarUrl" class="avatar-delete-button" type="button" :disabled="avatarUploading" @click="deleteAvatar"><Trash2 :size="16" /> 删除</button>
                </div>
              </div>
            </section>
            <label>个人简介<textarea v-model="editor.bio" rows="5" maxlength="1200" required /></label>
            <div class="field-row">
              <label v-if="account?.verified">生日公开范围<select v-model="editor.birthVisibility"><option value="YEAR_MONTH">年月</option><option value="FULL">完整日期</option><option value="HIDDEN">隐藏</option></select></label>
              <label v-if="account?.verified" class="switch-label"><span>允许关注者私信</span><input v-model="editor.allowFollowerDm" type="checkbox"></label>
            </div>
            <div class="section-heading"><h2>结构化模块</h2><button type="button" @click="addSection"><Plus :size="17" /> 添加</button></div>
            <article v-for="(section, index) in sections" :key="section.id || index" class="section-editor">
              <div class="field-row"><label>类型<select v-model="section.type"><option value="CUSTOM_TEXT">自定义文字</option><option value="LOCATION">居住地与家乡</option><option value="EDUCATION">教育经历</option><option value="WORK">工作经历</option><option value="LIFE_EVENT">人生经历</option><option value="INTEREST">兴趣与技能</option><option value="WORKS">作品与项目</option><option value="ACHIEVEMENT">荣誉与成就</option><option value="PUBLIC_LINK">公开链接</option></select></label><button class="icon-danger" type="button" aria-label="删除模块" @click="removeSection(index)"><Trash2 :size="18" /></button></div>
              <label>标题<input v-model="section.title" maxlength="100"></label>
              <label>内容<textarea :value="sectionText(section)" rows="3" maxlength="4000" @input="setSectionText(section, ($event.target as HTMLTextAreaElement).value)" /></label>
            </article>
            <button class="primary-button" type="submit" :disabled="busy"><Save :size="18" /> 保存草稿</button>
          </form>
          <aside class="profile-preview" data-folio="02">
            <div class="preview-orbits" aria-hidden="true"><i /><i /><i /></div>
            <span class="preview-avatar"><img v-if="profile.avatarUrl" :src="profile.avatarUrl" alt=""><span v-else>{{ profile.legalName.slice(0, 1) }}</span></span>
            <p class="mark">{{ account?.verified ? '公开预览' : '私密草稿预览' }}</p><h2>{{ editor.displayName || profile.legalName }}</h2><p>{{ editor.bio || '填写个人简介后才能发布。' }}</p>
            <dl><div><dt>生日</dt><dd>{{ editor.birthVisibility === 'HIDDEN' ? '不公开' : profile.displayedBirthDate }}</dd></div><div><dt>关注</dt><dd>{{ profile.followingCount }}</dd></div><div><dt>粉丝</dt><dd>{{ profile.followerCount }}</dd></div></dl>
            <section v-for="section in sections.filter(item => sectionText(item).trim())" :key="section.id || section.position"><h3>{{ section.title || '未命名模块' }}</h3><p>{{ sectionText(section) }}</p></section>
            <button v-if="account?.verified" class="publish-button" type="button" :disabled="busy" @click="togglePublish"><EyeOff v-if="profile.status === 'PUBLISHED'" :size="18" /><Sparkles v-else :size="18" />{{ profile.status === 'PUBLISHED' ? '取消公开' : '确认并发布' }}</button>
            <button class="export-button" type="button" @click="exportData"><Download :size="17" /> 导出我的数据</button>
          </aside>
        </div>
      </section>

      <section v-else-if="view === 'network' && profile" class="view-shell network-view">
        <header class="view-intro"><p class="mark">直接关系</p><h1>关系公开，需要双方同意。</h1><p>第一版只展示当前主页的直接关系，不推导朋友的朋友、远亲或共同关系。</p></header>
        <section v-if="relationshipInbox.length" class="inbox-card"><header><div><p class="mark">待确认</p><h2>关系邀请</h2></div><span>{{ relationshipInbox.length }}</span></header><article v-for="item in relationshipInbox" :key="item.requestId"><div><strong>{{ item.requesterLegalName }}</strong><small>希望确认：{{ relationLabel(item.relationshipType) }}</small></div><div><button type="button" @click="resolveRelationship(item.requestId, false)">拒绝</button><button class="primary-button" type="button" @click="resolveRelationship(item.requestId, true)">接受</button></div></article></section>
        <div class="branch-band constellation-map" :class="{ empty: !privateRelationships.length }">
          <svg v-if="privateRelationships.length" class="relation-lines" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
            <line v-for="(relation, index) in privateRelationships" :key="`line-${relation.relationshipId}`" x1="50" y1="50" :x2="relationPoint(index, privateRelationships.length).x" :y2="relationPoint(index, privateRelationships.length).y" />
          </svg>
          <div class="orbit-ring orbit-ring-one" aria-hidden="true" />
          <div class="orbit-ring orbit-ring-two" aria-hidden="true" />
          <div class="self-node"><span>{{ profile.legalName.slice(0, 1) }}</span><strong>{{ profile.legalName }}</strong><small>我的主页</small></div>
          <template v-if="privateRelationships.length">
            <article v-for="(relation, index) in privateRelationships" :key="relation.relationshipId" class="relation-node" :style="{ left: `${relationPoint(index, privateRelationships.length).x}%`, top: `${relationPoint(index, privateRelationships.length).y}%` }"><span>{{ relation.legalName.slice(0, 1) }}</span><div><strong>{{ relation.legalName }}</strong><small>{{ relationLabel(relation.relationshipType) }}</small></div></article>
          </template>
          <p v-else class="network-empty">还没有双方同意公开的直接关系。</p>
        </div>
        <div v-if="privateRelationships.length" class="relationship-list"><article v-for="item in privateRelationships" :key="item.relationshipId"><div><strong>{{ item.legalName }}</strong><small>{{ relationLabel(item.relationshipType) }} · {{ item.publicOnBothSides ? '双方已公开' : item.visibleByMe ? '等待对方公开' : '仅自己可见' }}</small></div><label class="switch-label"><span>我同意公开</span><input type="checkbox" :checked="item.visibleByMe" @change="setRelationshipVisibility(item, ($event.target as HTMLInputElement).checked)"></label><button class="icon-danger" type="button" @click="removeRelationship(item)"><Trash2 :size="17" /> 解除</button></article></div>
        <aside class="privacy-callout"><ShieldCheck :size="25" /><div><h2>公开是两次独立授权</h2><p>任一方撤回公开授权后，关系会立即从双方公开主页消失，但私密关系仍保留。</p></div></aside>
      </section>

      <section v-else-if="view === 'messages'" class="view-shell message-view">
        <header class="view-intro"><p class="mark">私信</p><h1>只在参与者之间。</h1><p>关注对方公开主页后才能发起纯文字私信。管理员不能任意浏览，只有举报的具体消息和有限上下文可以按目的审查。</p></header>
        <div class="messages-layout">
          <aside class="conversation-list"><button v-for="item in conversations" :key="item.conversationId" type="button" :class="{ active: activeConversation?.conversationId === item.conversationId }" @click="selectConversation(item)"><span>{{ item.otherLegalName.slice(0, 1) }}</span><div><strong>{{ item.otherLegalName }}</strong><small>{{ item.lastMessagePreview || '尚无消息' }}</small></div><b v-if="item.unreadCount">{{ item.unreadCount }}</b></button><p v-if="!conversations.length">还没有私信会话。关注公开主页后，可以从人物详情发起。</p></aside>
          <section class="thread-panel"><template v-if="activeConversation"><header><MessageCircle :size="20" /><strong>{{ activeConversation.otherLegalName }}</strong><div class="thread-actions"><button type="button" :disabled="!selectedMessageIds.length" @click="reportSelectedMessages">举报所选</button><button type="button" @click="blockConversationUser(!blockedAccountIds.includes(activeConversation.otherAccountId))">{{ blockedAccountIds.includes(activeConversation.otherAccountId) ? '解除拉黑' : '拉黑' }}</button></div></header><div class="message-scroll"><button v-if="messageCursor" class="load-older" type="button" @click="loadOlderMessages">加载更早消息</button><article v-for="message in messages" :key="message.messageId" :class="{ mine: message.senderAccountId === account?.id }"><label class="message-select"><input v-model="selectedMessageIds" type="checkbox" :value="message.messageId"><span class="sr-only">选择此消息</span></label><p>{{ message.text }}</p><time>{{ new Date(message.createdAt).toLocaleString('zh-CN') }}</time></article><article v-for="failed in failedMessages" :key="failed.clientMessageId" class="mine failed-message"><p>{{ failed.text }}</p><button type="button" @click="retryMessage(failed)">发送失败，点击重试</button></article></div><form @submit.prevent="sendMessage"><textarea v-model="messageDraft" rows="2" maxlength="4000" placeholder="输入纯文字或 Unicode 表情" aria-label="私信内容" /><button type="submit" :disabled="!messageDraft.trim() || blockedAccountIds.includes(activeConversation.otherAccountId)"><Send :size="18" /> 发送</button></form></template><div v-else class="thread-empty"><Mail :size="32" /><p>选择一条私信会话</p></div></section>
        </div>
      </section>

      <section v-else-if="view === 'notifications'" class="view-shell utility-view">
        <header class="view-intro split-intro"><div><p class="mark">通知中心</p><h1>所有待确认，一处处理。</h1><p>通知只显示必要摘要；关系邀请仍需进入关系页明确接受或拒绝。</p></div><button v-if="notifications.some(item => !item.readAt)" class="secondary-button" type="button" @click="readAllNotifications">全部标为已读</button></header>
        <div class="notification-list"><button v-for="item in notifications" :key="item.notificationId" type="button" :class="{ unread: !item.readAt }" @click="readNotification(item)"><span class="notification-dot" /><div><strong>{{ item.summary }}</strong><small>{{ new Date(item.createdAt).toLocaleString('zh-CN') }}</small></div><ArrowRight :size="18" /></button><p v-if="!notifications.length" class="empty-copy">暂时没有通知。</p></div>
      </section>

      <section v-else-if="view === 'settings' && account" class="view-shell utility-view">
        <header class="view-intro"><p class="mark">账号与安全</p><h1>账号安全，<br><span class="keep-together">尽在掌控。</span></h1><p>People 账号与 Pan Chat 完全独立。导出只包含 People 边界内与你有关的数据。</p></header>
        <div class="settings-grid">
          <section class="settings-card"><header><Mail :size="21" /><div><h2>邮箱验证</h2><p>{{ account.email }}</p></div><span :class="account.emailVerified ? 'status-ok' : 'status-warn'">{{ account.emailVerified ? '已验证' : '未验证' }}</span></header><button v-if="!account.emailVerified" class="secondary-button" type="button" @click="requestEmailVerification">生成验证链接</button><a v-if="testAccountLink" class="test-link" :href="testAccountLink">打开测试环境一次性链接</a></section>
          <form class="settings-card" @submit.prevent="changePassword"><header><KeyRound :size="21" /><div><h2>修改密码</h2><p>修改后会退出所有设备。</p></div></header><label>当前密码<input v-model="security.currentPassword" type="password" autocomplete="current-password" required></label><label>新密码<input v-model="security.newPassword" type="password" autocomplete="new-password" minlength="7" required></label><button class="primary-button" type="submit">修改并退出</button></form>
          <section class="settings-card sessions-card"><header><ShieldCheck :size="21" /><div><h2>登录设备</h2><p>撤销不认识或不再使用的会话。</p></div></header><article v-for="item in sessions" :key="item.sessionId"><div><strong>{{ item.current ? '当前设备' : (item.userAgent || '未知浏览器') }}</strong><small>{{ item.ipAddress || '未知地址' }} · 最近 {{ new Date(item.lastSeenAt).toLocaleString('zh-CN') }}</small></div><button type="button" @click="revokeSession(item)">{{ item.current ? '退出' : '撤销' }}</button></article></section>
          <section class="settings-card privacy-card"><header><Download :size="21" /><div><h2>导出与缓存说明</h2><p>导出包含主页、关系与邀请、关注、完整私信、通知、举报、协作与审计记录。</p></div></header><p>取消公开后，People 会立即拒绝公开访问；搜索引擎和浏览器既有快照仍可能需要一段时间更新。头像公开缓存最长 60 秒并强制重新验证。</p><button class="secondary-button" type="button" @click="exportData">导出 JSON</button></section>
          <form class="settings-card danger-card" @submit.prevent="requestDeletion"><header><Trash2 :size="21" /><div><h2>申请注销</h2><p>主页立即转为私密，30 天后永久匿名化；冷静期内可用原邮箱和密码恢复。</p></div></header><p>永久处理会删除邮箱、密码、身份记录、头像、主页内容、关系、关注和通知。未被举报的本人私信正文会清除；已举报消息和必要审计按争议处理需要保留，但不再关联你的可登录身份。对方自己的消息不会被误删。</p><label>输入当前密码<input v-model="security.deletePassword" type="password" autocomplete="current-password" required></label><button type="submit">确认申请注销</button></form>
        </div>
      </section>

      <section v-else-if="view === 'contribute'" class="view-shell contribute-view">
        <header class="view-intro"><p class="mark">公共人物记忆</p><h1>每一次修订，都带着来源。</h1><p>建页和修订不会直接覆盖线上内容。提案保留基准版本、来源、提交者与审核结果；提交人不能审核自己的修订。</p></header>
        <form class="proposal-form" @submit.prevent="submitFigure"><label>人物标准姓名<input v-model="figure.legalName" maxlength="80" required></label><label>建页说明<textarea v-model="figure.summary" rows="4" maxlength="500" required /></label><label>来源标题<input v-model="figure.sourceTitle" maxlength="300" required></label><label>来源 HTTPS 地址<input v-model="figure.sourceUrl" type="url" placeholder="https://…" required></label><button class="primary-button" type="submit" :disabled="busy"><BookOpen :size="18" /> 提交建页提案</button></form>
        <aside class="governance-list"><h2>首版治理边界</h2><ul><li>普通非公众人物不能由第三方建页</li><li>在世公众人物认领不能只凭同名通过</li><li>本人区与史料区采用不同维护权限</li><li>争议内容可紧急隐藏，但版本证据和审计保留</li></ul></aside>
      </section>

      <section v-else class="view-shell center-state"><LoaderCircle class="spinner" :size="30" /></section>

      <div v-if="selectedProfile" class="profile-drawer-backdrop" @click.self="selectedProfile = null">
        <aside class="profile-drawer" role="dialog" aria-modal="true" :aria-label="`${selectedProfile.legalName}的公开主页`">
          <button class="drawer-close" type="button" aria-label="关闭" @click="selectedProfile = null"><X :size="20" /></button>
          <span class="drawer-avatar"><img v-if="selectedProfile.avatarUrl" :src="selectedProfile.avatarUrl" alt=""><span v-else>{{ selectedProfile.legalName.slice(0, 1) }}</span></span>
          <p class="mark">{{ selectedProfile.pageType === 'FIGURE' ? '公共人物协作页' : '实名个人主页' }}</p>
          <h2>{{ selectedProfile.legalName }}</h2><p>{{ selectedProfile.bio }}</p>
          <dl><div><dt>生日</dt><dd>{{ selectedProfile.displayedBirthDate || '未公开' }}</dd></div><div><dt>关注</dt><dd>{{ selectedProfile.followingCount }}</dd></div><div><dt>粉丝</dt><dd>{{ selectedProfile.followerCount }}</dd></div></dl>
          <section v-for="section in selectedProfile.sections" :key="section.id"><h3>{{ section.title || section.type }}</h3><p>{{ sectionText(section) }}</p></section>
          <div v-if="account?.verified" class="drawer-actions"><button type="button" @click="toggleFollow"><Heart :size="18" :fill="selectedProfile.followedByMe ? 'currentColor' : 'none'" />{{ selectedProfile.followedByMe ? '取消关注' : '关注' }}</button><button type="button" :disabled="!selectedProfile.followedByMe" @click="startConversation"><MessageCircle :size="18" /> 私信</button></div>
          <div v-if="account?.verified && selectedProfile.pageType === 'PERSONAL'" class="relationship-action"><select v-model="relationshipType" aria-label="关系类型"><option value="FRIEND">朋友</option><option value="RELATIVE">亲属</option><option value="SIBLING">兄弟姐妹</option><option value="PARENT">父母</option><option value="CHILD">子女</option><option value="SPOUSE">配偶</option></select><button type="button" @click="requestRelationship"><UserPlus :size="18" /> 邀请确认关系</button></div>
          <a class="server-page-link" :href="`/people/p/${selectedProfile.pageId}/${selectedProfile.slug}`" target="_blank" rel="noreferrer"><Eye :size="17" /> 打开可抓取公开页</a>
        </aside>
      </div>
    </template>
  </main>
</template>
