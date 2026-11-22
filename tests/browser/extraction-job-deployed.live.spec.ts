import { expect, test } from '@playwright/test'

const LATEST_JOB_ID_KEY = 'reelio.discovery.latest-extraction-job-id'
const CANONICAL_JOB_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/u
const LIVE_SMOKE_ENABLED = process.env.REELIO_LIVE_FRONTEND_SMOKE === '1'
const LIVE_FRONTEND_BASE_URL = process.env.REELIO_LIVE_FRONTEND_BASE_URL
const LIVE_SOURCE_URL = process.env.REELIO_LIVE_SOURCE_URL
const LIVE_SETTINGS_CONFIGURED =
  LIVE_FRONTEND_BASE_URL !== undefined &&
  LIVE_FRONTEND_BASE_URL.trim() !== '' &&
  LIVE_SOURCE_URL !== undefined &&
  LIVE_SOURCE_URL.trim() !== ''

const requireLiveSetting = (value: string | undefined, name: string): string => {
  if (value === undefined || value.trim() === '') {
    throw new Error(`${name} must be configured for the deployed frontend smoke`)
  }
  return value
}

const parseFrontendOrigin = (value: string): string => {
  let parsed: URL
  try {
    parsed = new URL(value)
  } catch {
    throw new Error('REELIO_LIVE_FRONTEND_BASE_URL must be a valid HTTP(S) origin')
  }

  if (
    (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') ||
    parsed.username !== '' ||
    parsed.password !== '' ||
    parsed.pathname !== '/' ||
    parsed.search !== '' ||
    parsed.hash !== ''
  ) {
    throw new Error('REELIO_LIVE_FRONTEND_BASE_URL must be a credential-free HTTP(S) origin')
  }

  return parsed.origin
}

test.skip(
  !(LIVE_SMOKE_ENABLED && LIVE_SETTINGS_CONFIGURED),
  'REELIO_LIVE_FRONTEND_SMOKE=1 and all live frontend smoke settings are required',
)

test('should restore deployed extraction work when the page is reopened in one browser profile', async ({
  page,
  context,
}) => {
  test.setTimeout(15 * 60_000)
  const frontendOrigin = parseFrontendOrigin(
    requireLiveSetting(LIVE_FRONTEND_BASE_URL, 'REELIO_LIVE_FRONTEND_BASE_URL'),
  )
  const sourceUrl = requireLiveSetting(LIVE_SOURCE_URL, 'REELIO_LIVE_SOURCE_URL')
  let admissionRequestCount = 0
  let synchronousSubmissionRequestCount = 0
  const statusRequestJobIds: string[] = []

  context.on('request', (request) => {
    const pathname = new URL(request.url()).pathname
    if (request.method() === 'POST' && pathname === '/api/extraction-jobs') {
      admissionRequestCount += 1
      return
    }
    if (request.method() === 'POST' && pathname === '/api/extractions') {
      synchronousSubmissionRequestCount += 1
      return
    }
    if (request.method() === 'GET' && pathname.startsWith('/api/extraction-jobs/')) {
      statusRequestJobIds.push(pathname.slice('/api/extraction-jobs/'.length))
    }
  })

  await page.goto(frontendOrigin)
  await page.getByLabel('Video URL').fill(sourceUrl)
  await page.getByRole('button', { name: 'Discover' }).click()

  await expect.poll(() => admissionRequestCount).toBe(1)
  await expect
    .poll(() => page.evaluate((key) => localStorage.getItem(key), LATEST_JOB_ID_KEY))
    .toMatch(CANONICAL_JOB_ID)
  const admittedJobId = await page.evaluate((key) => localStorage.getItem(key), LATEST_JOB_ID_KEY)
  if (admittedJobId === null) {
    throw new Error('The deployed frontend did not persist the admitted job identifier')
  }
  await expect.poll(() => statusRequestJobIds.includes(admittedJobId)).toBe(true)
  await page.close()

  const restoredPage = await context.newPage()
  await restoredPage.goto(frontendOrigin)

  await expect(restoredPage.getByRole('status')).toContainText(
    /Waiting to start|Finding what’s mentioned/u,
  )
  await expect(restoredPage.locator('.source-video-summary')).toBeVisible()
  await expect(restoredPage.getByRole('button', { name: 'Read transcript' })).toBeEnabled()
  expect(admissionRequestCount).toBe(1)
  expect(synchronousSubmissionRequestCount).toBe(0)
  expect(statusRequestJobIds).toContain(admittedJobId)
})
