import type { MediaResult, UnknownMediaResult } from '../model/discovery'
import { ResultArtwork } from './ResultArtwork'

type ResultCardProps = {
  readonly result: MediaResult
  readonly onOpenDetails: (result: MediaResult, opener: HTMLButtonElement) => void
}

type ResultScoreProps = {
  readonly score: number
}

const ResultScore = ({ score }: ResultScoreProps) => {
  const formattedScore = score.toFixed(1)

  return (
    <span className="result-card_score" aria-label={`Score ${formattedScore}`}>
      <svg aria-hidden="true" viewBox="0 0 24 24">
        <path d="m12 3.5 2.63 5.33 5.88.86-4.25 4.14 1 5.85L12 16.91l-5.26 2.77 1-5.85-4.25-4.14 5.88-.86L12 3.5Z" />
      </svg>
      <span>{formattedScore}</span>
    </span>
  )
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

const unknownCardLabel = (result: UnknownMediaResult): string => {
  const labelParts = [result.title, unknownClassificationLabel(result)]

  switch (result.originalClassification) {
    case 'movie':
    case 'tvSeries':
      labelParts.push(`year ${result.year}`)
      break
    case 'track':
      if (result.artists.length > 0) {
        labelParts.push(`artists ${namesLabel(result.artists)}`)
      }
      if (result.releaseTitle !== undefined) {
        labelParts.push(`release ${result.releaseTitle}`)
      }
      if (result.releaseYear !== undefined) {
        labelParts.push(`release year ${result.releaseYear}`)
      }
      break
    case 'musicRelease':
      if (result.artists.length > 0) {
        labelParts.push(`artists ${namesLabel(result.artists)}`)
      }
      if (result.releaseYear !== undefined) {
        labelParts.push(`release year ${result.releaseYear}`)
      }
      break
    case 'book':
      if (result.authors.length > 0) {
        labelParts.push(`authors ${namesLabel(result.authors)}`)
      }
      break
  }

  return [...labelParts, 'Not identified', 'open details'].join(', ')
}

const ResultMetadata = ({ result }: { readonly result: UnknownMediaResult }) => {
  switch (result.originalClassification) {
    case 'movie':
    case 'tvSeries':
      return <span className="result-card_metadata">Year: {result.year}</span>
    case 'track':
      return (
        <span className="result-card_metadata">
          {result.artists.length > 0 ? <span>Artists: {namesLabel(result.artists)}</span> : null}
          {result.releaseTitle === undefined ? null : <span>Release: {result.releaseTitle}</span>}
          {result.releaseYear === undefined ? null : <span>Release year: {result.releaseYear}</span>}
        </span>
      )
    case 'musicRelease':
      return (
        <span className="result-card_metadata">
          {result.artists.length > 0 ? <span>Artists: {namesLabel(result.artists)}</span> : null}
          {result.releaseYear === undefined ? null : <span>Release year: {result.releaseYear}</span>}
        </span>
      )
    case 'book':
      return result.authors.length > 0 ? (
        <span className="result-card_metadata">Authors: {namesLabel(result.authors)}</span>
      ) : null
  }
}

const UnknownResultCard = ({
  result,
  onOpenDetails,
}: {
  readonly result: UnknownMediaResult
  readonly onOpenDetails: ResultCardProps['onOpenDetails']
}) => (
  <button
    className="result-card result-card--unknown"
    type="button"
    aria-label={unknownCardLabel(result)}
    onClick={(event) => onOpenDetails(result, event.currentTarget)}
  >
    <ResultArtwork title={result.title} shape={unknownArtworkShape(result)} />
    <span className="result-card_content">
      <span className="result-card_title">{result.title}</span>
      <span className="result-card_classification">{unknownClassificationLabel(result)}</span>
      <ResultMetadata result={result} />
      <span className="result-card_status-chip">Not identified</span>
    </span>
  </button>
)

export const ResultCard = ({ result, onOpenDetails }: ResultCardProps) => {
  if (result.kind === 'unknown') {
    return <UnknownResultCard result={result} onOpenDetails={onOpenDetails} />
  }

  switch (result.kind) {
    case 'movie': {
      const formattedScore = result.tmdbScore.toFixed(1)

      return (
        <button
          className="result-card"
          type="button"
          aria-label={`${result.title}, ${result.year}, score ${formattedScore}, open details`}
          onClick={(event) => onOpenDetails(result, event.currentTarget)}
        >
          <ResultArtwork title={result.title} artworkUrl={result.artworkUrl} shape="portrait" />
          <span className="result-card_content">
            <span className="result-card_title">{result.title}</span>
            <span className="result-card_screen-metadata">
              <span className="result-card_metadata">{result.year}</span>
              <span className="result-card_metadata-separator" aria-hidden="true">
                ·
              </span>
              <ResultScore score={result.tmdbScore} />
            </span>
          </span>
        </button>
      )
    }
    case 'tvSeries': {
      const formattedScore = result.tmdbScore.toFixed(1)
      const years =
        result.lastAirYear === undefined
          ? `${result.firstAirYear}`
          : `${result.firstAirYear}–${result.lastAirYear}`
      const accessibleYears =
        result.lastAirYear === undefined
          ? `${result.firstAirYear}`
          : `${result.firstAirYear} to ${result.lastAirYear}`

      return (
        <button
          className="result-card"
          type="button"
          aria-label={`${result.title}, ${accessibleYears}, score ${formattedScore}, open details`}
          onClick={(event) => onOpenDetails(result, event.currentTarget)}
        >
          <ResultArtwork title={result.title} artworkUrl={result.artworkUrl} shape="portrait" />
          <span className="result-card_content">
            <span className="result-card_title">{result.title}</span>
            <span className="result-card_screen-metadata">
              <span className="result-card_metadata">{years}</span>
              <span className="result-card_metadata-separator" aria-hidden="true">
                ·
              </span>
              <ResultScore score={result.tmdbScore} />
            </span>
          </span>
        </button>
      )
    }
    case 'track': {
      const artists = result.artists.map((artist) => artist.name)
      const artistLabel = artists.length === 0 ? '' : `, ${namesLabel(artists)}`

      return (
        <button
          className="result-card"
          type="button"
          aria-label={`${result.title}${artistLabel}, open details`}
          onClick={(event) => onOpenDetails(result, event.currentTarget)}
        >
          <ResultArtwork title={result.title} artworkUrl={result.artworkUrl} shape="square" />
          <span className="result-card_content">
            <span className="result-card_title">{result.title}</span>
            {artists.length === 0 ? null : (
              <span className="result-card_metadata">{namesLabel(artists)}</span>
            )}
          </span>
        </button>
      )
    }
    case 'musicRelease': {
      const artists = result.artists.map((artist) => artist.name)
      const artistLabel = artists.length === 0 ? '' : `, ${namesLabel(artists)}`

      return (
        <button
          className="result-card"
          type="button"
          aria-label={`${result.title}${artistLabel}, open details`}
          onClick={(event) => onOpenDetails(result, event.currentTarget)}
        >
          <ResultArtwork title={result.title} artworkUrl={result.artworkUrl} shape="square" />
          <span className="result-card_content">
            <span className="result-card_title">{result.title}</span>
            {artists.length === 0 ? null : (
              <span className="result-card_metadata">{namesLabel(artists)}</span>
            )}
          </span>
        </button>
      )
    }
    case 'book': {
      const authors = result.authors.map((author) => author.name)
      const authorLabel = authors.length === 0 ? '' : `, ${namesLabel(authors)}`

      return (
        <button
          className="result-card"
          type="button"
          aria-label={`${result.title}${authorLabel}, open details`}
          onClick={(event) => onOpenDetails(result, event.currentTarget)}
        >
          <ResultArtwork title={result.title} artworkUrl={result.artworkUrl} shape="portrait" />
          <span className="result-card_content">
            <span className="result-card_title">{result.title}</span>
            {authors.length === 0 ? null : (
              <span className="result-card_metadata">{namesLabel(authors)}</span>
            )}
          </span>
        </button>
      )
    }
  }
}
