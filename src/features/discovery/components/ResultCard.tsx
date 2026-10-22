import { useState } from 'react'
import type { MediaResult, UnknownMediaResult } from '../model/discovery'

type ResultCardProps = {
  readonly result: MediaResult
}

type ResultArtworkProps = {
  readonly title: string
  readonly artworkUrl?: string
  readonly shape: 'portrait' | 'square'
}


const ResultArtwork = ({ title, artworkUrl, shape }: ResultArtworkProps) => {
  const [hasImageError, setHasImageError] = useState(false)
  const shouldShowImage = artworkUrl !== undefined && artworkUrl !== '' && !hasImageError

  return (
    <div className={`result-card__artwork result-card__artwork--${shape}`}>
      {shouldShowImage ? (
        <img src={artworkUrl} alt={`Artwork for ${title}`} onError={() => setHasImageError(true)} />
      ) : (
        <span
          className="result-card__artwork-placeholder"
          role="img"
          aria-label={`No artwork available for ${title}`}
        >
          <svg aria-hidden="true" viewBox="0 0 24 24">
            <rect x="3" y="3" width="18" height="18" rx="3" />
            <circle cx="8.5" cy="8.5" r="1.5" />
            <path d="m5.5 18 4.5-4.5 3 3 2.5-2.5 3 4" />
          </svg>
        </span>
      )}
    </div>
  )
}

type ResultScoreProps = {
  readonly score: number
}

const ResultScore = ({ score }: ResultScoreProps) => {
  const formattedScore = score.toFixed(1)

  return (
    <p className="result-card__score" aria-label={`Score ${formattedScore}`}>
      <svg aria-hidden="true" viewBox="0 0 24 24">
        <path d="m12 3.5 2.63 5.33 5.88.86-4.25 4.14 1 5.85L12 16.91l-5.26 2.77 1-5.85-4.25-4.14 5.88-.86L12 3.5Z" />
      </svg>
      <span>{formattedScore}</span>
    </p>
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

const ResultMetadata = ({ result }: { readonly result: UnknownMediaResult }) => {
  switch (result.originalClassification) {
    case 'movie':
    case 'tvSeries':
      return <p className="result-card__metadata">Year: {result.year}</p>
    case 'track':
      return (
        <div className="result-card__metadata">
          {result.artists.length > 0 ? <p>Artists: {result.artists.join(', ')}</p> : null}
          {result.releaseTitle === undefined ? null : <p>Release: {result.releaseTitle}</p>}
          {result.releaseYear === undefined ? null : <p>Release year: {result.releaseYear}</p>}
        </div>
      )
    case 'musicRelease':
      return (
        <div className="result-card__metadata">
          {result.artists.length > 0 ? <p>Artists: {result.artists.join(', ')}</p> : null}
          {result.releaseYear === undefined ? null : <p>Release year: {result.releaseYear}</p>}
        </div>
      )
    case 'book':
      return result.authors.length > 0 ? (
        <p className="result-card__metadata">Authors: {result.authors.join(', ')}</p>
      ) : null
  }
}

const UnknownResultCard = ({ result }: { readonly result: UnknownMediaResult }) => (
  <article className="result-card result-card--unknown">
    <ResultArtwork title={result.title} shape="portrait" />
    <div className="result-card__content">
      <h3>{result.title}</h3>
      <p className="result-card__classification">{unknownClassificationLabel(result)}</p>
      <ResultMetadata result={result} />
      <span className="result-card__status-chip">Not identified</span>
      <p className="result-card__explanation">
        Reelio heard this mention but couldn’t match it to a catalog result.
      </p>
    </div>
  </article>
)

export const ResultCard = ({ result }: ResultCardProps) => {
  if (result.kind === 'unknown') {
    return <UnknownResultCard result={result} />
  }

  switch (result.kind) {
    case 'movie':
      return (
        <article className="result-card">
          <ResultArtwork title={result.title} artworkUrl={result.artworkUrl} shape="portrait" />
          <div className="result-card__content">
            <h3>{result.title}</h3>
            <div className="result-card__screen-metadata">
              <p className="result-card__metadata">{result.year}</p>
              <ResultScore score={result.tmdbScore} />
            </div>
          </div>
        </article>
      )
    case 'tvSeries':
      return (
        <article className="result-card">
          <ResultArtwork title={result.title} artworkUrl={result.artworkUrl} shape="portrait" />
          <div className="result-card__content">
            <h3>{result.title}</h3>
            <div className="result-card__screen-metadata">
              <p className="result-card__metadata">
                {result.firstAirYear}
                {result.lastAirYear === undefined ? '' : `–${result.lastAirYear}`}
              </p>
              <ResultScore score={result.tmdbScore} />
            </div>
          </div>
        </article>
      )
    case 'track':
      return (
        <article className="result-card">
          <ResultArtwork title={result.title} artworkUrl={result.artworkUrl} shape="square" />
          <div className="result-card__content">
            <h3>{result.title}</h3>
            {result.artists.length === 0 ? null : (
              <p className="result-card__metadata">{result.artists.map((artist) => artist.name).join(', ')}</p>
            )}
          </div>
        </article>
      )
    case 'musicRelease':
      return (
        <article className="result-card">
          <ResultArtwork title={result.title} artworkUrl={result.artworkUrl} shape="square" />
          <div className="result-card__content">
            <h3>{result.title}</h3>
            {result.artists.length === 0 ? null : (
              <p className="result-card__metadata">{result.artists.map((artist) => artist.name).join(', ')}</p>
            )}
          </div>
        </article>
      )
    case 'book':
      return (
        <article className="result-card">
          <ResultArtwork title={result.title} artworkUrl={result.artworkUrl} shape="portrait" />
          <div className="result-card__content">
            <h3>{result.title}</h3>
            {result.authors.length === 0 ? null : (
              <p className="result-card__metadata">{result.authors.map((author) => author.name).join(', ')}</p>
            )}
          </div>
        </article>
      )
  }
}
