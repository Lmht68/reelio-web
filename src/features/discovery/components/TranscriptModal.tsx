import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type PointerEvent, type ReactNode, type RefObject } from 'react'
import { useModalDialog } from '../../../components/Overlay/useModalDialog'
import type { TranscriptData } from '../model/discovery'

type TranscriptModalProps = {
  readonly transcript: TranscriptData
  readonly openerRef: RefObject<HTMLButtonElement | null>
  readonly onClose: () => void
}

type TranscriptView = 'text' | 'timestamp'

type TextRange = {
  readonly start: number
  readonly end: number
}


const TRANSCRIPT_VIEWS = ['text', 'timestamp'] as const satisfies ReadonlyArray<TranscriptView>
const SENTENCE_ENDING = /[.?!][\])}"'”’]*$/u
const REGULAR_EXPRESSION_CHARACTER = /[.*+?^${}()|[\]\\]/gu

const escapeRegularExpression = (value: string): string =>
  value.replace(REGULAR_EXPRESSION_CHARACTER, '\\$&')

const getWords = (text: string): Array<TextRange> =>
  Array.from(text.matchAll(/\S+/gu), (word) => ({
    start: word.index ?? 0,
    end: (word.index ?? 0) + word[0].length,
  }))

const getParagraphRanges = (text: string): Array<TextRange> => {
  const words = getWords(text)
  const paragraphs: Array<TextRange> = []
  let firstWordIndex = 0

  while (firstWordIndex < words.length) {
    const maximumLastWordIndex = Math.min(firstWordIndex + 79, words.length - 1)
    let lastWordIndex = maximumLastWordIndex

    for (let wordIndex = maximumLastWordIndex; wordIndex >= firstWordIndex + 39; wordIndex -= 1) {
      const word = words[wordIndex]
      if (SENTENCE_ENDING.test(text.slice(word.start, word.end))) {
        lastWordIndex = wordIndex
        break
      }
    }

    paragraphs.push({
      start: words[firstWordIndex].start,
      end: words[lastWordIndex].end,
    })
    firstWordIndex = lastWordIndex + 1
  }

  return paragraphs
}

const getMatchRanges = (text: string, query: string): Array<TextRange> => {
  if (query === '') {
    return []
  }

  const expression = new RegExp(escapeRegularExpression(query), 'giu')
  const matches: Array<TextRange> = []
  let match = expression.exec(text)

  while (match !== null) {
    matches.push({ start: match.index, end: match.index + match[0].length })
    match = expression.exec(text)
  }

  return matches
}

const tabId = (view: TranscriptView): string => `transcript-tab-${view}`
const panelId = (view: TranscriptView): string => `transcript-panel-${view}`

export const TranscriptModal = ({ transcript, openerRef, onClose }: TranscriptModalProps) => {
  const [selectedView, setSelectedView] = useState<TranscriptView>('text')
  const [query, setQuery] = useState('')
  const [activeMatchIndex, setActiveMatchIndex] = useState(0)
  const dialogRef = useRef<HTMLElement>(null)
  const closeButtonRef = useRef<HTMLButtonElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const tabRefs = useRef<Record<TranscriptView, HTMLButtonElement | null>>({
    text: null,
    timestamp: null,
  })
  const matchElementsRef = useRef<Map<string, HTMLElement>>(new Map())
  const hasTranscriptText = transcript.text.trim().length > 0
  const effectiveQuery = query.trim()
  const paragraphs = useMemo(
    () => (hasTranscriptText ? getParagraphRanges(transcript.text) : []),
    [hasTranscriptText, transcript.text],
  )
  const matches = useMemo(
    () => (hasTranscriptText ? getMatchRanges(transcript.text, effectiveQuery) : []),
    [effectiveQuery, hasTranscriptText, transcript.text],
  )
  const matchKey = matches.map((match) => `${match.start}:${match.end}`).join(',')


  useModalDialog({
    isOpen: true,
    onClose,
    dialogRef,
    initialFocusRef: hasTranscriptText ? searchInputRef : closeButtonRef,
    restoreFocusRef: openerRef,
  })

  useEffect(() => {
    const matchKeyPrefix = `${matchKey}:`
    const matchElements = matchElementsRef.current

    return () => {
      for (const elementKey of matchElements.keys()) {
        if (elementKey.startsWith(matchKeyPrefix)) {
          matchElements.delete(elementKey)
        }
      }
    }
  }, [matchKey])
  useEffect(() => {
    if (selectedView !== 'text' || matches.length === 0) {
      return
    }

    const activeMatch = matchElementsRef.current.get(`${matchKey}:${activeMatchIndex}`)
    if (activeMatch === undefined) {
      return
    }

    const behavior =
      typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
        ? 'auto'
        : 'smooth'
    activeMatch.scrollIntoView?.({ block: 'center', behavior })
  }, [activeMatchIndex, matchKey, matches.length, selectedView])

  const handleQueryChange = (value: string) => {
    if (value.trim() !== effectiveQuery) {
      setActiveMatchIndex(0)
    }
    setQuery(value)
  }

  const navigateMatches = (direction: 1 | -1) => {
    if (matches.length === 0) {
      return
    }

    setActiveMatchIndex((currentIndex) => (currentIndex + direction + matches.length) % matches.length)
  }

  const selectView = (view: TranscriptView) => {
    setSelectedView(view)
  }

  const handleTabKeyDown = (event: KeyboardEvent<HTMLButtonElement>, view: TranscriptView) => {
    const viewIndex = TRANSCRIPT_VIEWS.indexOf(view)
    let nextView: TranscriptView | undefined

    if (event.key === 'ArrowLeft') {
      nextView = TRANSCRIPT_VIEWS[(viewIndex - 1 + TRANSCRIPT_VIEWS.length) % TRANSCRIPT_VIEWS.length]
    } else if (event.key === 'ArrowRight') {
      nextView = TRANSCRIPT_VIEWS[(viewIndex + 1) % TRANSCRIPT_VIEWS.length]
    } else if (event.key === 'Home') {
      nextView = TRANSCRIPT_VIEWS[0]
    } else if (event.key === 'End') {
      nextView = TRANSCRIPT_VIEWS[TRANSCRIPT_VIEWS.length - 1]
    }

    if (nextView === undefined) {
      return
    }

    event.preventDefault()
    selectView(nextView)
    tabRefs.current[nextView]?.focus()
  }

  const handleSearchKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== 'Enter') {
      return
    }

    event.preventDefault()
    navigateMatches(event.shiftKey ? -1 : 1)
  }

  const handleScrimPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget) {
      onClose()
    }
  }

  const setMatchFragmentRef = (matchIndex: number, element: HTMLElement | null) => {
    const elementKey = `${matchKey}:${matchIndex}`
    const existingElement = matchElementsRef.current.get(elementKey)

    if (element !== null && (existingElement === undefined || !existingElement.isConnected)) {
      matchElementsRef.current.set(elementKey, element)
    }
  }

  const renderParagraph = (paragraph: TextRange): Array<ReactNode> => {
    const nodes: Array<ReactNode> = []
    let cursor = paragraph.start

    matches.forEach((match, matchIndex) => {
      const fragmentStart = Math.max(match.start, paragraph.start)
      const fragmentEnd = Math.min(match.end, paragraph.end)

      if (fragmentStart >= fragmentEnd) {
        return
      }

      if (cursor < fragmentStart) {
        nodes.push(transcript.text.slice(cursor, fragmentStart))
      }

      nodes.push(
        <mark
          key={`${match.start}-${match.end}-${paragraph.start}`}
          ref={(element) => setMatchFragmentRef(matchIndex, element)}
          className={matchIndex === activeMatchIndex ? 'transcript-modal_match--active' : undefined}
          aria-current={matchIndex === activeMatchIndex ? 'true' : undefined}
        >
          {transcript.text.slice(fragmentStart, fragmentEnd)}
        </mark>,
      )
      cursor = fragmentEnd
    })

    if (cursor < paragraph.end) {
      nodes.push(transcript.text.slice(cursor, paragraph.end))
    }

    return nodes
  }

  const searchIsDisabled = !hasTranscriptText || selectedView !== 'text'
  const matchControlsDisabled = searchIsDisabled || matches.length === 0
  const matchCount =
    effectiveQuery === '' ? '' : matches.length === 0 ? '0 matches' : `${activeMatchIndex + 1} of ${matches.length}`

  return (
    <>
      <div
        className="transcript-modal_scrim"
        data-testid="transcript-modal-scrim"
        aria-hidden="true"
        onPointerDown={handleScrimPointerDown}
      />
      <section
        ref={dialogRef}
        className="transcript-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="transcript-modal-title"
      >
        <header className="transcript-modal_header">
          <h2 id="transcript-modal-title">Transcript</h2>
          <button
            ref={closeButtonRef}
            className="transcript-modal_close"
            type="button"
            aria-label="Close transcript"
            onClick={onClose}
          >
            <svg aria-hidden="true" viewBox="0 0 24 24">
              <path d="m6 6 12 12M18 6 6 18" />
            </svg>
          </button>
        </header>
        <div className="transcript-modal_toolbar">
          <div className="transcript-modal_tabs" role="tablist" aria-label="Transcript view">
            {TRANSCRIPT_VIEWS.map((view) => (
              <button
                key={view}
                ref={(element) => {
                  tabRefs.current[view] = element
                }}
                className="transcript-modal_tab"
                type="button"
                role="tab"
                id={tabId(view)}
                aria-controls={panelId(view)}
                aria-selected={selectedView === view}
                tabIndex={selectedView === view ? 0 : -1}
                onClick={() => selectView(view)}
                onFocus={() => selectView(view)}
                onKeyDown={(event) => handleTabKeyDown(event, view)}
              >
                {view === 'text' ? 'Text' : 'Timestamp'}
              </button>
            ))}
          </div>
          <div className="transcript-modal_search-controls">
            <input
              ref={searchInputRef}
              type="search"
              aria-label="Search the transcript"
              placeholder="Search the transcript"
              value={query}
              disabled={searchIsDisabled}
              onChange={(event) => handleQueryChange(event.target.value)}
              onKeyDown={handleSearchKeyDown}
            />
            <span className="transcript-modal_match-count" aria-live="polite">
              {matchCount}
            </span>
            <button
              className="transcript-modal_navigation"
              type="button"
              aria-label="Previous match"
              disabled={matchControlsDisabled}
              onClick={() => navigateMatches(-1)}
            >
              <svg aria-hidden="true" viewBox="0 0 24 24">
                <path d="m6 14 6-6 6 6" />
              </svg>
            </button>
            <button
              className="transcript-modal_navigation"
              type="button"
              aria-label="Next match"
              disabled={matchControlsDisabled}
              onClick={() => navigateMatches(1)}
            >
              <svg aria-hidden="true" viewBox="0 0 24 24">
                <path d="m6 10 6 6 6-6" />
              </svg>
            </button>
          </div>
        </div>
        <div
          className="transcript-modal_body"
          id={panelId(selectedView)}
          role="tabpanel"
          aria-labelledby={tabId(selectedView)}
        >
          {selectedView === 'timestamp' ? (
            <div className="transcript-modal_empty-state">
              <h3>Timestamps aren’t available</h3>
              <p>This source video’s transcript does not include timing information.</p>
            </div>
          ) : !hasTranscriptText ? (
            <div className="transcript-modal_empty-state">
              <p>Transcript text is unavailable for this source video.</p>
            </div>
          ) : effectiveQuery !== '' && matches.length === 0 ? (
            <div className="transcript-modal_empty-state">
              <h3>No matches</h3>
              <p>Try a different word.</p>
            </div>
          ) : (
            <div className="transcript-modal_text">
              {paragraphs.map((paragraph) => (
                <p key={paragraph.start}>{renderParagraph(paragraph)}</p>
              ))}
            </div>
          )}
        </div>
      </section>
    </>
  )
}
