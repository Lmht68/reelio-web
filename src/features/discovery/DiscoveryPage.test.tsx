import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent, { type UserEvent } from '@testing-library/user-event'
import { HttpResponse, http } from 'msw'
import { setupServer } from 'msw/node'
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { DiscoveryPage } from './DiscoveryPage'

const PORTRAIT_ARTWORK =
  'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%224%22 height=%226%22%3E%3Crect width=%224%22 height=%226%22 fill=%22%23c2410c%22/%3E%3C/svg%3E'
const SQUARE_ARTWORK =
  'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%224%22 height=%224%22%3E%3Crect width=%224%22 height=%224%22 fill=%22%23c2410c%22/%3E%3C/svg%3E'
const ZERO_COUNTS = { n_mentions: 0, n_resolved: 0, n_unresolved: 0 }
const MIXED_COUNTS = { n_mentions: 2, n_resolved: 1, n_unresolved: 1 }
const RESOLVED_COUNTS = { n_mentions: 1, n_resolved: 1, n_unresolved: 0 }

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
            album_type: 'album',
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

const submitSourceVideo = async (user: UserEvent) => {
  await user.type(screen.getByLabelText('Video URL'), 'https://www.youtube.com/watch?v=dQw4w9WgXcQ')
  await user.click(screen.getByRole('button', { name: 'Discover' }))
}

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

  it('should render every resolved card variant when the visitor switches media categories', async () => {
    const user = userEvent.setup()

    render(<DiscoveryPage />)
    await submitSourceVideo(user)

    expect(await screen.findByRole('heading', { name: 'Dune: Part One' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'The Last of Us' })).toBeInTheDocument()
    expect(screen.getByText('2021')).toBeInTheDocument()
    expect(screen.getByLabelText('Score 7.8')).toHaveTextContent('7.8')
    expect(screen.getByLabelText('Score 8.7')).toHaveTextContent('8.7')
    expect(screen.queryByText(/TMDB/u)).not.toBeInTheDocument()
    expect(screen.queryByText('Movie')).not.toBeInTheDocument()
    expect(screen.queryByText('TV series')).not.toBeInTheDocument()
    expect(screen.getByAltText('Artwork for Dune: Part One')).toBeInTheDocument()
    expect(screen.getByAltText('Artwork for The Last of Us')).toBeInTheDocument()

    await user.click(screen.getByRole('tab', { name: 'Music, 2 results' }))

    expect(screen.getByRole('heading', { name: 'One More Time (2011 Remaster)' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Discovery (Deluxe Edition)' })).toBeInTheDocument()
    expect(screen.queryByText('Track')).not.toBeInTheDocument()
    expect(screen.queryByText('Album')).not.toBeInTheDocument()
    expect(screen.getByAltText('Artwork for One More Time (2011 Remaster)')).toBeInTheDocument()
    expect(screen.getByAltText('Artwork for Discovery (Deluxe Edition)')).toBeInTheDocument()

    await user.click(screen.getByRole('tab', { name: 'Books, 1 results' }))

    expect(screen.getByRole('heading', { name: 'Pride and Prejudice' })).toBeInTheDocument()
    expect(screen.getByText('Jane Austen')).toBeInTheDocument()
    expect(screen.queryByText('Book')).not.toBeInTheDocument()
    expect(screen.getByAltText('Artwork for Pride and Prejudice')).toBeInTheDocument()
  })

  it('should show every unresolved mention field when the Unknown category is selected', async () => {
    const user = userEvent.setup()

    render(<DiscoveryPage />)
    await submitSourceVideo(user)
    await user.click(screen.getByRole('tab', { name: 'Unknown, 5 results' }))

    expect(screen.getByRole('heading', { name: 'Unidentified Movie' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Unidentified TV Series' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Unidentified Track' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Unidentified Release' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Unidentified Book' })).toBeInTheDocument()
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

  it('should keep resolved results categorized when their optional provider metadata is absent', async () => {
    const user = userEvent.setup()

    server.use(http.post('/api/extractions', () => HttpResponse.json(OPTIONAL_METADATA_FIXTURE)))

    render(<DiscoveryPage />)
    await submitSourceVideo(user)

    expect(await screen.findByRole('heading', { name: 'Dune: Part One' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'The Last of Us' })).toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'No artwork available for Dune: Part One' })).toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'No artwork available for The Last of Us' })).toBeInTheDocument()

    await user.click(screen.getByRole('tab', { name: 'Music, 2 results' }))

    expect(screen.getByRole('heading', { name: 'One More Time (2011 Remaster)' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Discovery (Deluxe Edition)' })).toBeInTheDocument()
    expect(
      screen.getByRole('img', { name: 'No artwork available for One More Time (2011 Remaster)' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('img', { name: 'No artwork available for Discovery (Deluxe Edition)' }),
    ).toBeInTheDocument()

    await user.click(screen.getByRole('tab', { name: 'Books, 1 results' }))

    expect(screen.getByRole('heading', { name: 'Pride and Prejudice' })).toBeInTheDocument()
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
    expect(screen.getByRole('heading', { name: 'Dune: Part One' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Movies & TV, 2 results' })).toHaveAttribute(
      'aria-selected',
      'true',
    )
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

  it('should render directional empty copy without tabs or error styling when a successful extraction has no results', async () => {
    const user = userEvent.setup()

    server.use(http.post('/api/extractions', () => HttpResponse.json(EMPTY_EXTRACTION_FIXTURE)))

    render(<DiscoveryPage />)
    await submitSourceVideo(user)

    expect(await screen.findByRole('heading', { name: 'Never Gonna Give You Up' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'We didn’t find anything' })).toBeInTheDocument()
    expect(
      screen.getByText(
        'No movies, shows, music, or books were mentioned in this video. Try another one.',
      ),
    ).toBeInTheDocument()
    expect(screen.queryByRole('tablist')).not.toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('should show a generic failure and restore controls when the extraction request fails', async () => {
    const user = userEvent.setup()

    server.use(
      http.post('/api/extractions', () =>
        HttpResponse.json({ error: { code: 'source_unavailable', message: 'Unavailable' } }, { status: 502 }),
      ),
    )

    render(<DiscoveryPage />)
    await submitSourceVideo(user)

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'We couldn’t complete the discovery. Please try again.',
    )
    expect(screen.getByLabelText('Video URL')).toBeEnabled()
    expect(screen.getByRole('button', { name: 'Discover' })).toBeEnabled()
  })

  it('should show a generic failure when a successful response lacks required extraction fields', async () => {
    const user = userEvent.setup()

    server.use(
      http.post('/api/extractions', () =>
        HttpResponse.json({ source: { platform: 'youtube' } }),
      ),
    )

    render(<DiscoveryPage />)
    await submitSourceVideo(user)

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'We couldn’t complete the discovery. Please try again.',
    )
    expect(screen.queryByRole('heading', { name: 'Source video' })).not.toBeInTheDocument()
  })
})
