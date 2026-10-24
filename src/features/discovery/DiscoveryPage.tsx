import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react'
import { extractSourceVideo, getExtractionFailure, type ExtractionFailure } from './api/extractions'
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
  | { status: 'loading'; submittedUrl: string; requestId: number }
  | { status: 'success'; data: DiscoveryData; selectedCategory: MediaCategory }
  | { status: 'empty'; data: DiscoveryData }
  | { status: 'failure'; submittedUrl: string; failure: ExtractionFailure }

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
        <div className="source-video-summary_metadata">
          <span>{sourceVideo.platformLabel}</span>
        </div>
        <button
          ref={transcriptOpenerRef}
          className="source-video-summary_transcript-button"
          type="button"
          aria-haspopup="dialog"
          aria-expanded={isTranscriptOpen}
          onClick={() => setIsTranscriptOpen(true)}
        >
          View transcript
        </button>
      </div>
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
  const activeRequestRef = useRef<{ requestId: number; controller: AbortController } | undefined>(
    undefined,
  )
  const isLoading = discoveryState.status === 'loading'

  const handleUrlChange = (value: string) => {
    setUrlValue(value)
    setGuidance(undefined)
  }

  const runExtraction = useCallback(async (submittedUrl: string): Promise<void> => {
    if (isPendingRef.current) {
      return
    }

    isPendingRef.current = true
    const requestId = requestIdRef.current + 1
    requestIdRef.current = requestId
    const controller = new AbortController()
    activeRequestRef.current = { requestId, controller }
    setDiscoveryState({ status: 'loading', submittedUrl, requestId })

    try {
      const data = await extractSourceVideo({ url: submittedUrl, signal: controller.signal })
      if (activeRequestRef.current?.requestId !== requestId) {
        return
      }

      const selectedCategory = getFirstNonEmptyMediaCategory(data.categorizedResults)
      setDiscoveryState(
        selectedCategory === undefined
          ? { status: 'empty', data }
          : { status: 'success', data, selectedCategory },
      )
    } catch (error) {
      if (controller.signal.aborted || activeRequestRef.current?.requestId !== requestId) {
        return
      }

      setDiscoveryState({
        status: 'failure',
        submittedUrl,
        failure: getExtractionFailure(error),
      })
    } finally {
      if (activeRequestRef.current?.requestId === requestId) {
        isPendingRef.current = false
        activeRequestRef.current = undefined
      }
    }
  }, [])

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
    void runExtraction(validation.url)
  }

  const handleRetry = () => {
    if (discoveryState.status !== 'failure' || !discoveryState.failure.canRetry) {
      return
    }

    setUrlValue(discoveryState.submittedUrl)
    void runExtraction(discoveryState.submittedUrl)
  }

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
                  disabled={isLoading}
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
              <button className="discover-button" type="submit" disabled={isLoading}>
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
          {discoveryState.status === 'loading' ? (
            <p className="discovery-result_status" role="status">
              Finding what’s mentioned
              <span className="loading-dots" aria-hidden="true">
                <span>.</span>
                <span>.</span>
                <span>.</span>
              </span>
            </p>
          ) : null}
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
