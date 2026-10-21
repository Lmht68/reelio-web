export type SourceVideoSummary = {
  readonly canonicalUrl: string
  readonly platformLabel: 'YouTube' | 'Instagram' | 'Facebook' | 'TikTok' | 'X'
  readonly title?: string
  readonly channel?: string
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
