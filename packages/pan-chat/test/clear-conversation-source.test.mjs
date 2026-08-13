import { readFile } from 'node:fs/promises'
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

async function source(relativePath) {
  return readFile(path.join(root, relativePath), 'utf8')
}

test('chat header exposes a guarded clear-conversation action', async () => {
  const app = await source('src/App.vue')

  assert.equal(app.includes("import { BadgeCheck, Brain, CloudOff, Home, LoaderCircle, Square, Trash2 }"), true)
  assert.equal(app.includes("class=\"icon-action clear-action\""), true)
  assert.equal(app.includes(':disabled="sending || clearing || messages.length === 0"'), true)
  assert.equal(app.includes('@click="clearConversation"'), true)
  assert.equal(app.includes("clearing ? '正在清空对话' : '清空对话'"), true)
})

test('clearConversation confirms destructive deletion and resets local state', async () => {
  const chat = await source('src/composables/useChat.ts')

  assert.equal(chat.includes("window.confirm('确定清空全部对话吗？清空后无法恢复。')"), true)
  assert.equal(chat.includes("if (mode.value === 'account') {"), true)
  assert.equal(chat.includes('await deleteAllSessions()'), true)
  assert.equal(chat.includes('await deleteAllSessions()\n        clearPendingGenerations()'), true)
  assert.equal(chat.includes('messages.value = []'), true)
  assert.equal(chat.includes('currentSessionId.value = null'), true)
  assert.equal(chat.includes('clearPendingGenerations()'), true)
})
