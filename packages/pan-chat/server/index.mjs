import { createReadStream } from 'node:fs'
import { stat } from 'node:fs/promises'
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
const backendOrigin = normalizeBackendOrigin(process.env.PAN_CHAT_BACKEND_URL ?? 'http://localhost:8080')

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

    if (isBackendApiPath(requestUrl.pathname)) {
      await proxyApiRequest(request, response, `${requestUrl.pathname}${requestUrl.search}`)
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

async function proxyApiRequest(request, response, backendPath) {
  try {
    const hasRequestBody = request.method !== 'GET' && request.method !== 'HEAD'
    const requestBody = hasRequestBody ? await readRequestBody(request) : undefined
    const backendResponse = await fetch(new URL(backendPath, backendOrigin), {
      method: request.method,
      headers: getForwardHeaders(request),
      body: requestBody,
    })
    const responseBody = Buffer.from(await backendResponse.arrayBuffer())

    response.writeHead(backendResponse.status, getResponseHeaders(backendResponse))
    response.end(responseBody)
  } catch (error) {
    console.error('Failed to proxy backend request:', error)
    sendJson(response, 502, { error: '后端聊天服务暂时不可用，请稍后再试。' })
  }
}

function isBackendApiPath(pathname) {
  return (
    pathname === apiPath ||
    pathname === '/api/me' ||
    pathname.startsWith('/api/auth/') ||
    pathname === '/api/chat/sessions' ||
    pathname.startsWith('/api/chat/sessions/')
  )
}

async function readRequestBody(request) {
  const chunks = []
  let totalSize = 0

  for await (const chunk of request) {
    totalSize += chunk.length

    if (totalSize > 64 * 1024) {
      throw new Error('Request body is too large')
    }

    chunks.push(chunk)
  }

  return Buffer.concat(chunks)
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

function normalizeBackendOrigin(value) {
  const url = new URL(value)
  return `${url.protocol}//${url.host}`
}

function getForwardHeaders(request) {
  const headers = new Headers()
  const blockedHeaders = new Set(['connection', 'content-length', 'host', 'origin', 'transfer-encoding'])

  for (const [name, value] of Object.entries(request.headers)) {
    if (!value || blockedHeaders.has(name.toLowerCase())) {
      continue
    }

    headers.set(name, Array.isArray(value) ? value.join(', ') : value)
  }

  if (request.method !== 'GET' && request.method !== 'HEAD' && !headers.has('content-type')) {
    headers.set('content-type', 'application/json')
  }

  return headers
}

function getResponseHeaders(backendResponse) {
  const headers = {
    'Content-Type': backendResponse.headers.get('content-type') ?? 'application/json; charset=utf-8',
  }

  const setCookies = backendResponse.headers.getSetCookie?.() ?? []
  if (setCookies.length > 0) {
    headers['Set-Cookie'] = setCookies
  } else if (backendResponse.headers.has('set-cookie')) {
    headers['Set-Cookie'] = backendResponse.headers.get('set-cookie')
  }

  return headers
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
