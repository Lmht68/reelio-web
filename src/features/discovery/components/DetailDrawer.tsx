import imdbIconUrl from '../../../assets/icons/providers/imdb.svg'
import openLibraryIconUrl from '../../../assets/icons/providers/open-library.svg'
import spotifyIconUrl from '../../../assets/icons/providers/spotify.svg'
import tmdbIconUrl from '../../../assets/icons/providers/tmdb.svg'
import { useEffect, useRef } from 'react'
import type { PointerEvent as ReactPointerEvent, ReactNode } from 'react'
import type { MediaResult, UnknownMediaResult } from '../model/discovery'
import { ResultArtwork } from './ResultArtwork'

type DetailDrawerProps = {
  readonly isOpen: boolean
  readonly result: MediaResult
  readonly opener: HTMLButtonElement
  readonly onClose: () => void
}

type BodyStyleState = {
  readonly overflow: string
  readonly paddingRight: string
  readonly position: string
  readonly top: string
  readonly width: string
}

type Provider = 'TMDB' | 'IMDb' | 'Spotify' | 'Open Library'

const PROVIDER_ICON_URLS: Readonly<Record<Provider, string>> = {
  IMDb: imdbIconUrl,
  'Open Library': openLibraryIconUrl,
  Spotify: spotifyIconUrl,
  TMDB: tmdbIconUrl,
}

type ProviderLinkProps = {
  readonly href: string
  readonly provider: Provider
}

type ResultArtworkProps = {
  readonly title: string
  readonly artworkUrl?: string
  readonly shape: 'portrait' | 'square'
}

type DetailRowProps = {
  readonly label: string
  readonly value: string
}

const unknownClassificationLabel = (result: UnknownMediaResult): string => {
  switch (result.originalClassification) {
    case 'movie':
      return 'Movie'
    case 'tvSeries':
      return 'TV series'
    case 'track':
      return 'Track'
    case 'musicRelease':
      return 'Music release'
    case 'book':
      return 'Book'
  }
}

const unknownArtworkShape = (result: UnknownMediaResult): 'portrait' | 'square' => {
  switch (result.originalClassification) {
    case 'movie':
    case 'tvSeries':
    case 'book':
      return 'portrait'
    case 'track':
    case 'musicRelease':
      return 'square'
  }
}

const namesLabel = (names: ReadonlyArray<string>): string => names.join(', ')

const releaseDateFormatter = new Intl.DateTimeFormat('en-US', {
  day: 'numeric',
  month: 'long',
  timeZone: 'UTC',
  year: 'numeric',
})

const formatReleaseDate = (releaseDate: string): string => {
  const date = new Date(`${releaseDate}T00:00:00Z`)

  return Number.isNaN(date.valueOf()) ? releaseDate : releaseDateFormatter.format(date)
}

const releaseKindLabel = (releaseKind: 'album' | 'single' | 'compilation'): string =>
  `${releaseKind.slice(0, 1).toUpperCase()}${releaseKind.slice(1)}`

const ResultArtworkBlock = ({ title, artworkUrl, shape }: ResultArtworkProps) => (
  <div className="detail-drawer_artwork">
    <ResultArtwork title={title} artworkUrl={artworkUrl} shape={shape} />
  </div>
)

const Score = ({ score }: { readonly score: number }) => {
  const formattedScore = score.toFixed(1)

  return (
    <span className="detail-drawer_score" aria-label={`Score ${formattedScore}`}>
      <svg aria-hidden="true" viewBox="0 0 24 24">
        <path d="m12 3.5 2.63 5.33 5.88.86-4.25 4.14 1 5.85L12 16.91l-5.26 2.77 1-5.85-4.25-4.14 5.88-.86L12 3.5Z" />
      </svg>
      <span>{formattedScore}</span>
    </span>
  )
}

const ProviderIcon = ({ provider }: { readonly provider: Provider }) => (
  <img
    className="detail-drawer_provider-icon"
    data-provider={provider}
    src={PROVIDER_ICON_URLS[provider]}
    alt=""
    aria-hidden="true"
  />
)

const ProviderLink = ({ href, provider }: ProviderLinkProps) => (
  <a
    className="detail-drawer_provider-link"
    href={href}
    target="_blank"
    rel="noreferrer"
    aria-label={`Open ${provider}`}
    title={`Open ${provider}`}
  >
    <ProviderIcon provider={provider} />
    <svg className="detail-drawer_external-arrow" aria-hidden="true" viewBox="0 0 24 24">
      <path d="M7 17 17 7M9 7h8v8" />
    </svg>
  </a>
)

const DetailRow = ({ label, value }: DetailRowProps) => (
  <div className="detail-drawer_row">
    <dt>{label}</dt>
    <dd>{value}</dd>
  </div>
)

const ProviderLinks = ({ children }: { readonly children: ReactNode }) => (
  <div className="detail-drawer_links">{children}</div>
)

const MovieDetails = ({ result }: { readonly result: Extract<MediaResult, { readonly kind: 'movie' }> }) => {
  const description = result.description.trim()

  return (
    <>
      <ResultArtworkBlock title={result.title} artworkUrl={result.artworkUrl} shape="portrait" />
      <h3>{result.title}</h3>
      <div className="detail-drawer_summary">
        <span>{result.year}</span>
        <span aria-hidden="true">·</span>
        <Score score={result.tmdbScore} />
      </div>
      {description === '' ? null : <p className="detail-drawer_description">{description}</p>}
      {result.directors.length === 0 ? null : (
        <dl className="detail-drawer_rows">
          <DetailRow label="Directors" value={namesLabel(result.directors)} />
        </dl>
      )}
      <ProviderLinks>
        <ProviderLink href={result.tmdbUrl} provider="TMDB" />
        {result.imdbUrl === undefined ? null : <ProviderLink href={result.imdbUrl} provider="IMDb" />}
      </ProviderLinks>
    </>
  )
}

const TvSeriesDetails = ({
  result,
}: {
  readonly result: Extract<MediaResult, { readonly kind: 'tvSeries' }>
}) => {
  const description = result.description.trim()
  const years =
    result.lastAirYear === undefined
      ? `${result.firstAirYear}`
      : `${result.firstAirYear}–${result.lastAirYear}`

  return (
    <>
      <ResultArtworkBlock title={result.title} artworkUrl={result.artworkUrl} shape="portrait" />
      <h3>{result.title}</h3>
      <div className="detail-drawer_summary">
        <span>{years}</span>
        <span aria-hidden="true">·</span>
        <Score score={result.tmdbScore} />
      </div>
      {description === '' ? null : <p className="detail-drawer_description">{description}</p>}
      {result.creators.length === 0 ? null : (
        <dl className="detail-drawer_rows">
          <DetailRow label="Creators" value={namesLabel(result.creators)} />
        </dl>
      )}
      <ProviderLinks>
        <ProviderLink href={result.tmdbUrl} provider="TMDB" />
        {result.imdbUrl === undefined ? null : <ProviderLink href={result.imdbUrl} provider="IMDb" />}
      </ProviderLinks>
    </>
  )
}

const TrackDetails = ({ result }: { readonly result: Extract<MediaResult, { readonly kind: 'track' }> }) => {
  const artists = result.artists.map((artist) => artist.name)

  return (
    <>
      <ResultArtworkBlock title={result.title} artworkUrl={result.artworkUrl} shape="square" />
      <h3>{result.title}</h3>
      <dl className="detail-drawer_rows">
        {result.musicRelease.releaseKind === 'album' ? (
          <DetailRow label="Album" value={result.musicRelease.title} />
        ) : (
          <DetailRow
            label="Release type"
            value={releaseKindLabel(result.musicRelease.releaseKind)}
          />
        )}
        {artists.length === 0 ? null : <DetailRow label="Artists" value={namesLabel(artists)} />}
      </dl>
      <ProviderLinks>
        <ProviderLink href={result.spotifyUrl} provider="Spotify" />
      </ProviderLinks>
    </>
  )
}

const MusicReleaseDetails = ({
  result,
}: {
  readonly result: Extract<MediaResult, { readonly kind: 'musicRelease' }>
}) => {
  const artists = result.artists.map((artist) => artist.name)
  const releaseType = releaseKindLabel(result.releaseKind)
  return (
    <>
      <ResultArtworkBlock title={result.title} artworkUrl={result.artworkUrl} shape="square" />
      <h3>{result.title}</h3>
      <dl className="detail-drawer_rows">
        {artists.length === 0 ? null : <DetailRow label="Artists" value={namesLabel(artists)} />}
        <DetailRow label="Release type" value={releaseType} />
        <DetailRow label="Release date" value={formatReleaseDate(result.releaseDate)} />
      </dl>
      <ProviderLinks>
        <ProviderLink href={result.spotifyUrl} provider="Spotify" />
      </ProviderLinks>
    </>
  )
}

const BookDetails = ({ result }: { readonly result: Extract<MediaResult, { readonly kind: 'book' }> }) => {
  const authors = result.authors.map((author) => author.name)

  return (
    <>
      <ResultArtworkBlock title={result.title} artworkUrl={result.artworkUrl} shape="portrait" />
      <h3>{result.title}</h3>
      <dl className="detail-drawer_rows">
        {authors.length === 0 ? null : <DetailRow label="Authors" value={namesLabel(authors)} />}
        {result.edition === undefined || result.edition.publishers.length === 0 ? null : (
          <DetailRow label="Publishers" value={namesLabel(result.edition.publishers)} />
        )}
      </dl>
      <ProviderLinks>
        <ProviderLink href={result.openLibraryUrl} provider="Open Library" />
      </ProviderLinks>
    </>
  )
}

const UnknownDetails = ({ result }: { readonly result: UnknownMediaResult }) => {
  const rows: Array<DetailRowProps> = [
    { label: 'Original classification', value: unknownClassificationLabel(result) },
  ]

  switch (result.originalClassification) {
    case 'movie':
    case 'tvSeries':
      rows.push({ label: 'Year', value: `${result.year}` })
      break
    case 'track':
      if (result.artists.length > 0) {
        rows.push({ label: 'Artists', value: namesLabel(result.artists) })
      }
      if (result.releaseTitle !== undefined) {
        rows.push({ label: 'Release', value: result.releaseTitle })
      }
      if (result.releaseYear !== undefined) {
        rows.push({ label: 'Release year', value: `${result.releaseYear}` })
      }
      break
    case 'musicRelease':
      if (result.artists.length > 0) {
        rows.push({ label: 'Artists', value: namesLabel(result.artists) })
      }
      if (result.releaseYear !== undefined) {
        rows.push({ label: 'Release year', value: `${result.releaseYear}` })
      }
      break
    case 'book':
      if (result.authors.length > 0) {
        rows.push({ label: 'Authors', value: namesLabel(result.authors) })
      }
      break
  }

  return (
    <>
      <ResultArtworkBlock title={result.title} shape={unknownArtworkShape(result)} />
      <h3>{result.title}</h3>
      <span className="detail-drawer_status-chip">Not identified</span>
      <p className="detail-drawer_description">
        Reelio heard this mention but couldn’t match it to a catalog result.
      </p>
      <dl className="detail-drawer_rows">
        {rows.map((row) => (
          <DetailRow key={row.label} label={row.label} value={row.value} />
        ))}
      </dl>
    </>
  )
}

const DrawerContent = ({ result }: { readonly result: MediaResult }) => {
  switch (result.kind) {
    case 'movie':
      return <MovieDetails result={result} />
    case 'tvSeries':
      return <TvSeriesDetails result={result} />
    case 'track':
      return <TrackDetails result={result} />
    case 'musicRelease':
      return <MusicReleaseDetails result={result} />
    case 'book':
      return <BookDetails result={result} />
    case 'unknown':
      return <UnknownDetails result={result} />
  }
}

const getFocusableControls = (drawer: HTMLElement): Array<HTMLAnchorElement | HTMLButtonElement> =>
  Array.from(drawer.querySelectorAll<HTMLAnchorElement | HTMLButtonElement>('a[href], button:not([disabled])'))

export const DetailDrawer = ({ isOpen, result, opener, onClose }: DetailDrawerProps) => {
  const closeButtonRef = useRef<HTMLButtonElement>(null)
  const drawerRef = useRef<HTMLElement>(null)
  const openerRef = useRef(opener)

  useEffect(() => {
    openerRef.current = opener
  }, [opener])

  useEffect(() => {
    if (!isOpen) {
      return
    }

    const savedScrollY = window.scrollY
    const body = document.body
    const previousBodyStyles: BodyStyleState = {
      overflow: body.style.overflow,
      paddingRight: body.style.paddingRight,
      position: body.style.position,
      top: body.style.top,
      width: body.style.width,
    }
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth

    body.style.overflow = 'hidden'
    body.style.position = 'fixed'
    body.style.top = `-${savedScrollY}px`
    body.style.width = '100%'
    if (scrollbarWidth > 0) {
      body.style.paddingRight = `${scrollbarWidth}px`
    }

    closeButtonRef.current?.focus({ preventScroll: true })

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        onClose()
        return
      }

      if (event.key !== 'Tab') {
        return
      }

      const drawer = drawerRef.current
      if (drawer === null) {
        return
      }

      const focusableControls = getFocusableControls(drawer)
      if (focusableControls.length === 0) {
        event.preventDefault()
        return
      }

      const firstControl = focusableControls[0]
      const lastControl = focusableControls[focusableControls.length - 1]

      if (event.shiftKey && document.activeElement === firstControl) {
        event.preventDefault()
        lastControl.focus()
      } else if (!event.shiftKey && document.activeElement === lastControl) {
        event.preventDefault()
        firstControl.focus()
      }
    }

    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      body.style.overflow = previousBodyStyles.overflow
      body.style.paddingRight = previousBodyStyles.paddingRight
      body.style.position = previousBodyStyles.position
      body.style.top = previousBodyStyles.top
      body.style.width = previousBodyStyles.width
      requestAnimationFrame(() => {
        window.scrollTo(0, savedScrollY)
        openerRef.current.focus({ preventScroll: true })
      })
    }
  }, [isOpen, onClose])

  const handleScrimPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget) {
      onClose()
    }
  }

  return (
    <>
      <div
        className={`detail-drawer_scrim${isOpen ? ' detail-drawer_scrim--open' : ''}`}
        data-testid="detail-drawer-scrim"
        aria-hidden={!isOpen}
        inert={!isOpen}
        onPointerDown={handleScrimPointerDown}
      />
      <aside
        ref={drawerRef}
        className={`detail-drawer${isOpen ? ' detail-drawer--open' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-hidden={!isOpen}
        aria-labelledby="detail-drawer-title"
        inert={!isOpen}
      >
        <div className="detail-drawer_header">
          <strong id="detail-drawer-title">Details</strong>
          <button
            ref={closeButtonRef}
            className="detail-drawer_close"
            type="button"
            aria-label="Close details"
            onClick={onClose}
          >
            <svg aria-hidden="true" viewBox="0 0 24 24">
              <path d="m6 6 12 12M18 6 6 18" />
            </svg>
          </button>
        </div>
        <div className="detail-drawer_body">
          <DrawerContent result={result} />
        </div>
      </aside>
    </>
  )
}
