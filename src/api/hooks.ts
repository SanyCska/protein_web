import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationOptions,
} from '@tanstack/react-query'

import { mondayOf } from '@/lib/format'
import { api } from './client'
import type { MealInput, PeriodRange, Profile, Supplement } from './types'

export const keys = {
  profile: ['profile'] as const,
  reference: ['reference'] as const,
  day: (day: string) => ['day', day] as const,
  meal: (id: number) => ['meal', id] as const,
  /** Ключ — понедельник недели: тап по соседнему дню не должен перезапрашивать ту же полосу. */
  weekStrip: (day: string) => ['weekStrip', mondayOf(day)] as const,
  dayReport: (day: string) => ['dayReport', day] as const,
  periodReport: (range: PeriodRange, end: string) => ['periodReport', range, end] as const,
  progress: (range: PeriodRange, end: string) => ['progress', range, end] as const,
  templates: ['templates'] as const,
  supplements: ['supplements'] as const,
  products: (query: string) => ['products', query] as const,
}

export function useProfile() {
  return useQuery({ queryKey: keys.profile, queryFn: api.profile })
}

export function useReference() {
  return useQuery({ queryKey: keys.reference, queryFn: api.reference, staleTime: Infinity })
}

export function useDay(day: string) {
  // Пока грузится новый день, показываем предыдущий — иначе весь экран мигает скелетоном.
  return useQuery({
    queryKey: keys.day(day),
    queryFn: () => api.day(day),
    placeholderData: keepPreviousData,
  })
}

export function useWeekStrip(day: string) {
  return useQuery({
    queryKey: keys.weekStrip(day),
    queryFn: () => api.weekStrip(day),
    placeholderData: keepPreviousData,
  })
}

export function useDayReport(day: string) {
  return useQuery({ queryKey: keys.dayReport(day), queryFn: () => api.dayReport(day) })
}

export function usePeriodReport(range: PeriodRange, end: string) {
  return useQuery({
    queryKey: keys.periodReport(range, end),
    queryFn: () => api.periodReport(range, end),
  })
}

export function useProgress(range: PeriodRange, end: string) {
  return useQuery({ queryKey: keys.progress(range, end), queryFn: () => api.progress(range, end) })
}

export function useTemplates() {
  return useQuery({ queryKey: keys.templates, queryFn: api.templates })
}

export function useSupplements() {
  return useQuery({ queryKey: keys.supplements, queryFn: api.supplements })
}

export function useProducts(query: string, enabled = true) {
  return useQuery({
    queryKey: keys.products(query),
    queryFn: () => api.products(query),
    enabled,
  })
}

/**
 * Любая правка данных меняет и ленту дня, и отчёты, и графики — считать вручную,
 * что именно протухло, слишком легко забыть. Сбрасываем всё, кроме справочников
 * и деталей блюда: их обновляет сам ответ PATCH, а после DELETE перезапрос
 * ещё открытого шита дал бы гарантированный 404.
 */
const UNTOUCHED_KEYS = new Set(['reference', 'meal'])

function useInvalidateAll() {
  const queryClient = useQueryClient()
  return () =>
    queryClient.invalidateQueries({
      predicate: (query) => !UNTOUCHED_KEYS.has(String(query.queryKey[0])),
    })
}

function useDataMutation<TData, TVars>(
  mutationFn: (vars: TVars) => Promise<TData>,
  options?: Omit<UseMutationOptions<TData, Error, TVars>, 'mutationFn'>,
) {
  const invalidate = useInvalidateAll()
  return useMutation<TData, Error, TVars>({
    mutationFn,
    ...options,
    onSuccess: (...args) => {
      void invalidate()
      options?.onSuccess?.(...args)
    },
  })
}

export function useAddMeal(day: string) {
  return useDataMutation((payload: MealInput) => api.addMeal(day, payload))
}

export function useUpdateMeal() {
  const queryClient = useQueryClient()
  return useDataMutation(
    (vars: { id: number; payload: Partial<MealInput> & { day?: string } }) =>
      api.updateMeal(vars.id, vars.payload),
    { onSuccess: (meal) => queryClient.setQueryData(keys.meal(meal.id), meal) },
  )
}

export function useDeleteMeal() {
  return useDataMutation((id: number) => api.deleteMeal(id))
}

export function useAddWorkout(day: string) {
  return useDataMutation(
    (payload: {
      kind: string
      minutes: number
      kcal?: number
      note?: string
      done_at?: string
      save_as_template?: boolean
      template_name?: string
    }) => api.addWorkout(day, payload),
  )
}

export function useDeleteWorkout() {
  return useDataMutation((id: number) => api.deleteWorkout(id))
}

export function useAddTemplate() {
  return useDataMutation((payload: { name: string; kind: string; minutes: number }) =>
    api.addTemplate(payload),
  )
}

export function useDeleteTemplate() {
  return useDataMutation((id: number) => api.deleteTemplate(id))
}

export function useSaveProfile() {
  return useDataMutation((payload: Partial<Profile>) => api.saveProfile(payload))
}

export function useAddSupplement() {
  return useDataMutation((payload: Omit<Supplement, 'id'>) => api.addSupplement(payload))
}

export function useUpdateSupplement() {
  return useDataMutation((vars: { id: number; payload: Partial<Omit<Supplement, 'id'>> }) =>
    api.updateSupplement(vars.id, vars.payload),
  )
}

export function useDeleteSupplement() {
  return useDataMutation((id: number) => api.deleteSupplement(id))
}

export function useParseMeal() {
  return useMutation({
    mutationFn: (payload: { text: string; image_base64?: string }) => api.parseMeal(payload),
  })
}
