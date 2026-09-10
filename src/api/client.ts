import { initData, isInsideTelegram } from './telegram'
import type {
  AiLabelResult,
  AiParseResult,
  AiSupplementLabelResult,
  DayReport,
  DayView,
  Meal,
  MealInput,
  PeriodRange,
  Product,
  ProductMicroEstimate,
  ProductsEstimateResult,
  Profile,
  Progress,
  Reference,
  Supplement,
  WeekStrip,
  Workout,
  WorkoutTemplate,
} from './types'

// Пустая переменная — тоже «не задано»; хвостовой слэш убираем, чтобы не получить `//diary`.
const BASE = (import.meta.env.VITE_API_BASE || '/api').replace(/\/+$/, '')

/** ID пользователя для разработки вне Telegram; в проде игнорируется сервером. */
const DEV_USER_ID = import.meta.env.VITE_DEV_USER_ID ?? '1'

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message)
    this.name = 'ApiError'
  }

  /** ИИ недоступен — это ожидаемое состояние, а не поломка приложения. */
  get isAiUnavailable(): boolean {
    return this.status === 503
  }
}

function authHeaders(): Record<string, string> {
  if (isInsideTelegram()) return { Authorization: `tma ${initData()}` }
  return { 'X-Dev-User-Id': DEV_USER_ID }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response
  try {
    response = await fetch(`${BASE}${path}`, {
      ...init,
      headers: {
        // Content-Type только там, где есть тело: на GET он лишь провоцирует CORS-preflight.
        ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
        ...authHeaders(),
        ...init?.headers,
      },
    })
  } catch {
    throw new ApiError(0, 'Нет связи с сервером')
  }

  if (response.status === 204) return undefined as T

  const text = await response.text()
  const payload: unknown = text ? safeJson(text) : null

  if (!response.ok) {
    throw new ApiError(response.status, detailOf(payload) ?? `Ошибка ${response.status}`)
  }
  return payload as T
}

function safeJson(text: string): unknown {
  try {
    return JSON.parse(text)
  } catch {
    // Не JSON — обычно HTML-страница ошибки от прокси; показывать её пользователю нечего.
    return null
  }
}

function detailOf(payload: unknown): string | null {
  if (typeof payload === 'string') return payload
  if (payload && typeof payload === 'object' && 'detail' in payload) {
    const detail = (payload as { detail: unknown }).detail
    if (typeof detail === 'string') return detail
    // Ошибки валидации pydantic приходят массивом объектов.
    if (Array.isArray(detail)) {
      const first = detail[0] as { msg?: string; loc?: unknown[] } | undefined
      if (first?.msg) {
        const field = Array.isArray(first.loc) ? first.loc.at(-1) : undefined
        return field ? `${String(field)}: ${first.msg}` : first.msg
      }
    }
  }
  return null
}

const get = <T,>(path: string) => request<T>(path)
const post = <T,>(path: string, body: unknown) =>
  request<T>(path, { method: 'POST', body: JSON.stringify(body) })
const patch = <T,>(path: string, body: unknown) =>
  request<T>(path, { method: 'PATCH', body: JSON.stringify(body) })
const put = <T,>(path: string, body: unknown) =>
  request<T>(path, { method: 'PUT', body: JSON.stringify(body) })
const del = (path: string) => request<void>(path, { method: 'DELETE' })

export const api = {
  health: () => get<{ status: string; today: string }>('/health'),
  reference: () => get<Reference>('/reference'),

  profile: () => get<Profile>('/profile'),
  saveProfile: (payload: Partial<Profile>) => put<Profile>('/profile', payload),

  day: (day: string) => get<DayView>(`/diary/${day}`),
  weekStrip: (day: string) => get<WeekStrip>(`/diary/${day}/week`),

  addMeal: (day: string, payload: MealInput) => post<Meal>(`/diary/${day}/meals`, payload),
  meal: (id: number) => get<Meal>(`/meals/${id}`),
  updateMeal: (id: number, payload: Partial<MealInput> & { day?: string }) =>
    patch<Meal>(`/meals/${id}`, payload),
  deleteMeal: (id: number) => del(`/meals/${id}`),

  addWorkout: (
    day: string,
    payload: {
      kind: string
      minutes: number
      kcal?: number
      note?: string
      done_at?: string
      save_as_template?: boolean
      template_name?: string
    },
  ) => post<Workout>(`/diary/${day}/workouts`, payload),
  updateWorkout: (id: number, payload: { kind?: string; minutes?: number; kcal?: number }) =>
    patch<Workout>(`/workouts/${id}`, payload),
  deleteWorkout: (id: number) => del(`/workouts/${id}`),
  workoutEstimate: (kind: string, minutes: number) =>
    get<{ kcal: number; met: number; weight_kg: number }>(
      `/workout-estimate?kind=${encodeURIComponent(kind)}&minutes=${minutes}`,
    ),

  templates: () => get<WorkoutTemplate[]>('/workout-templates'),
  addTemplate: (payload: { name: string; kind: string; minutes: number }) =>
    post<WorkoutTemplate>('/workout-templates', payload),
  deleteTemplate: (id: number) => del(`/workout-templates/${id}`),

  supplements: () => get<Supplement[]>('/supplements'),
  addSupplement: (payload: Omit<Supplement, 'id'>) => post<Supplement>('/supplements', payload),
  addSupplements: (payload: { name: string; items: Omit<Supplement, 'id' | 'group_name'>[] }) =>
    post<Supplement[]>('/supplements/bulk', payload),
  deleteSupplements: (ids: number[]) => post<void>('/supplements/bulk-delete', { ids }),
  updateSupplement: (id: number, payload: Partial<Omit<Supplement, 'id'>>) =>
    patch<Supplement>(`/supplements/${id}`, payload),
  deleteSupplement: (id: number) => del(`/supplements/${id}`),

  products: (query: string) => get<Product[]>(`/products?q=${encodeURIComponent(query)}`),
  addProduct: (payload: Omit<Product, 'id'>) => post<Product>('/products', payload),
  updateProduct: (id: number, payload: Partial<Omit<Product, 'id'>>) =>
    patch<Product>(`/products/${id}`, payload),
  deleteProduct: (id: number) => del(`/products/${id}`),
  estimateProduct: (id: number) => post<Product>(`/products/${id}/estimate`, {}),
  estimateProducts: () => post<ProductsEstimateResult>('/products/estimate', {}),

  parseMeal: (payload: { text: string; image_base64?: string }) =>
    post<AiParseResult>('/ai/parse', payload),
  parseLabel: (payload: { image_base64: string; text?: string }) =>
    post<AiLabelResult>('/ai/label', payload),
  parseSupplementLabel: (payload: { image_base64: string; text?: string }) =>
    post<AiSupplementLabelResult>('/ai/supplement-label', payload),
  estimateMicros: (payload: {
    name: string
    portion_g?: number | null
    calories_kcal?: number | null
    protein_g?: number | null
    fat_g?: number | null
    carbs_g?: number | null
  }) => post<ProductMicroEstimate>('/ai/product', payload),

  dayReport: (day: string) => get<DayReport>(`/report/day/${day}`),
  periodReport: (range: PeriodRange, end: string) =>
    get<import('./types').PeriodReport>(`/report/period?range=${range}&end=${end}`),
  progress: (range: PeriodRange, end: string) =>
    get<Progress>(`/progress?range=${range}&end=${end}`),
}
