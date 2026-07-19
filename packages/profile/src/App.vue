<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import {
  ArrowLeft,
  Award,
  Check,
  Copy,
  Eye,
  Heart,
  ImagePlus,
  LoaderCircle,
  Plus,
  Save,
  Trash2,
  X,
} from 'lucide-vue-next'
import { ApiError, getMyProfile, getPublishedProfile, saveMyProfile } from './api'
import ProfileDisplay from './components/ProfileDisplay.vue'
import type { Achievement, UserProfile } from './types'

const params = new URLSearchParams(window.location.search)
const publicUserId = params.get('user')?.trim() || ''
const isPublicView = Boolean(publicUserId)
const isLoading = ref(true)
const isSaving = ref(false)
const loadError = ref('')
const formError = ref('')
const savedMessage = ref('')
const interestInput = ref('')
const avatarInput = ref<HTMLInputElement | null>(null)
const profile = ref<UserProfile>(emptyProfile())

const publicUrl = computed(() => {
  if (!profile.value.userId) return ''
  return `${window.location.origin}/profile/?user=${encodeURIComponent(profile.value.userId)}`
})

function emptyProfile(): UserProfile {
  return {
    userId: '',
    name: '',
    avatarDataUrl: null,
    birthDate: null,
    bio: null,
    interests: [],
    achievements: [],
    published: false,
    exists: false,
    updatedAt: null,
  }
}

async function loadProfile() {
  isLoading.value = true
  loadError.value = ''
  try {
    profile.value = isPublicView
      ? await getPublishedProfile(publicUserId)
      : await getMyProfile()
  } catch (error) {
    if (!isPublicView && error instanceof ApiError && error.status === 401) {
      window.location.replace('/?login=1&next=%2Fprofile%2F')
      return
    }
    loadError.value = error instanceof Error ? error.message : '个人主页加载失败'
  } finally {
    isLoading.value = false
  }
}

function addInterest() {
  const value = interestInput.value.trim()
  formError.value = ''
  if (!value) return
  if (value.length > 30) {
    formError.value = '单个兴趣不能超过 30 个字符'
    return
  }
  if (profile.value.interests.includes(value)) {
    interestInput.value = ''
    return
  }
  if (profile.value.interests.length >= 12) {
    formError.value = '最多添加 12 个兴趣'
    return
  }
  profile.value.interests.push(value)
  interestInput.value = ''
}

function removeInterest(index: number) {
  profile.value.interests.splice(index, 1)
}

function addAchievement() {
  formError.value = ''
  if (profile.value.achievements.length >= 20) {
    formError.value = '最多添加 20 项成就'
    return
  }
  profile.value.achievements.push({ title: '', date: null, description: null })
}

function removeAchievement(index: number) {
  profile.value.achievements.splice(index, 1)
}

async function chooseAvatar(event: Event) {
  const input = event.currentTarget as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return
  formError.value = ''
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
    formError.value = '头像仅支持 JPEG、PNG 或 WebP 图片'
    return
  }
  if (file.size > 10 * 1024 * 1024) {
    formError.value = '请选择小于 10MB 的图片'
    return
  }
  try {
    profile.value.avatarDataUrl = await cropAvatar(file)
  } catch {
    formError.value = '头像处理失败，请更换图片后重试'
  }
}

function cropAvatar(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    const objectUrl = URL.createObjectURL(file)
    image.onload = () => {
      const size = 720
      const sourceSize = Math.min(image.naturalWidth, image.naturalHeight)
      const sourceX = (image.naturalWidth - sourceSize) / 2
      const sourceY = (image.naturalHeight - sourceSize) / 2
      const canvas = document.createElement('canvas')
      canvas.width = size
      canvas.height = size
      const context = canvas.getContext('2d')
      if (!context) {
        URL.revokeObjectURL(objectUrl)
        reject(new Error('Canvas is unavailable'))
        return
      }
      context.drawImage(image, sourceX, sourceY, sourceSize, sourceSize, 0, 0, size, size)
      const dataUrl = canvas.toDataURL('image/jpeg', 0.82)
      URL.revokeObjectURL(objectUrl)
      resolve(dataUrl)
    }
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl)
      reject(new Error('Image decode failed'))
    }
    image.src = objectUrl
  })
}

function validateForm() {
  const name = profile.value.name.trim()
  if (name.length < 2 || name.length > 80) return '姓名需要填写 2 至 80 个字符'
  if ((profile.value.bio?.length ?? 0) > 1200) return '个人简介不能超过 1200 个字符'
  if (profile.value.achievements.some((item) => !item.title.trim())) return '请填写每项成就的标题'
  return ''
}

async function saveProfile() {
  const message = validateForm()
  if (message) {
    formError.value = message
    return
  }
  isSaving.value = true
  formError.value = ''
  savedMessage.value = ''
  try {
    profile.value = await saveMyProfile(profile.value)
    savedMessage.value = profile.value.published ? '主页已保存并公开' : '主页已保存为未公开状态'
    window.setTimeout(() => (savedMessage.value = ''), 3200)
  } catch (error) {
    formError.value = error instanceof Error ? error.message : '保存失败，请稍后再试'
  } finally {
    isSaving.value = false
  }
}

async function copyPublicUrl() {
  if (!profile.value.published || !publicUrl.value) return
  try {
    await navigator.clipboard.writeText(publicUrl.value)
    savedMessage.value = '公开链接已复制'
  } catch {
    savedMessage.value = '浏览器未允许复制，请从展示页复制地址'
  }
}

onMounted(loadProfile)
</script>

<template>
  <main class="profile-page" :class="{ 'is-public-page': isPublicView }">
    <header class="page-bar">
      <a class="back-link" href="/">
        <ArrowLeft :size="18" />
        返回首页
      </a>
      <p>Pan Portal</p>
      <div v-if="!isPublicView && !isLoading && !loadError" class="bar-actions">
        <button type="button" :disabled="!profile.published" @click="copyPublicUrl">
          <Copy :size="17" />
          复制链接
        </button>
        <a v-if="profile.published" :href="publicUrl" target="_blank" rel="noreferrer">
          <Eye :size="17" />
          查看展示页
        </a>
      </div>
    </header>

    <section v-if="isLoading" class="state-card" aria-live="polite">
      <LoaderCircle class="spinner" :size="34" />
      <p>正在加载个人主页</p>
    </section>

    <section v-else-if="loadError" class="state-card error-card">
      <h1>无法打开个人主页</h1>
      <p>{{ loadError }}</p>
      <button type="button" @click="loadProfile">重新加载</button>
    </section>

    <section v-else-if="isPublicView" class="public-stage">
      <ProfileDisplay :profile="profile" />
    </section>

    <template v-else>
      <header class="owner-intro">
        <div>
          <p class="eyebrow">主页维护</p>
          <h1>把重要的自己，整理成一页。</h1>
        </div>
        <p>填写资料并保存后，你可以通过公开链接分享自己的个人主页。右侧预览会跟随编辑内容即时更新。</p>
      </header>

      <div class="owner-layout">
        <form class="profile-form" @submit.prevent="saveProfile">
          <section class="form-section identity-section">
            <div class="section-title">
              <span>01</span>
              <div>
                <h2>基本资料</h2>
                <p>头像、姓名和出生日期会出现在主页顶部。</p>
              </div>
            </div>

            <div class="avatar-editor">
              <button type="button" class="avatar-button" @click="avatarInput?.click()">
                <img v-if="profile.avatarDataUrl" :src="profile.avatarDataUrl" alt="当前头像" />
                <ImagePlus v-else :size="38" :stroke-width="1.5" />
              </button>
              <div>
                <button type="button" class="text-button" @click="avatarInput?.click()">选择头像</button>
                <button v-if="profile.avatarDataUrl" type="button" class="text-button muted" @click="profile.avatarDataUrl = null">
                  移除
                </button>
                <p>支持 JPEG、PNG、WebP，选择后自动裁剪为正方形。</p>
              </div>
              <input ref="avatarInput" class="visually-hidden" type="file" accept="image/jpeg,image/png,image/webp" @change="chooseAvatar" />
            </div>

            <div class="field-grid">
              <label class="field">
                <span>姓名</span>
                <input v-model="profile.name" type="text" maxlength="80" autocomplete="name" placeholder="填写希望展示的姓名" />
              </label>
              <label class="field">
                <span>出生日期</span>
                <input v-model="profile.birthDate" type="date" :max="new Date().toISOString().slice(0, 10)" />
              </label>
            </div>

            <label class="field">
              <span>个人简介</span>
              <textarea v-model="profile.bio" rows="6" maxlength="1200" placeholder="介绍你的经历、关注的事，或希望别人了解的你。"></textarea>
              <small>{{ profile.bio?.length ?? 0 }} / 1200</small>
            </label>
          </section>

          <section class="form-section">
            <div class="section-title">
              <span>02</span>
              <div>
                <h2><Heart :size="20" />兴趣爱好</h2>
                <p>用简短标签整理你长期喜欢或正在投入的事。</p>
              </div>
            </div>
            <div class="add-row">
              <input v-model="interestInput" type="text" maxlength="30" placeholder="输入一项兴趣" @keydown.enter.prevent="addInterest" />
              <button type="button" @click="addInterest"><Plus :size="18" />添加</button>
            </div>
            <div v-if="profile.interests.length" class="editable-tags">
              <span v-for="(interest, index) in profile.interests" :key="interest">
                {{ interest }}
                <button type="button" :aria-label="`移除兴趣：${interest}`" @click="removeInterest(index)"><X :size="15" /></button>
              </span>
            </div>
          </section>

          <section class="form-section">
            <div class="section-title">
              <span>03</span>
              <div>
                <h2><Award :size="20" />成就</h2>
                <p>可以记录学习、工作、作品、比赛或个人里程碑。</p>
              </div>
            </div>
            <div class="achievement-edit-list">
              <article v-for="(achievement, index) in profile.achievements" :key="index">
                <div class="achievement-edit-head">
                  <strong>成就 {{ String(index + 1).padStart(2, '0') }}</strong>
                  <button type="button" :aria-label="`删除第 ${index + 1} 项成就`" @click="removeAchievement(index)"><Trash2 :size="17" /></button>
                </div>
                <label class="field">
                  <span>标题</span>
                  <input v-model="achievement.title" type="text" maxlength="100" placeholder="成就名称" />
                </label>
                <label class="field">
                  <span>时间</span>
                  <input v-model="achievement.date" type="text" maxlength="20" placeholder="例如：2026 年 7 月" />
                </label>
                <label class="field">
                  <span>说明</span>
                  <textarea v-model="achievement.description" rows="3" maxlength="400" placeholder="补充这项成就的背景或结果。"></textarea>
                </label>
              </article>
            </div>
            <button type="button" class="add-achievement" @click="addAchievement"><Plus :size="18" />添加一项成就</button>
          </section>

          <section class="form-section publish-section">
            <div class="section-title">
              <span>04</span>
              <div>
                <h2>公开状态</h2>
                <p>未公开时，只有你在维护页面中能看到这些资料。</p>
              </div>
            </div>
            <label class="publish-control">
              <input v-model="profile.published" type="checkbox" />
              <span class="switch-track"><span></span></span>
              <span>{{ profile.published ? '公开个人主页' : '暂不公开' }}</span>
            </label>
          </section>

          <p v-if="formError" class="form-message error-message" role="alert">{{ formError }}</p>
          <p v-if="savedMessage" class="form-message success-message"><Check :size="18" />{{ savedMessage }}</p>

          <button class="save-button" type="submit" :disabled="isSaving">
            <LoaderCircle v-if="isSaving" class="spinner" :size="20" />
            <Save v-else :size="20" />
            {{ isSaving ? '正在保存' : '保存主页' }}
          </button>
        </form>

        <aside class="preview-column">
          <div class="preview-heading">
            <span>实时预览</span>
            <small>{{ profile.published ? '公开' : '未公开' }}</small>
          </div>
          <ProfileDisplay :profile="profile" preview />
        </aside>
      </div>
    </template>
  </main>
</template>
