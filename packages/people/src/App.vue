<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  BookOpen,
  Check,
  CircleUserRound,
  Download,
  Eye,
  EyeOff,
  Heart,
  LoaderCircle,
  LogOut,
  Mail,
  Menu,
  MessageCircle,
  Network,
  Plus,
  Save,
  Search,
  Send,
  ShieldCheck,
  Sparkles,
  Trash2,
  UserPlus,
  X,
} from 'lucide-vue-next'
import { ApiError, peopleApi } from './api'
import type { Account, Conversation, DirectMessage, Profile, ProfileSection } from './types'

type View = 'discover' | 'profile' | 'network' | 'messages' | 'contribute'

const loading = ref(true)
const busy = ref(false)
const account = ref<Account | null>(null)
const view = ref<View>('discover')
const mobileNav = ref(false)
const error = ref('')
const notice = ref('')
const authMode = ref<'login' | 'register'>('register')
const authEmail = ref('')
const authPassword = ref('')

const verification = ref({
  legalName: '', birthDate: '', gender: 'UNDISCLOSED', identityNumber: '', consent: false,
})
const profile = ref<Profile | null>(null)
const editor = ref({ avatarUrl: '', bio: '', birthVisibility: 'YEAR_MONTH', allowFollowerDm: true })
const sections = ref<ProfileSection[]>([])

const searchQuery = ref('')
const searchResults = ref<Profile[]>([])
const selectedProfile = ref<Profile | null>(null)
const relationshipType = ref('FRIEND')
const conversations = ref<Conversation[]>([])
const activeConversation = ref<Conversation | null>(null)
const messages = ref<DirectMessage[]>([])
const messageDraft = ref('')
const figure = ref({ legalName: '', summary: '', sourceTitle: '', sourceUrl: '' })

const navItems: Array<{ id: View; label: string; icon: typeof Search }> = [
  { id: 'discover', label: '搜索人物', icon: Search },
  { id: 'profile', label: '我的主页', icon: CircleUserRound },
  { id: 'network', label: '关系网络', icon: Network },
  { id: 'messages', label: '私信', icon: Mail },
  { id: 'contribute', label: '人物协作', icon: BookOpen },
]

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
    if (account.value.verified) await loadProfile()
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
    if (account.value.verified) await loadProfile()
  } catch (reason) {
    error.value = messageOf(reason)
  } finally {
    busy.value = false
  }
}

async function logout() {
  await peopleApi.logout().catch(() => undefined)
  account.value = null
  profile.value = null
  selectedProfile.value = null
}

async function verifyIdentity() {
  if (!verification.value.consent) {
    error.value = '请先阅读并同意本地模拟认证说明'
    return
  }
  error.value = ''
  busy.value = true
  try {
    const started = await peopleApi.startVerification({
      legalName: verification.value.legalName,
      birthDate: verification.value.birthDate,
      gender: verification.value.gender,
      identityNumber: verification.value.identityNumber,
      consentVersion: 'local-mock-v1',
    })
    if (!started.simulated) {
      window.location.assign(started.certifyUrl || '/people/')
      return
    }
    await peopleApi.completeVerification(started.verificationId)
    account.value = await peopleApi.me()
    verification.value.identityNumber = ''
    await loadProfile()
    view.value = 'profile'
    showNotice('本地模拟认证已完成；这不代表真实阿里云认证')
  } catch (reason) {
    error.value = messageOf(reason)
  } finally {
    busy.value = false
  }
}

async function loadProfile() {
  profile.value = await peopleApi.myProfile()
  editor.value = {
    avatarUrl: profile.value.avatarUrl || '',
    bio: profile.value.bio || '',
    birthVisibility: profile.value.birthVisibility,
    allowFollowerDm: profile.value.allowFollowerDm,
  }
  sections.value = profile.value.sections.map(section => ({ ...section, content: { ...section.content } }))
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
  conversations.value = await peopleApi.conversations()
}

async function selectConversation(item: Conversation) {
  activeConversation.value = item
  await loadMessages()
}

async function loadMessages() {
  if (!activeConversation.value) return
  messages.value = (await peopleApi.messages(activeConversation.value.conversationId)).items
}

async function sendMessage() {
  const text = messageDraft.value.trim()
  if (!text || !activeConversation.value) return
  const clientMessageId = createUuid()
  messageDraft.value = ''
  try {
    const message = await peopleApi.sendMessage(activeConversation.value.conversationId, clientMessageId, text)
    if (!messages.value.some(item => item.messageId === message.messageId)) messages.value.push(message)
    await loadConversations()
  } catch (reason) {
    messageDraft.value = text
    error.value = messageOf(reason)
  }
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
  if (next === 'profile' && account.value?.verified) await loadProfile()
  if (next === 'messages') await loadConversations()
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

onMounted(initialize)
</script>

<template>
  <main class="people-app">
    <div class="grain" aria-hidden="true" />

    <section v-if="loading" class="center-state" aria-live="polite">
      <LoaderCircle class="spinner" :size="36" />
      <p>正在打开人物主页</p>
    </section>

    <section v-else-if="!account" class="auth-shell">
      <a class="back-home" href="/"><ArrowLeft :size="18" /> 返回 Pan Portal</a>
      <div class="auth-story">
        <p class="mark">人物主页</p>
        <h1>真实身份，<br>由自己书写。</h1>
        <p>独立账号、独立数据边界。公开主页可以被匿名访问和搜索引擎收录；关系必须双方确认，私信只属于参与者。</p>
        <div class="boundary-list">
          <span><ShieldCheck :size="18" /> 不连接 Pan Chat 记忆</span>
          <span><Network :size="18" /> 只展示双方同意的直接关系</span>
          <span><BookOpen :size="18" /> 公共人物修订保留来源与版本</span>
        </div>
      </div>
      <form class="auth-card" @submit.prevent="authenticate">
        <div class="auth-tabs" role="tablist" aria-label="账号操作">
          <button type="button" :class="{ active: authMode === 'register' }" @click="authMode = 'register'">注册</button>
          <button type="button" :class="{ active: authMode === 'login' }" @click="authMode = 'login'">登录</button>
        </div>
        <label>邮箱<input v-model="authEmail" type="email" autocomplete="email" required></label>
        <label>密码<input v-model="authPassword" type="password" :autocomplete="authMode === 'login' ? 'current-password' : 'new-password'" minlength="10" required></label>
        <p v-if="error" class="form-error">{{ error }}</p>
        <button class="primary-button" type="submit" :disabled="busy">
          <LoaderCircle v-if="busy" class="spinner" :size="18" />
          {{ authMode === 'register' ? '创建独立账号' : '登录' }}
        </button>
        <p class="legal-note">注册不等于实名认证。公开主页及社交功能需年满 18 岁并完成认证。</p>
      </form>
    </section>

    <section v-else-if="!account.verified" class="verification-shell">
      <header class="simple-header">
        <a href="/"><ArrowLeft :size="18" /> Pan Portal</a>
        <button type="button" @click="logout"><LogOut :size="17" /> 退出</button>
      </header>
      <div class="verification-copy">
        <BadgeCheck :size="48" :stroke-width="1.4" />
        <p class="mark">独立实名认证</p>
        <h1>一人一页，从真实身份开始。</h1>
        <p>当前 mm 环境只启用本地模拟适配器，用于验证年龄、一人一页和数据最小化。它不会调用阿里云，也不代表真实认证通过。</p>
      </div>
      <form class="verification-form" @submit.prevent="verifyIdentity">
        <label>真实姓名<input v-model="verification.legalName" autocomplete="name" minlength="2" maxlength="80" required></label>
        <div class="field-row">
          <label>出生日期<input v-model="verification.birthDate" type="date" required></label>
          <label>性别<select v-model="verification.gender"><option value="FEMALE">女</option><option value="MALE">男</option><option value="OTHER">其他</option><option value="UNDISCLOSED">不公开说明</option></select></label>
        </div>
        <label>本地模拟身份号码<input v-model="verification.identityNumber" autocomplete="off" minlength="6" maxlength="40" required><small>只在本次请求内存中计算 HMAC 指纹，不保存原值。</small></label>
        <label class="consent"><input v-model="verification.consent" type="checkbox"> <span>我已年满 18 岁，并同意仅为本地功能验证处理上述信息。</span></label>
        <p v-if="error" class="form-error">{{ error }}</p>
        <button class="primary-button" type="submit" :disabled="busy">完成本地模拟认证</button>
      </form>
    </section>

    <template v-else>
      <header class="app-header">
        <a class="brand" href="/people/"><span>人物</span><strong>主页</strong></a>
        <nav :class="{ open: mobileNav }" aria-label="人物主页功能">
          <button v-for="item in navItems" :key="item.id" type="button" :class="{ active: view === item.id }" @click="switchView(item.id)">
            <component :is="item.icon" :size="18" /> {{ item.label }}
          </button>
        </nav>
        <div class="header-actions">
          <a href="/" aria-label="返回 Pan Portal"><ArrowLeft :size="18" /></a>
          <button type="button" aria-label="退出" @click="logout"><LogOut :size="18" /></button>
          <button class="menu-button" type="button" aria-label="打开导航" @click="mobileNav = !mobileNav"><Menu :size="21" /></button>
        </div>
      </header>

      <div v-if="notice" class="notice" role="status"><Check :size="18" /> {{ notice }}</div>
      <div v-if="error" class="error-banner" role="alert"><span>{{ error }}</span><button type="button" aria-label="关闭" @click="error = ''"><X :size="17" /></button></div>

      <section v-if="view === 'discover'" class="view-shell discover-view">
        <header class="view-intro">
          <p class="mark">公开人物索引</p>
          <h1>按真实姓名，找到一张可信的主页。</h1>
          <p>只搜索已公开的实名个人主页和审核后的人物主页。结果不包含邮箱、账号标识、身份指纹或关注名单。</p>
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
        <div v-else class="empty-grove"><Search :size="32" /><h2>搜索已公开的人物主页</h2><p>未输入姓名时不会展示推荐名单，也不会公开关注者或粉丝名单。</p></div>
      </section>

      <section v-else-if="view === 'profile' && profile" class="view-shell owner-view">
        <header class="view-intro split-intro">
          <div><p class="mark">我的实名主页</p><h1>{{ profile.legalName }}</h1><p>实名姓名、出生日期和性别来自认证结果，只能通过重新认证变更。</p></div>
          <div class="publish-state"><span :class="profile.status.toLowerCase()">{{ profile.status === 'PUBLISHED' ? '已公开' : '未公开' }}</span><a v-if="publicUrl" :href="publicUrl" target="_blank" rel="noreferrer"><Eye :size="17" /> 查看公开页</a></div>
        </header>
        <div class="owner-grid">
          <form class="editor-card" @submit.prevent="saveProfile">
            <label>头像 HTTPS 地址<input v-model="editor.avatarUrl" type="url" placeholder="https://…" required><small>真实媒体上传等待独立 OSS 获得批准；当前不保存本地图片或认证媒体。</small></label>
            <label>个人简介<textarea v-model="editor.bio" rows="5" maxlength="1200" required /></label>
            <div class="field-row">
              <label>生日公开范围<select v-model="editor.birthVisibility"><option value="YEAR_MONTH">年月</option><option value="FULL">完整日期</option><option value="HIDDEN">隐藏</option></select></label>
              <label class="switch-label"><span>允许关注者私信</span><input v-model="editor.allowFollowerDm" type="checkbox"></label>
            </div>
            <div class="section-heading"><h2>结构化模块</h2><button type="button" @click="addSection"><Plus :size="17" /> 添加</button></div>
            <article v-for="(section, index) in sections" :key="section.id || index" class="section-editor">
              <div class="field-row"><label>类型<select v-model="section.type"><option value="CUSTOM_TEXT">自定义文字</option><option value="LOCATION">居住地与家乡</option><option value="EDUCATION">教育经历</option><option value="WORK">工作经历</option><option value="LIFE_EVENT">人生经历</option><option value="INTEREST">兴趣与技能</option><option value="WORKS">作品与项目</option><option value="ACHIEVEMENT">荣誉与成就</option><option value="PUBLIC_LINK">公开链接</option></select></label><button class="icon-danger" type="button" aria-label="删除模块" @click="removeSection(index)"><Trash2 :size="18" /></button></div>
              <label>标题<input v-model="section.title" maxlength="100"></label>
              <label>内容<textarea :value="sectionText(section)" rows="3" maxlength="4000" @input="setSectionText(section, ($event.target as HTMLTextAreaElement).value)" /></label>
            </article>
            <button class="primary-button" type="submit" :disabled="busy"><Save :size="18" /> 保存草稿</button>
          </form>
          <aside class="profile-preview">
            <span class="preview-avatar"><img v-if="editor.avatarUrl" :src="editor.avatarUrl" alt=""><span v-else>{{ profile.legalName.slice(0, 1) }}</span></span>
            <p class="mark">公开预览</p><h2>{{ profile.legalName }}</h2><p>{{ editor.bio || '填写个人简介后才能发布。' }}</p>
            <dl><div><dt>生日</dt><dd>{{ editor.birthVisibility === 'HIDDEN' ? '不公开' : profile.displayedBirthDate }}</dd></div><div><dt>关注</dt><dd>{{ profile.followingCount }}</dd></div><div><dt>粉丝</dt><dd>{{ profile.followerCount }}</dd></div></dl>
            <section v-for="section in sections.filter(item => sectionText(item).trim())" :key="section.id || section.position"><h3>{{ section.title || '未命名模块' }}</h3><p>{{ sectionText(section) }}</p></section>
            <button class="publish-button" type="button" :disabled="busy" @click="togglePublish"><EyeOff v-if="profile.status === 'PUBLISHED'" :size="18" /><Sparkles v-else :size="18" />{{ profile.status === 'PUBLISHED' ? '取消公开' : '确认并发布' }}</button>
            <button class="export-button" type="button" @click="exportData"><Download :size="17" /> 导出我的数据</button>
          </aside>
        </div>
      </section>

      <section v-else-if="view === 'network' && profile" class="view-shell network-view">
        <header class="view-intro"><p class="mark">直接关系</p><h1>双方都同意，关系才会出现在这里。</h1><p>第一版只展示当前主页的直接关系，不推导朋友的朋友、远亲或共同关系。</p></header>
        <div class="branch-band" :class="{ empty: !profile.relationships.length }">
          <div class="self-node"><span>{{ profile.legalName.slice(0, 1) }}</span><strong>{{ profile.legalName }}</strong></div>
          <template v-if="profile.relationships.length">
            <article v-for="relation in profile.relationships" :key="relation.relationshipId" class="relation-node"><span>{{ relation.legalName.slice(0, 1) }}</span><div><strong>{{ relation.legalName }}</strong><small>{{ relationLabel(relation.relationshipType) }}</small></div></article>
          </template>
          <p v-else>还没有双方同意公开的直接关系。</p>
        </div>
        <aside class="privacy-callout"><ShieldCheck :size="25" /><div><h2>公开是两次独立授权</h2><p>任一方撤回公开授权后，关系会立即从双方公开主页消失，但私密关系仍保留。</p></div></aside>
      </section>

      <section v-else-if="view === 'messages'" class="view-shell message-view">
        <header class="view-intro"><p class="mark">私信</p><h1>只在参与者之间。</h1><p>关注对方公开主页后才能发起纯文字私信。管理员不能任意浏览，只有举报的具体消息和有限上下文可以按目的审查。</p></header>
        <div class="messages-layout">
          <aside class="conversation-list"><button v-for="item in conversations" :key="item.conversationId" type="button" :class="{ active: activeConversation?.conversationId === item.conversationId }" @click="selectConversation(item)"><span>{{ item.otherLegalName.slice(0, 1) }}</span><div><strong>{{ item.otherLegalName }}</strong><small>{{ item.lastMessagePreview || '尚无消息' }}</small></div><b v-if="item.unreadCount">{{ item.unreadCount }}</b></button><p v-if="!conversations.length">还没有私信会话。关注公开主页后，可以从人物详情发起。</p></aside>
          <section class="thread-panel"><template v-if="activeConversation"><header><MessageCircle :size="20" /><strong>{{ activeConversation.otherLegalName }}</strong></header><div class="message-scroll"><article v-for="message in messages" :key="message.messageId" :class="{ mine: message.senderAccountId === account.id }"><p>{{ message.text }}</p><time>{{ new Date(message.createdAt).toLocaleString('zh-CN') }}</time></article></div><form @submit.prevent="sendMessage"><textarea v-model="messageDraft" rows="2" maxlength="4000" placeholder="输入纯文字或 Unicode 表情" aria-label="私信内容" /><button type="submit" :disabled="!messageDraft.trim()"><Send :size="18" /> 发送</button></form></template><div v-else class="thread-empty"><Mail :size="32" /><p>选择一条私信会话</p></div></section>
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
          <div class="drawer-actions"><button type="button" @click="toggleFollow"><Heart :size="18" :fill="selectedProfile.followedByMe ? 'currentColor' : 'none'" />{{ selectedProfile.followedByMe ? '取消关注' : '关注' }}</button><button type="button" :disabled="!selectedProfile.followedByMe" @click="startConversation"><MessageCircle :size="18" /> 私信</button></div>
          <div v-if="selectedProfile.pageType === 'PERSONAL'" class="relationship-action"><select v-model="relationshipType" aria-label="关系类型"><option value="FRIEND">朋友</option><option value="RELATIVE">亲属</option><option value="SIBLING">兄弟姐妹</option><option value="PARENT">父母</option><option value="CHILD">子女</option><option value="SPOUSE">配偶</option></select><button type="button" @click="requestRelationship"><UserPlus :size="18" /> 邀请确认关系</button></div>
          <a class="server-page-link" :href="`/people/p/${selectedProfile.pageId}/${selectedProfile.slug}`" target="_blank" rel="noreferrer"><Eye :size="17" /> 打开可抓取公开页</a>
        </aside>
      </div>
    </template>
  </main>
</template>
