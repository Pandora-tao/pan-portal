import { spawn } from 'node:child_process'
import { once } from 'node:events'
import { createServer } from 'node:http'
import { test } from 'node:test'
import assert from 'node:assert/strict'

test('chat api proxies requests to the configured backend', async () => {
  const port = 18000 + Math.floor(Math.random() * 10000)
  const backendPort = 28000 + Math.floor(Math.random() * 10000)
  const forwardedRequests = []
  const backend = createServer(async (request, response) => {
    const body = await readRequestBody(request)

    forwardedRequests.push({
      method: request.method,
      url: request.url,
      origin: request.headers.origin,
      visitorId: request.headers['x-visitor-id'],
      body,
    })

    response.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' })
    response.end(JSON.stringify({ answer: '来自后端的回复' }))
  })
  const env = {
    ...process.env,
    NODE_ENV: 'production',
    HOST: '127.0.0.1',
    PORT: String(port),
    PAN_CHAT_BACKEND_URL: `http://127.0.0.1:${backendPort}`,
  }

  await listen(backend, backendPort)

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
      headers: {
        'Content-Type': 'application/json',
        Origin: 'http://192.168.10.2:666',
        'X-Visitor-Id': 'visitor-test',
      },
      body: JSON.stringify({
        messages: [{ role: 'user', content: '现在能聊吗？' }],
      }),
    })
    const data = await response.json()

    assert.equal(response.status, 200)
    assert.equal(data.answer, '来自后端的回复')
    assert.equal(forwardedRequests.length, 1)
    assert.deepEqual(forwardedRequests[0], {
      method: 'POST',
      url: '/chat/api/chat',
      origin: undefined,
      visitorId: 'visitor-test',
      body: JSON.stringify({
        messages: [{ role: 'user', content: '现在能聊吗？' }],
      }),
    })
  } finally {
    server.kill()
    await once(server, 'exit').catch(() => {})
    await close(backend)
  }
})

function listen(server, port) {
  return new Promise((resolve, reject) => {
    server.once('error', reject)
    server.listen(port, '127.0.0.1', resolve)
  })
}

function close(server) {
  return new Promise((resolve) => {
    server.close(resolve)
  })
}

async function readRequestBody(request) {
  const chunks = []

  for await (const chunk of request) {
    chunks.push(chunk)
  }

  return Buffer.concat(chunks).toString('utf8')
}

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
