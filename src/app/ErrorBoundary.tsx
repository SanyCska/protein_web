import { Component, type ErrorInfo, type ReactNode } from 'react'

interface State {
  error: Error | null
}

/**
 * Последний рубеж: без него любое исключение в рендере оставляет пустой экран,
 * а в Telegram нет консоли, чтобы понять, что случилось.
 */
export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('Необработанная ошибка интерфейса', error, info.componentStack)
  }

  render() {
    if (!this.state.error) return this.props.children
    return (
      <div className="fatal" role="alert">
        <h1 className="fatal__title">Что-то сломалось</h1>
        <p className="fatal__text">{this.state.error.message}</p>
        <button type="button" className="btn btn--accent" onClick={() => window.location.reload()}>
          Перезагрузить
        </button>
      </div>
    )
  }
}
