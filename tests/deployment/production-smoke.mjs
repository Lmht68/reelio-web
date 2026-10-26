import { execFile } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import { fileURLToPath } from 'node:url'
import { request as createHttpRequest } from 'node:http'
import { promisify } from 'node:util'
import { setTimeout as delay } from 'node:timers/promises'
import { join } from 'node:path'

const execFileAsync = promisify(execFile)
const repositoryRoot = fileURLToPath(new URL('../..', import.meta.url))
const fixturePath = join(repositoryRoot, 'tests', 'deployment', 'mock-backend.mjs')
const runId = `${process.pid}-${randomUUID().replaceAll('-', '')}`
const resourcePrefix = `reelio-frontend-smoke-${runId}`
const imageName = `${resourcePrefix}:latest`
const networkName = resourcePrefix
const fixtureImage =
  'node:24-alpine@sha256:06d7adf3e0ef61a13f1d28682726366f97a15aa1888c934d3ecec86c33918b53'
const errorBody = '{"error":"fixture unavailable"}'
const slowBody = '{"status":"slow-success"}'

const resources = {
  containers: new Set(),
  imageBuilt: false,
  networkCreated: false,
}

const assert = (condition, message) => {
  if (!condition) {
    throw new Error(message)
  }
}

const assertEqual = (actual, expected, description) => {
  assert(
    actual === expected,
    `${description}: expected ${JSON.stringify(expected)}, received ${JSON.stringify(actual)}.`,
  )
}

const docker = async (args, { allowFailure = false } = {}) => {
  try {
    return await execFileAsync('docker', args, {
      cwd: repositoryRoot,
      maxBuffer: 10 * 1024 * 1024,
    })
  } catch (error) {
    if (allowFailure) {
      return undefined
    }

    const output = [error.stdout, error.stderr].filter(Boolean).join('\n').trim()
    throw new Error(
      `docker ${args.join(' ')} failed.${output.length > 0 ? `\n${output}` : ''}`,
      { cause: error },
    )
  }
}

const waitFor = async ({ description, timeoutMs, check }) => {
  const deadline = Date.now() + timeoutMs
  let lastError

  while (Date.now() < deadline) {
    try {
      const result = await check()

      if (result) {
        return result
      }
    } catch (error) {
      lastError = error
    }

    await delay(250)
  }

  throw new Error(
    `${description} did not complete within ${timeoutMs}ms.${
      lastError === undefined ? '' : ` Last error: ${lastError.message}`
    }`,
  )
}

const request = async ({ port, path, method = 'GET', body, timeoutMs = 15_000 }) =>
  new Promise((resolve, reject) => {
    const requestBody = body === undefined ? undefined : Buffer.from(body)
    const clientRequest = createHttpRequest(
      {
        host: '127.0.0.1',
        port,
        path,
        method,
        headers:
          requestBody === undefined
            ? undefined
            : {
                'Content-Type': 'application/json',
                'Content-Length': requestBody.byteLength,
              },
      },
      (response) => {
        const chunks = []

        response.on('data', (chunk) => {
          chunks.push(chunk)
        })
        response.on('end', () => {
          resolve({
            statusCode: response.statusCode,
            headers: response.headers,
            body: Buffer.concat(chunks).toString('utf8'),
          })
        })
      },
    )

    clientRequest.setTimeout(timeoutMs, () => {
      clientRequest.destroy(new Error(`Request to ${path} timed out after ${timeoutMs}ms.`))
    })
    clientRequest.on('error', reject)

    if (requestBody !== undefined) {
      clientRequest.write(requestBody)
    }

    clientRequest.end()
  })

const getPublishedPort = async (containerName) => {
  const { stdout } = await docker(['port', containerName, '80/tcp'])
  const mapping = stdout.trim()
  const match = /^127\.0\.0\.1:(\d+)$/.exec(mapping)

  assert(match !== null, `Expected a loopback port mapping for ${containerName}, received ${mapping}.`)
  return Number(match[1])
}

const waitForFixture = async (containerName, fixtureId) => {
  await waitFor({
    description: `Fixture ${fixtureId} readiness`,
    timeoutMs: 30_000,
    check: async () => {
      const { stdout, stderr } = await docker(['logs', containerName])
      return `${stdout}${stderr}`.includes(`fixture ${fixtureId} listening on 8181`)
    },
  })
}

const waitForHealthy = async (containerName) => {
  await waitFor({
    description: `Docker health for ${containerName}`,
    timeoutMs: 60_000,
    check: async () => {
      const { stdout } = await docker([
        'inspect',
        '--format',
        '{{if .State.Health}}{{.State.Health.Status}}{{end}}',
        containerName,
      ])
      const status = stdout.trim()

      if (status === 'unhealthy') {
        const logs = await docker(['logs', containerName])
        throw new Error(`Container became unhealthy.\n${logs.stdout}${logs.stderr}`)
      }

      return status === 'healthy'
    },
  })
}

const removeContainer = async (containerName) => {
  if (!resources.containers.has(containerName)) {
    return
  }

  await docker(['rm', '--force', containerName])
  resources.containers.delete(containerName)
}

let cleanupPromise

const cleanup = () => {
  if (cleanupPromise !== undefined) {
    return cleanupPromise
  }

  cleanupPromise = (async () => {
    for (const containerName of [...resources.containers]) {
      await removeContainer(containerName)
    }

    if (resources.networkCreated) {
      await docker(['network', 'rm', networkName])
      resources.networkCreated = false
    }

    if (resources.imageBuilt) {
      await docker(['image', 'rm', '--force', imageName])
      resources.imageBuilt = false
    }
  })()

  return cleanupPromise
}

const installSignalCleanup = () => {
  const handleSignal = (signal) => {
    console.error(`Received ${signal}; removing production smoke resources.`)
    void cleanup().then(
      () => process.exit(128),
      (error) => {
        console.error(error)
        process.exit(1)
      },
    )
  }

  process.once('SIGINT', handleSignal)
  process.once('SIGTERM', handleSignal)

  return () => {
    process.off('SIGINT', handleSignal)
    process.off('SIGTERM', handleSignal)
  }
}

const startFixture = async ({ name, alias, fixtureId }) => {
  await docker([
    'run',
    '--detach',
    '--name',
    name,
    '--network',
    networkName,
    '--network-alias',
    alias,
    '--env',
    `FIXTURE_ID=${fixtureId}`,
    '--volume',
    `${fixturePath}:/app/mock-backend.mjs:ro`,
    fixtureImage,
    'node',
    '/app/mock-backend.mjs',
  ])
  resources.containers.add(name)
  await waitForFixture(name, fixtureId)
}

const startFrontend = async ({ name, upstream }) => {
  const args = [
    'run',
    '--detach',
    '--name',
    name,
    '--network',
    networkName,
    '--publish',
    '127.0.0.1::80',
  ]

  if (upstream !== undefined) {
    args.push('--env', `BACKEND_UPSTREAM=${upstream}`)
  }

  args.push(imageName)
  await docker(args)
  resources.containers.add(name)
  await waitForHealthy(name)
  return getPublishedPort(name)
}

const assertPathCheck = ({ response, fixtureId, method, target, body }) => {
  assertEqual(response.statusCode, 200, 'Path-check response status')
  const payload = JSON.parse(response.body)
  assertEqual(payload.fixtureId, fixtureId, 'Path-check fixture')
  assertEqual(payload.method, method, 'Path-check method')
  assertEqual(payload.target, target, 'Path-check target')
  assertEqual(payload.body, body, 'Path-check body')
}

const main = async () => {
  await docker(['version', '--format', '{{.Server.Version}}'])
  await docker(['build', '--tag', imageName, '.'])
  resources.imageBuilt = true

  await docker([
    'run',
    '--rm',
    '--entrypoint',
    '/bin/sh',
    imageName,
    '-c',
    '! command -v node >/dev/null 2>&1 && ! command -v npm >/dev/null 2>&1',
  ])

  await docker(['network', 'create', networkName])
  resources.networkCreated = true

  const defaultFixtureName = `${resourcePrefix}-fixture-default`
  const defaultFrontendName = `${resourcePrefix}-frontend-default`
  const defaultFixtureId = `${runId}-default`
  await startFixture({
    name: defaultFixtureName,
    alias: 'api',
    fixtureId: defaultFixtureId,
  })
  const defaultPort = await startFrontend({ name: defaultFrontendName })
  const defaultResponse = await request({
    port: defaultPort,
    path: '/api/path-check?run=default',
  })
  assertPathCheck({
    response: defaultResponse,
    fixtureId: defaultFixtureId,
    method: 'GET',
    target: '/api/path-check?run=default',
    body: '',
  })
  await removeContainer(defaultFrontendName)
  await removeContainer(defaultFixtureName)

  const overrideFixtureName = `${resourcePrefix}-fixture-override`
  const overrideFrontendName = `${resourcePrefix}-frontend-override`
  const overrideFixtureId = `${runId}-override`
  await startFixture({
    name: overrideFixtureName,
    alias: 'custom-api',
    fixtureId: overrideFixtureId,
  })
  const overridePort = await startFrontend({
    name: overrideFrontendName,
    upstream: 'custom-api:8181',
  })

  const health = await request({ port: overridePort, path: '/healthz' })
  assertEqual(health.statusCode, 200, 'Health response status')
  assertEqual(health.body, 'ok\n', 'Health response body')
  assertEqual(health.headers['cache-control'], 'no-store', 'Health cache policy')

  const root = await request({ port: overridePort, path: '/' })
  assertEqual(root.statusCode, 200, 'Root response status')
  assertEqual(root.headers['cache-control'], 'no-cache', 'Root cache policy')

  const nestedRoute = await request({
    port: overridePort,
    path: '/nested/frontend/route',
  })
  assertEqual(nestedRoute.statusCode, 200, 'Nested SPA route response status')
  assertEqual(nestedRoute.body, root.body, 'Nested SPA route HTML')
  assertEqual(nestedRoute.headers['cache-control'], 'no-cache', 'Nested SPA route cache policy')

  const assetMatch = /(?:src|href)="(\/assets\/[^"?]+)"/.exec(root.body)
  assert(assetMatch !== null, 'Root HTML did not reference a fingerprinted asset.')
  const asset = await request({ port: overridePort, path: assetMatch[1] })
  assertEqual(asset.statusCode, 200, 'Fingerprinted asset response status')
  assertEqual(
    asset.headers['cache-control'],
    'public, max-age=31536000, immutable',
    'Fingerprinted asset cache policy',
  )

  const requestBody = '{"source":"smoke"}'
  const pathCheck = await request({
    port: overridePort,
    path: '/api/path-check?value=preserved',
    method: 'POST',
    body: requestBody,
  })
  assertPathCheck({
    response: pathCheck,
    fixtureId: overrideFixtureId,
    method: 'POST',
    target: '/api/path-check?value=preserved',
    body: requestBody,
  })

  const upstreamError = await request({ port: overridePort, path: '/api/error' })
  assertEqual(upstreamError.statusCode, 503, 'Upstream error status')
  assertEqual(upstreamError.body, errorBody, 'Upstream error body')
  assertEqual(upstreamError.headers['retry-after'], '17', 'Upstream Retry-After header')

  const slowStartedAt = process.hrtime.bigint()
  const slow = await request({
    port: overridePort,
    path: '/api/slow',
    timeoutMs: 75_000,
  })
  const slowElapsedMs = Number(process.hrtime.bigint() - slowStartedAt) / 1_000_000
  assert(slowElapsedMs >= 65_000, `Slow upstream response completed too early: ${slowElapsedMs}ms.`)
  assertEqual(slow.statusCode, 200, 'Slow upstream response status')
  assertEqual(slow.body, slowBody, 'Slow upstream response body')

  console.log('Production smoke test passed.')
}

const removeSignalHandlers = installSignalCleanup()

try {
  await main()
} finally {
  removeSignalHandlers()
  await cleanup()
}
