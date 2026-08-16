import { useLayoutEffect, useRef } from 'react'

import { useProfile } from '@/api/hooks'
import { isInsideTelegram } from '@/api/telegram'
import { Icon } from '@/components/Icon'
import { longDate } from '@/lib/format'
import { DiaryScreen } from '@/screens/Diary/DiaryScreen'
import { ProfileScreen } from '@/screens/Profile/ProfileScreen'
import { ProgressScreen } from '@/screens/Progress/ProgressScreen'
import { ReportScreen } from '@/screens/Report/ReportScreen'
import { SheetHost } from '@/sheets/SheetHost'
import { useUi, type Tab } from './store'
import './shell.css'

const TABS: { key: Tab; label: string; icon: string }[] = [
  { key: 'diary', label: 'Дневник', icon: 'fork-knife' },
  { key: 'report', label: 'Отчёт', icon: 'chart-pie-slice' },
  { key: 'progress', label: 'Прогресс', icon: 'chart-line-up' },
  { key: 'profile', label: 'Профиль', icon: 'user-gear' },
]

const SUBTITLES: Record<Exclude<Tab, 'diary'>, string> = {
  report: 'Нормы и микронутриенты',
  progress: 'Динамика и нагрузка',
  profile: 'Параметры, норма, шаблоны',
}

export function Shell() {
  const tab = useUi((state) => state.tab)
  const day = useUi((state) => state.day)
  const setTab = useUi((state) => state.setTab)
  const { data: profile } = useProfile()

  // Скролл общий на все табы, поэтому запоминаем позицию каждого сами — иначе
  // переход на другой таб открывает его в середине чужого экрана.
  const content = useRef<HTMLElement>(null)
  const scrollByTab = useRef<Partial<Record<Tab, number>>>({})
  const previousTab = useRef<Tab>(tab)

  useLayoutEffect(() => {
    const element = content.current
    if (!element) return
    if (previousTab.current !== tab) {
      scrollByTab.current[previousTab.current] = element.scrollTop
      element.scrollTop = scrollByTab.current[tab] ?? 0
      previousTab.current = tab
    }
  }, [tab])

  const title = TABS.find((item) => item.key === tab)?.label ?? ''
  const subtitle = tab === 'diary' ? longDate(day) : SUBTITLES[tab]
  const initials = (profile?.first_name ?? 'Я').slice(0, 2).toUpperCase()

  return (
    <div className="shell">
      {!isInsideTelegram() && (
        <p className="dev-banner">Режим разработки — открыто вне Telegram</p>
      )}

      <header className="shell__header">
        <div>
          <h1 className="shell__title">{title}</h1>
          <p className="shell__subtitle">{subtitle}</p>
        </div>
        <div className="shell__header-right">
          <Icon name="bell" size={17} color="var(--color-neutral-600)" />
          <span className="avatar" aria-label={profile?.first_name ?? 'Профиль'}>
            {initials}
          </span>
        </div>
      </header>

      <main className="shell__content" ref={content}>
        {tab === 'diary' && <DiaryScreen />}
        {tab === 'report' && <ReportScreen />}
        {tab === 'progress' && <ProgressScreen />}
        {tab === 'profile' && <ProfileScreen />}
      </main>

      <nav className="tabbar" aria-label="Разделы">
        {TABS.map((item) => {
          const active = item.key === tab
          return (
            <button
              key={item.key}
              type="button"
              className="tabbar__button"
              aria-current={active ? 'page' : undefined}
              onClick={() => setTab(item.key)}
            >
              <Icon
                name={item.icon}
                size={18}
                weight={active ? 'fill' : 'regular'}
                color={active ? 'var(--color-accent-300)' : 'var(--color-neutral-600)'}
              />
              {item.label}
            </button>
          )
        })}
      </nav>

      <SheetHost />
    </div>
  )
}
