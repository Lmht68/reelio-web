import { useState } from 'react'

type ResultArtworkProps = {
  readonly title: string
  readonly artworkUrl?: string
  readonly shape: 'portrait' | 'square'
}

export const ResultArtwork = ({ title, artworkUrl, shape }: ResultArtworkProps) => {
  const [hasImageError, setHasImageError] = useState(false)
  const shouldShowImage = artworkUrl !== undefined && artworkUrl !== '' && !hasImageError

  return (
    <div className={`result-artwork result-artwork--${shape}`}>
      {shouldShowImage ? (
        <img src={artworkUrl} alt={`Artwork for ${title}`} onError={() => setHasImageError(true)} />
      ) : (
        <span
          className="result-artwork_placeholder"
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
