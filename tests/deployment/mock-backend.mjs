import { createServer } from 'node:http'

const fixtureId = process.env.FIXTURE_ID
const port = 8181
const errorBody = '{"error":"fixture unavailable"}'
const slowBody = '{"status":"slow-success"}'

if (fixtureId === undefined || fixtureId.length === 0) {
  throw new Error('FIXTURE_ID is required.')
}

const readBody = async (request) => {
  const chunks = []

  for await (const chunk of request) {
    chunks.push(chunk)
  }

  return Buffer.concat(chunks).toString('utf8')
}

const sendJson = (response, statusCode, body, headers = {}) => {
  response.writeHead(statusCode, {
    'Content-Type': 'application/json',
    ...headers,
  })
  response.end(body)
}

const server = createServer(async (request, response) => {
  const target = request.url

  if (target === undefined) {
    sendJson(response, 400, '{"error":"missing request target"}')
    return
  }

  const { pathname } = new URL(target, 'http://fixture')

  if (pathname === '/api/path-check') {
    const body = await readBody(request)
    sendJson(
      response,
      200,
      JSON.stringify({
        fixtureId,
        method: request.method ?? 'GET',
        target,
        body,
      }),
    )
    return
  }

  if (pathname === '/api/error') {
    sendJson(response, 503, errorBody, { 'Retry-After': '17' })
    return
  }

  if (pathname === '/api/slow') {
    setTimeout(() => {
      sendJson(response, 200, slowBody)
    }, 65_000)
    return
  }

  sendJson(response, 404, '{"error":"not found"}')
})

server.listen(port, '0.0.0.0', () => {
  console.log(`fixture ${fixtureId} listening on ${port}`)
})
