import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent, { type UserEvent } from '@testing-library/user-event'
import { HttpResponse, http } from 'msw'
import { setupServer } from 'msw/node'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { DiscoveryPage } from './DiscoveryPage'

const PORTRAIT_ARTWORK =
  'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%224%22 height=%226%22%3E%3Crect width=%224%22 height=%226%22 fill=%22%23c2410c%22/%3E%3C/svg%3E'
const SQUARE_ARTWORK =
  'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%224%22 height=%224%22%3E%3Crect width=%224%22 height=%224%22 fill=%22%23c2410c%22/%3E%3C/svg%3E'
const ZERO_COUNTS = { n_mentions: 0, n_resolved: 0, n_unresolved: 0 }
const MIXED_COUNTS = { n_mentions: 2, n_resolved: 1, n_unresolved: 1 }
const RESOLVED_COUNTS = { n_mentions: 1, n_resolved: 1, n_unresolved: 0 }

const TRANSCRIPT_TEXT = [
  'Today I revisited Dune with friends and explained why its quiet deserts, patient rhythms, and immense skies still reward careful viewing whenever the story returns to our conversations after dinner with curious visitors who enjoy science fiction, practical effects, patient characters, and big-screen soundtracks during long weekends at home for viewers.',
  'DUNE followed in our conversation, then a younger cousin recommended dune again while we compared ambitious adaptations, patient performances, and the way memorable music carries a scene after the credits end on a rainy afternoon filled with snacks, notebooks, questions, laughter, and thoughtful debate.',
  'Later we wrote the literal Dune? [test] <mark>safe</mark> notation into our notes so the search demonstration could show punctuation, brackets, and markup-like characters as ordinary words rather than instructions, while everyone agreed the transcript should remain readable, calm, complete, and safe for people reviewing the source.',
].join(' ')

const EMPTY_EXTRACTION_FIXTURE = {
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

const EXTRACTION_FIXTURE = {
  ...EMPTY_EXTRACTION_FIXTURE,
  transcript: {
    ...EMPTY_EXTRACTION_FIXTURE.transcript,
    text: TRANSCRIPT_TEXT,
  },
  statistics: {
    movies: MIXED_COUNTS,
    tv_series: MIXED_COUNTS,
    tracks: MIXED_COUNTS,
    music_releases: MIXED_COUNTS,
    books: MIXED_COUNTS,
  },
  results: {
    movies: [
      {
        status: 'resolved',
        movie_mention: { title: 'Dune: Part One', year: 2021 },
        movie: {
          title: 'Dune: Part One',
          year: 2021,
          cast: ['Timothée Chalamet'],
          directors: ['Denis Villeneuve'],
          description: 'Paul Atreides faces his destiny on Arrakis.',
          poster_url: PORTRAIT_ARTWORK,
          tmdb_id: 438631,
          tmdb_url: 'https://www.themoviedb.org/movie/438631',
          imdb_id: 'tt1160419',
          imdb_url: 'https://www.imdb.com/title/tt1160419/',
          tmdb_score: 7.84,
        },
      },
      {
        status: 'unresolved',
        movie_mention: { title: 'Unidentified Movie', year: 2024 },
        movie: null,
      },
    ],
    tv_series: [
      {
        status: 'resolved',
        tv_series_mention: { title: 'The Last of Us', year: 2023 },
        tv_series: {
          title: 'The Last of Us',
          first_air_year: 2023,
          last_air_year: 2025,
          cast: ['Pedro Pascal', 'Bella Ramsey'],
          creators: ['Craig Mazin', 'Neil Druckmann'],
          description: 'A smuggler escorts a teenager across a ruined America.',
          poster_url: PORTRAIT_ARTWORK,
          tmdb_id: 100088,
          tmdb_url: 'https://www.themoviedb.org/tv/100088',
          imdb_id: 'tt3581920',
          imdb_url: 'https://www.imdb.com/title/tt3581920/',
          tmdb_score: 8.66,
        },
      },
      {
        status: 'unresolved',
        tv_series_mention: { title: 'Unidentified TV Series', year: 2024 },
        tv_series: null,
      },
    ],
    tracks: [
      {
        status: 'resolved',
        track_mention: {
          track_title: 'One More Time',
          artists: ['Daft Punk'],
          release_title: 'Discovery',
          release_year: 2001,
        },
        track: {
          track_title: 'One More Time (2011 Remaster)',
          artists: [{ spotify_artist_id: '4tZwfgrHOc3mvqYlEYSvVi', name: 'Daft Punk' }],
          spotify_track_id: '0DiWol3AO6WpXZgp0goxAV',
          spotify_url: 'https://open.spotify.com/track/0DiWol3AO6WpXZgp0goxAV',
          music_release: {
            release_title: 'Discovery (Deluxe Edition)',
            artists: [{ spotify_artist_id: '4tZwfgrHOc3mvqYlEYSvVi', name: 'Daft Punk' }],
            release_date: '2001-02-26',
            album_type: 'album',
            spotify_album_id: '2noRn2Aes5aoNVsU6iWThc',
            spotify_url: 'https://open.spotify.com/album/2noRn2Aes5aoNVsU6iWThc',
            cover_url: SQUARE_ARTWORK,
          },
          cover_url: SQUARE_ARTWORK,
        },
      },
      {
        status: 'unresolved',
        track_mention: {
          track_title: 'Unidentified Track',
          artists: ['Unknown Artist'],
          release_title: 'Lost Sessions',
          release_year: 1998,
        },
        track: null,
      },
    ],
    music_releases: [
      {
        status: 'resolved',
        music_release_mention: {
          release_title: 'Discovery',
          artists: ['Daft Punk'],
          release_year: 2001,
        },
        music_release: {
          release_title: 'Discovery (Deluxe Edition)',
          artists: [{ spotify_artist_id: '4tZwfgrHOc3mvqYlEYSvVi', name: 'Daft Punk' }],
          release_date: '2001-02-26',
          album_type: 'album',
          spotify_album_id: '2noRn2Aes5aoNVsU6iWThc',
          spotify_url: 'https://open.spotify.com/album/2noRn2Aes5aoNVsU6iWThc',
          cover_url: SQUARE_ARTWORK,
        },
      },
      {
        status: 'unresolved',
        music_release_mention: {
          release_title: 'Unidentified Release',
          artists: ['Unknown Artist'],
          release_year: 1999,
        },
        music_release: null,
      },
    ],
    books: [
      {
        status: 'resolved',
        book_mention: {
          title: 'Pride and Prejudice',
          authors: ['Jane Austen'],
        },
        book: {
          title: 'Pride and Prejudice',
          authors: [
            {
              open_library_author_id: 'OL21594A',
              name: 'Jane Austen',
              open_library_url: 'https://openlibrary.org/authors/OL21594A',
            },
          ],
          open_library_work_id: 'OL66554W',
          open_library_url: 'https://openlibrary.org/works/OL66554W',
          edition: {
            title: 'Pride and Prejudice: A Collector’s Edition',
            publication_year: 1813,
            publishers: ['T. Egerton'],
            isbn_10: ['0141439513'],
            isbn_13: ['9780141439518'],
            open_library_edition_id: 'OL12345M',
            open_library_url: 'https://openlibrary.org/books/OL12345M',
            cover_url: PORTRAIT_ARTWORK,
          },
          cover_url: PORTRAIT_ARTWORK,
          cover_edition_id: 'OL12345M',
        },
      },
      {
        status: 'unresolved',
        book_mention: {
          title: 'Unidentified Book',
          authors: ['Unknown Author'],
        },
        book: null,
      },
    ],
  },
}

const OPTIONAL_METADATA_FIXTURE = {
  ...EXTRACTION_FIXTURE,
  statistics: {
    movies: RESOLVED_COUNTS,
    tv_series: RESOLVED_COUNTS,
    tracks: RESOLVED_COUNTS,
    music_releases: RESOLVED_COUNTS,
    books: RESOLVED_COUNTS,
  },
  results: {
    movies: [
      {
        ...EXTRACTION_FIXTURE.results.movies[0],
        movie: {
          ...EXTRACTION_FIXTURE.results.movies[0].movie,
          cast: [],
          directors: [],
          poster_url: null,
          imdb_id: null,
          imdb_url: null,
        },
      },
    ],
    tv_series: [
      {
        ...EXTRACTION_FIXTURE.results.tv_series[0],
        tv_series: {
          ...EXTRACTION_FIXTURE.results.tv_series[0].tv_series,
          last_air_year: null,
          cast: [],
          creators: [],
          poster_url: null,
          imdb_id: null,
          imdb_url: null,
        },
      },
    ],
    tracks: [
      {
        ...EXTRACTION_FIXTURE.results.tracks[0],
        track_mention: {
          ...EXTRACTION_FIXTURE.results.tracks[0].track_mention,
          release_title: null,
          release_year: null,
        },
        track: {
          track_title: 'One More Time (2011 Remaster)',
          artists: [],
          spotify_track_id: '0DiWol3AO6WpXZgp0goxAV',
          spotify_url: 'https://open.spotify.com/track/0DiWol3AO6WpXZgp0goxAV',
          music_release: {
            release_title: 'Discovery (Deluxe Edition)',
            artists: [],
            release_date: '2001-02-26',
            album_type: 'single',
            spotify_album_id: '2noRn2Aes5aoNVsU6iWThc',
            spotify_url: 'https://open.spotify.com/album/2noRn2Aes5aoNVsU6iWThc',
            cover_url: null,
          },
          cover_url: null,
        },
      },
    ],
    music_releases: [
      {
        ...EXTRACTION_FIXTURE.results.music_releases[0],
        music_release: {
          release_title: 'Discovery (Deluxe Edition)',
          artists: [],
          release_date: '2001-02-26',
          album_type: 'album',
          spotify_album_id: '2noRn2Aes5aoNVsU6iWThc',
          spotify_url: 'https://open.spotify.com/album/2noRn2Aes5aoNVsU6iWThc',
          cover_url: null,
        },
      },
    ],
    books: [
      {
        ...EXTRACTION_FIXTURE.results.books[0],
        book: {
          title: 'Pride and Prejudice',
          authors: [],
          open_library_work_id: 'OL66554W',
          open_library_url: 'https://openlibrary.org/works/OL66554W',
          edition: {
            title: null,
            publication_year: null,
            publishers: [],
            isbn_10: ['0141439513'],
            isbn_13: ['9780141439518'],
            open_library_edition_id: 'OL12345M',
            open_library_url: 'https://openlibrary.org/books/OL12345M',
            cover_url: null,
          },
          cover_url: null,
          cover_edition_id: null,
        },
      },
    ],
  },
}

const MEDIA_AND_UNKNOWN_FIXTURE = {
  ...EMPTY_EXTRACTION_FIXTURE,
  statistics: {
    movies: MIXED_COUNTS,
    tv_series: ZERO_COUNTS,
    tracks: ZERO_COUNTS,
    music_releases: ZERO_COUNTS,
    books: ZERO_COUNTS,
  },
  results: {
    ...EMPTY_EXTRACTION_FIXTURE.results,
    movies: EXTRACTION_FIXTURE.results.movies,
  },
}

const MUSIC_ONLY_FIXTURE = {
  ...EMPTY_EXTRACTION_FIXTURE,
  statistics: {
    movies: ZERO_COUNTS,
    tv_series: ZERO_COUNTS,
    tracks: RESOLVED_COUNTS,
    music_releases: ZERO_COUNTS,
    books: ZERO_COUNTS,
  },
  results: {
    ...EMPTY_EXTRACTION_FIXTURE.results,
    tracks: [EXTRACTION_FIXTURE.results.tracks[0]],
  },
}

const DOMAIN_FAILURE_CASES = [
  {
    code: 'invalid_source',
    heading: 'We can’t use that source video',
    guidance: 'Check the link or try a different source video.',
    canRetry: false,
  },
  {
    code: 'unsupported_platform',
    heading: 'We can’t use that source video',
    guidance: 'Check the link or try a different source video.',
    canRetry: false,
  },
  {
    code: 'source_unavailable',
    heading: 'We couldn’t access that source video',
    guidance: 'Check that the video is public and still available, or try a different link.',
    canRetry: false,
  },
  {
    code: 'duration_limit_exceeded',
    heading: 'That source video is too long',
    guidance: 'It exceeds Reelio’s supported length. Try a shorter video.',
    canRetry: false,
  },
  {
    code: 'interpretation_input_too_large',
    heading: 'That source video has too much content',
    guidance: 'It exceeds Reelio’s supported processing limit. Try a shorter video.',
    canRetry: false,
  },
  {
    code: 'transcription_failed',
    heading: 'We couldn’t get a transcript for that source video',
    guidance: 'Check the link or try a different source video.',
    canRetry: false,
  },
  {
    code: 'transcription_unavailable',
    heading: 'Transcription is temporarily unavailable',
    guidance: 'Try again in a moment.',
    canRetry: true,
  },
  {
    code: 'metadata_provider_failed',
    heading: 'We couldn’t access the source video’s details',
    guidance: 'Try again in a moment.',
    canRetry: true,
  },
  {
    code: 'catalog_provider_failed',
    heading: 'The media catalogs are temporarily unavailable',
    guidance: 'Try again in a moment.',
    canRetry: true,
  },
  {
    code: 'enrichment_failed',
    heading: 'The media catalogs are temporarily unavailable',
    guidance: 'Try again in a moment.',
    canRetry: true,
  },
  {
    code: 'mention_interpretation_failed',
    heading: 'We couldn’t finish processing the source video',
    guidance: 'Try again.',
    canRetry: true,
  },
  {
    code: 'invalid_llm_response',
    heading: 'We couldn’t finish processing the source video',
    guidance: 'Try again.',
    canRetry: true,
  },
  {
    code: 'pipeline_timeout',
    heading: 'Processing took too long',
    guidance: 'Try the source video again.',
    canRetry: true,
  },
  {
    code: 'internal_error',
    heading: 'Something went wrong while processing the source video',
    guidance: 'Try again.',
    canRetry: true,
  },
] as const

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

const originalScrollYDescriptor = Object.getOwnPropertyDescriptor(window, 'scrollY')
const originalScrollIntoViewDescriptor = Object.getOwnPropertyDescriptor(
  HTMLElement.prototype,
  'scrollIntoView',
)
const scrollIntoViewMock = vi.fn()

const setPageScrollY = (scrollY: number) => {
  Object.defineProperty(window, 'scrollY', { configurable: true, value: scrollY })
}

const openDetails = async (user: UserEvent, cardName: string) => {
  await user.click(screen.getByRole('button', { name: cardName }))
  return screen.getByRole('dialog', { name: 'Details' })
}

const openTranscript = async (user: UserEvent) => {
  await user.click(await screen.findByRole('button', { name: 'View transcript' }))
  return screen.getByRole('dialog', { name: 'Transcript' })
}

const submitSourceVideo = async (user: UserEvent) => {
  await user.type(screen.getByLabelText('Video URL'), 'https://www.youtube.com/watch?v=dQw4w9WgXcQ')
  await user.click(screen.getByRole('button', { name: 'Discover' }))
}


beforeEach(() => {
  vi.stubGlobal('scrollTo', vi.fn())
  scrollIntoViewMock.mockReset()
  Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
    configurable: true,
    value: scrollIntoViewMock,
  })
})
beforeAll(() => {
  server.listen({ onUnhandledFrame: 'error' })
})

afterEach(() => {
  extractionRequests.length = 0
  server.resetHandlers()
  document.body.style.cssText = ''
  if (originalScrollYDescriptor === undefined) {
    Reflect.deleteProperty(window, 'scrollY')
  } else {
    Object.defineProperty(window, 'scrollY', originalScrollYDescriptor)
  }
  vi.unstubAllGlobals()
  if (originalScrollIntoViewDescriptor === undefined) {
    Reflect.deleteProperty(HTMLElement.prototype, 'scrollIntoView')
  } else {
    Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', originalScrollIntoViewDescriptor)
  }
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

  it('should render the source summary and ordered category counts when an extraction succeeds', async () => {
    const user = userEvent.setup()

    render(<DiscoveryPage />)
    await submitSourceVideo(user)

    const resultRegion = screen.getByRole('region', { name: 'Discovery result' })
    expect(resultRegion).toHaveAttribute('aria-live', 'polite')
    expect(
      await within(resultRegion).findByRole('heading', { name: 'Never Gonna Give You Up' }),
    ).toBeInTheDocument()
    const titleLink = within(resultRegion).getByRole('link', { name: 'Never Gonna Give You Up' })
    expect(titleLink).toHaveAttribute('href', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ')
    expect(titleLink).toHaveAttribute('target', '_blank')
    expect(titleLink).toHaveAttribute('rel', 'noreferrer')
    expect(within(resultRegion).getByText('YouTube')).toBeInTheDocument()
    expect(
      screen.getAllByRole('tab').map((tab) => tab.textContent),
    ).toEqual(['Movies & TV2', 'Music2', 'Books1', 'Unknown5'])
    expect(screen.getByRole('tab', { name: 'Movies & TV, 2 results' })).toHaveAttribute(
      'aria-selected',
      'true',
    )
  })

  it('should use the default source title when a successful response has a blank title', async () => {
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
    await submitSourceVideo(user)

    const resultRegion = screen.getByRole('region', { name: 'Discovery result' })
    expect(await within(resultRegion).findByRole('heading', { name: 'Source video' })).toBeInTheDocument()
    expect(within(resultRegion).getByText('YouTube')).toBeInTheDocument()
  })

  it('should expose complete accessible card names and visible screen metadata when the visitor switches media categories', async () => {
    const user = userEvent.setup()

    render(<DiscoveryPage />)
    await submitSourceVideo(user)

    const duneCard = await screen.findByRole('button', {
      name: 'Dune: Part One, 2021, score 7.8, open details',
    })
    const lastOfUsCard = screen.getByRole('button', {
      name: 'The Last of Us, 2023 to 2025, score 8.7, open details',
    })
    expect(within(duneCard).getByText('2021')).toBeInTheDocument()
    expect(within(duneCard).getByText('·')).toHaveAttribute('aria-hidden', 'true')
    expect(within(duneCard).getByLabelText('Score 7.8')).toHaveTextContent('7.8')
    expect(within(lastOfUsCard).getByLabelText('Score 8.7')).toHaveTextContent('8.7')
    expect(screen.queryByText('Movie')).not.toBeInTheDocument()
    expect(screen.queryByText('TV series')).not.toBeInTheDocument()
    expect(screen.getByAltText('Artwork for Dune: Part One')).toBeInTheDocument()
    expect(screen.getByAltText('Artwork for The Last of Us')).toBeInTheDocument()

    await user.click(screen.getByRole('tab', { name: 'Music, 2 results' }))

    expect(
      screen.getByRole('button', {
        name: 'One More Time (2011 Remaster), Daft Punk, open details',
      }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', {
        name: 'Discovery (Deluxe Edition), Daft Punk, open details',
      }),
    ).toBeInTheDocument()
    expect(screen.queryByText('Track')).not.toBeInTheDocument()
    expect(screen.queryByText('Album')).not.toBeInTheDocument()
    expect(screen.getByAltText('Artwork for One More Time (2011 Remaster)')).toBeInTheDocument()
    expect(screen.getByAltText('Artwork for Discovery (Deluxe Edition)')).toBeInTheDocument()

    await user.click(screen.getByRole('tab', { name: 'Books, 1 results' }))

    expect(
      screen.getByRole('button', { name: 'Pride and Prejudice, Jane Austen, open details' }),
    ).toBeInTheDocument()
    expect(screen.getByText('Jane Austen')).toBeInTheDocument()
    expect(screen.queryByText('Book')).not.toBeInTheDocument()
    expect(screen.getByAltText('Artwork for Pride and Prejudice')).toBeInTheDocument()
  })

  it('should expose every unresolved mention field when the Unknown category is selected', async () => {
    const user = userEvent.setup()

    render(<DiscoveryPage />)
    await submitSourceVideo(user)
    await user.click(screen.getByRole('tab', { name: 'Unknown, 5 results' }))

    expect(
      screen.getByRole('button', {
        name: 'Unidentified Movie, Movie, year 2024, Not identified, open details',
      }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', {
        name: 'Unidentified TV Series, TV series, year 2024, Not identified, open details',
      }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', {
        name: 'Unidentified Track, Track, artists Unknown Artist, release Lost Sessions, release year 1998, Not identified, open details',
      }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', {
        name: 'Unidentified Release, Music release, artists Unknown Artist, release year 1999, Not identified, open details',
      }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', {
        name: 'Unidentified Book, Book, authors Unknown Author, Not identified, open details',
      }),
    ).toBeInTheDocument()
    expect(screen.getAllByText('Not identified')).toHaveLength(5)
    expect(screen.getByText('Movie')).toBeInTheDocument()
    expect(screen.getByText('TV series')).toBeInTheDocument()
    expect(screen.getByText('Track')).toBeInTheDocument()
    expect(screen.getByText('Music release')).toBeInTheDocument()
    expect(screen.getByText('Book')).toBeInTheDocument()
    expect(screen.getAllByText('Year: 2024')).toHaveLength(2)
    expect(screen.getAllByText('Artists: Unknown Artist')).toHaveLength(2)
    expect(screen.getByText('Release: Lost Sessions')).toBeInTheDocument()
    expect(screen.getByText('Release year: 1998')).toBeInTheDocument()
    expect(screen.getByText('Release year: 1999')).toBeInTheDocument()
    expect(screen.getByText('Authors: Unknown Author')).toBeInTheDocument()
    expect(
      screen.getAllByText('Reelio heard this mention but couldn’t match it to a catalog result.'),
    ).toHaveLength(5)
  })

  it('should keep resolved results categorized when optional provider metadata is absent', async () => {
    const user = userEvent.setup()

    server.use(http.post('/api/extractions', () => HttpResponse.json(OPTIONAL_METADATA_FIXTURE)))

    render(<DiscoveryPage />)
    await submitSourceVideo(user)

    expect(
      await screen.findByRole('button', { name: 'Dune: Part One, 2021, score 7.8, open details' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', {
        name: 'The Last of Us, 2023, score 8.7, open details',
      }),
    ).toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'No artwork available for Dune: Part One' })).toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'No artwork available for The Last of Us' })).toBeInTheDocument()

    await user.click(screen.getByRole('tab', { name: 'Music, 2 results' }))

    expect(
      screen.getByRole('button', {
        name: 'One More Time (2011 Remaster), open details',
      }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', {
        name: 'Discovery (Deluxe Edition), open details',
      }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('img', { name: 'No artwork available for One More Time (2011 Remaster)' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('img', { name: 'No artwork available for Discovery (Deluxe Edition)' }),
    ).toBeInTheDocument()

    await user.click(screen.getByRole('tab', { name: 'Books, 1 results' }))

    expect(
      screen.getByRole('button', { name: 'Pride and Prejudice, open details' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'No artwork available for Pride and Prejudice' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Unknown' })).toBeDisabled()
  })

  it('should replace a failed provider image without changing its result when the image emits an error', async () => {
    const user = userEvent.setup()

    render(<DiscoveryPage />)
    await submitSourceVideo(user)

    const image = await screen.findByAltText('Artwork for Dune: Part One')
    fireEvent.error(image)

    expect(await screen.findByRole('img', { name: 'No artwork available for Dune: Part One' })).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Dune: Part One, 2021, score 7.8, open details' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Movies & TV, 2 results' })).toHaveAttribute(
      'aria-selected',
      'true',
    )
  })

  it('should render every resolved drawer variant with its provider-backed fields when a card opens', async () => {
    const user = userEvent.setup()

    render(<DiscoveryPage />)
    await submitSourceVideo(user)

    const movieDrawer = await openDetails(user, 'Dune: Part One, 2021, score 7.8, open details')
    expect(movieDrawer).toHaveAttribute('aria-modal', 'true')
    expect(within(movieDrawer).getByRole('heading', { name: 'Dune: Part One' })).toBeInTheDocument()
    expect(within(movieDrawer).getByText('2021')).toBeInTheDocument()
    expect(within(movieDrawer).getByLabelText('Score 7.8')).toHaveTextContent('7.8')
    expect(
      within(movieDrawer).getByText('Paul Atreides faces his destiny on Arrakis.'),
    ).toBeInTheDocument()
    expect(within(movieDrawer).getByText('Directors')).toBeInTheDocument()
    expect(within(movieDrawer).getByText('Denis Villeneuve')).toBeInTheDocument()
    const tmdbLink = within(movieDrawer).getByRole('link', { name: 'Open TMDB' })
    expect(tmdbLink).toHaveAttribute('href', 'https://www.themoviedb.org/movie/438631')
    expect(tmdbLink).toHaveAttribute('target', '_blank')
    expect(tmdbLink).toHaveAttribute('rel', 'noreferrer')
    expect(within(movieDrawer).getByRole('link', { name: 'Open IMDb' })).toHaveAttribute(
      'href',
      'https://www.imdb.com/title/tt1160419/',
    )
    await user.click(within(movieDrawer).getByRole('button', { name: 'Close details' }))

    const tvDrawer = await openDetails(
      user,
      'The Last of Us, 2023 to 2025, score 8.7, open details',
    )
    expect(within(tvDrawer).getByText('2023–2025')).toBeInTheDocument()
    expect(within(tvDrawer).getByLabelText('Score 8.7')).toHaveTextContent('8.7')
    expect(
      within(tvDrawer).getByText('A smuggler escorts a teenager across a ruined America.'),
    ).toBeInTheDocument()
    expect(within(tvDrawer).getByText('Creators')).toBeInTheDocument()
    expect(within(tvDrawer).getByText('Craig Mazin, Neil Druckmann')).toBeInTheDocument()
    expect(within(tvDrawer).getByRole('link', { name: 'Open TMDB' })).toHaveAttribute(
      'href',
      'https://www.themoviedb.org/tv/100088',
    )
    expect(within(tvDrawer).getByRole('link', { name: 'Open IMDb' })).toHaveAttribute(
      'href',
      'https://www.imdb.com/title/tt3581920/',
    )
    await user.click(within(tvDrawer).getByRole('button', { name: 'Close details' }))

    await user.click(screen.getByRole('tab', { name: 'Music, 2 results' }))
    const trackDrawer = await openDetails(
      user,
      'One More Time (2011 Remaster), Daft Punk, open details',
    )
    expect(within(trackDrawer).getByText('Album')).toBeInTheDocument()
    expect(within(trackDrawer).getByText('Discovery (Deluxe Edition)')).toBeInTheDocument()
    expect(within(trackDrawer).getByText('Artists')).toBeInTheDocument()
    expect(within(trackDrawer).getByText('Daft Punk')).toBeInTheDocument()
    expect(within(trackDrawer).getByRole('link', { name: 'Open Spotify' })).toHaveAttribute(
      'href',
      'https://open.spotify.com/track/0DiWol3AO6WpXZgp0goxAV',
    )
    await user.click(within(trackDrawer).getByRole('button', { name: 'Close details' }))

    const releaseDrawer = await openDetails(
      user,
      'Discovery (Deluxe Edition), Daft Punk, open details',
    )
    expect(within(releaseDrawer).getByText('Release type')).toBeInTheDocument()
    expect(within(releaseDrawer).getByText('Album')).toBeInTheDocument()
    expect(within(releaseDrawer).getByText('Release date')).toBeInTheDocument()
    expect(within(releaseDrawer).getByText('February 26, 2001')).toBeInTheDocument()
    expect(within(releaseDrawer).getByRole('link', { name: 'Open Spotify' })).toHaveAttribute(
      'href',
      'https://open.spotify.com/album/2noRn2Aes5aoNVsU6iWThc',
    )
    await user.click(within(releaseDrawer).getByRole('button', { name: 'Close details' }))

    await user.click(screen.getByRole('tab', { name: 'Books, 1 results' }))
    const bookDrawer = await openDetails(user, 'Pride and Prejudice, Jane Austen, open details')
    expect(within(bookDrawer).getByText('Authors')).toBeInTheDocument()
    expect(within(bookDrawer).getByText('Jane Austen')).toBeInTheDocument()
    expect(within(bookDrawer).getByText('Publishers')).toBeInTheDocument()
    expect(within(bookDrawer).getByText('T. Egerton')).toBeInTheDocument()
    expect(within(bookDrawer).getByRole('link', { name: 'Open Open Library' })).toHaveAttribute(
      'href',
      'https://openlibrary.org/works/OL66554W',
    )
    await user.click(within(bookDrawer).getByRole('button', { name: 'Close details' }))
  })

  it('should render only available unknown mention fields when each unresolved card opens', async () => {
    const user = userEvent.setup()

    render(<DiscoveryPage />)
    await submitSourceVideo(user)
    await user.click(screen.getByRole('tab', { name: 'Unknown, 5 results' }))

    const unknownCases = [
      {
        cardName: 'Unidentified Movie, Movie, year 2024, Not identified, open details',
        classification: 'Movie',
        availableRows: [
          ['Original classification', 'Movie'],
          ['Year', '2024'],
        ],
        unavailableRows: ['Artists', 'Release', 'Release year', 'Authors'],
      },
      {
        cardName: 'Unidentified TV Series, TV series, year 2024, Not identified, open details',
        classification: 'TV series',
        availableRows: [
          ['Original classification', 'TV series'],
          ['Year', '2024'],
        ],
        unavailableRows: ['Artists', 'Release', 'Release year', 'Authors'],
      },
      {
        cardName:
          'Unidentified Track, Track, artists Unknown Artist, release Lost Sessions, release year 1998, Not identified, open details',
        classification: 'Track',
        availableRows: [
          ['Original classification', 'Track'],
          ['Artists', 'Unknown Artist'],
          ['Release', 'Lost Sessions'],
          ['Release year', '1998'],
        ],
        unavailableRows: ['Year', 'Authors'],
      },
      {
        cardName:
          'Unidentified Release, Music release, artists Unknown Artist, release year 1999, Not identified, open details',
        classification: 'Music release',
        availableRows: [
          ['Original classification', 'Music release'],
          ['Artists', 'Unknown Artist'],
          ['Release year', '1999'],
        ],
        unavailableRows: ['Year', 'Release', 'Authors'],
      },
      {
        cardName: 'Unidentified Book, Book, authors Unknown Author, Not identified, open details',
        classification: 'Book',
        availableRows: [
          ['Original classification', 'Book'],
          ['Authors', 'Unknown Author'],
        ],
        unavailableRows: ['Year', 'Artists', 'Release', 'Release year'],
      },
    ]

    for (const unknownCase of unknownCases) {
      const drawer = await openDetails(user, unknownCase.cardName)
      expect(within(drawer).getByText('Not identified')).toBeInTheDocument()
      expect(within(drawer).getByText(unknownCase.classification)).toBeInTheDocument()
      expect(
        within(drawer).getByText(
          'Reelio heard this mention but couldn’t match it to a catalog result.',
        ),
      ).toBeInTheDocument()
      expect(within(drawer).queryByRole('link')).not.toBeInTheDocument()

      for (const [label, value] of unknownCase.availableRows) {
        expect(within(drawer).getByText(label, { selector: 'dt' })).toBeInTheDocument()
        expect(within(drawer).getByText(value, { selector: 'dd' })).toBeInTheDocument()
      }

      for (const label of unknownCase.unavailableRows) {
        expect(within(drawer).queryByText(label, { selector: 'dt' })).not.toBeInTheDocument()
      }

      await user.click(within(drawer).getByRole('button', { name: 'Close details' }))
    }
  })

  it('should omit empty optional rows and links when provider metadata is unavailable', async () => {
    const user = userEvent.setup()

    server.use(http.post('/api/extractions', () => HttpResponse.json(OPTIONAL_METADATA_FIXTURE)))

    render(<DiscoveryPage />)
    await submitSourceVideo(user)

    const movieDrawer = await openDetails(user, 'Dune: Part One, 2021, score 7.8, open details')
    expect(
      within(movieDrawer).getByRole('img', { name: 'No artwork available for Dune: Part One' }),
    ).toBeInTheDocument()
    expect(within(movieDrawer).queryByText('Directors', { selector: 'dt' })).not.toBeInTheDocument()
    expect(within(movieDrawer).queryByRole('link', { name: 'Open IMDb' })).not.toBeInTheDocument()
    expect(within(movieDrawer).getByRole('link', { name: 'Open TMDB' })).toBeInTheDocument()
    await user.click(within(movieDrawer).getByRole('button', { name: 'Close details' }))

    const tvDrawer = await openDetails(user, 'The Last of Us, 2023, score 8.7, open details')
    expect(within(tvDrawer).queryByText('Creators', { selector: 'dt' })).not.toBeInTheDocument()
    expect(within(tvDrawer).queryByRole('link', { name: 'Open IMDb' })).not.toBeInTheDocument()
    expect(within(tvDrawer).getByRole('link', { name: 'Open TMDB' })).toBeInTheDocument()
    await user.click(within(tvDrawer).getByRole('button', { name: 'Close details' }))

    await user.click(screen.getByRole('tab', { name: 'Music, 2 results' }))
    const trackDrawer = await openDetails(user, 'One More Time (2011 Remaster), open details')
    expect(within(trackDrawer).queryByText('Artists', { selector: 'dt' })).not.toBeInTheDocument()
    expect(within(trackDrawer).getByText('Release type')).toBeInTheDocument()
    expect(within(trackDrawer).getByText('Single')).toBeInTheDocument()
    expect(within(trackDrawer).queryByText('Album', { selector: 'dt' })).not.toBeInTheDocument()
    expect(within(trackDrawer).getByRole('link', { name: 'Open Spotify' })).toBeInTheDocument()
    await user.click(within(trackDrawer).getByRole('button', { name: 'Close details' }))

    const releaseDrawer = await openDetails(user, 'Discovery (Deluxe Edition), open details')
    expect(within(releaseDrawer).queryByText('Artists', { selector: 'dt' })).not.toBeInTheDocument()
    expect(within(releaseDrawer).getByRole('link', { name: 'Open Spotify' })).toBeInTheDocument()
    await user.click(within(releaseDrawer).getByRole('button', { name: 'Close details' }))

    await user.click(screen.getByRole('tab', { name: 'Books, 1 results' }))
    const bookDrawer = await openDetails(user, 'Pride and Prejudice, open details')
    expect(within(bookDrawer).queryByText('Authors', { selector: 'dt' })).not.toBeInTheDocument()
    expect(within(bookDrawer).queryByText('Publishers', { selector: 'dt' })).not.toBeInTheDocument()
    expect(within(bookDrawer).getByRole('link', { name: 'Open Open Library' })).toBeInTheDocument()
    await user.click(within(bookDrawer).getByRole('button', { name: 'Close details' }))
  })

  it('should replace failed drawer artwork without changing the selected category when its image errors', async () => {
    const user = userEvent.setup()

    render(<DiscoveryPage />)
    await submitSourceVideo(user)

    const drawer = await openDetails(user, 'Dune: Part One, 2021, score 7.8, open details')
    fireEvent.error(within(drawer).getByAltText('Artwork for Dune: Part One'))

    expect(
      within(drawer).getByRole('img', { name: 'No artwork available for Dune: Part One' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('dialog', { name: 'Details' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Movies & TV, 2 results' })).toHaveAttribute(
      'aria-selected',
      'true',
    )
    await user.click(within(drawer).getByRole('button', { name: 'Close details' }))
  })

  it('should trap focus and restore page state when details closes with Escape', async () => {
    const user = userEvent.setup()
    document.body.style.overflow = 'clip'
    document.body.style.position = 'relative'
    document.body.style.top = '13px'
    document.body.style.width = '90%'
    document.body.style.paddingRight = '4px'
    setPageScrollY(360)

    render(<DiscoveryPage />)
    await submitSourceVideo(user)

    const duneCard = await screen.findByRole('button', {
      name: 'Dune: Part One, 2021, score 7.8, open details',
    })
    const drawer = await openDetails(user, 'Dune: Part One, 2021, score 7.8, open details')
    const closeButton = within(drawer).getByRole('button', { name: 'Close details' })
    const imdbLink = within(drawer).getByRole('link', { name: 'Open IMDb' })

    expect(closeButton).toHaveFocus()
    await user.keyboard('{Shift>}{Tab}{/Shift}')
    expect(imdbLink).toHaveFocus()
    await user.keyboard('{Tab}')
    expect(closeButton).toHaveFocus()

    await user.keyboard('{Escape}')

    expect(screen.queryByRole('dialog', { name: 'Details' })).not.toBeInTheDocument()
    await waitFor(() => {
      expect(duneCard).toHaveFocus()
      expect(window.scrollTo).toHaveBeenLastCalledWith(0, 360)
    })
    expect(screen.getByRole('tab', { name: 'Movies & TV, 2 results' })).toHaveAttribute(
      'aria-selected',
      'true',
    )
    expect(document.body.style.overflow).toBe('clip')
    expect(document.body.style.position).toBe('relative')
    expect(document.body.style.top).toBe('13px')
    expect(document.body.style.width).toBe('90%')
    expect(document.body.style.paddingRight).toBe('4px')
  })

  it('should dismiss details from the close control and scrim when either is activated', async () => {
    const user = userEvent.setup()

    render(<DiscoveryPage />)
    await submitSourceVideo(user)

    const duneCard = await screen.findByRole('button', {
      name: 'Dune: Part One, 2021, score 7.8, open details',
    })
    const drawer = await openDetails(user, 'Dune: Part One, 2021, score 7.8, open details')
    await user.click(within(drawer).getByRole('button', { name: 'Close details' }))
    expect(screen.queryByRole('dialog', { name: 'Details' })).not.toBeInTheDocument()
    await waitFor(() => {
      expect(duneCard).toHaveFocus()
    })

    await openDetails(user, 'Dune: Part One, 2021, score 7.8, open details')
    fireEvent.pointerDown(screen.getByTestId('detail-drawer-scrim'))

    expect(screen.queryByRole('dialog', { name: 'Details' })).not.toBeInTheDocument()
    await waitFor(() => {
      expect(duneCard).toHaveFocus()
    })
  })
  it('should skip disabled tabs and wrap keyboard navigation when only Movies and Unknown have results', async () => {
    const user = userEvent.setup()

    server.use(http.post('/api/extractions', () => HttpResponse.json(MEDIA_AND_UNKNOWN_FIXTURE)))

    render(<DiscoveryPage />)
    await submitSourceVideo(user)

    const moviesTab = await screen.findByRole('tab', { name: 'Movies & TV, 1 results' })
    const musicTab = screen.getByRole('tab', { name: 'Music' })
    const booksTab = screen.getByRole('tab', { name: 'Books' })
    const unknownTab = screen.getByRole('tab', { name: 'Unknown, 1 results' })
    expect(musicTab).toBeDisabled()
    expect(booksTab).toBeDisabled()
    expect(within(moviesTab).getByText('1')).toBeInTheDocument()
    expect(within(unknownTab).getByText('1')).toBeInTheDocument()

    moviesTab.focus()
    await user.keyboard('{ArrowRight}')
    expect(unknownTab).toHaveFocus()
    expect(unknownTab).toHaveAttribute('aria-selected', 'true')

    await user.keyboard('{ArrowLeft}')
    expect(moviesTab).toHaveFocus()
    expect(moviesTab).toHaveAttribute('aria-selected', 'true')

    await user.keyboard('{End}')
    expect(unknownTab).toHaveFocus()
    expect(unknownTab).toHaveAttribute('aria-selected', 'true')

    await user.keyboard('{Home}')
    expect(moviesTab).toHaveFocus()
    expect(moviesTab).toHaveAttribute('aria-selected', 'true')
  })

  it('should select the first non-empty category when a later extraction replaces the results', async () => {
    const user = userEvent.setup()
    let responseNumber = 0

    server.use(
      http.post('/api/extractions', () => {
        responseNumber += 1
        return HttpResponse.json(responseNumber === 1 ? EXTRACTION_FIXTURE : MUSIC_ONLY_FIXTURE)
      }),
    )

    render(<DiscoveryPage />)
    await submitSourceVideo(user)
    await user.click(screen.getByRole('tab', { name: 'Books, 1 results' }))
    expect(screen.getByRole('tab', { name: 'Books, 1 results' })).toHaveAttribute('aria-selected', 'true')

    await user.clear(screen.getByLabelText('Video URL'))
    await submitSourceVideo(user)

    const musicTab = await screen.findByRole('tab', { name: 'Music, 1 results' })
    expect(musicTab).toHaveAttribute('aria-selected', 'true')
  })

  it('should render directional empty copy without alerts or retry when a successful extraction has no results', async () => {
    const user = userEvent.setup()

    server.use(http.post('/api/extractions', () => HttpResponse.json(EMPTY_EXTRACTION_FIXTURE)))

    render(<DiscoveryPage />)
    await submitSourceVideo(user)

    expect(await screen.findByRole('heading', { name: 'Never Gonna Give You Up' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'View transcript' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'We didn’t find anything' })).toBeInTheDocument()
    expect(
      screen.getByText(
        'No movies, shows, music, or books were mentioned in this video. Try another one.',
      ),
    ).toBeInTheDocument()
    expect(screen.queryByRole('tablist')).not.toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Try again' })).not.toBeInTheDocument()
  })

  it.each(DOMAIN_FAILURE_CASES)(
    'should render normalized recovery feedback when the backend returns $code',
    async ({ code, heading, guidance, canRetry }) => {
      const user = userEvent.setup()

      server.use(
        http.post('/api/extractions', () =>
          HttpResponse.json(
            { error: { code, message: 'Backend details must stay hidden' } },
            { status: 503 },
          ),
        ),
      )

      render(<DiscoveryPage />)
      await submitSourceVideo(user)

      const alert = await screen.findByRole('alert')
      expect(within(alert).getByRole('heading', { name: heading })).toBeInTheDocument()
      expect(within(alert).getByText(guidance)).toBeInTheDocument()
      expect(screen.queryByText('Backend details must stay hidden')).not.toBeInTheDocument()
      expect(within(alert).queryByRole('button', { name: 'Try again' })).toEqual(
        canRetry ? expect.any(HTMLButtonElement) : null,
      )
      expect(screen.getByLabelText('Video URL')).toBeEnabled()
      expect(screen.getByRole('button', { name: 'Discover' })).toBeEnabled()
    },
  )

  it('should explain unusable source without retry when FastAPI returns validation detail', async () => {
    const user = userEvent.setup()

    server.use(
      http.post('/api/extractions', () =>
        HttpResponse.json({ detail: [{ msg: 'The backend details must stay hidden' }] }, { status: 422 }),
      ),
    )

    render(<DiscoveryPage />)
    await submitSourceVideo(user)

    const alert = await screen.findByRole('alert')
    expect(within(alert).getByRole('heading', { name: 'We can’t use that source video' })).toBeInTheDocument()
    expect(
      within(alert).getByText('Check the link or try a different source video.'),
    ).toBeInTheDocument()
    expect(within(alert).queryByRole('button', { name: 'Try again' })).not.toBeInTheDocument()
  })

  it('should render unexpected-response recovery when a failure body is not JSON', async () => {
    const user = userEvent.setup()

    server.use(
      http.post('/api/extractions', () => new HttpResponse('Service temporarily unavailable', { status: 503 })),
    )

    render(<DiscoveryPage />)
    await submitSourceVideo(user)

    const alert = await screen.findByRole('alert')
    expect(within(alert).getByRole('heading', { name: 'We received an unexpected response' })).toBeInTheDocument()
    expect(within(alert).getByText('Try again.')).toBeInTheDocument()
    expect(within(alert).getByRole('button', { name: 'Try again' })).toBeInTheDocument()
  })

  it('should render unexpected-response recovery when a successful response lacks required extraction fields', async () => {
    const user = userEvent.setup()

    server.use(http.post('/api/extractions', () => HttpResponse.json({ source: { platform: 'youtube' } })))

    render(<DiscoveryPage />)
    await submitSourceVideo(user)

    const alert = await screen.findByRole('alert')
    expect(within(alert).getByRole('heading', { name: 'We received an unexpected response' })).toBeInTheDocument()
    expect(within(alert).getByText('Try again.')).toBeInTheDocument()
    expect(within(alert).getByRole('button', { name: 'Try again' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Source video' })).not.toBeInTheDocument()
  })

  it('should render network recovery when the extraction request rejects', async () => {
    const user = userEvent.setup()

    server.use(http.post('/api/extractions', () => HttpResponse.error()))

    render(<DiscoveryPage />)
    await submitSourceVideo(user)

    const alert = await screen.findByRole('alert')
    expect(within(alert).getByRole('heading', { name: 'We couldn’t reach Reelio' })).toBeInTheDocument()
    expect(within(alert).getByText('Check your connection and try again.')).toBeInTheDocument()
    expect(within(alert).getByRole('button', { name: 'Try again' })).toBeInTheDocument()
  })

  it('should retry the same submitted URL and render success when a recoverable failure is retried', async () => {
    const user = userEvent.setup()
    const { promise: retryResponseGate, resolve: releaseRetryResponse } = Promise.withResolvers<void>()
    let attempt = 0

    server.use(
      http.post('/api/extractions', async ({ request }) => {
        extractionRequests.push({
          body: await request.json(),
          contentType: request.headers.get('content-type'),
        })
        attempt += 1
        if (attempt === 1) {
          return HttpResponse.json(
            { error: { code: 'transcription_unavailable', message: 'Backend details must stay hidden' } },
            { status: 503 },
          )
        }

        await retryResponseGate
        return HttpResponse.json(EXTRACTION_FIXTURE)
      }),
    )

    render(<DiscoveryPage />)
    await submitSourceVideo(user)

    expect(await screen.findByRole('heading', { name: 'Transcription is temporarily unavailable' })).toBeInTheDocument()
    expect(screen.getByLabelText('Video URL')).toHaveValue(
      'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    )
    await user.click(screen.getByRole('button', { name: 'Try again' }))

    expect(screen.getByRole('status')).toHaveTextContent('Finding what’s mentioned')
    releaseRetryResponse()
    expect(await screen.findByRole('heading', { name: 'Never Gonna Give You Up' })).toBeInTheDocument()
    expect(extractionRequests.map(({ body }) => body)).toEqual([
      { url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' },
      { url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' },
    ])
  })

  it('should restore the form when a retry receives another normalized failure', async () => {
    const user = userEvent.setup()
    const { promise: retryResponseGate, resolve: releaseRetryResponse } = Promise.withResolvers<void>()
    let attempt = 0

    server.use(
      http.post('/api/extractions', async () => {
        attempt += 1
        if (attempt === 1) {
          return HttpResponse.json(
            { error: { code: 'transcription_unavailable', message: 'Backend details must stay hidden' } },
            { status: 503 },
          )
        }

        await retryResponseGate
        return HttpResponse.json(
          { error: { code: 'pipeline_timeout', message: 'Backend details must stay hidden' } },
          { status: 504 },
        )
      }),
    )

    render(<DiscoveryPage />)
    await submitSourceVideo(user)

    expect(await screen.findByRole('heading', { name: 'Transcription is temporarily unavailable' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Try again' }))

    expect(screen.getByRole('status')).toHaveTextContent('Finding what’s mentioned')
    releaseRetryResponse()
    expect(await screen.findByRole('heading', { name: 'Processing took too long' })).toBeInTheDocument()
    expect(screen.getByLabelText('Video URL')).toHaveValue(
      'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    )
    expect(screen.getByLabelText('Video URL')).toBeEnabled()
    expect(screen.getByRole('button', { name: 'Discover' })).toBeEnabled()
    expect(screen.getByRole('button', { name: 'Try again' })).toBeEnabled()
  })

  it('should send one request when the form is submitted twice before React rerenders', async () => {
    const { promise: responseGate, resolve: releaseResponse } = Promise.withResolvers<void>()

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
    const input = screen.getByLabelText('Video URL')
    const form = input.closest('form')
    if (form === null) {
      throw new Error('Discovery form is missing.')
    }

    fireEvent.change(input, { target: { value: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' } })
    fireEvent.submit(form)
    fireEvent.submit(form)

    expect(screen.getByRole('status')).toHaveTextContent('Finding what’s mentioned')
    await waitFor(() => {
      expect(extractionRequests).toHaveLength(1)
    })

    releaseResponse()
    expect(await screen.findByRole('heading', { name: 'Never Gonna Give You Up' })).toBeInTheDocument()
  })

  it('should keep loading without a client timeout when extraction remains pending for 30 minutes', async () => {
    const { promise: responseGate, resolve: releaseResponse } = Promise.withResolvers<void>()
    vi.useFakeTimers()

    try {
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
      const input = screen.getByLabelText('Video URL')
      const form = input.closest('form')
      if (form === null) {
        throw new Error('Discovery form is missing.')
      }

      fireEvent.change(input, { target: { value: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' } })
      fireEvent.submit(form)

      expect(screen.getByRole('status')).toHaveTextContent('Finding what’s mentioned')
      await act(async () => {
        await vi.advanceTimersByTimeAsync(30 * 60 * 1000)
      })
      expect(extractionRequests).toHaveLength(1)
      expect(screen.getByRole('status')).toHaveTextContent('Finding what’s mentioned')

      releaseResponse()
    } finally {
      vi.useRealTimers()
    }

    expect(await screen.findByRole('heading', { name: 'Never Gonna Give You Up' })).toBeInTheDocument()
  })

  it('should abort the active request without an alert when the page unmounts', async () => {
    const { promise: responseGate, resolve: releaseResponse } = Promise.withResolvers<void>()
    let requestSignal: AbortSignal | undefined
    const user = userEvent.setup()

    server.use(
      http.post('/api/extractions', async ({ request }) => {
        requestSignal = request.signal
        await responseGate
        return HttpResponse.json(EXTRACTION_FIXTURE)
      }),
    )

    const { unmount } = render(<DiscoveryPage />)
    await submitSourceVideo(user)

    await waitFor(() => {
      expect(requestSignal).toBeDefined()
    })
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    unmount()

    expect(requestSignal?.aborted).toBe(true)
    releaseResponse()
  })

  it('should preserve the newest result when an obsolete keyed page request finishes last', async () => {
    const { promise: firstResponseGate, resolve: releaseFirstResponse } = Promise.withResolvers<void>()
    const { promise: secondResponseGate, resolve: releaseSecondResponse } = Promise.withResolvers<void>()
    const user = userEvent.setup()
    let requestCount = 0
    const olderFixture = {
      ...EXTRACTION_FIXTURE,
      source: { ...EXTRACTION_FIXTURE.source, title: 'Older source video' },
    }
    const newerFixture = {
      ...EXTRACTION_FIXTURE,
      source: { ...EXTRACTION_FIXTURE.source, title: 'Newer source video' },
    }

    server.use(
      http.post('/api/extractions', async () => {
        requestCount += 1
        if (requestCount === 1) {
          await firstResponseGate
          return HttpResponse.json(olderFixture)
        }

        await secondResponseGate
        return HttpResponse.json(newerFixture)
      }),
    )

    const page = render(<DiscoveryPage key="initial" />)
    await submitSourceVideo(user)
    await waitFor(() => {
      expect(requestCount).toBe(1)
    })

    page.rerender(<DiscoveryPage key="replacement" />)
    await submitSourceVideo(user)
    await waitFor(() => {
      expect(requestCount).toBe(2)
    })

    releaseSecondResponse()
    expect(await screen.findByRole('heading', { name: 'Newer source video' })).toBeInTheDocument()

    releaseFirstResponse()
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Newer source video' })).toBeInTheDocument()
    })
  })

  it('should open the normalized transcript when its source-summary action is activated', async () => {
    const user = userEvent.setup()

    render(<DiscoveryPage />)
    await submitSourceVideo(user)

    const transcriptOpener = await screen.findByRole('button', { name: 'View transcript' })
    expect(transcriptOpener).toBeInTheDocument()

    const dialog = await openTranscript(user)
    expect(screen.getByLabelText('Search the transcript')).toHaveFocus()
    expect(
      Array.from(dialog.querySelectorAll('.transcript-modal_text p'), (paragraph) => paragraph.textContent).join(
        ' ',
      ),
    ).toBe(TRANSCRIPT_TEXT)

    await user.keyboard('{Escape}')
  })

  it('should highlight literal case-insensitive matches and wrap match controls when a query is entered', async () => {
    const user = userEvent.setup()

    render(<DiscoveryPage />)
    await submitSourceVideo(user)

    const dialog = await openTranscript(user)
    const search = screen.getByLabelText('Search the transcript')
    const matchCount = within(dialog).getByText('', { selector: '.transcript-modal_match-count' })
    await user.type(search, 'dune')

    await waitFor(() => {
      expect(matchCount).toHaveTextContent('1 of 4')
      expect(scrollIntoViewMock).toHaveBeenLastCalledWith({ block: 'center', behavior: 'smooth' })
    })
    expect(Array.from(dialog.querySelectorAll('mark'), (mark) => mark.textContent)).toEqual([
      'Dune',
      'DUNE',
      'dune',
      'Dune',
    ])
    expect(dialog.querySelectorAll('mark[aria-current="true"]')).toHaveLength(1)

    const previousMatch = within(dialog).getByRole('button', { name: 'Previous match' })
    const nextMatch = within(dialog).getByRole('button', { name: 'Next match' })
    await user.click(nextMatch)
    expect(matchCount).toHaveTextContent('2 of 4')
    await user.click(nextMatch)
    expect(matchCount).toHaveTextContent('3 of 4')
    await user.click(nextMatch)
    expect(matchCount).toHaveTextContent('4 of 4')
    await user.click(nextMatch)
    expect(matchCount).toHaveTextContent('1 of 4')
    await user.click(previousMatch)
    expect(matchCount).toHaveTextContent('4 of 4')
    search.focus()
    await user.keyboard('{Enter}')
    expect(matchCount).toHaveTextContent('1 of 4')
    await user.keyboard('{Shift>}{Enter}{/Shift}')
    expect(matchCount).toHaveTextContent('4 of 4')

    await user.clear(search)
    fireEvent.change(search, { target: { value: 'Dune? [test] <mark>safe</mark>' } })
    expect(search).toHaveValue('Dune? [test] <mark>safe</mark>')
    expect(matchCount).toHaveTextContent('1 of 1')
    expect(Array.from(dialog.querySelectorAll('mark'), (mark) => mark.textContent)).toEqual([
      'Dune?',
      '[test] <mark>safe</mark>',
    ])
    expect(dialog.querySelectorAll('mark[aria-current="true"]')).toHaveLength(2)
    expect(dialog.querySelector('mark mark')).toBeNull()

    await user.clear(search)
    await user.type(search, 'viewers. DUNE')
    expect(matchCount).toHaveTextContent('1 of 1')
    expect(dialog.querySelectorAll('mark')).toHaveLength(2)
    expect(dialog.querySelectorAll('mark[aria-current="true"]')).toHaveLength(2)

    await user.keyboard('{Escape}')
  })

  it('should show no-match copy and return ordinary paragraphs when the search query changes', async () => {
    const user = userEvent.setup()

    render(<DiscoveryPage />)
    await submitSourceVideo(user)

    const dialog = await openTranscript(user)
    const search = screen.getByLabelText('Search the transcript')
    await user.type(search, 'not in this transcript')

    expect(within(dialog).getByRole('heading', { name: 'No matches' })).toBeInTheDocument()
    expect(within(dialog).getByText('Try a different word.')).toBeInTheDocument()
    expect(within(dialog).getByText('0 matches')).toBeInTheDocument()
    expect(dialog.querySelectorAll('.transcript-modal_text p')).toHaveLength(0)

    await user.clear(search)
    expect(within(dialog).queryByRole('heading', { name: 'No matches' })).not.toBeInTheDocument()
    expect(dialog.querySelectorAll('.transcript-modal_text p').length).toBeGreaterThan(1)

    await user.keyboard('{Escape}')
  })

  it('should preserve an active query and expose timestamp unavailability when transcript views change', async () => {
    const user = userEvent.setup()

    render(<DiscoveryPage />)
    await submitSourceVideo(user)

    const dialog = await openTranscript(user)
    const search = screen.getByLabelText('Search the transcript')
    await user.type(search, 'dune')
    await user.click(within(dialog).getByRole('button', { name: 'Next match' }))
    expect(within(dialog).getByText('2 of 4')).toBeInTheDocument()

    const [textTab, timestampTab] = within(dialog).getAllByRole('tab')
    expect([textTab.textContent, timestampTab.textContent]).toEqual(['Text', 'Timestamp'])
    await user.click(timestampTab)
    expect(timestampTab).toHaveAttribute('aria-selected', 'true')
    expect(search).toBeDisabled()
    expect(within(dialog).getByRole('button', { name: 'Previous match' })).toBeDisabled()
    expect(within(dialog).getByRole('button', { name: 'Next match' })).toBeDisabled()
    expect(within(dialog).getByText('2 of 4')).toBeInTheDocument()

    const timestampPanel = dialog.querySelector('#transcript-panel-timestamp')
    expect(timestampPanel).not.toBeNull()
    expect(Array.from(timestampPanel?.querySelectorAll('h3, p') ?? [], (node) => node.textContent)).toEqual([
      'Timestamps aren’t available',
      'This source video’s transcript does not include timing information.',
    ])
    expect(timestampPanel?.querySelectorAll('time')).toHaveLength(0)
    expect(timestampPanel?.textContent).not.toMatch(/\b\d{1,2}:\d{2}\b/u)

    await user.click(textTab)
    expect(textTab).toHaveAttribute('aria-selected', 'true')
    expect(search).toBeEnabled()
    expect(search).toHaveValue('dune')
    expect(within(dialog).getByText('2 of 4')).toBeInTheDocument()
    await user.click(within(dialog).getByRole('button', { name: 'Next match' }))
    expect(within(dialog).getByText('3 of 4')).toBeInTheDocument()

    textTab.focus()
    await user.keyboard('{ArrowRight}')
    expect(timestampTab).toHaveFocus()
    expect(timestampTab).toHaveAttribute('aria-selected', 'true')
    await user.keyboard('{ArrowLeft}')
    expect(textTab).toHaveFocus()
    expect(textTab).toHaveAttribute('aria-selected', 'true')
    await user.keyboard('{End}')
    expect(timestampTab).toHaveFocus()
    expect(timestampTab).toHaveAttribute('aria-selected', 'true')
    await user.keyboard('{Home}')
    expect(textTab).toHaveFocus()
    expect(textTab).toHaveAttribute('aria-selected', 'true')

    await user.keyboard('{Escape}')
  })

  it('should disable transcript search and describe the source when transcript text is blank', async () => {
    const user = userEvent.setup()
    server.use(
      http.post('/api/extractions', () =>
        HttpResponse.json({
          ...EXTRACTION_FIXTURE,
          transcript: { ...EXTRACTION_FIXTURE.transcript, text: '   ' },
        }),
      ),
    )

    render(<DiscoveryPage />)
    await submitSourceVideo(user)

    const dialog = await openTranscript(user)
    expect(within(dialog).getByText('Transcript text is unavailable for this source video.')).toBeInTheDocument()
    expect(screen.getByLabelText('Search the transcript')).toBeDisabled()
    expect(within(dialog).getByRole('button', { name: 'Previous match' })).toBeDisabled()
    expect(within(dialog).getByRole('button', { name: 'Next match' })).toBeDisabled()
    expect(within(dialog).queryByRole('heading', { name: 'No matches' })).not.toBeInTheDocument()

    await user.keyboard('{Escape}')
  })

  it('should trap focus and restore page state when the transcript closes through every modal path', async () => {
    const user = userEvent.setup()
    document.body.style.overflow = 'clip'
    document.body.style.position = 'relative'
    document.body.style.top = '13px'
    document.body.style.width = '90%'
    document.body.style.paddingRight = '4px'
    setPageScrollY(360)

    render(<DiscoveryPage />)
    await submitSourceVideo(user)

    const transcriptOpener = await screen.findByRole('button', { name: 'View transcript' })
    const dialog = await openTranscript(user)
    const search = screen.getByLabelText('Search the transcript')
    const closeButton = within(dialog).getByRole('button', { name: 'Close transcript' })

    expect(search).toHaveFocus()
    expect(document.body.style.overflow).toBe('hidden')
    expect(document.body.style.position).toBe('fixed')
    expect(document.body.style.top).toBe('-360px')
    expect(document.body.style.width).toBe('100%')
    closeButton.focus()
    await user.keyboard('{Shift>}{Tab}{/Shift}')
    expect(search).toHaveFocus()
    await user.keyboard('{Tab}')
    expect(closeButton).toHaveFocus()

    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog', { name: 'Transcript' })).not.toBeInTheDocument()
    await waitFor(() => {
      expect(transcriptOpener).toHaveFocus()
      expect(window.scrollTo).toHaveBeenLastCalledWith(0, 360)
    })
    expect(document.body.style.overflow).toBe('clip')
    expect(document.body.style.position).toBe('relative')
    expect(document.body.style.top).toBe('13px')
    expect(document.body.style.width).toBe('90%')
    expect(document.body.style.paddingRight).toBe('4px')

    const closeControlDialog = await openTranscript(user)
    await user.click(within(closeControlDialog).getByRole('button', { name: 'Close transcript' }))
    expect(screen.queryByRole('dialog', { name: 'Transcript' })).not.toBeInTheDocument()
    await waitFor(() => {
      expect(transcriptOpener).toHaveFocus()
    })

    await openTranscript(user)
    fireEvent.pointerDown(screen.getByTestId('transcript-modal-scrim'))
    expect(screen.queryByRole('dialog', { name: 'Transcript' })).not.toBeInTheDocument()
    await waitFor(() => {
      expect(transcriptOpener).toHaveFocus()
    })
  })

  it('should use immediate match scrolling when reduced motion is preferred', async () => {
    const user = userEvent.setup()
    vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: true })))

    render(<DiscoveryPage />)
    await submitSourceVideo(user)

    const dialog = await openTranscript(user)
    await user.type(screen.getByLabelText('Search the transcript'), 'dune')

    await waitFor(() => {
      expect(within(dialog).getByText('1 of 4')).toBeInTheDocument()
      expect(scrollIntoViewMock).toHaveBeenLastCalledWith({ block: 'center', behavior: 'auto' })
    })

    await user.keyboard('{Escape}')
  })
})
