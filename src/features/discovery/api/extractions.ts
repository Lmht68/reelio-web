import type { SourceVideoSummary } from '../model/discovery'

type BackendPlatform = 'youtube' | 'instagram' | 'facebook' | 'tiktok' | 'x'

type BackendSource = {
  platform: BackendPlatform
  video_id: string
  url: string
  title: string
  description: string
  channel: string
  duration_seconds: number
}

type BackendExtractionResponse = {
  source: BackendSource
}

const PLATFORM_LABELS = {
  youtube: 'YouTube',
  instagram: 'Instagram',
  facebook: 'Facebook',
  tiktok: 'TikTok',
  x: 'X',
} as const

const isBackendPlatform = (value: unknown): value is BackendPlatform =>
  typeof value === 'string' && Object.hasOwn(PLATFORM_LABELS, value)

const isBackendSource = (value: unknown): value is BackendSource => {
  if (
    typeof value !== 'object' ||
    value === null ||
    Array.isArray(value) ||
    !('platform' in value) ||
    !('video_id' in value) ||
    !('url' in value) ||
    !('title' in value) ||
    !('description' in value) ||
    !('channel' in value) ||
    !('duration_seconds' in value)
  ) {
    return false
  }

  const {
    platform,
    video_id: videoId,
    url,
    title,
    description,
    channel,
    duration_seconds: durationSeconds,
  } = value

  return (
    isBackendPlatform(platform) &&
    typeof videoId === 'string' &&
    typeof url === 'string' &&
    typeof title === 'string' &&
    typeof description === 'string' &&
    typeof channel === 'string' &&
    typeof durationSeconds === 'number'
  )
}

const parseExtractionResponse = (value: unknown): SourceVideoSummary => {
  if (
    typeof value !== 'object' ||
    value === null ||
    Array.isArray(value) ||
    !('source' in value) ||
    !isBackendSource(value.source)
  ) {
    throw new Error('Malformed extraction response.')
  }

  const response: BackendExtractionResponse = { source: value.source }
  const canonicalUrl = response.source.url

  let parsedUrl: URL
  try {
    parsedUrl = new URL(canonicalUrl)
  } catch {
    throw new Error('Malformed source URL.')
  }

  if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
    throw new Error('Unsafe source URL.')
  }

  const title = response.source.title.trim()
  const channel = response.source.channel.trim()

  return {
    canonicalUrl,
    platformLabel: PLATFORM_LABELS[response.source.platform],
    ...(title === '' ? {} : { title }),
    ...(channel === '' ? {} : { channel }),
  }
}

export const extractSourceVideo = async (url: string): Promise<SourceVideoSummary> => {
  const response = await fetch('/api/extractions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ url }),
  })

  if (!response.ok) {
    throw new Error('Extraction request failed.')
  }

  const payload: unknown = await response.json()
  return parseExtractionResponse(payload)
}
