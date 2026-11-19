import { expect, test, type Page, type Route } from '@playwright/test'

const SOURCE_URL = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'
const JOB_ID = '00000000-0000-4000-8000-000000000001'
const LATEST_JOB_ID_KEY = 'reelio.discovery.latest-extraction-job-id'
const SOURCE_TITLE = 'Browser lifecycle source'
const PRIVATE_FAILURE_MESSAGE = 'private-provider-detail-must-not-render'

const SUCCESS_RESULT = {
  market: 'US',
  source: {
    platform: 'youtube',
    video_id: 'dQw4w9WgXcQ',
    url: SOURCE_URL,
    title: SOURCE_TITLE,
    description: 'A deterministic browser smoke source.',
    channel: 'Browser smoke channel',
    duration_seconds: 42,
  },
  transcript: {
    text: 'The browser smoke transcript mentions Dune.',
    language: 'en',
    method: 'youtube_captions',
  },
  statistics: {
    movies: { n_mentions: 1, n_resolved: 1, n_unresolved: 0 },
    tv_series: { n_mentions: 0, n_resolved: 0, n_unresolved: 0 },
    tracks: { n_mentions: 0, n_resolved: 0, n_unresolved: 0 },
    music_releases: { n_mentions: 0, n_resolved: 0, n_unresolved: 0 },
    books: { n_mentions: 0, n_resolved: 0, n_unresolved: 0 },
  },
  results: {
    movies: [
      {
        status: 'resolved',
        movie_mention: { title: 'Dune', year: 2021 },
        movie: {
          title: 'Dune',
          year: 2021,
          cast: ['Timothée Chalamet'],
          directors: ['Denis Villeneuve'],
          description: 'A science-fiction epic.',
          poster_url: null,
          tmdb_id: 438631,
          tmdb_url: 'https://www.themoviedb.org/movie/438631',
          imdb_id: null,
          imdb_url: null,
          tmdb_score: 8,
        },
      },
    ],
    tv_series: [],
    tracks: [],
    music_releases: [],
    books: [],
  },
}

type JobApiHandlers = Readonly<{
  admit: (route: Route) => Promise<void>
  status: (route: Route) => Promise<void>
}>

const fulfillJson = async ({
  route,
  status,
  body,
  headers,
}: {
  readonly route: Route
  readonly status: number
  readonly body: object
  readonly headers?: Readonly<Record<string, string>>
}): Promise<void> => {
  await route.fulfill({
    status,
    contentType: 'application/json',
    headers,
    body: JSON.stringify(body),
  })
}

const interceptJobApi = async (page: Page, handlers: JobApiHandlers): Promise<string[]> => {
  const unexpectedRequests: string[] = []

  await page.route((url) => url.pathname.startsWith('/api/'), async (route) => {
    const request = route.request()
    const pathname = new URL(request.url()).pathname

    if (request.method() === 'POST' && pathname === '/api/extraction-jobs') {
      await handlers.admit(route)
      return
    }
    if (request.method() === 'GET' && pathname === `/api/extraction-jobs/${JOB_ID}`) {
      await handlers.status(route)
      return
    }

    unexpectedRequests.push(`${request.method()} ${pathname}`)
    await route.abort('failed')
  })

  return unexpectedRequests
}

const activeJob = (status: 'queued' | 'running') => ({ job_id: JOB_ID, status })

const assertNoHorizontalOverflow = async (page: Page): Promise<void> => {
  const hasHorizontalOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
  )

  expect(hasHorizontalOverflow).toBe(false)
}

test.describe('Discovery extraction job lifecycle', () => {
  test('should restore a queued job and render its result when polling succeeds', async ({ page }) => {
    let admissionCount = 0
    let statusReadCount = 0
    const { promise: admissionGate, resolve: releaseAdmission } = Promise.withResolvers<void>()
    const unexpectedRequests = await interceptJobApi(page, {
      admit: async (route) => {
        admissionCount += 1
        expect(route.request().postDataJSON()).toEqual({ url: SOURCE_URL })
        await admissionGate
        await fulfillJson({
          route,
          status: 202,
          headers: { 'Retry-After': '1' },
          body: activeJob('queued'),
        })
      },
      status: async (route) => {
        statusReadCount += 1
        if (statusReadCount === 1) {
          await fulfillJson({
            route,
            status: 200,
            headers: { 'Retry-After': '0' },
            body: activeJob('queued'),
          })
          return
        }
        if (statusReadCount === 2) {
          await fulfillJson({
            route,
            status: 200,
            headers: { 'Retry-After': '1' },
            body: activeJob('running'),
          })
          return
        }
        await fulfillJson({
          route,
          status: 200,
          body: { job_id: JOB_ID, status: 'succeeded', result: SUCCESS_RESULT },
        })
      },
    })

    await page.goto('/')
    const urlInput = page.getByLabel('Video URL')
    await urlInput.fill(SOURCE_URL)
    await urlInput.press('Enter')

    await expect(page.getByRole('status')).toContainText('Submitting your video')
    await expect.poll(() => admissionCount).toBe(1)
    releaseAdmission()
    await expect(page.getByRole('status')).toContainText('Waiting to start')

    await page.reload()
    await expect(page.getByRole('status')).toContainText('Waiting to start')
    await expect(page.getByRole('status')).toContainText('Finding what’s mentioned')
    await expect(page.getByRole('heading', { name: SOURCE_TITLE })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Dune, 2021, score 8.0, open details' })).toBeVisible()

    expect(admissionCount).toBe(1)
    expect(statusReadCount).toBe(3)
    expect(unexpectedRequests).toEqual([])
    await assertNoHorizontalOverflow(page)

    const transcriptButton = page.getByRole('button', { name: 'Read transcript' })
    await transcriptButton.focus()
    await page.keyboard.press('Enter')
    await expect(page.getByRole('dialog', { name: 'Transcript' })).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(page.getByRole('dialog', { name: 'Transcript' })).toHaveCount(0)
    await expect(transcriptButton).toBeFocused()
  })

  test('should hide private terminal failure text when the job rejects its source', async ({ page }) => {
    const unexpectedRequests = await interceptJobApi(page, {
      admit: async (route) => {
        await fulfillJson({
          route,
          status: 202,
          headers: { 'Retry-After': '0' },
          body: activeJob('queued'),
        })
      },
      status: async (route) => {
        await fulfillJson({
          route,
          status: 200,
          body: {
            job_id: JOB_ID,
            status: 'failed',
            error: { code: 'invalid_source', message: PRIVATE_FAILURE_MESSAGE },
          },
        })
      },
    })

    await page.goto('/')
    const urlInput = page.getByLabel('Video URL')
    await urlInput.fill(SOURCE_URL)
    await urlInput.press('Enter')

    const alert = page.getByRole('alert')
    await expect(alert.getByRole('heading', { name: 'We can’t use that source video' })).toBeVisible()
    await expect(alert).toContainText('Check the link or try a different source video.')
    await expect(alert).not.toContainText(PRIVATE_FAILURE_MESSAGE)
    await expect(page.getByRole('button', { name: 'Try again' })).toHaveCount(0)
    await expect.poll(() => page.evaluate((key) => localStorage.getItem(key), LATEST_JOB_ID_KEY)).toBeNull()
    expect(unexpectedRequests).toEqual([])
  })

  test('should restore keyboard-ready admission controls when the saved job has expired', async ({ page }) => {
    const unexpectedRequests = await interceptJobApi(page, {
      admit: async (route) => {
        await route.abort('failed')
      },
      status: async (route) => {
        await fulfillJson({
          route,
          status: 404,
          body: {
            error: {
              code: 'extraction_job_not_found',
              message: 'Extraction job was not found.',
            },
          },
        })
      },
    })
    await page.addInitScript(
      ({ key, jobId }) => {
        localStorage.setItem(key, jobId)
      },
      { key: LATEST_JOB_ID_KEY, jobId: JOB_ID },
    )

    await page.goto('/')

    await expect(page.getByRole('status')).toContainText(
      'That discovery is no longer available. Paste the video link again to start a new discovery.',
    )
    const urlInput = page.getByLabel('Video URL')
    const discoverButton = page.getByRole('button', { name: 'Discover' })
    await expect(urlInput).toBeEnabled()
    await expect(discoverButton).toBeEnabled()
    await urlInput.focus()
    await expect(urlInput).toBeFocused()
    await expect.poll(() => page.evaluate((key) => localStorage.getItem(key), LATEST_JOB_ID_KEY)).toBeNull()
    expect(unexpectedRequests).toEqual([])
  })
})
