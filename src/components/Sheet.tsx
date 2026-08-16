import { useEffect, useRef, type ReactNode } from 'react'

import { useBackButtonHandler } from '@/api/telegram'
import './ui.css'

/**
 * Нижний шит. Закрывается кнопкой, тапом по бэкдропу, Esc и системной кнопкой
 * «назад» в Telegram — все четыре пути пользователь пробует первым делом.
 */
export function Sheet({
  title,
  subtitle,
  onClose,
  children,
  footer,
  short = false,
}: {
  title: string
  subtitle?: string
  onClose: () => void
  children: ReactNode
  footer?: ReactNode
  short?: boolean
}) {
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  useEffect(() => useBackButtonHandler(onClose), [onClose])

  useEffect(() => {
    panelRef.current?.focus()
  }, [])

  return (
    <>
      <div className="sheet-backdrop" onClick={onClose} aria-hidden />
      <div
        ref={panelRef}
        className={short ? 'sheet sheet--short' : 'sheet'}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
      >
        <div className="sheet__handle" aria-hidden />
        <header className="sheet__head">
          <div>
            <h2 className="sheet__title">{title}</h2>
            {subtitle && <p className="sheet__subtitle">{subtitle}</p>}
          </div>
          <button type="button" className="sheet__close" onClick={onClose}>
            Закрыть
          </button>
        </header>
        {children}
        {footer && <div className="sheet__footer">{footer}</div>}
      </div>
    </>
  )
}
