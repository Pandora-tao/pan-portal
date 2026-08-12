import { readFile } from 'node:fs/promises'
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

async function source(relativePath) {
  return readFile(path.join(root, relativePath), 'utf8')
}

/*
 * 语音入口隐藏 + 历史 VOICE 消息兼容的源码级回归测试。
 * 不引入新测试框架：直接断言 composer 不再包含录音/麦克风实现，
 * 而消息渲染与类型模型仍完整保留 VOICE 的展示与播放能力。
 */
test('ChatInput hides the voice/mic entry while keeping file and image entries', async () => {
  const input = await source('src/components/ChatInput.vue')

  for (const voiceMarker of [
    'Mic',
    'toggleRecording',
    'startRecording',
    'stopRecording',
    'MediaRecorder',
    'getUserMedia',
    '录音',
    '发送语音',
    'voiceFileName',
  ]) {
    assert.equal(input.includes(voiceMarker), false, `ChatInput.vue 不应包含语音标记：${voiceMarker}`)
  }

  assert.equal(input.includes('发送文件'), true, '文件入口应保留')
  assert.equal(input.includes('发送图片'), true, '图片入口应保留')
  assert.equal(input.includes('Paperclip'), true)
  assert.equal(input.includes('ImageIcon'), true)
})

test('ChatInput image picker is limited to the PanPilot image whitelist', async () => {
  const input = await source('src/components/ChatInput.vue')

  assert.equal(
    input.includes('accept="image/png,image/jpeg,image/webp,image/gif"'),
    true,
    '图片选择器必须限制为 PNG/JPEG/WebP/GIF',
  )
  assert.equal(input.includes('accept="image/*"'), false, '不得使用无边界 image/*')
  assert.equal(input.includes("'image/png'"), true)
  assert.equal(input.includes("'image/jpeg'"), true)
  assert.equal(input.includes("'image/webp'"), true)
  assert.equal(input.includes("'image/gif'"), true)
  assert.equal(input.includes('仅支持 PNG/JPEG/WebP/GIF 图片'), true)
})

test('ChatInput image entry enforces the 10MB PanPilot limit', async () => {
  const input = await source('src/components/ChatInput.vue')

  assert.equal(input.includes('const MAX_IMAGE_BYTES = 10 * 1024 * 1024'), true)
  assert.equal(input.includes('图片太大，最大支持 10MB'), true)
  assert.equal(input.includes('const MAX_ATTACHMENT_BYTES = 20 * 1024 * 1024'), true)
  assert.equal(input.includes('文件太大，最大支持 20MB'), true)
})

test('MessageItem keeps historical VOICE playback rendering', async () => {
  const item = await source('src/components/MessageItem.vue')

  assert.equal(item.includes("contentType === 'VOICE'"), true, 'VOICE 消息渲染分支应保留')
  assert.equal(item.includes('voice-bubble'), true)
  assert.equal(item.includes('audioRef'), true)
  assert.equal(item.includes('toggleVoice'), true)
  assert.equal(item.includes('voiceDurationLabel'), true)
})

test('MessageItem renders PanPilot file paths as safe portal download links', async () => {
  const item = await source('src/components/MessageItem.vue')

  assert.equal(item.includes('PILOT_FILE_URL_PATTERN'), true)
  assert.equal(item.includes('api\\/chat\\/pilot-files|v1\\/files'), true)
  assert.equal(item.includes('href: `/api/chat/pilot-files/${fileId}`'), true)
  assert.equal(item.includes('class="message-download-link"'), true)
  assert.equal(item.includes('下载 Word 文档'), true)
  assert.equal(item.includes('v-html'), false, '下载链接不得通过未消毒的 HTML 渲染')
})

test('chat types keep VOICE for historical message compatibility', async () => {
  const types = await source('src/types/chat.ts')

  assert.equal(types.includes("'FILE' | 'VOICE'"), true, 'ChatAttachmentKind 应保留 VOICE')
  assert.equal(types.includes("'TEXT' | 'STICKER' | 'FILE' | 'VOICE'"), true)
  assert.equal(types.includes('durationMs'), true)
})
