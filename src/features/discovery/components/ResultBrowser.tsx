import type { KeyboardEvent } from 'react'
import {
  MEDIA_CATEGORIES,
  type CategorizedMediaResults,
  type MediaCategory,
} from '../model/discovery'
import { ResultCard } from './ResultCard'

type ResultBrowserProps = {
  readonly categorizedResults: CategorizedMediaResults
  readonly selectedCategory: MediaCategory
  readonly onSelectCategory: (category: MediaCategory) => void
}

const tabId = (category: MediaCategory) => `media-results-tab-${category}`

export const ResultBrowser = ({
  categorizedResults,
  selectedCategory,
  onSelectCategory,
}: ResultBrowserProps) => {
  const handleTabKeyDown = (
    event: KeyboardEvent<HTMLButtonElement>,
    category: MediaCategory,
  ) => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) {
      return
    }

    const enabledCategories = MEDIA_CATEGORIES.filter(
      ({ category: candidateCategory }) => categorizedResults[candidateCategory].length > 0,
    )
    const currentIndex = enabledCategories.findIndex(
      ({ category: candidateCategory }) => candidateCategory === category,
    )

    if (currentIndex === -1) {
      return
    }

    event.preventDefault()

    const nextIndex =
      event.key === 'Home'
        ? 0
        : event.key === 'End'
          ? enabledCategories.length - 1
          : event.key === 'ArrowLeft'
            ? (currentIndex - 1 + enabledCategories.length) % enabledCategories.length
            : (currentIndex + 1) % enabledCategories.length
    const nextCategory = enabledCategories[nextIndex].category

    document.getElementById(tabId(nextCategory))?.focus()
    onSelectCategory(nextCategory)
  }

  const selectedResults = categorizedResults[selectedCategory]

  return (
    <section className="result-browser" aria-label="Media results">
      <div className="result-browser__tabs" role="tablist" aria-label="Media categories">
        {MEDIA_CATEGORIES.map(({ category, label }) => {
          const count = categorizedResults[category].length
          const isSelected = category === selectedCategory
          const isDisabled = count === 0

          return (
            <button
              key={category}
              className="result-browser__tab"
              type="button"
              role="tab"
              id={tabId(category)}
              aria-selected={isSelected}
              aria-controls={`media-results-panel-${category}`}
              aria-label={isDisabled ? label : `${label}, ${count} results`}
              tabIndex={isSelected && !isDisabled ? 0 : -1}
              disabled={isDisabled}
              onClick={() => onSelectCategory(category)}
              onKeyDown={(event) => handleTabKeyDown(event, category)}
            >
              <span>{label}</span>
              {isDisabled ? null : <span className="result-browser__count">{count}</span>}
            </button>
          )
        })}
      </div>
      <div
        id={`media-results-panel-${selectedCategory}`}
        className="result-browser__panel"
        role="tabpanel"
        aria-labelledby={tabId(selectedCategory)}
      >
        <div className="result-browser__grid">
          {selectedResults.map((result, index) => (
            <ResultCard key={`${result.kind}-${result.title}-${index}`} result={result} />
          ))}
        </div>
      </div>
    </section>
  )
}
