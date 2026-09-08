/** Тонкая обёртка над Telegram WebApp: SDK может отсутствовать (открыли в браузере). */

interface TelegramWebApp {
  initData: string
  colorScheme: string
  ready: () => void
  expand: () => void
  close: () => void
  /** Появилась в Bot API 6.1 — на старых клиентах объекта нет. */
  BackButton?: {
    show: () => void
    hide: () => void
    onClick: (cb: () => void) => void
    offClick: (cb: () => void) => void
  }
  HapticFeedback?: {
    impactOccurred: (style: 'light' | 'medium' | 'heavy') => void
    notificationOccurred: (type: 'error' | 'success' | 'warning') => void
  }
  setHeaderColor?: (color: string) => void
  setBackgroundColor?: (color: string) => void
}

declare global {
  interface Window {
    Telegram?: { WebApp?: TelegramWebApp }
  }
}

export function webApp(): TelegramWebApp | undefined {
  return typeof window === 'undefined' ? undefined : window.Telegram?.WebApp
}

export function isInsideTelegram(): boolean {
  return Boolean(webApp()?.initData)
}

export function initData(): string {
  return webApp()?.initData ?? ''
}

export function initTelegram(): void {
  const app = webApp()
  if (!app) return
  app.ready()
  app.expand()
  app.setHeaderColor?.('#161826')
  app.setBackgroundColor?.('#161826')
}

export function haptic(style: 'light' | 'medium' | 'heavy' = 'light'): void {
  webApp()?.HapticFeedback?.impactOccurred(style)
}

/** Показать системную кнопку «назад», пока открыт шит. Возвращает функцию отписки. */
export function bindBackButton(handler: () => void): () => void {
  const button = webApp()?.BackButton
  if (!button) return () => {}
  button.onClick(handler)
  button.show()
  return () => {
    button.offClick(handler)
    button.hide()
  }
}
