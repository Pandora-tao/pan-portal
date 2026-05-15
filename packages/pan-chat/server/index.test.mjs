import { spawn } from 'node:child_process'
import { once } from 'node:events'
import { test } from 'node:test'
import assert from 'node:assert/strict'

test('chat api returns an in-character fallback reply when no LLM key is configured', async () => {
  const port = 18000 + Math.floor(Math.random() * 10000)
  const env = {
    ...process.env,
    NODE_ENV: 'production',
    HOST: '127.0.0.1',
    PORT: String(port),
  }

  delete env.LLM_API_KEY
  delete env.OPENAI_API_KEY

  const server = spawn(process.execPath, ['server/index.mjs'], {
    cwd: new URL('..', import.meta.url),
    env,
    stdio: ['ignore', 'pipe', 'pipe'],
  })

  const output = []
  server.stdout.on('data', (chunk) => output.push(chunk.toString('utf8')))
  server.stderr.on('data', (chunk) => output.push(chunk.toString('utf8')))

  try {
    await waitForServer(server, output)

    const response = await fetch(`http://127.0.0.1:${port}/chat/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: [{ role: 'user', content: '现在能聊吗？' }],
      }),
    })
    const data = await response.json()

    assert.equal(response.status, 200)
    assert.equal(typeof data.answer, 'string')
    assert.match(data.answer, /本地演示模式|没有连上大模型/)
  } finally {
    server.kill()
    await once(server, 'exit').catch(() => {})
  }
})

async function waitForServer(server, output) {
  const deadline = Date.now() + 5000

  while (Date.now() < deadline) {
    if (output.some((line) => line.includes('Pan chat is running'))) {
      return
    }

    if (server.exitCode !== null) {
      throw new Error(`Server exited early:\n${output.join('')}`)
    }

    await new Promise((resolve) => setTimeout(resolve, 50))
  }

  throw new Error(`Timed out waiting for server:\n${output.join('')}`)
}
