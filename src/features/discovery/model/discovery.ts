export type SourceVideoSummary = {
  readonly canonicalUrl: string
  readonly platformLabel: 'YouTube' | 'Instagram' | 'Facebook' | 'TikTok' | 'X'
  readonly videoId: string
  readonly description: string
  readonly durationSeconds: number
  readonly title?: string
  readonly channel?: string
}

export type TranscriptData = {
  readonly text: string
  readonly language: string
  readonly acquisitionMethod: 'youtubeCaptions' | 'whisper' | 'textSubmission'
}

export type ResultCounts = {
  readonly mentionCount: number
  readonly resolvedCount: number
  readonly unresolvedCount: number
}

export type ExtractionStatistics = {
  readonly movies: ResultCounts
  readonly tvSeries: ResultCounts
  readonly tracks: ResultCounts
  readonly musicReleases: ResultCounts
  readonly books: ResultCounts
}

export type SpotifyArtistCredit = {
  readonly spotifyArtistId: string
  readonly name: string
}

export type MusicReleaseData = {
  readonly title: string
  readonly artists: ReadonlyArray<SpotifyArtistCredit>
  readonly releaseDate: string
  readonly releaseKind: 'album' | 'single' | 'compilation'
  readonly spotifyAlbumId: string
  readonly spotifyUrl: string
  readonly artworkUrl?: string
}

export type OpenLibraryAuthorCredit = {
  readonly openLibraryAuthorId: string
  readonly name: string
  readonly openLibraryUrl: string
}

export type BookEditionData = {
  readonly title?: string
  readonly publicationYear?: number
  readonly publishers: ReadonlyArray<string>
  readonly isbn10: ReadonlyArray<string>
  readonly isbn13: ReadonlyArray<string>
  readonly openLibraryEditionId: string
  readonly openLibraryUrl: string
  readonly artworkUrl?: string
}

export type MovieMediaResult = {
  readonly kind: 'movie'
  readonly title: string
  readonly year: number
  readonly cast: ReadonlyArray<string>
  readonly directors: ReadonlyArray<string>
  readonly description: string
  readonly artworkUrl?: string
  readonly tmdbId: number
  readonly tmdbUrl: string
  readonly imdbId?: string
  readonly imdbUrl?: string
  readonly tmdbScore: number
}

export type TvSeriesMediaResult = {
  readonly kind: 'tvSeries'
  readonly title: string
  readonly firstAirYear: number
  readonly lastAirYear?: number
  readonly cast: ReadonlyArray<string>
  readonly creators: ReadonlyArray<string>
  readonly description: string
  readonly artworkUrl?: string
  readonly tmdbId: number
  readonly tmdbUrl: string
  readonly imdbId?: string
  readonly imdbUrl?: string
  readonly tmdbScore: number
}

export type TrackMediaResult = {
  readonly kind: 'track'
  readonly title: string
  readonly artists: ReadonlyArray<SpotifyArtistCredit>
  readonly spotifyTrackId: string
  readonly spotifyUrl: string
  readonly musicRelease: MusicReleaseData
  readonly artworkUrl?: string
}

export type MusicReleaseMediaResult = MusicReleaseData & {
  readonly kind: 'musicRelease'
}

export type BookMediaResult = {
  readonly kind: 'book'
  readonly title: string
  readonly authors: ReadonlyArray<OpenLibraryAuthorCredit>
  readonly openLibraryWorkId: string
  readonly openLibraryUrl: string
  readonly edition?: BookEditionData
  readonly artworkUrl?: string
  readonly coverEditionId?: string
}

export type UnknownMovieMediaResult = {
  readonly kind: 'unknown'
  readonly originalClassification: 'movie'
  readonly title: string
  readonly year: number
}

export type UnknownTvSeriesMediaResult = {
  readonly kind: 'unknown'
  readonly originalClassification: 'tvSeries'
  readonly title: string
  readonly year: number
}

export type UnknownTrackMediaResult = {
  readonly kind: 'unknown'
  readonly originalClassification: 'track'
  readonly title: string
  readonly artists: ReadonlyArray<string>
  readonly releaseTitle?: string
  readonly releaseYear?: number
}

export type UnknownMusicReleaseMediaResult = {
  readonly kind: 'unknown'
  readonly originalClassification: 'musicRelease'
  readonly title: string
  readonly artists: ReadonlyArray<string>
  readonly releaseYear?: number
}

export type UnknownBookMediaResult = {
  readonly kind: 'unknown'
  readonly originalClassification: 'book'
  readonly title: string
  readonly authors: ReadonlyArray<string>
}

export type ResolvedMediaResult =
  | MovieMediaResult
  | TvSeriesMediaResult
  | TrackMediaResult
  | MusicReleaseMediaResult
  | BookMediaResult

export type UnknownMediaResult =
  | UnknownMovieMediaResult
  | UnknownTvSeriesMediaResult
  | UnknownTrackMediaResult
  | UnknownMusicReleaseMediaResult
  | UnknownBookMediaResult

export type MediaResult = ResolvedMediaResult | UnknownMediaResult

export type MediaCategory = 'moviesAndTv' | 'music' | 'books' | 'unknown'

export type CategorizedMediaResults = {
  readonly moviesAndTv: ReadonlyArray<MovieMediaResult | TvSeriesMediaResult>
  readonly music: ReadonlyArray<TrackMediaResult | MusicReleaseMediaResult>
  readonly books: ReadonlyArray<BookMediaResult>
  readonly unknown: ReadonlyArray<UnknownMediaResult>
}

export type DiscoveryData = {
  readonly market: string
  readonly sourceVideo: SourceVideoSummary
  readonly transcript: TranscriptData
  readonly statistics: ExtractionStatistics
  readonly categorizedResults: CategorizedMediaResults
}

export const MEDIA_CATEGORIES = [
  { category: 'moviesAndTv', label: 'Movies & TV' },
  { category: 'music', label: 'Music' },
  { category: 'books', label: 'Books' },
  { category: 'unknown', label: 'Unknown' },
] as const satisfies ReadonlyArray<{ readonly category: MediaCategory; readonly label: string }>

export const getFirstNonEmptyMediaCategory = (
  categorizedResults: CategorizedMediaResults,
): MediaCategory | undefined => {
  for (const { category } of MEDIA_CATEGORIES) {
    if (categorizedResults[category].length > 0) {
      return category
    }
  }

  return undefined
}

export type SourceVideoUrlValidation =
  | { valid: true; url: string }
  | { valid: false; message: string }

export const validateSourceVideoUrl = (value: string): SourceVideoUrlValidation => {
  const url = value.trim()

  if (url === '') {
    return { valid: false, message: 'Please paste a video link first.' }
  }

  let parsedUrl: URL
  try {
    parsedUrl = new URL(url)
  } catch {
    return {
      valid: false,
      message: 'That doesn’t look like a valid video link. Please check it and try again.',
    }
  }

  if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
    return {
      valid: false,
      message: 'Please use a link that starts with http:// or https://.',
    }
  }

  return { valid: true, url }
}
