import { readFile } from 'node:fs/promises'
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

async function source(relativePath) {
  return readFile(path.join(root, relativePath), 'utf8')
}

test('portal hides the lucky draw entry unless the server-side entitlement unlocks it', async () => {
  const app = await source('src/App.vue')

  assert.equal(app.includes('isFeatureUnlocked(entitlements.value, LUCKY_DRAW_FEATURE_KEY)'), true,
    '入口必须由服务端资格解锁后才渲染')
  assert.equal(app.includes('...(isFeatureUnlocked(entitlements.value, LUCKY_DRAW_FEATURE_KEY)'), true,
    '陶攀问答局入口应作为条件项加入应用列表')
})

test('portal shows a one-time guide and ACKs only after the guide renders', async () => {
  const app = await source('src/App.vue')
  const composable = await source('src/composables/useFeatureEntitlements.ts')
  const api = await source('src/api/features.ts')

  assert.equal(app.includes('陶攀问答局已解锁'), true, '引导文案应存在')
  assert.equal(app.includes('isGuideOpen'), true, '引导展示由本地状态控制')
  assert.equal(app.includes('ackGuide(LUCKY_DRAW_FEATURE_KEY)'), true, '展示后必须调用 ACK')
  assert.equal(composable.includes('acknowledgeFeatureGuide'), true, 'ACK 必须走服务端接口')
  assert.equal(api.includes("'/api/features'"), true, '资格接口路径应存在')
  assert.equal(api.includes('guide-ack'), true, 'ACK 接口路径应存在')
})

test('logout clears local entitlement state so the entry disappears', async () => {
  const app = await source('src/App.vue')

  assert.equal(app.includes('entitlements.value = []'), true)
  assert.equal(app.includes('isGuideOpen.value = false'), true)
})
