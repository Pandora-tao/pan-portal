import { readFile } from 'node:fs/promises'
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

async function source(relativePath) {
  return readFile(path.join(root, relativePath), 'utf8')
}

test('lucky draw app turns a 403 entitlement rejection into a locked screen instead of leaking gameplay', async () => {
  const app = await source('src/App.vue')

  assert.equal(app.includes("error.status === 403"), true, '必须识别 403 资格拒绝')
  assert.equal(app.includes('isLocked.value = true'), true, '403 后进入锁定状态')
  assert.equal(app.includes('活动尚未解锁'), true, '锁定页文案应存在')
  assert.equal(app.includes('该活动需要注册满 7 天后解锁'), true, '拒绝文案不应泄露玩法')
  assert.equal(app.includes('返回首页'), true, '锁定页应提供返回门户入口')
})

test('lucky draw app keeps the existing 401 login redirect behavior', async () => {
  const app = await source('src/App.vue')

  assert.equal(app.includes("error.status === 401"), true)
  assert.equal(app.includes('redirectToLogin'), true)
})
