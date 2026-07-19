<script setup lang="ts">
import { Award, CalendarDays, Heart, UserRound } from 'lucide-vue-next'
import type { UserProfile } from '../types'

defineProps<{
  profile: UserProfile
  preview?: boolean
}>()

function formatBirthDate(value: string | null) {
  if (!value) return ''
  const [year, month, day] = value.split('-').map(Number)
  if (!year || !month || !day) return value
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(new Date(year, month - 1, day))
}
</script>

<template>
  <article class="profile-display" :class="{ 'is-preview': preview }">
    <header class="display-hero">
      <div class="avatar-frame">
        <img v-if="profile.avatarDataUrl" :src="profile.avatarDataUrl" :alt="`${profile.name}的头像`" />
        <div v-else class="avatar-placeholder" aria-label="尚未设置头像">
          <UserRound :size="preview ? 46 : 64" :stroke-width="1.4" />
        </div>
      </div>
      <div class="hero-copy">
        <p class="profile-label">个人主页</p>
        <h1>{{ profile.name || '尚未填写姓名' }}</h1>
        <p v-if="profile.birthDate" class="birth-line">
          <CalendarDays :size="18" />
          {{ formatBirthDate(profile.birthDate) }}
        </p>
      </div>
    </header>

    <section v-if="profile.bio || preview" class="display-section bio-section">
      <p class="section-label">关于我</p>
      <p class="bio-copy">{{ profile.bio || '填写个人简介后，会在这里展示。' }}</p>
    </section>

    <section v-if="profile.interests.length || preview" class="display-section">
      <div class="section-heading">
        <Heart :size="20" />
        <h2>兴趣爱好</h2>
      </div>
      <div v-if="profile.interests.length" class="interest-cloud">
        <span v-for="interest in profile.interests" :key="interest">{{ interest }}</span>
      </div>
      <p v-else class="empty-copy">添加兴趣后，会在这里形成你的兴趣清单。</p>
    </section>

    <section v-if="profile.achievements.length || preview" class="display-section achievements-section">
      <div class="section-heading">
        <Award :size="20" />
        <h2>成就</h2>
      </div>
      <div v-if="profile.achievements.length" class="achievement-list">
        <article v-for="(achievement, index) in profile.achievements" :key="`${achievement.title}-${index}`">
          <span class="achievement-index">{{ String(index + 1).padStart(2, '0') }}</span>
          <div>
            <div class="achievement-title-row">
              <h3>{{ achievement.title }}</h3>
              <time v-if="achievement.date">{{ achievement.date }}</time>
            </div>
            <p v-if="achievement.description">{{ achievement.description }}</p>
          </div>
        </article>
      </div>
      <p v-else class="empty-copy">添加成就后，会按顺序在这里展示。</p>
    </section>
  </article>
</template>
