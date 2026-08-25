import { useCallback, useEffect, useRef, useState } from 'react'
import { typeStyle } from '../theme'

/**
 * A confirmation that appears where the action happened, and takes itself away.
 *
 * ## Why it exists
 *
 * Two of Discover's actions change something the user cannot then see. Adding a
 * passage to the list writes a row on a screen that is forbidden from showing
 * anything about that row (principle 7.6), and bookmarking changes a 17px mark
 * from grey to gold. Neither is enough acknowledgement for an action that
 * commits something, and adding had no way back at all until this.
 *
 * ## Why it is not a dialogue
 *
 * A confirmation dialogue on a reading screen is the study-app furniture
 * principle 7.6 exists to keep out, and it would put a question between a person
 * and a prayer. This says what happened, offers the way back, and leaves.
 *
 * ## Drawn as a printed object
 *
 * A band across the foot of the screen in `field` navy with the cloth grain, no
 * radius and no shadow (design-tokens 3), caps label in `on-field-66`, the undo
 * in `accent`. It sits above the tab bar rather than over it, so it never covers
 * a way out. Motion is opacity and position only, under 200ms, per
 * design-tokens 6.
 */

/** Long enough to notice, read, and reach for. */
const UNDO_MILLISECONDS = 6000

/** Long enough to read. Nothing is waiting on it. */
const CONFIRMATION_MILLISECONDS = 3000

/** Design-tokens 6: transitions under 200ms, opacity and position only. */
const TRANSITION_MILLISECONDS = 160

export interface ToastMessage {
  readonly text: string
  /** The label and the action, or `null` where there is nothing to undo. */
  readonly undo: { readonly label: string; readonly onUndo: () => void } | null
}

export interface ToastController {
  readonly toast: ToastMessage | null
  readonly show: (message: ToastMessage) => void
  readonly dismiss: () => void
}

/**
 * Holds the current message and takes it away on its own.
 *
 * The timer is keyed on the message, so a second action while the first is still
 * showing replaces it and restarts the clock rather than inheriting the
 * remainder of someone else's.
 */
export function useToast(): ToastController {
  const [toast, setToast] = useState<ToastMessage | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const clear = useCallback(() => {
    if (timer.current !== null) clearTimeout(timer.current)
    timer.current = null
  }, [])

  const dismiss = useCallback(() => {
    clear()
    setToast(null)
  }, [clear])

  const show = useCallback(
    (message: ToastMessage) => {
      clear()
      setToast(message)
      timer.current = setTimeout(
        () => {
          setToast(null)
        },
        message.undo === null ? CONFIRMATION_MILLISECONDS : UNDO_MILLISECONDS,
      )
    },
    [clear],
  )

  useEffect(() => clear, [clear])

  return { toast, show, dismiss }
}

export function Toast({ toast, onDismiss }: { toast: ToastMessage | null; onDismiss: () => void }) {
  // Kept mounted through the fade so the band leaves the way it arrived. The
  // last message is held while it goes, or the text would vanish first.
  const [shown, setShown] = useState<ToastMessage | null>(toast)
  const [visible, setVisible] = useState(toast !== null)

  useEffect(() => {
    if (toast !== null) {
      setShown(toast)
      setVisible(true)
      return
    }
    setVisible(false)
    const timer = setTimeout(() => {
      setShown(null)
    }, TRANSITION_MILLISECONDS)
    return () => {
      clearTimeout(timer)
    }
  }, [toast])

  if (shown === null) return null

  return (
    <div
      role="status"
      aria-live="polite"
      className="cloth-grain flex shrink-0 items-center justify-between bg-field"
      style={{
        padding: '13px 26px',
        gap: 16,
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(6px)',
        transition: `opacity ${String(TRANSITION_MILLISECONDS)}ms, transform ${String(
          TRANSITION_MILLISECONDS,
        )}ms`,
      }}
    >
      <span className="min-w-0 text-on-field-66" style={typeStyle('secondaryButtonLabel')}>
        {shown.text}
      </span>
      {shown.undo !== null && (
        <button
          type="button"
          className="-my-3 flex flex-none items-center text-accent"
          style={{ ...typeStyle('primaryButtonLabel'), minHeight: 44 }}
          onClick={() => {
            shown.undo?.onUndo()
            onDismiss()
          }}
        >
          {shown.undo.label}
        </button>
      )}
    </div>
  )
}
