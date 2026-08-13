import { readFile } from 'node:fs/promises'
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

async function source(relativePath) {
  return readFile(path.join(root, relativePath), 'utf8')
}

test('MessageList follows streaming changes without relying only on message count', async () => {
  const list = await source('src/components/MessageList.vue')

  assert.equal(list.includes('latest.status'), true, '应监听最后一条消息状态')
  assert.equal(list.includes('latest.content'), true, '应监听流式回复内容增长')
  assert.equal(
    list.includes("await autoScrollToBottom('auto')"),
    true,
    '流式更新应立即滚到真实底部，不能堆积平滑滚动动画',
  )
  assert.equal(
    list.includes('if (!current || !previous || awaitingEarlierPage) return'),
    true,
    '加载更早消息时不得抢走锚点恢复逻辑',
  )
})

test('useAutoScroll keeps sticky mode while performing an immediate follow', async () => {
  const autoScroll = await source('src/composables/useAutoScroll.ts')
  const stickyAssignment = autoScroll.indexOf('shouldAutoScroll.value = true')
  const immediateScroll = autoScroll.indexOf('container.scrollTop = container.scrollHeight')

  assert.notEqual(stickyAssignment, -1)
  assert.notEqual(immediateScroll, -1)
  assert.equal(
    stickyAssignment < immediateScroll,
    true,
    '程序滚动前必须保持粘底状态，避免 scroll 事件关闭自动跟随',
  )
  assert.equal(
    autoScroll.includes('if (!shouldAutoScroll.value)'),
    true,
    '用户主动离开底部后仍应暂停自动滚动',
  )
})
