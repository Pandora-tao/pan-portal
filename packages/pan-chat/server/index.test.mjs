import { spawn } from 'node:child_process'
import { once } from 'node:events'
import { createServer } from 'node:http'
import { test } from 'node:test'
import assert from 'node:assert/strict'

test('chat server proxies guest, auth, and persistent chat requests with cookies', async () => {
  const port = 18000 + Math.floor(Math.random() * 10000)
  const backendPort = 28000 + Math.floor(Math.random() * 10000)
  const forwardedRequests = []
  const backend = createServer(async (request, response) => {
    const body = await readRequestBody(request)
    forwardedRequests.push({
      method: request.method,
      url: request.url,
      cookie: request.headers.cookie,
      body,
    })

    if (request.url === '/api/auth/login') {
      response.writeHead(200, {
        'Content-Type': 'application/json; charset=utf-8',
        'Set-Cookie': 'pan_session=test-token; Path=/; HttpOnly; SameSite=Strict',
      })
      response.end(JSON.stringify({ code: 0, message: 'ok', data: { id: 'user-1' } }))
      return
    }

    if (request.url === '/chat/api/chat/stream') {
      response.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
      })
      response.write('event: delta\ndata: {"delta":"第一段"}\n\n')
      setTimeout(() => {
        response.end('event: done\ndata: {"answer":"第一段第二段"}\n\n')
      }, 120)
      return
    }

    response.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' })
    response.end(JSON.stringify({ answer: '来自后端的回复', code: 0, message: 'ok', data: null }))
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

    const guestResponse = await fetch(`http://127.0.0.1:${port}/chat/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: [{ role: 'user', content: '现在能聊吗？' }] }),
    })
    assert.equal(guestResponse.status, 200)

    const streamResponse = await fetch(`http://127.0.0.1:${port}/chat/api/chat/stream`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: [{ role: 'user', content: '流式回复' }] }),
    })
    const streamReader = streamResponse.body.getReader()
    const firstChunk = await streamReader.read()
    assert.match(new TextDecoder().decode(firstChunk.value), /第一段/)
    assert.equal(firstChunk.done, false)
    await streamReader.cancel()

    const loginResponse = await fetch(`http://127.0.0.1:${port}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'pan@example.com', password: 'password123' }),
    })
    assert.match(loginResponse.headers.get('set-cookie') ?? '', /pan_session=test-token/)

    const deleteResponse = await fetch(`http://127.0.0.1:${port}/api/chat/sessions`, {
      method: 'DELETE',
      headers: { Cookie: 'pan_session=test-token' },
    })
    assert.equal(deleteResponse.status, 200)

    const relationshipResponse = await fetch(`http://127.0.0.1:${port}/api/relationship`, {
      headers: { Cookie: 'pan_session=test-token' },
    })
    assert.equal(relationshipResponse.status, 200)

    const uploadResponse = await fetch(`http://127.0.0.1:${port}/api/chat/attachments`, {
      method: 'POST',
      headers: { Cookie: 'pan_session=test-token' },
      body: 'fake-multipart-body',
    })
    assert.equal(uploadResponse.status, 200)

    const attachmentResponse = await fetch(
      `http://127.0.0.1:${port}/api/chat/messages/msg-1/attachment`,
      { headers: { Cookie: 'pan_session=test-token' } },
    )
    assert.equal(attachmentResponse.status, 200)

    assert.deepEqual(forwardedRequests, [
      {
        method: 'POST',
        url: '/chat/api/chat',
        cookie: undefined,
        body: JSON.stringify({ messages: [{ role: 'user', content: '现在能聊吗？' }] }),
      },
      {
        method: 'POST',
        url: '/chat/api/chat/stream',
        cookie: undefined,
        body: JSON.stringify({ messages: [{ role: 'user', content: '流式回复' }] }),
      },
      {
        method: 'POST',
        url: '/api/auth/login',
        cookie: undefined,
        body: JSON.stringify({ email: 'pan@example.com', password: 'password123' }),
      },
      {
        method: 'DELETE',
        url: '/api/chat/sessions',
        cookie: 'pan_session=test-token',
        body: '',
      },
      {
        method: 'GET',
        url: '/api/relationship',
        cookie: 'pan_session=test-token',
        body: '',
      },
      {
        method: 'POST',
        url: '/api/chat/attachments',
        cookie: 'pan_session=test-token',
        body: 'fake-multipart-body',
      },
      {
        method: 'GET',
        url: '/api/chat/messages/msg-1/attachment',
        cookie: 'pan_session=test-token',
        body: '',
      },
    ])
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
  return new Promise((resolve) => server.close(resolve))
}

async function readRequestBody(request) {
  const chunks = []
  for await (const chunk of request) chunks.push(chunk)
  return Buffer.concat(chunks).toString('utf8')
}

async function waitForServer(server, output) {
  const deadline = Date.now() + 5000
  while (Date.now() < deadline) {
    if (output.some((line) => line.includes('Pan chat is running'))) return
    if (server.exitCode !== null) throw new Error(`Server exited early:\n${output.join('')}`)
    await new Promise((resolve) => setTimeout(resolve, 50))
  }
  throw new Error(`Timed out waiting for server:\n${output.join('')}`)
}
