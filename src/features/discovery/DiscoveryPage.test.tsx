import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { HttpResponse, http } from 'msw'
import { setupServer } from 'msw/node'
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { DiscoveryPage } from './DiscoveryPage'

const ZERO_COUNTS = { n_mentions: 0, n_resolved: 0, n_unresolved: 0 }
const EXTRACTION_FIXTURE = {
  market: 'US',
  source: {
    platform: 'youtube',
    video_id: 'dQw4w9WgXcQ',
    url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    title: 'Never Gonna Give You Up',
    description: 'Official music video.',
    channel: 'Rick Astley',
    duration_seconds: 213,
  },
  transcript: {
    text: 'A complete fixture transcript.',
    language: 'en',
    method: 'youtube_captions',
  },
  statistics: {
    movies: ZERO_COUNTS,
    tv_series: ZERO_COUNTS,
    tracks: ZERO_COUNTS,
    music_releases: ZERO_COUNTS,
    books: ZERO_COUNTS,
  },
  results: {
    movies: [],
    tv_series: [],
    tracks: [],
    music_releases: [],
    books: [],
  },
}
const extractionRequests: Array<{ body: unknown; contentType: string | null }> = []
const server = setupServer(
  http.post('/api/extractions', async ({ request }) => {
    extractionRequests.push({
      body: await request.json(),
      contentType: request.headers.get('content-type'),
    })
    return HttpResponse.json(EXTRACTION_FIXTURE)
  }),
)

beforeAll(() => {
  server.listen({ onUnhandledFrame: 'error' })
})

afterEach(() => {
  extractionRequests.length = 0
  server.resetHandlers()
  vi.unstubAllGlobals()
})

afterAll(() => {
  server.close()
})

describe('DiscoveryPage', () => {
  it('should show required URL guidance when the form is submitted empty', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    const user = userEvent.setup()

    render(<DiscoveryPage />)
    await user.click(screen.getByRole('button', { name: 'Discover' }))

    expect(screen.getByRole('alert')).toHaveTextContent('Please paste a video link first.')
    expect(screen.getByLabelText('Video URL')).toHaveFocus()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('should submit the trimmed URL when Discover is activated', async () => {
    const user = userEvent.setup()

    render(<DiscoveryPage />)
    await user.type(
      screen.getByLabelText('Video URL'),
      ' https://www.youtube.com/watch?v=dQw4w9WgXcQ ',
    )
    await user.click(screen.getByRole('button', { name: 'Discover' }))

    await waitFor(() => {
      expect(extractionRequests).toEqual([
        {
          body: { url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' },
          contentType: 'application/json',
        },
      ])
    })
  })

  it('should focus the three-step footer when How it works is activated', async () => {
    const user = userEvent.setup()

    render(<DiscoveryPage />)
    await user.click(screen.getByRole('button', { name: 'How it works' }))

    expect(screen.getByRole('heading', { name: 'How it works' })).toHaveFocus()
    expect(screen.getAllByRole('listitem')).toHaveLength(3)
    expect(screen.getByRole('list')).toHaveTextContent('Paste a video link')
    expect(screen.getByRole('list')).toHaveTextContent('Find the mentions')
    expect(screen.getByRole('list')).toHaveTextContent('Explore the results')
  })

  it('should announce pending discovery and prevent duplicate activation when the request is open', async () => {
    const { promise: responseGate, resolve: releaseResponse } = Promise.withResolvers<void>()
    const user = userEvent.setup()

    server.use(
      http.post('/api/extractions', async ({ request }) => {
        extractionRequests.push({
          body: await request.json(),
          contentType: request.headers.get('content-type'),
        })
        await responseGate
        return HttpResponse.json(EXTRACTION_FIXTURE)
      }),
    )

    render(<DiscoveryPage />)
    await user.type(screen.getByLabelText('Video URL'), 'https://www.youtube.com/watch?v=dQw4w9WgXcQ')
    await user.click(screen.getByRole('button', { name: 'Discover' }))

    const resultRegion = screen.getByRole('region', { name: 'Discovery result' })
    expect(await screen.findByRole('status')).toHaveTextContent('Finding what’s mentioned')
    expect(resultRegion).not.toHaveAttribute('aria-busy')
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument()
    expect(screen.getByLabelText('Video URL')).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Discover' })).toBeDisabled()

    await waitFor(() => {
      expect(extractionRequests).toHaveLength(1)
    })
    await user.click(screen.getByRole('button', { name: 'Discover' }))
    expect(extractionRequests).toHaveLength(1)

    releaseResponse()

    expect(await screen.findByRole('heading', { name: 'Never Gonna Give You Up' })).toBeInTheDocument()
  })

  it('should show malformed URL guidance when the submitted URL cannot be parsed', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    const user = userEvent.setup()

    render(<DiscoveryPage />)
    await user.type(screen.getByLabelText('Video URL'), 'not a link')
    await user.click(screen.getByRole('button', { name: 'Discover' }))

    expect(screen.getByRole('alert')).toHaveTextContent(
      'That doesn’t look like a valid video link. Please check it and try again.',
    )
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('should show scheme guidance when the submitted URL is not HTTP(S)', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    const user = userEvent.setup()

    render(<DiscoveryPage />)
    await user.type(screen.getByLabelText('Video URL'), 'mailto:hello@example.com')
    await user.click(screen.getByRole('button', { name: 'Discover' }))

    expect(screen.getByRole('alert')).toHaveTextContent(
      'Please use a link that starts with http:// or https://.',
    )
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('should clear stale validation guidance when the URL value changes', async () => {
    const user = userEvent.setup()

    render(<DiscoveryPage />)
    await user.click(screen.getByRole('button', { name: 'Discover' }))
    await user.type(screen.getByLabelText('Video URL'), 'https://www.youtube.com/watch?v=dQw4w9WgXcQ')

    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('should submit the URL when Enter is pressed in the Video URL field', async () => {
    const user = userEvent.setup()

    render(<DiscoveryPage />)
    await user.type(screen.getByLabelText('Video URL'), 'https://www.youtube.com/watch?v=dQw4w9WgXcQ')
    await user.keyboard('{Enter}')

    await waitFor(() => {
      expect(extractionRequests).toEqual([
        {
          body: { url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' },
          contentType: 'application/json',
        },
      ])
    })
  })

  it('should render the source summary when a complete extraction succeeds', async () => {
    const user = userEvent.setup()

    render(<DiscoveryPage />)
    await user.type(screen.getByLabelText('Video URL'), 'https://www.youtube.com/watch?v=dQw4w9WgXcQ')
    await user.click(screen.getByRole('button', { name: 'Discover' }))

    const resultRegion = screen.getByRole('region', { name: 'Discovery result' })
    expect(resultRegion).toHaveAttribute('aria-live', 'polite')
    expect(await within(resultRegion).findByRole('heading', { name: 'Never Gonna Give You Up' })).toBeInTheDocument()
    const titleLink = within(resultRegion).getByRole('link', { name: 'Never Gonna Give You Up' })
    expect(titleLink).toHaveAttribute('href', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ')
    expect(titleLink).toHaveAttribute('target', '_blank')
    expect(titleLink).toHaveAttribute('rel', 'noreferrer')
    expect(within(resultRegion).queryByText('by Rick Astley')).not.toBeInTheDocument()
    expect(within(resultRegion).queryByText('·')).not.toBeInTheDocument()
    expect(within(resultRegion).getByText('YouTube')).toBeInTheDocument()
    expect(within(resultRegion).queryByText('No source thumbnail available')).not.toBeInTheDocument()
    expect(within(resultRegion).queryByRole('link', { name: 'Open original video' })).not.toBeInTheDocument()
  })

  it('should use the default source title when an extraction response has a blank title', async () => {
    const user = userEvent.setup()

    server.use(
      http.post('/api/extractions', () =>
        HttpResponse.json({
          ...EXTRACTION_FIXTURE,
          source: {
            ...EXTRACTION_FIXTURE.source,
            title: '   ',
          },
        }),
      ),
    )

    render(<DiscoveryPage />)
    await user.type(screen.getByLabelText('Video URL'), 'https://www.youtube.com/watch?v=dQw4w9WgXcQ')
    await user.click(screen.getByRole('button', { name: 'Discover' }))

    const resultRegion = screen.getByRole('region', { name: 'Discovery result' })
    expect(await within(resultRegion).findByRole('heading', { name: 'Source video' })).toBeInTheDocument()
    expect(within(resultRegion).getByText('YouTube')).toBeInTheDocument()
  })

  it('should show a generic failure and restore controls when the extraction request fails', async () => {
    const user = userEvent.setup()

    server.use(
      http.post('/api/extractions', () =>
        HttpResponse.json({ error: { code: 'source_unavailable', message: 'Unavailable' } }, { status: 502 }),
      ),
    )

    render(<DiscoveryPage />)
    await user.type(screen.getByLabelText('Video URL'), 'https://www.youtube.com/watch?v=dQw4w9WgXcQ')
    await user.click(screen.getByRole('button', { name: 'Discover' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'We couldn’t complete the discovery. Please try again.',
    )
    expect(screen.getByLabelText('Video URL')).toBeEnabled()
    expect(screen.getByRole('button', { name: 'Discover' })).toBeEnabled()
  })

  it('should show a generic failure when the successful response lacks the required source fields', async () => {
    const user = userEvent.setup()

    server.use(
      http.post('/api/extractions', () =>
        HttpResponse.json({ source: { platform: 'youtube' } }),
      ),
    )

    render(<DiscoveryPage />)
    await user.type(screen.getByLabelText('Video URL'), 'https://www.youtube.com/watch?v=dQw4w9WgXcQ')
    await user.click(screen.getByRole('button', { name: 'Discover' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'We couldn’t complete the discovery. Please try again.',
    )
    expect(screen.queryByRole('heading', { name: 'Source video' })).not.toBeInTheDocument()
  })
})
