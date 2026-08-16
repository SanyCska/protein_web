/** Тонкая обёртка над Telegram WebApp: SDK может отсутствовать (открыли в браузере). */

interface TelegramWebApp {
  initData: string
  colorScheme: string
  ready: () => void
  expand: () => void
  close: () => void
  BackButton: {
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
export function useBackButtonHandler(handler: () => void): () => void {
  const app = webApp()
  if (!app) return () => {}
  app.BackButton.onClick(handler)
  app.BackButton.show()
  return () => {
    app.BackButton.offClick(handler)
    app.BackButton.hide()
  }
}
