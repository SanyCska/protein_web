import { create } from 'zustand'

import { today } from '@/lib/format'
import type { PeriodRange } from '@/api/types'

export type Tab = 'diary' | 'report' | 'progress' | 'profile'
export type SheetKind = 'add' | 'meal' | 'workout' | 'supplement' | 'params'

interface UiState {
  tab: Tab
  /** Выбранный день дневника и отчёта за день. */
  day: string
  sheet: SheetKind | null
  /** Какое блюдо открыто в шите деталей. */
  mealId: number | null
  reportPeriod: 'day' | PeriodRange
  progressRange: PeriodRange

  setTab: (tab: Tab) => void
  setDay: (day: string) => void
  openSheet: (sheet: SheetKind, mealId?: number) => void
  closeSheet: () => void
  setReportPeriod: (period: 'day' | PeriodRange) => void
  setProgressRange: (range: PeriodRange) => void
}

export const useUi = create<UiState>((set) => ({
  tab: 'diary',
  day: today(),
  sheet: null,
  mealId: null,
  reportPeriod: 'day',
  progressRange: 'week',

  // Переключение таба закрывает открытый шит — иначе он повиснет над чужим экраном.
  setTab: (tab) => set({ tab, sheet: null, mealId: null }),
  setDay: (day) => set({ day }),
  openSheet: (sheet, mealId) => set({ sheet, mealId: mealId ?? null }),
  closeSheet: () => set({ sheet: null, mealId: null }),
  setReportPeriod: (reportPeriod) => set({ reportPeriod }),
  setProgressRange: (progressRange) => set({ progressRange }),
}))
