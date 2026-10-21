import { useRef, useState, type FormEvent } from 'react'
import { extractSourceVideo } from './api/extractions'
import type { SourceVideoSummary } from './model/discovery'
import { validateSourceVideoUrl } from './model/discovery'
import './DiscoveryPage.css'

type DiscoveryState =
  | { status: 'idle' }
  | { status: 'loading'; submittedUrl: string }
  | { status: 'success'; sourceVideo: SourceVideoSummary }
  | { status: 'failure'; message: string }

type SourceVideoSummaryCardProps = {
  sourceVideo: SourceVideoSummary
}

const SourceVideoSummaryCard = ({ sourceVideo }: SourceVideoSummaryCardProps) => {
  const title = sourceVideo.title?.trim() || 'Source video'

  return (
    <section className="source-video-summary" aria-labelledby="source-video-summary-heading">
      <div className="source-video-summary__content">
        <h2 id="source-video-summary-heading">
          <a
            className="source-video-summary__title-link"
            href={sourceVideo.canonicalUrl}
            target="_blank"
            rel="noreferrer"
          >
            {title}
          </a>
        </h2>
        <div className="source-video-summary__metadata">
          <span>{sourceVideo.platformLabel}</span>
        </div>
      </div>
    </section>
  )
}

export const DiscoveryPage = () => {
  const [urlValue, setUrlValue] = useState('')
  const [guidance, setGuidance] = useState<string>()
  const [discoveryState, setDiscoveryState] = useState<DiscoveryState>({ status: 'idle' })
  const inputRef = useRef<HTMLInputElement>(null)
  const howItWorksHeadingRef = useRef<HTMLHeadingElement>(null)
  const isLoading = discoveryState.status === 'loading'

  const handleUrlChange = (value: string) => {
    setUrlValue(value)
    setGuidance(undefined)
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (isLoading) {
      return
    }

    const validation = validateSourceVideoUrl(urlValue)
    if (!validation.valid) {
      setGuidance(validation.message)
      inputRef.current?.focus()
      return
    }

    setGuidance(undefined)
    setDiscoveryState({ status: 'loading', submittedUrl: validation.url })

    try {
      const sourceVideo = await extractSourceVideo(validation.url)
      setDiscoveryState({ status: 'success', sourceVideo })
    } catch {
      setDiscoveryState({
        status: 'failure',
        message: 'We couldn’t complete the discovery. Please try again.',
      })
    }
  }

  const handleHowItWorks = () => {
    howItWorksHeadingRef.current?.focus({ preventScroll: true })
    howItWorksHeadingRef.current?.scrollIntoView?.()
  }

  const guidanceId = guidance === undefined ? undefined : 'video-url-guidance'

  return (
    <div className="discovery-page">
      <header className="site-header">
        <div className="page-wrap site-header__content">
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
            <p className="hero__description">
              Find movies, TV series, music, and books mentioned in public social videos.
            </p>
            <form className="discovery-form" noValidate onSubmit={handleSubmit}>
              <div className="discovery-form__field">
                <label htmlFor="source-video-url">Video URL</label>
                <input
                  ref={inputRef}
                  id="source-video-url"
                  type="url"
                  inputMode="url"
                  placeholder="https://www.tiktok.com/@creator/video/123…"
                  autoComplete="off"
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
                <p id="source-video-url-support" className="discovery-form__support">
                  Paste a public YouTube, Instagram, Facebook, TikTok, or X video link.
                </p>
              </div>
              <button className="discover-button" type="submit" disabled={isLoading}>
                Discover
              </button>
            </form>
            {guidance === undefined ? null : (
              <p id={guidanceId} className="discovery-form__guidance" role="alert">
                {guidance}
              </p>
            )}
          </div>
        </section>

        <section className="page-wrap discovery-result" aria-label="Discovery result" aria-live="polite">
          {discoveryState.status === 'loading' ? (
            <p className="discovery-result__status" role="status">
              Finding what’s mentioned
              <span className="loading-dots" aria-hidden="true">
                <span>.</span>
                <span>.</span>
                <span>.</span>
              </span>
            </p>
          ) : null}
          {discoveryState.status === 'success' ? (
            <SourceVideoSummaryCard sourceVideo={discoveryState.sourceVideo} />
          ) : null}
          {discoveryState.status === 'failure' ? (
            <p className="discovery-result__failure" role="alert">
              {discoveryState.message}
            </p>
          ) : null}
        </section>
      </main>

      <footer id="how-it-works" className="how-it-works">
        <div className="page-wrap">
          <h2 ref={howItWorksHeadingRef} tabIndex={-1}>
            How it works
          </h2>
          <ol className="how-it-works__steps">
            <li>
              <svg className="how-it-works__icon" aria-hidden="true" viewBox="0 0 24 24">
                <path d="M10 14a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1" />
                <path d="M14 10a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1" />
              </svg>
              <h3>Paste a video link</h3>
              <p>Submit the URL of a public social video.</p>
            </li>
            <li>
              <svg className="how-it-works__icon" aria-hidden="true" viewBox="0 0 24 24">
                <circle cx="11" cy="11" r="7" />
                <path d="m20 20-3.5-3.5" />
              </svg>
              <h3>Find the mentions</h3>
              <p>Reelio analyzes the transcript to identify movies, TV series, music, and books.</p>
            </li>
            <li>
              <svg className="how-it-works__icon" aria-hidden="true" viewBox="0 0 24 24">
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
