import type {
  BookEditionData,
  BookMediaResult,
  CategorizedMediaResults,
  DiscoveryData,
  ExtractionStatistics,
  MovieMediaResult,
  MusicReleaseData,
  MusicReleaseMediaResult,
  OpenLibraryAuthorCredit,
  ResultCounts,
  SourceVideoSummary,
  SpotifyArtistCredit,
  TrackMediaResult,
  TvSeriesMediaResult,
  UnknownBookMediaResult,
  UnknownMediaResult,
  UnknownMovieMediaResult,
  UnknownMusicReleaseMediaResult,
  UnknownTrackMediaResult,
  UnknownTvSeriesMediaResult,
} from '../model/discovery'

export type ExtractionFailure = {
  readonly kind:
    | 'sourceInput'
    | 'sourceUnavailable'
    | 'durationLimit'
    | 'inputTooLarge'
    | 'transcriptUnavailable'
    | 'temporaryTranscription'
    | 'metadataProvider'
    | 'catalogProvider'
    | 'processing'
    | 'pipelineTimeout'
    | 'internal'
    | 'network'
    | 'unexpectedResponse'
  readonly heading: string
  readonly guidance: string
  readonly canRetry: boolean
}

type BackendPlatform = 'youtube' | 'instagram' | 'facebook' | 'tiktok' | 'x'
type BackendTranscriptMethod = 'youtube_captions' | 'whisper' | 'text_submission'
type BackendResultStatus = 'resolved' | 'unresolved'
type BackendAlbumType = 'album' | 'single' | 'compilation'

type BackendSource = {
  platform: BackendPlatform
  video_id: string
  url: string
  title: string
  description: string
  channel: string
  duration_seconds: number
}

type BackendTranscript = {
  text: string
  language: string
  method: BackendTranscriptMethod
}

type BackendResultCounts = {
  n_mentions: number
  n_resolved: number
  n_unresolved: number
}

type BackendStatistics = {
  movies: BackendResultCounts
  tv_series: BackendResultCounts
  tracks: BackendResultCounts
  music_releases: BackendResultCounts
  books: BackendResultCounts
}

type BackendArtistCredit = {
  spotify_artist_id: string
  name: string
}

type BackendMusicRelease = {
  release_title: string
  artists: ReadonlyArray<BackendArtistCredit>
  release_date: string
  album_type: BackendAlbumType
  spotify_album_id: string
  spotify_url: string
  cover_url: string | null
}

type BackendMovie = {
  title: string
  year: number
  cast: ReadonlyArray<string>
  directors: ReadonlyArray<string>
  description: string
  poster_url: string | null
  tmdb_id: number
  tmdb_url: string
  imdb_id: string | null
  imdb_url: string | null
  tmdb_score: number
}

type BackendTvSeries = {
  title: string
  first_air_year: number
  last_air_year: number | null
  cast: ReadonlyArray<string>
  creators: ReadonlyArray<string>
  description: string
  poster_url: string | null
  tmdb_id: number
  tmdb_url: string
  imdb_id: string | null
  imdb_url: string | null
  tmdb_score: number
}

type BackendTrack = {
  track_title: string
  artists: ReadonlyArray<BackendArtistCredit>
  spotify_track_id: string
  spotify_url: string
  music_release: BackendMusicRelease
  cover_url: string | null
}

type BackendOpenLibraryAuthorCredit = {
  open_library_author_id: string
  name: string
  open_library_url: string
}

type BackendBookEdition = {
  title: string | null
  publication_year: number | null
  publishers: ReadonlyArray<string>
  isbn_10: ReadonlyArray<string>
  isbn_13: ReadonlyArray<string>
  open_library_edition_id: string
  open_library_url: string
  cover_url: string | null
}

type BackendBook = {
  title: string
  authors: ReadonlyArray<BackendOpenLibraryAuthorCredit>
  open_library_work_id: string
  open_library_url: string
  edition: BackendBookEdition | null
  cover_url: string | null
  cover_edition_id: string | null
}

type BackendMovieMention = {
  title: string
  year: number
}

type BackendTvSeriesMention = {
  title: string
  year: number
}

type BackendTrackMention = {
  track_title: string
  artists: ReadonlyArray<string>
  release_title: string | null
  release_year: number | null
}

type BackendMusicReleaseMention = {
  release_title: string
  artists: ReadonlyArray<string>
  release_year: number | null
}

type BackendBookMention = {
  title: string
  authors: ReadonlyArray<string>
}

type BackendMovieResult = {
  status: BackendResultStatus
  movie_mention: BackendMovieMention
  movie: BackendMovie | null
}

type BackendTvSeriesResult = {
  status: BackendResultStatus
  tv_series_mention: BackendTvSeriesMention
  tv_series: BackendTvSeries | null
}

type BackendTrackResult = {
  status: BackendResultStatus
  track_mention: BackendTrackMention
  track: BackendTrack | null
}

type BackendMusicReleaseResult = {
  status: BackendResultStatus
  music_release_mention: BackendMusicReleaseMention
  music_release: BackendMusicRelease | null
}

type BackendBookResult = {
  status: BackendResultStatus
  book_mention: BackendBookMention
  book: BackendBook | null
}

type BackendResults = {
  movies: ReadonlyArray<BackendMovieResult>
  tv_series: ReadonlyArray<BackendTvSeriesResult>
  tracks: ReadonlyArray<BackendTrackResult>
  music_releases: ReadonlyArray<BackendMusicReleaseResult>
  books: ReadonlyArray<BackendBookResult>
}

type BackendExtractionResponse = {
  market: string
  source: BackendSource
  transcript: BackendTranscript
  statistics: BackendStatistics
  results: BackendResults
}

const PLATFORM_LABELS = {
  youtube: 'YouTube',
  instagram: 'Instagram',
  facebook: 'Facebook',
  tiktok: 'TikTok',
  x: 'X',
} as const

const malformedResponse = (): never => {
  throw new Error('Malformed extraction response.')
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const requireRecord = (value: unknown): Record<string, unknown> => {
  if (!isRecord(value)) {
    return malformedResponse()
  }

  return value
}

const requireField = (record: Record<string, unknown>, field: string): unknown => {
  if (!Object.hasOwn(record, field)) {
    return malformedResponse()
  }

  return record[field]
}

const requireString = (value: unknown): string => {
  if (typeof value !== 'string') {
    return malformedResponse()
  }

  return value
}

const requireInteger = (value: unknown): number => {
  if (typeof value !== 'number' || !Number.isInteger(value)) {
    return malformedResponse()
  }

  return value
}

const requireNonNegativeInteger = (value: unknown): number => {
  const integer = requireInteger(value)
  if (integer < 0) {
    return malformedResponse()
  }

  return integer
}

const requireScore = (value: unknown): number => {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value > 10) {
    return malformedResponse()
  }

  return value
}

const requireArray = <T>(
  value: unknown,
  parser: (item: unknown) => T,
): ReadonlyArray<T> => {
  if (!Array.isArray(value)) {
    return malformedResponse()
  }

  return value.map(parser)
}

const requireNullable = <T>(
  value: unknown,
  parser: (item: unknown) => T,
): T | null => (value === null ? null : parser(value))

const requirePlatform = (value: unknown): BackendPlatform => {
  if (
    value !== 'youtube' &&
    value !== 'instagram' &&
    value !== 'facebook' &&
    value !== 'tiktok' &&
    value !== 'x'
  ) {
    return malformedResponse()
  }

  return value
}

const requireTranscriptMethod = (value: unknown): BackendTranscriptMethod => {
  if (value !== 'youtube_captions' && value !== 'whisper' && value !== 'text_submission') {
    return malformedResponse()
  }

  return value
}

const requireResultStatus = (value: unknown): BackendResultStatus => {
  if (value !== 'resolved' && value !== 'unresolved') {
    return malformedResponse()
  }

  return value
}

const requireAlbumType = (value: unknown): BackendAlbumType => {
  if (value !== 'album' && value !== 'single' && value !== 'compilation') {
    return malformedResponse()
  }

  return value
}

const requireMarket = (value: unknown): string => {
  const market = requireString(value)
  if (!/^[A-Z]{2}$/u.test(market)) {
    return malformedResponse()
  }

  return market
}

const parseStringArray = (value: unknown): ReadonlyArray<string> => requireArray(value, requireString)

const parseSource = (value: unknown): BackendSource => {
  const record = requireRecord(value)

  return {
    platform: requirePlatform(requireField(record, 'platform')),
    video_id: requireString(requireField(record, 'video_id')),
    url: requireString(requireField(record, 'url')),
    title: requireString(requireField(record, 'title')),
    description: requireString(requireField(record, 'description')),
    channel: requireString(requireField(record, 'channel')),
    duration_seconds: requireInteger(requireField(record, 'duration_seconds')),
  }
}

const parseTranscript = (value: unknown): BackendTranscript => {
  const record = requireRecord(value)

  return {
    text: requireString(requireField(record, 'text')),
    language: requireString(requireField(record, 'language')),
    method: requireTranscriptMethod(requireField(record, 'method')),
  }
}

const parseResultCounts = (value: unknown): BackendResultCounts => {
  const record = requireRecord(value)

  return {
    n_mentions: requireNonNegativeInteger(requireField(record, 'n_mentions')),
    n_resolved: requireNonNegativeInteger(requireField(record, 'n_resolved')),
    n_unresolved: requireNonNegativeInteger(requireField(record, 'n_unresolved')),
  }
}

const parseStatistics = (value: unknown): BackendStatistics => {
  const record = requireRecord(value)

  return {
    movies: parseResultCounts(requireField(record, 'movies')),
    tv_series: parseResultCounts(requireField(record, 'tv_series')),
    tracks: parseResultCounts(requireField(record, 'tracks')),
    music_releases: parseResultCounts(requireField(record, 'music_releases')),
    books: parseResultCounts(requireField(record, 'books')),
  }
}

const parseArtistCredit = (value: unknown): BackendArtistCredit => {
  const record = requireRecord(value)

  return {
    spotify_artist_id: requireString(requireField(record, 'spotify_artist_id')),
    name: requireString(requireField(record, 'name')),
  }
}

const parseMusicRelease = (value: unknown): BackendMusicRelease => {
  const record = requireRecord(value)

  return {
    release_title: requireString(requireField(record, 'release_title')),
    artists: requireArray(requireField(record, 'artists'), parseArtistCredit),
    release_date: requireString(requireField(record, 'release_date')),
    album_type: requireAlbumType(requireField(record, 'album_type')),
    spotify_album_id: requireString(requireField(record, 'spotify_album_id')),
    spotify_url: requireString(requireField(record, 'spotify_url')),
    cover_url: requireNullable(requireField(record, 'cover_url'), requireString),
  }
}

const parseMovie = (value: unknown): BackendMovie => {
  const record = requireRecord(value)

  return {
    title: requireString(requireField(record, 'title')),
    year: requireInteger(requireField(record, 'year')),
    cast: parseStringArray(requireField(record, 'cast')),
    directors: parseStringArray(requireField(record, 'directors')),
    description: requireString(requireField(record, 'description')),
    poster_url: requireNullable(requireField(record, 'poster_url'), requireString),
    tmdb_id: requireInteger(requireField(record, 'tmdb_id')),
    tmdb_url: requireString(requireField(record, 'tmdb_url')),
    imdb_id: requireNullable(requireField(record, 'imdb_id'), requireString),
    imdb_url: requireNullable(requireField(record, 'imdb_url'), requireString),
    tmdb_score: requireScore(requireField(record, 'tmdb_score')),
  }
}

const parseTvSeries = (value: unknown): BackendTvSeries => {
  const record = requireRecord(value)

  return {
    title: requireString(requireField(record, 'title')),
    first_air_year: requireInteger(requireField(record, 'first_air_year')),
    last_air_year: requireNullable(requireField(record, 'last_air_year'), requireInteger),
    cast: parseStringArray(requireField(record, 'cast')),
    creators: parseStringArray(requireField(record, 'creators')),
    description: requireString(requireField(record, 'description')),
    poster_url: requireNullable(requireField(record, 'poster_url'), requireString),
    tmdb_id: requireInteger(requireField(record, 'tmdb_id')),
    tmdb_url: requireString(requireField(record, 'tmdb_url')),
    imdb_id: requireNullable(requireField(record, 'imdb_id'), requireString),
    imdb_url: requireNullable(requireField(record, 'imdb_url'), requireString),
    tmdb_score: requireScore(requireField(record, 'tmdb_score')),
  }
}

const parseTrack = (value: unknown): BackendTrack => {
  const record = requireRecord(value)

  return {
    track_title: requireString(requireField(record, 'track_title')),
    artists: requireArray(requireField(record, 'artists'), parseArtistCredit),
    spotify_track_id: requireString(requireField(record, 'spotify_track_id')),
    spotify_url: requireString(requireField(record, 'spotify_url')),
    music_release: parseMusicRelease(requireField(record, 'music_release')),
    cover_url: requireNullable(requireField(record, 'cover_url'), requireString),
  }
}

const parseOpenLibraryAuthorCredit = (value: unknown): BackendOpenLibraryAuthorCredit => {
  const record = requireRecord(value)

  return {
    open_library_author_id: requireString(requireField(record, 'open_library_author_id')),
    name: requireString(requireField(record, 'name')),
    open_library_url: requireString(requireField(record, 'open_library_url')),
  }
}

const parseBookEdition = (value: unknown): BackendBookEdition => {
  const record = requireRecord(value)

  return {
    title: requireNullable(requireField(record, 'title'), requireString),
    publication_year: requireNullable(requireField(record, 'publication_year'), requireInteger),
    publishers: parseStringArray(requireField(record, 'publishers')),
    isbn_10: parseStringArray(requireField(record, 'isbn_10')),
    isbn_13: parseStringArray(requireField(record, 'isbn_13')),
    open_library_edition_id: requireString(requireField(record, 'open_library_edition_id')),
    open_library_url: requireString(requireField(record, 'open_library_url')),
    cover_url: requireNullable(requireField(record, 'cover_url'), requireString),
  }
}

const parseBook = (value: unknown): BackendBook => {
  const record = requireRecord(value)

  return {
    title: requireString(requireField(record, 'title')),
    authors: requireArray(requireField(record, 'authors'), parseOpenLibraryAuthorCredit),
    open_library_work_id: requireString(requireField(record, 'open_library_work_id')),
    open_library_url: requireString(requireField(record, 'open_library_url')),
    edition: requireNullable(requireField(record, 'edition'), parseBookEdition),
    cover_url: requireNullable(requireField(record, 'cover_url'), requireString),
    cover_edition_id: requireNullable(requireField(record, 'cover_edition_id'), requireString),
  }
}

const parseMovieMention = (value: unknown): BackendMovieMention => {
  const record = requireRecord(value)

  return {
    title: requireString(requireField(record, 'title')),
    year: requireInteger(requireField(record, 'year')),
  }
}

const parseTvSeriesMention = (value: unknown): BackendTvSeriesMention => {
  const record = requireRecord(value)

  return {
    title: requireString(requireField(record, 'title')),
    year: requireInteger(requireField(record, 'year')),
  }
}

const parseTrackMention = (value: unknown): BackendTrackMention => {
  const record = requireRecord(value)

  return {
    track_title: requireString(requireField(record, 'track_title')),
    artists: parseStringArray(requireField(record, 'artists')),
    release_title: requireNullable(requireField(record, 'release_title'), requireString),
    release_year: requireNullable(requireField(record, 'release_year'), requireInteger),
  }
}

const parseMusicReleaseMention = (value: unknown): BackendMusicReleaseMention => {
  const record = requireRecord(value)

  return {
    release_title: requireString(requireField(record, 'release_title')),
    artists: parseStringArray(requireField(record, 'artists')),
    release_year: requireNullable(requireField(record, 'release_year'), requireInteger),
  }
}

const parseBookMention = (value: unknown): BackendBookMention => {
  const record = requireRecord(value)

  return {
    title: requireString(requireField(record, 'title')),
    authors: parseStringArray(requireField(record, 'authors')),
  }
}

const parseMovieResult = (value: unknown): BackendMovieResult => {
  const record = requireRecord(value)

  return {
    status: requireResultStatus(requireField(record, 'status')),
    movie_mention: parseMovieMention(requireField(record, 'movie_mention')),
    movie: requireNullable(requireField(record, 'movie'), parseMovie),
  }
}

const parseTvSeriesResult = (value: unknown): BackendTvSeriesResult => {
  const record = requireRecord(value)

  return {
    status: requireResultStatus(requireField(record, 'status')),
    tv_series_mention: parseTvSeriesMention(requireField(record, 'tv_series_mention')),
    tv_series: requireNullable(requireField(record, 'tv_series'), parseTvSeries),
  }
}

const parseTrackResult = (value: unknown): BackendTrackResult => {
  const record = requireRecord(value)

  return {
    status: requireResultStatus(requireField(record, 'status')),
    track_mention: parseTrackMention(requireField(record, 'track_mention')),
    track: requireNullable(requireField(record, 'track'), parseTrack),
  }
}

const parseMusicReleaseResult = (value: unknown): BackendMusicReleaseResult => {
  const record = requireRecord(value)

  return {
    status: requireResultStatus(requireField(record, 'status')),
    music_release_mention: parseMusicReleaseMention(requireField(record, 'music_release_mention')),
    music_release: requireNullable(requireField(record, 'music_release'), parseMusicRelease),
  }
}

const parseBookResult = (value: unknown): BackendBookResult => {
  const record = requireRecord(value)

  return {
    status: requireResultStatus(requireField(record, 'status')),
    book_mention: parseBookMention(requireField(record, 'book_mention')),
    book: requireNullable(requireField(record, 'book'), parseBook),
  }
}

const parseResults = (value: unknown): BackendResults => {
  const record = requireRecord(value)

  return {
    movies: requireArray(requireField(record, 'movies'), parseMovieResult),
    tv_series: requireArray(requireField(record, 'tv_series'), parseTvSeriesResult),
    tracks: requireArray(requireField(record, 'tracks'), parseTrackResult),
    music_releases: requireArray(requireField(record, 'music_releases'), parseMusicReleaseResult),
    books: requireArray(requireField(record, 'books'), parseBookResult),
  }
}

const parseBackendExtractionResponse = (value: unknown): BackendExtractionResponse => {
  const record = requireRecord(value)

  return {
    market: requireMarket(requireField(record, 'market')),
    source: parseSource(requireField(record, 'source')),
    transcript: parseTranscript(requireField(record, 'transcript')),
    statistics: parseStatistics(requireField(record, 'statistics')),
    results: parseResults(requireField(record, 'results')),
  }
}

const mapSourceVideo = (source: BackendSource): SourceVideoSummary => {
  let parsedUrl: URL
  try {
    parsedUrl = new URL(source.url)
  } catch {
    throw new Error('Malformed source URL.')
  }

  if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
    throw new Error('Unsafe source URL.')
  }

  const title = source.title.trim()
  const channel = source.channel.trim()

  return {
    canonicalUrl: source.url,
    platformLabel: PLATFORM_LABELS[source.platform],
    videoId: source.video_id,
    description: source.description,
    durationSeconds: source.duration_seconds,
    ...(title === '' ? {} : { title }),
    ...(channel === '' ? {} : { channel }),
  }
}

const mapResultCounts = (counts: BackendResultCounts): ResultCounts => ({
  mentionCount: counts.n_mentions,
  resolvedCount: counts.n_resolved,
  unresolvedCount: counts.n_unresolved,
})

const mapStatistics = (statistics: BackendStatistics): ExtractionStatistics => ({
  movies: mapResultCounts(statistics.movies),
  tvSeries: mapResultCounts(statistics.tv_series),
  tracks: mapResultCounts(statistics.tracks),
  musicReleases: mapResultCounts(statistics.music_releases),
  books: mapResultCounts(statistics.books),
})

const mapArtistCredit = (credit: BackendArtistCredit): SpotifyArtistCredit => ({
  spotifyArtistId: credit.spotify_artist_id,
  name: credit.name,
})

const mapMusicRelease = (musicRelease: BackendMusicRelease): MusicReleaseData => ({
  title: musicRelease.release_title,
  artists: musicRelease.artists.map(mapArtistCredit),
  releaseDate: musicRelease.release_date,
  releaseKind: musicRelease.album_type,
  spotifyAlbumId: musicRelease.spotify_album_id,
  spotifyUrl: musicRelease.spotify_url,
  ...(musicRelease.cover_url === null ? {} : { artworkUrl: musicRelease.cover_url }),
})

const mapAuthorCredit = (
  author: BackendOpenLibraryAuthorCredit,
): OpenLibraryAuthorCredit => ({
  openLibraryAuthorId: author.open_library_author_id,
  name: author.name,
  openLibraryUrl: author.open_library_url,
})

const mapBookEdition = (edition: BackendBookEdition): BookEditionData => ({
  ...(edition.title === null ? {} : { title: edition.title }),
  ...(edition.publication_year === null ? {} : { publicationYear: edition.publication_year }),
  publishers: edition.publishers,
  isbn10: edition.isbn_10,
  isbn13: edition.isbn_13,
  openLibraryEditionId: edition.open_library_edition_id,
  openLibraryUrl: edition.open_library_url,
  ...(edition.cover_url === null ? {} : { artworkUrl: edition.cover_url }),
})

const mapMovieResult = (
  result: BackendMovieResult,
): MovieMediaResult | UnknownMovieMediaResult => {
  if (result.status === 'unresolved') {
    if (result.movie !== null) {
      return malformedResponse()
    }

    return {
      kind: 'unknown',
      originalClassification: 'movie',
      title: result.movie_mention.title,
      year: result.movie_mention.year,
    }
  }

  if (result.movie === null) {
    return malformedResponse()
  }

  return {
    kind: 'movie',
    title: result.movie.title,
    year: result.movie.year,
    cast: result.movie.cast,
    directors: result.movie.directors,
    description: result.movie.description,
    ...(result.movie.poster_url === null ? {} : { artworkUrl: result.movie.poster_url }),
    tmdbId: result.movie.tmdb_id,
    tmdbUrl: result.movie.tmdb_url,
    ...(result.movie.imdb_id === null ? {} : { imdbId: result.movie.imdb_id }),
    ...(result.movie.imdb_url === null ? {} : { imdbUrl: result.movie.imdb_url }),
    tmdbScore: result.movie.tmdb_score,
  }
}

const mapTvSeriesResult = (
  result: BackendTvSeriesResult,
): TvSeriesMediaResult | UnknownTvSeriesMediaResult => {
  if (result.status === 'unresolved') {
    if (result.tv_series !== null) {
      return malformedResponse()
    }

    return {
      kind: 'unknown',
      originalClassification: 'tvSeries',
      title: result.tv_series_mention.title,
      year: result.tv_series_mention.year,
    }
  }

  if (result.tv_series === null) {
    return malformedResponse()
  }

  return {
    kind: 'tvSeries',
    title: result.tv_series.title,
    firstAirYear: result.tv_series.first_air_year,
    ...(result.tv_series.last_air_year === null
      ? {}
      : { lastAirYear: result.tv_series.last_air_year }),
    cast: result.tv_series.cast,
    creators: result.tv_series.creators,
    description: result.tv_series.description,
    ...(result.tv_series.poster_url === null ? {} : { artworkUrl: result.tv_series.poster_url }),
    tmdbId: result.tv_series.tmdb_id,
    tmdbUrl: result.tv_series.tmdb_url,
    ...(result.tv_series.imdb_id === null ? {} : { imdbId: result.tv_series.imdb_id }),
    ...(result.tv_series.imdb_url === null ? {} : { imdbUrl: result.tv_series.imdb_url }),
    tmdbScore: result.tv_series.tmdb_score,
  }
}

const mapTrackResult = (
  result: BackendTrackResult,
): TrackMediaResult | UnknownTrackMediaResult => {
  if (result.status === 'unresolved') {
    if (result.track !== null) {
      return malformedResponse()
    }

    return {
      kind: 'unknown',
      originalClassification: 'track',
      title: result.track_mention.track_title,
      artists: result.track_mention.artists,
      ...(result.track_mention.release_title === null
        ? {}
        : { releaseTitle: result.track_mention.release_title }),
      ...(result.track_mention.release_year === null
        ? {}
        : { releaseYear: result.track_mention.release_year }),
    }
  }

  if (result.track === null) {
    return malformedResponse()
  }

  return {
    kind: 'track',
    title: result.track.track_title,
    artists: result.track.artists.map(mapArtistCredit),
    spotifyTrackId: result.track.spotify_track_id,
    spotifyUrl: result.track.spotify_url,
    musicRelease: mapMusicRelease(result.track.music_release),
    ...(result.track.cover_url === null ? {} : { artworkUrl: result.track.cover_url }),
  }
}

const mapMusicReleaseResult = (
  result: BackendMusicReleaseResult,
): MusicReleaseMediaResult | UnknownMusicReleaseMediaResult => {
  if (result.status === 'unresolved') {
    if (result.music_release !== null) {
      return malformedResponse()
    }

    return {
      kind: 'unknown',
      originalClassification: 'musicRelease',
      title: result.music_release_mention.release_title,
      artists: result.music_release_mention.artists,
      ...(result.music_release_mention.release_year === null
        ? {}
        : { releaseYear: result.music_release_mention.release_year }),
    }
  }

  if (result.music_release === null) {
    return malformedResponse()
  }

  return {
    kind: 'musicRelease',
    ...mapMusicRelease(result.music_release),
  }
}

const mapBookResult = (result: BackendBookResult): BookMediaResult | UnknownBookMediaResult => {
  if (result.status === 'unresolved') {
    if (result.book !== null) {
      return malformedResponse()
    }

    return {
      kind: 'unknown',
      originalClassification: 'book',
      title: result.book_mention.title,
      authors: result.book_mention.authors,
    }
  }

  if (result.book === null) {
    return malformedResponse()
  }

  return {
    kind: 'book',
    title: result.book.title,
    authors: result.book.authors.map(mapAuthorCredit),
    openLibraryWorkId: result.book.open_library_work_id,
    openLibraryUrl: result.book.open_library_url,
    ...(result.book.edition === null ? {} : { edition: mapBookEdition(result.book.edition) }),
    ...(result.book.cover_url === null ? {} : { artworkUrl: result.book.cover_url }),
    ...(result.book.cover_edition_id === null
      ? {}
      : { coverEditionId: result.book.cover_edition_id }),
  }
}

const mapCategorizedResults = (results: BackendResults): CategorizedMediaResults => {
  const moviesAndTv: Array<MovieMediaResult | TvSeriesMediaResult> = []
  const music: Array<TrackMediaResult | MusicReleaseMediaResult> = []
  const books: Array<BookMediaResult> = []
  const unknown: Array<UnknownMediaResult> = []

  for (const movieResult of results.movies) {
    const result = mapMovieResult(movieResult)
    if (result.kind === 'unknown') {
      unknown.push(result)
    } else {
      moviesAndTv.push(result)
    }
  }

  for (const tvSeriesResult of results.tv_series) {
    const result = mapTvSeriesResult(tvSeriesResult)
    if (result.kind === 'unknown') {
      unknown.push(result)
    } else {
      moviesAndTv.push(result)
    }
  }

  for (const trackResult of results.tracks) {
    const result = mapTrackResult(trackResult)
    if (result.kind === 'unknown') {
      unknown.push(result)
    } else {
      music.push(result)
    }
  }

  for (const musicReleaseResult of results.music_releases) {
    const result = mapMusicReleaseResult(musicReleaseResult)
    if (result.kind === 'unknown') {
      unknown.push(result)
    } else {
      music.push(result)
    }
  }

  for (const bookResult of results.books) {
    const result = mapBookResult(bookResult)
    if (result.kind === 'unknown') {
      unknown.push(result)
    } else {
      books.push(result)
    }
  }

  return { moviesAndTv, music, books, unknown }
}

const parseExtractionResponse = (value: unknown): DiscoveryData => {
  const response = parseBackendExtractionResponse(value)

  return {
    market: response.market,
    sourceVideo: mapSourceVideo(response.source),
    transcript: {
      text: response.transcript.text,
      language: response.transcript.language,
      acquisitionMethod:
        response.transcript.method === 'youtube_captions'
          ? 'youtubeCaptions'
          : response.transcript.method === 'whisper'
            ? 'whisper'
            : 'textSubmission',
    },
    statistics: mapStatistics(response.statistics),
    categorizedResults: mapCategorizedResults(response.results),
  }
}

const SOURCE_INPUT_FAILURE = {
  kind: 'sourceInput',
  heading: 'We can’t use that source video',
  guidance: 'Check the link or try a different source video.',
  canRetry: false,
} as const satisfies ExtractionFailure

const SOURCE_UNAVAILABLE_FAILURE = {
  kind: 'sourceUnavailable',
  heading: 'We couldn’t access that source video',
  guidance: 'Check that the video is public and still available, or try a different link.',
  canRetry: false,
} as const satisfies ExtractionFailure

const DURATION_LIMIT_FAILURE = {
  kind: 'durationLimit',
  heading: 'That source video is too long',
  guidance: 'It exceeds Reelio’s supported length. Try a shorter video.',
  canRetry: false,
} as const satisfies ExtractionFailure

const INPUT_TOO_LARGE_FAILURE = {
  kind: 'inputTooLarge',
  heading: 'That source video has too much content',
  guidance: 'It exceeds Reelio’s supported processing limit. Try a shorter video.',
  canRetry: false,
} as const satisfies ExtractionFailure

const TRANSCRIPT_UNAVAILABLE_FAILURE = {
  kind: 'transcriptUnavailable',
  heading: 'We couldn’t get a transcript for that source video',
  guidance: 'Check the link or try a different source video.',
  canRetry: false,
} as const satisfies ExtractionFailure

const TEMPORARY_TRANSCRIPTION_FAILURE = {
  kind: 'temporaryTranscription',
  heading: 'Transcription is temporarily unavailable',
  guidance: 'Try again in a moment.',
  canRetry: true,
} as const satisfies ExtractionFailure

const METADATA_PROVIDER_FAILURE = {
  kind: 'metadataProvider',
  heading: 'We couldn’t access the source video’s details',
  guidance: 'Try again in a moment.',
  canRetry: true,
} as const satisfies ExtractionFailure

const CATALOG_PROVIDER_FAILURE = {
  kind: 'catalogProvider',
  heading: 'The media catalogs are temporarily unavailable',
  guidance: 'Try again in a moment.',
  canRetry: true,
} as const satisfies ExtractionFailure

const PROCESSING_FAILURE = {
  kind: 'processing',
  heading: 'We couldn’t finish processing the source video',
  guidance: 'Try again.',
  canRetry: true,
} as const satisfies ExtractionFailure

const PIPELINE_TIMEOUT_FAILURE = {
  kind: 'pipelineTimeout',
  heading: 'Processing took too long',
  guidance: 'Try the source video again.',
  canRetry: true,
} as const satisfies ExtractionFailure

const INTERNAL_FAILURE = {
  kind: 'internal',
  heading: 'Something went wrong while processing the source video',
  guidance: 'Try again.',
  canRetry: true,
} as const satisfies ExtractionFailure

const NETWORK_FAILURE = {
  kind: 'network',
  heading: 'We couldn’t reach Reelio',
  guidance: 'Check your connection and try again.',
  canRetry: true,
} as const satisfies ExtractionFailure

const UNEXPECTED_RESPONSE_FAILURE = {
  kind: 'unexpectedResponse',
  heading: 'We received an unexpected response',
  guidance: 'Try again.',
  canRetry: true,
} as const satisfies ExtractionFailure

const DOMAIN_FAILURES: Readonly<Record<string, ExtractionFailure>> = {
  invalid_source: SOURCE_INPUT_FAILURE,
  unsupported_platform: SOURCE_INPUT_FAILURE,
  source_unavailable: SOURCE_UNAVAILABLE_FAILURE,
  duration_limit_exceeded: DURATION_LIMIT_FAILURE,
  interpretation_input_too_large: INPUT_TOO_LARGE_FAILURE,
  transcription_failed: TRANSCRIPT_UNAVAILABLE_FAILURE,
  transcription_unavailable: TEMPORARY_TRANSCRIPTION_FAILURE,
  metadata_provider_failed: METADATA_PROVIDER_FAILURE,
  catalog_provider_failed: CATALOG_PROVIDER_FAILURE,
  enrichment_failed: CATALOG_PROVIDER_FAILURE,
  mention_interpretation_failed: PROCESSING_FAILURE,
  invalid_llm_response: PROCESSING_FAILURE,
  pipeline_timeout: PIPELINE_TIMEOUT_FAILURE,
  internal_error: INTERNAL_FAILURE,
}

class ExtractionRequestError extends Error {
  readonly failure: ExtractionFailure

  constructor(failure: ExtractionFailure) {
    super(failure.heading)
    this.name = 'ExtractionRequestError'
    this.failure = failure
  }
}

const getFailureFromErrorPayload = (payload: unknown): ExtractionFailure => {
  if (!isRecord(payload)) {
    return UNEXPECTED_RESPONSE_FAILURE
  }

  const error = payload.error
  if (
    isRecord(error) &&
    typeof error.code === 'string' &&
    typeof error.message === 'string'
  ) {
    return DOMAIN_FAILURES[error.code] ?? UNEXPECTED_RESPONSE_FAILURE
  }

  return Object.hasOwn(payload, 'detail') ? SOURCE_INPUT_FAILURE : UNEXPECTED_RESPONSE_FAILURE
}

const readJsonPayload = async ({
  response,
  signal,
}: {
  readonly response: Response
  readonly signal: AbortSignal
}): Promise<unknown> => {
  try {
    return await response.json()
  } catch (error) {
    if (signal.aborted) {
      throw error
    }

    throw new ExtractionRequestError(UNEXPECTED_RESPONSE_FAILURE)
  }
}

export const getExtractionFailure = (error: unknown): ExtractionFailure =>
  error instanceof ExtractionRequestError ? error.failure : UNEXPECTED_RESPONSE_FAILURE

export const extractSourceVideo = async ({
  url,
  signal,
}: {
  readonly url: string
  readonly signal: AbortSignal
}): Promise<DiscoveryData> => {
  let response: Response

  try {
    response = await fetch('/api/extractions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ url }),
      signal,
    })
  } catch (error) {
    if (signal.aborted) {
      throw error
    }

    throw new ExtractionRequestError(NETWORK_FAILURE)
  }

  const payload = await readJsonPayload({ response, signal })

  if (!response.ok) {
    throw new ExtractionRequestError(getFailureFromErrorPayload(payload))
  }

  try {
    return parseExtractionResponse(payload)
  } catch (error) {
    if (signal.aborted) {
      throw error
    }

    throw new ExtractionRequestError(UNEXPECTED_RESPONSE_FAILURE)
  }
}
