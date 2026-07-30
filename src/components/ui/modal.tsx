"use client"

import * as React from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface ModalProps {
  open: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
  footer?: React.ReactNode
  size?: 'sm' | 'md' | 'lg' | 'xl'
  closeLabel?: string
  busy?: boolean
}

const sizeClasses = {
  sm: 'max-w-md',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
}

function Modal({
  open,
  onClose,
  title,
  children,
  footer,
  size = 'md',
  closeLabel = 'Close',
  busy = false,
}: ModalProps) {
  const dialogRef = React.useRef<HTMLDivElement>(null)
  const onCloseRef = React.useRef(onClose)
  const busyRef = React.useRef(busy)
  const titleId = React.useId()

  React.useEffect(() => {
    onCloseRef.current = onClose
  }, [onClose])

  React.useEffect(() => {
    busyRef.current = busy
  }, [busy])

  React.useEffect(() => {
    if (!open) return

    const previousActive = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const dialog = dialogRef.current
    const focusable = dialog?.querySelector<HTMLElement>(
      'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
    )
    queueMicrotask(() => (focusable ?? dialog)?.focus())

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !busyRef.current) {
        event.preventDefault()
        onCloseRef.current()
        return
      }
      if (event.key !== 'Tab' || !dialog) return

      const elements = Array.from(dialog.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      )).filter(element => element.offsetParent !== null)
      if (!elements.length) {
        event.preventDefault()
        dialog.focus()
        return
      }

      const first = elements[0]
      const last = elements[elements.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = previousOverflow
      previousActive?.focus()
    }
  }, [open])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4">
      <button
        type="button"
        className="absolute inset-0 cursor-default bg-surface-container-highest/80 backdrop-blur-sm"
        onClick={() => !busy && onClose()}
        aria-label={closeLabel}
        tabIndex={-1}
      />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={cn(
          'relative z-10 flex max-h-[96dvh] w-full flex-col rounded-t-3xl bg-surface-container-lowest shadow-[0_24px_80px_rgba(24,34,48,.22)] outline-none sm:max-h-[90dvh] sm:rounded-2xl',
          sizeClasses[size],
        )}
      >
        <div className="flex shrink-0 items-center justify-between gap-4 border-b border-outline-variant/60 px-5 py-4 sm:px-6">
          <h2 id={titleId} className="text-lg font-semibold text-on-surface">{title}</h2>
          <button
            type="button"
            onClick={() => !busy && onClose()}
            disabled={busy}
            className="grid h-12 w-12 shrink-0 place-items-center rounded-xl text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface disabled:opacity-50"
            aria-label={closeLabel}
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-6">{children}</div>
        {footer && (
          <div className="flex shrink-0 flex-col-reverse gap-3 border-t border-outline-variant/60 px-5 py-4 sm:flex-row sm:justify-end sm:px-6">
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}

export { Modal }
