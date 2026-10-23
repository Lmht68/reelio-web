import { useEffect, type RefObject } from 'react'

type ModalDialogOptions = {
  readonly isOpen: boolean
  readonly onClose: () => void
  readonly dialogRef: RefObject<HTMLElement | null>
  readonly initialFocusRef: RefObject<HTMLElement | null>
  readonly restoreFocusRef: RefObject<HTMLElement | null>
}

type BodyStyleState = {
  readonly overflow: string
  readonly paddingRight: string
  readonly position: string
  readonly top: string
  readonly width: string
}

const getFocusableElements = (dialog: HTMLElement): Array<HTMLElement> =>
  Array.from(dialog.querySelectorAll<HTMLElement>('a[href], button, input, [tabindex]')).filter(
    (element) =>
      !element.matches(':disabled') &&
      element.getAttribute('aria-disabled') !== 'true' &&
      element.tabIndex >= 0,
  )

export const useModalDialog = ({
  isOpen,
  onClose,
  dialogRef,
  initialFocusRef,
  restoreFocusRef,
}: ModalDialogOptions): void => {
  useEffect(() => {
    if (!isOpen) {
      return
    }

    const savedScrollY = window.scrollY
    const body = document.body
    const previousBodyStyles: BodyStyleState = {
      overflow: body.style.overflow,
      paddingRight: body.style.paddingRight,
      position: body.style.position,
      top: body.style.top,
      width: body.style.width,
    }
    const restoreFocusElement = restoreFocusRef.current
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth

    body.style.overflow = 'hidden'
    body.style.position = 'fixed'
    body.style.top = `-${savedScrollY}px`
    body.style.width = '100%'
    if (scrollbarWidth > 0) {
      body.style.paddingRight = `${scrollbarWidth}px`
    }

    initialFocusRef.current?.focus({ preventScroll: true })

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        onClose()
        return
      }

      if (event.key !== 'Tab') {
        return
      }

      const dialog = dialogRef.current
      if (dialog === null) {
        return
      }

      const focusableElements = getFocusableElements(dialog)
      if (focusableElements.length === 0) {
        event.preventDefault()
        return
      }

      const firstElement = focusableElements[0]
      const lastElement = focusableElements[focusableElements.length - 1]
      const focusIsOutsideDialog = !dialog.contains(document.activeElement)

      if (event.shiftKey && (document.activeElement === firstElement || focusIsOutsideDialog)) {
        event.preventDefault()
        lastElement.focus()
      } else if (!event.shiftKey && (document.activeElement === lastElement || focusIsOutsideDialog)) {
        event.preventDefault()
        firstElement.focus()
      }
    }

    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      body.style.overflow = previousBodyStyles.overflow
      body.style.paddingRight = previousBodyStyles.paddingRight
      body.style.position = previousBodyStyles.position
      body.style.top = previousBodyStyles.top
      body.style.width = previousBodyStyles.width
      requestAnimationFrame(() => {
        window.scrollTo(0, savedScrollY)
        restoreFocusElement?.focus({ preventScroll: true })
      })
    }
  }, [dialogRef, initialFocusRef, isOpen, onClose, restoreFocusRef])
}
