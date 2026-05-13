import { createReadStream } from 'node:fs'
import { readFile, stat } from 'node:fs/promises'
import { createServer } from 'node:http'
import { extname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const packageRoot = resolve(fileURLToPath(new URL('..', import.meta.url)))
const isProduction = process.env.NODE_ENV === 'production'
const port = Number(process.env.PORT ?? 5174)
const host = process.env.HOST ?? '::'
const basePath = normalizeBasePath(process.env.CHAT_BASE_PATH ?? '/chat/')
const apiPath = `${basePath}api/chat`
const distDir = join(packageRoot, 'dist')

const mimeTypes = new Map([
  ['.css', 'text/css; charset=utf-8'],
  ['.html', 'text/html; charset=utf-8'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
  ['.png', 'image/png'],
  ['.svg', 'image/svg+xml'],
  ['.webp', 'image/webp'],
])

let vite

const server = createServer(async (request, response) => {
  try {
    const requestUrl = new URL(request.url ?? '/', `http://${request.headers.host ?? 'localhost'}`)

    if (request.method === 'POST' && (requestUrl.pathname === apiPath || requestUrl.pathname === '/api/chat')) {
      await handleChatRequest(request, response)
      return
    }

    if (!isProduction) {
      vite?.middlewares(request, response, () => {
        sendNotFound(response)
      })
      return
    }

    await serveStatic(requestUrl.pathname, response)
  } catch (error) {
    console.error(error)
    sendJson(response, 500, { error: '服务暂时开小差了，请稍后再试。' })
  }
})

if (!isProduction) {
  const { createServer: createViteServer } = await import('vite')

  vite = await createViteServer({
    root: packageRoot,
    base: basePath,
    server: {
      middlewareMode: true,
      hmr: { server },
    },
    appType: 'spa',
  })
}

server.listen(port, host, () => {
  console.log(`Pan chat is running at http://localhost:${port}${basePath}`)
})

async function handleChatRequest(request, response) {
  const payload = await readJson(request)
  const messages = normalizeMessages(payload?.messages)

  if (!messages.length) {
    sendJson(response, 400, { error: '请先输入一条消息。' })
    return
  }

  const answer = await createPersonaReply(messages)
  sendJson(response, 200, { answer })
}

async function createPersonaReply(messages) {
  const apiKey = process.env.LLM_API_KEY ?? process.env.OPENAI_API_KEY
  const baseUrl = (process.env.LLM_BASE_URL ?? 'https://api.openai.com/v1').replace(/\/$/, '')
  const model = process.env.LLM_MODEL ?? 'gpt-4o-mini'

  if (!apiKey) {
    throw new Error('Missing LLM_API_KEY or OPENAI_API_KEY')
  }

  const profile = await readProfile()
  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      temperature: Number(process.env.LLM_TEMPERATURE ?? 0.8),
      messages: [
        {
          role: 'system',
          content: [
            '你正在扮演用户提供资料中的“我”，用于和访客进行自然对话。',
            '严格参考个人资料、说话习惯和性格生成回复；资料没有写到的事实不要编造。',
            '保持像真人聊天一样简洁、自然、有温度。遇到不确定信息时，直接说不确定或需要更多资料。',
            '以下是资料：',
            profile,
          ].join('\n\n'),
        },
        ...messages,
      ],
    }),
  })

  if (!response.ok) {
    const detail = await response.text()
    throw new Error(`LLM request failed: ${response.status} ${detail}`)
  }

  const result = await response.json()
  const content = result?.choices?.[0]?.message?.content

  if (typeof content !== 'string' || !content.trim()) {
    throw new Error('LLM returned an empty response')
  }

  return content.trim()
}

async function readProfile() {
  const profilePath = resolve(process.env.PAN_PROFILE_PATH ?? join(packageRoot, 'data/profile.md'))

  try {
    return await readFile(profilePath, 'utf8')
  } catch {
    return '暂无个人资料。请提醒维护者补充 PAN_PROFILE_PATH 或 packages/pan-chat/data/profile.md。'
  }
}

function normalizeMessages(messages) {
  if (!Array.isArray(messages)) {
    return []
  }

  return messages
    .map((message) => ({
      role: message?.role === 'assistant' ? 'assistant' : 'user',
      content: typeof message?.content === 'string' ? message.content.trim() : '',
    }))
    .filter((message) => message.content)
    .slice(-12)
}

async function readJson(request) {
  const chunks = []
  let totalSize = 0

  for await (const chunk of request) {
    totalSize += chunk.length

    if (totalSize > 64 * 1024) {
      throw new Error('Request body is too large')
    }

    chunks.push(chunk)
  }

  if (!chunks.length) {
    return null
  }

  return JSON.parse(Buffer.concat(chunks).toString('utf8'))
}

async function serveStatic(pathname, response) {
  const decodedPath = decodeURIComponent(pathname)
  const relativePath = decodedPath.startsWith(basePath)
    ? decodedPath.slice(basePath.length)
    : decodedPath.replace(/^\//, '')
  const filePath = resolve(distDir, relativePath || 'index.html')

  if (!filePath.startsWith(distDir)) {
    sendNotFound(response)
    return
  }

  try {
    const fileStat = await stat(filePath)

    if (fileStat.isFile()) {
      response.writeHead(200, {
        'Content-Type': mimeTypes.get(extname(filePath)) ?? 'application/octet-stream',
      })
      createReadStream(filePath).pipe(response)
      return
    }
  } catch {
    // Fall through to SPA fallback.
  }

  response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
  createReadStream(join(distDir, 'index.html')).pipe(response)
}

function normalizeBasePath(value) {
  const withLeadingSlash = value.startsWith('/') ? value : `/${value}`
  return withLeadingSlash.endsWith('/') ? withLeadingSlash : `${withLeadingSlash}/`
}

function sendJson(response, statusCode, data) {
  response.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
  })
  response.end(JSON.stringify(data))
}

function sendNotFound(response) {
  response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' })
  response.end('Not found')
}
