import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react'
import {
  admitSourceExtractionJob,
  getExtractionFailure,
  getSourceExtractionJob,
  isExtractionJobNotFoundError,
  type ExtractionFailure,
} from './api/extractions'
import {
  clearLatestExtractionJobId,
  readLatestExtractionJobId,
  readPendingExtractionIdempotencyKey,
  writeLatestExtractionJobId,
  writePendingExtractionIdempotencyKey,
  clearPendingExtractionIdempotencyKey,
} from './extractionJobStorage'
import { ResultBrowser } from './components/ResultBrowser'
import { TranscriptModal } from './components/TranscriptModal'
import {
  getFirstNonEmptyMediaCategory,
  validateSourceVideoUrl,
  type DiscoveryData,
  type MediaCategory,
  type SourceVideoSummary,
  type TranscriptData,
} from './model/discovery'
import './DiscoveryPage.css'

type DiscoveryState =
  | { status: 'idle' }
  | { status: 'admitting'; submittedUrl: string; requestId: number }
  | { status: 'queued'; requestId: number; jobId: string }
  | { status: 'running'; requestId: number; jobId: string }
  | { status: 'success'; data: DiscoveryData; selectedCategory: MediaCategory }
  | { status: 'empty'; data: DiscoveryData }
  | {
      status: 'failure'
      failure: ExtractionFailure
      retry: { kind: 'admission'; submittedUrl: string } | { kind: 'status'; jobId: string }
    }

type ActiveRequest = {
  readonly requestId: number
  readonly controller: AbortController
}

const waitForPollingDelay = ({
  delayMilliseconds,
  signal,
}: {
  readonly delayMilliseconds: number
  readonly signal: AbortSignal
}): Promise<void> => {
  const { promise, resolve, reject } = Promise.withResolvers<void>()
  const handleAbort = () => {
    clearTimeout(timeoutId)
    reject(signal.reason)
  }
  const timeoutId = setTimeout(() => {
    signal.removeEventListener('abort', handleAbort)
    resolve()
  }, delayMilliseconds)

  signal.addEventListener('abort', handleAbort, { once: true })
  if (signal.aborted) {
    handleAbort()
  }

  return promise
}

const clearStoredLatestExtractionJobId = (): void => {
  try {
    clearLatestExtractionJobId()
  } catch {
    return
  }
}

type SourceVideoSummaryCardProps = {
  sourceVideo: SourceVideoSummary
  transcript: TranscriptData
}

const SourceVideoSummaryCard = ({ sourceVideo, transcript }: SourceVideoSummaryCardProps) => {
  const [isTranscriptOpen, setIsTranscriptOpen] = useState(false)
  const transcriptOpenerRef = useRef<HTMLButtonElement>(null)
  const handleCloseTranscript = useCallback(() => {
    setIsTranscriptOpen(false)
  }, [])

  const title = sourceVideo.title?.trim() || 'Source video'

  return (
    <section className="source-video-summary" aria-labelledby="source-video-summary-heading">
      <div
        className="source-video-summary_placeholder"
        role="img"
        aria-label="Source video thumbnail unavailable"
      >
        <svg aria-hidden="true" viewBox="0 0 24 24">
          <rect x="3" y="5" width="18" height="14" rx="2" />
          <path d="m10 9 5 3-5 3Z" />
        </svg>
      </div>
      <div className="source-video-summary_content">
        <h2 id="source-video-summary-heading">
          <a
            className="source-video-summary_title-link"
            href={sourceVideo.canonicalUrl}
            target="_blank"
            rel="noreferrer"
          >
            {title}
          </a>
        </h2>
        <p className="source-video-summary_metadata">
          {sourceVideo.channel === undefined
            ? sourceVideo.platformLabel
            : `by ${sourceVideo.channel} · ${sourceVideo.platformLabel}`}
        </p>
      </div>
      <button
        ref={transcriptOpenerRef}
        className="source-video-summary_transcript-button"
        type="button"
        aria-haspopup="dialog"
        aria-expanded={isTranscriptOpen}
        onClick={() => setIsTranscriptOpen(true)}
      >
        Read transcript
      </button>
      {isTranscriptOpen ? (
        <TranscriptModal
          transcript={transcript}
          openerRef={transcriptOpenerRef}
          onClose={handleCloseTranscript}
        />
      ) : null}
    </section>
  )
}

export const DiscoveryPage = () => {
  const [urlValue, setUrlValue] = useState('')
  const [guidance, setGuidance] = useState<string>()
  const [discoveryState, setDiscoveryState] = useState<DiscoveryState>({ status: 'idle' })
  const inputRef = useRef<HTMLInputElement>(null)
  const howItWorksHeadingRef = useRef<HTMLHeadingElement>(null)
  const isPendingRef = useRef(false)
  const requestIdRef = useRef(0)
  const activeRequestRef = useRef<ActiveRequest | undefined>(undefined)
  const isPending =
    discoveryState.status === 'admitting' ||
    discoveryState.status === 'queued' ||
    discoveryState.status === 'running'

  const handleUrlChange = (value: string) => {
    setUrlValue(value)
    setGuidance(undefined)
  }

  const beginRequest = useCallback((): ActiveRequest | undefined => {
    if (isPendingRef.current) {
      return undefined
    }

    isPendingRef.current = true
    const requestId = requestIdRef.current + 1
    requestIdRef.current = requestId
    const activeRequest = { requestId, controller: new AbortController() }
    activeRequestRef.current = activeRequest
    return activeRequest
  }, [])

  const finishRequest = useCallback((requestId: number): void => {
    if (activeRequestRef.current?.requestId === requestId) {
      isPendingRef.current = false
      activeRequestRef.current = undefined
    }
  }, [])

  const pollSourceExtractionJob = useCallback(
    async ({
      jobId,
      requestId,
      controller,
      initialDelayMilliseconds,
    }: {
      readonly jobId: string
      readonly requestId: number
      readonly controller: AbortController
      readonly initialDelayMilliseconds: number
    }): Promise<void> => {
      try {
        if (initialDelayMilliseconds > 0) {
          await waitForPollingDelay({
            delayMilliseconds: initialDelayMilliseconds,
            signal: controller.signal,
          })
        }

        while (activeRequestRef.current?.requestId === requestId) {
          const job = await getSourceExtractionJob({ jobId, signal: controller.signal })
          if (activeRequestRef.current?.requestId !== requestId) {
            return
          }

          if (job.status === 'succeeded') {
            clearStoredLatestExtractionJobId()
            const selectedCategory = getFirstNonEmptyMediaCategory(job.data.categorizedResults)
            setDiscoveryState(
              selectedCategory === undefined
                ? { status: 'empty', data: job.data }
                : { status: 'success', data: job.data, selectedCategory },
            )
            return
          }

          setDiscoveryState({
            status: job.status,
            requestId,
            jobId: job.jobId,
          })
          await waitForPollingDelay({
            delayMilliseconds: job.retryAfterMilliseconds,
            signal: controller.signal,
          })
        }
      } catch (error) {
        if (controller.signal.aborted || activeRequestRef.current?.requestId !== requestId) {
          return
        }

        if (isExtractionJobNotFoundError(error)) {
          clearStoredLatestExtractionJobId()
          setDiscoveryState({ status: 'idle' })
          return
        }

        setDiscoveryState({
          status: 'failure',
          failure: getExtractionFailure(error),
          retry: { kind: 'status', jobId },
        })
      }
    },
    [],
  )

  const runSourceExtractionJob = useCallback(
    async (submittedUrl: string): Promise<void> => {
      const activeRequest = beginRequest()
      if (activeRequest === undefined) {
        return
      }

      const { requestId, controller } = activeRequest
      setDiscoveryState({ status: 'admitting', submittedUrl, requestId })

      try {
        const idempotencyKey =
          readPendingExtractionIdempotencyKey() ??
          (() => {
            if (typeof crypto.randomUUID !== 'function') {
              throw new Error('The browser cannot generate an idempotency key.')
            }

            const generatedKey = crypto.randomUUID()
            writePendingExtractionIdempotencyKey(generatedKey)
            return generatedKey
          })()
        const admittedJob = await admitSourceExtractionJob({
          url: submittedUrl,
          idempotencyKey,
          signal: controller.signal,
        })
        if (activeRequestRef.current?.requestId !== requestId) {
          return
        }

        writeLatestExtractionJobId(admittedJob.jobId)
        clearPendingExtractionIdempotencyKey()
        setDiscoveryState({
          status: 'queued',
          requestId,
          jobId: admittedJob.jobId,
        })
        await pollSourceExtractionJob({
          jobId: admittedJob.jobId,
          requestId,
          controller,
          initialDelayMilliseconds: admittedJob.retryAfterMilliseconds,
        })
      } catch (error) {
        if (controller.signal.aborted || activeRequestRef.current?.requestId !== requestId) {
          return
        }

        setDiscoveryState({
          status: 'failure',
          failure: getExtractionFailure(error),
          retry: { kind: 'admission', submittedUrl },
        })
      } finally {
        finishRequest(requestId)
      }
    },
    [beginRequest, finishRequest, pollSourceExtractionJob],
  )

  const resumeSourceExtractionJob = useCallback(
    async (jobId: string): Promise<void> => {
      const activeRequest = beginRequest()
      if (activeRequest === undefined) {
        return
      }

      const { requestId, controller } = activeRequest
      setDiscoveryState({ status: 'queued', requestId, jobId })
      try {
        await pollSourceExtractionJob({
          jobId,
          requestId,
          controller,
          initialDelayMilliseconds: 0,
        })
      } finally {
        finishRequest(requestId)
      }
    },
    [beginRequest, finishRequest, pollSourceExtractionJob],
  )

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (isPendingRef.current) {
      return
    }

    const validation = validateSourceVideoUrl(urlValue)
    if (!validation.valid) {
      setGuidance(validation.message)
      inputRef.current?.focus()
      return
    }

    setGuidance(undefined)
    void runSourceExtractionJob(validation.url)
  }

  const handleRetry = () => {
    if (discoveryState.status !== 'failure' || !discoveryState.failure.canRetry) {
      return
    }

    if (discoveryState.retry.kind === 'admission') {
      setUrlValue(discoveryState.retry.submittedUrl)
      void runSourceExtractionJob(discoveryState.retry.submittedUrl)
      return
    }

    void resumeSourceExtractionJob(discoveryState.retry.jobId)
  }

  useEffect(() => {
    let disposed = false
    try {
      const jobId = readLatestExtractionJobId()
      if (jobId !== undefined) {
        queueMicrotask(() => {
          if (!disposed) {
            void resumeSourceExtractionJob(jobId)
          }
        })
      }
    } catch {
      return undefined
    }

    return () => {
      disposed = true
    }
  }, [resumeSourceExtractionJob])

  useEffect(
    () => () => {
      requestIdRef.current += 1
      activeRequestRef.current?.controller.abort()
      activeRequestRef.current = undefined
      isPendingRef.current = false
    },
    [],
  )

  const handleSelectCategory = (selectedCategory: MediaCategory) => {
    setDiscoveryState((currentState) => {
      if (
        currentState.status !== 'success' ||
        currentState.data.categorizedResults[selectedCategory].length === 0
      ) {
        return currentState
      }

      return { ...currentState, selectedCategory }
    })
  }

  const handleHowItWorks = () => {
    howItWorksHeadingRef.current?.focus({ preventScroll: true })
    howItWorksHeadingRef.current?.scrollIntoView?.()
  }

  const guidanceId = guidance === undefined ? undefined : 'video-url-guidance'

  const pendingStatusMessage =
    discoveryState.status === 'admitting'
      ? 'Submitting your video'
      : discoveryState.status === 'queued'
        ? 'Waiting to start'
        : discoveryState.status === 'running'
          ? 'Finding what’s mentioned'
          : undefined

  return (
    <div className="discovery-page">
      <header className="site-header">
        <div className="page-wrap site-header_content">
          <div className="wordmark">
            Reel<span>io</span>
          </div>
          <button className="how-it-works-button" type="button" onClick={handleHowItWorks}>
            How it works
          </button>
        </div>
      </header>

      <main>
        <section className="hero" aria-labelledby="discovery-heading">
          <div className="page-wrap">
            <h1 id="discovery-heading">Discover what’s mentioned.</h1>
            <p className="hero_description">
              Find movies, TV series, music, and books mentioned in public social videos.
            </p>
            <form className="discovery-form" noValidate onSubmit={handleSubmit}>
              <div className="discovery-form_field">
                <label htmlFor="source-video-url">Video URL</label>
                <input
                  ref={inputRef}
                  id="source-video-url"
                  type="url"
                  inputMode="url"
                  placeholder="https://www.tiktok.com/@creator/video/123…"
                  value={urlValue}
                  onChange={(event) => handleUrlChange(event.target.value)}
                  disabled={isPending}
                  aria-describedby={
                    guidanceId === undefined
                      ? 'source-video-url-support'
                      : `source-video-url-support ${guidanceId}`
                  }
                  aria-invalid={guidance === undefined ? undefined : true}
                />
                <p id="source-video-url-support" className="discovery-form_support">
                  Paste a public YouTube, Instagram, Facebook, TikTok, or X video link.
                </p>
              </div>
              <button className="discover-button" type="submit" disabled={isPending}>
                Discover
              </button>
            </form>
            {guidance === undefined ? null : (
              <p id={guidanceId} className="discovery-form_guidance" role="alert">
                {guidance}
              </p>
            )}
          </div>
        </section>

        <section className="page-wrap discovery-result" aria-label="Discovery result" aria-live="polite">
          {pendingStatusMessage === undefined ? null : (
            <p className="discovery-result_status" role="status">
              {pendingStatusMessage}
              <span className="loading-dots" aria-hidden="true">
                <span>.</span>
                <span>.</span>
                <span>.</span>
              </span>
            </p>
          )}
          {discoveryState.status === 'success' || discoveryState.status === 'empty' ? (
            <>
              <SourceVideoSummaryCard
                sourceVideo={discoveryState.data.sourceVideo}
                transcript={discoveryState.data.transcript}
              />
              {discoveryState.status === 'success' ? (
                <ResultBrowser
                  categorizedResults={discoveryState.data.categorizedResults}
                  selectedCategory={discoveryState.selectedCategory}
                  onSelectCategory={handleSelectCategory}
                />
              ) : (
                <section className="discovery-result_empty" aria-labelledby="empty-discovery-heading">
                  <h2 id="empty-discovery-heading">We didn’t find anything</h2>
                  <p>
                    No movies, shows, music, or books were mentioned in this video. Try another
                    one.
                  </p>
                </section>
              )}
            </>
          ) : null}
          {discoveryState.status === 'failure' ? (
            <section
              className="discovery-result_failure"
              role="alert"
              aria-labelledby="discovery-failure-heading"
            >
              <h2 id="discovery-failure-heading">{discoveryState.failure.heading}</h2>
              <p>{discoveryState.failure.guidance}</p>
              {discoveryState.failure.canRetry ? (
                <button className="discovery-result_retry" type="button" onClick={handleRetry}>
                  Try again
                </button>
              ) : null}
            </section>
          ) : null}
        </section>
      </main>

      <footer id="how-it-works" className="how-it-works">
        <div className="page-wrap">
          <h2 ref={howItWorksHeadingRef} tabIndex={-1}>
            How it works
          </h2>
          <ol className="how-it-works_steps">
            <li>
              <svg className="how-it-works_icon" aria-hidden="true" viewBox="0 0 24 24">
                <path d="M10 14a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1" />
                <path d="M14 10a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1" />
              </svg>
              <h3>Paste a video link</h3>
              <p>Submit the URL of a public social video.</p>
            </li>
            <li>
              <svg className="how-it-works_icon" aria-hidden="true" viewBox="0 0 24 24">
                <circle cx="11" cy="11" r="7" />
                <path d="m20 20-3.5-3.5" />
              </svg>
              <h3>Find the mentions</h3>
              <p>Reelio analyzes the transcript to identify movies, TV series, music, and books.</p>
            </li>
            <li>
              <svg className="how-it-works_icon" aria-hidden="true" viewBox="0 0 24 24">
                <rect x="3" y="3" width="7" height="9" rx="1" />
                <rect x="14" y="3" width="7" height="5" rx="1" />
                <rect x="14" y="12" width="7" height="9" rx="1" />
                <rect x="3" y="16" width="7" height="5" rx="1" />
              </svg>
              <h3>Explore the results</h3>
              <p>Browse covers, open details, and read the transcript.</p>
            </li>
          </ol>
        </div>
      </footer>
    </div>
  )
}
