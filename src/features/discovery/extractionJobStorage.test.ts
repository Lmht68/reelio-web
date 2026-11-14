import { afterEach, describe, expect, it } from 'vitest'

import {
  clearLatestExtractionJobId,
  clearPendingExtractionIdempotencyKey,
  readLatestExtractionJobId,
  readPendingExtractionIdempotencyKey,
  writeLatestExtractionJobId,
  writePendingExtractionIdempotencyKey,
} from './extractionJobStorage'

const JOB_ID = '00000000-0000-4000-8000-000000000001'
const IDEMPOTENCY_KEY = '00000000-0000-4000-8000-000000000002'
const LATEST_JOB_KEY = 'reelio.discovery.latest-extraction-job-id'
const PENDING_KEY = 'reelio.discovery.pending-extraction-idempotency-key'

afterEach(() => {
  window.localStorage.clear()
})

describe('extractionJobStorage', () => {
  it('should retain only valid job and idempotency identities when values are written', () => {
    writeLatestExtractionJobId(JOB_ID)
    writePendingExtractionIdempotencyKey(IDEMPOTENCY_KEY)

    expect(readLatestExtractionJobId()).toBe(JOB_ID)
    expect(readPendingExtractionIdempotencyKey()).toBe(IDEMPOTENCY_KEY)
    expect(Object.keys(window.localStorage).sort()).toEqual([LATEST_JOB_KEY, PENDING_KEY])
  })

  it('should remove malformed values when recovery identities are read', () => {
    window.localStorage.setItem(LATEST_JOB_KEY, '00000000-0000-3000-8000-000000000001')
    window.localStorage.setItem(PENDING_KEY, 'not-a-uuid')


    expect(readLatestExtractionJobId()).toBeUndefined()
    expect(readPendingExtractionIdempotencyKey()).toBeUndefined()
    expect(Object.keys(window.localStorage)).toEqual([])
  })
  it('should reject malformed values before they can be persisted', () => {
    expect(() => writeLatestExtractionJobId('not-a-uuid')).toThrow('canonical UUIDv4')
    expect(() => writePendingExtractionIdempotencyKey('not-a-uuid')).toThrow('canonical UUIDv4')
    expect(Object.keys(window.localStorage)).toEqual([])
  })

  it('should clear one recovery identity without changing the other when requested', () => {
    writeLatestExtractionJobId(JOB_ID)
    writePendingExtractionIdempotencyKey(IDEMPOTENCY_KEY)

    clearPendingExtractionIdempotencyKey()
    expect(readLatestExtractionJobId()).toBe(JOB_ID)
    expect(readPendingExtractionIdempotencyKey()).toBeUndefined()

    clearLatestExtractionJobId()
    expect(readLatestExtractionJobId()).toBeUndefined()
  })
})
