const LATEST_EXTRACTION_JOB_ID_KEY = 'reelio.discovery.latest-extraction-job-id'
const PENDING_EXTRACTION_IDEMPOTENCY_KEY = 'reelio.discovery.pending-extraction-idempotency-key'
const CANONICAL_UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/u

const readCanonicalUuid = (key: string): string | undefined => {
  const value = window.localStorage.getItem(key)
  if (value === null) {
    return undefined
  }

  if (!CANONICAL_UUID_V4.test(value)) {
    window.localStorage.removeItem(key)
    return undefined
  }

  return value
}

const writeCanonicalUuid = ({ key, value }: { readonly key: string; readonly value: string }): void => {
  if (!CANONICAL_UUID_V4.test(value)) {
    throw new TypeError('Extraction job storage values must be canonical UUIDv4 strings.')
  }

  window.localStorage.setItem(key, value)
}

export const readLatestExtractionJobId = (): string | undefined =>
  readCanonicalUuid(LATEST_EXTRACTION_JOB_ID_KEY)

export const writeLatestExtractionJobId = (jobId: string): void => {
  writeCanonicalUuid({ key: LATEST_EXTRACTION_JOB_ID_KEY, value: jobId })
}

export const clearLatestExtractionJobId = (): void => {
  window.localStorage.removeItem(LATEST_EXTRACTION_JOB_ID_KEY)
}

export const readPendingExtractionIdempotencyKey = (): string | undefined =>
  readCanonicalUuid(PENDING_EXTRACTION_IDEMPOTENCY_KEY)

export const writePendingExtractionIdempotencyKey = (idempotencyKey: string): void => {
  writeCanonicalUuid({ key: PENDING_EXTRACTION_IDEMPOTENCY_KEY, value: idempotencyKey })
}

export const clearPendingExtractionIdempotencyKey = (): void => {
  window.localStorage.removeItem(PENDING_EXTRACTION_IDEMPOTENCY_KEY)
}
