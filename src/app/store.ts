import { create } from 'zustand'

import { today } from '@/lib/format'
import type { PeriodRange } from '@/api/types'

export type Tab = 'diary' | 'report' | 'progress' | 'profile'
export type SheetKind = 'add' | 'meal' | 'workout' | 'supplement' | 'params'

/** Что именно открывает шит: блюдо по id, добавку по названию банки. */
export interface SheetTarget {
  mealId?: number
  supplementKey?: string
  workoutId?: number
}

interface UiState {
  tab: Tab
  /** Выбранный день дневника и отчёта за день. */
  day: string
  sheet: SheetKind | null
  /** Какое блюдо открыто в шите деталей. */
  mealId: number | null
  /** Какая добавка открыта на правку; null — шит заводит новую. */
  supplementKey: string | null
  /** Какая нагрузка открыта на правку; null — шит заводит новую. */
  workoutId: number | null
  reportPeriod: 'day' | PeriodRange
  progressRange: PeriodRange
  /** Какой день считался сегодняшним при последней проверке. */
  today: string

  setTab: (tab: Tab) => void
  /** Telegram держит мини-апп в фоне сутками — после полуночи «сегодня» надо пересчитать. */
  syncToday: () => void
  setDay: (day: string) => void
  openSheet: (sheet: SheetKind, target?: SheetTarget) => void
  closeSheet: () => void
  setReportPeriod: (period: 'day' | PeriodRange) => void
  setProgressRange: (range: PeriodRange) => void
}

export const useUi = create<UiState>((set) => ({
  tab: 'diary',
  day: today(),
  sheet: null,
  mealId: null,
  supplementKey: null,
  workoutId: null,
  reportPeriod: 'day',
  progressRange: 'week',
  today: today(),

  // Переключение таба закрывает открытый шит — иначе он повиснет над чужим экраном.
  setTab: (tab) => set({ tab, sheet: null, mealId: null, supplementKey: null, workoutId: null }),
  syncToday: () =>
    set((state) => {
      const now = today()
      if (now === state.today) return {}
      // Если пользователь смотрел «сегодня», переводим его на новый день; выбранный
      // вручную прошлый день не трогаем.
      return state.day === state.today ? { today: now, day: now } : { today: now }
    }),
  setDay: (day) => set({ day }),
  openSheet: (sheet, target) =>
    set({
      sheet,
      mealId: target?.mealId ?? null,
      supplementKey: target?.supplementKey ?? null,
      workoutId: target?.workoutId ?? null,
    }),
  closeSheet: () =>
    set({ sheet: null, mealId: null, supplementKey: null, workoutId: null }),
  setReportPeriod: (reportPeriod) => set({ reportPeriod }),
  setProgressRange: (progressRange) => set({ progressRange }),
}))
