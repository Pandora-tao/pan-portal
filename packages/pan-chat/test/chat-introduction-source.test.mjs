import { readFile } from 'node:fs/promises'
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

async function source(relativePath) {
  return readFile(path.join(root, relativePath), 'utf8')
}

test('account initialization claims a server-authoritative one-time introduction', async () => {
  const chat = await source('src/composables/useChat.ts')
  const api = await source('src/api/chatPersistence.ts')

  assert.equal(api.includes("'/api/chat/introduction'"), true)
  assert.equal(chat.includes('await claimChatIntroduction()'), true)
  assert.equal(chat.includes('messages.value = [toChatMessage(introduction.message)]'), true)
  assert.equal(chat.includes('currentSessionId.value = introduction.session.id'), true)
  assert.equal(chat.includes('你好，我是陶攀，很高兴认识你。'), true)
  assert.equal(chat.includes('陶攀的数字分身'), false, '自我介绍不应暴露数字分身身份')
})

test('guest introduction is shown once per browser without sending a user message', async () => {
  const chat = await source('src/composables/useChat.ts')

  assert.equal(chat.includes("const GUEST_INTRODUCTION_KEY = 'pan-chat-introduction-seen-v1'"), true)
  assert.equal(chat.includes("localStorage.getItem(GUEST_INTRODUCTION_KEY) === '1'"), true)
  assert.equal(chat.includes("createTemporaryMessage('assistant', INTRODUCTION, 'completed')"), true)
  assert.equal(chat.includes("messages.value[0]!.origin = 'PROACTIVE'"), true)
})

test('empty state stays neutral after the one-time introduction has been seen', async () => {
  const list = await source('src/components/MessageList.vue')

  assert.equal(list.includes('title="想聊点什么？"'), true)
  assert.equal(list.includes('title="你好，我是陶攀。"'), false)
})
