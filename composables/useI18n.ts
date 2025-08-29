import { ref, watch } from 'vue'

export type Locale = 'en' | 'uk'

type Messages = Record<string, string>

type Catalog = Record<Locale, Messages>

const STORAGE_KEY = 'team-organizer:locale'

const locale = ref<Locale>('en')

const catalog: Catalog = {
  en: {
    app_title: 'Team Organizer',
    nav_home: 'Home',
    nav_people: 'People',
    nav_teams: 'Teams',
    nav_organize: 'Organize',

    home_welcome: 'Welcome to Team Organizer',
    home_desc: 'Create and manage a list of people, then organize them into teams.',
    home_get_started: 'Get started: Enter People',

    people_title: 'People',
    people_desc: 'Add people you want to organize into teams.',
    people_total: 'Total',
    people_add: 'Add Person',
    people_remove_confirm: 'Are you sure you want to remove person{label}? This action cannot be undone.',
    people_field_name: 'Name',

    teams_title: 'Teams',
    teams_desc: 'Create and manage teams.',
    teams_total: 'Total',
    teams_add: 'Add Team',
    teams_remove: 'Remove',
    teams_color: 'Color',
    teams_no_color: 'No color',
    teams_no_teams_hint: 'No teams yet. Click "Add Team" to create Team #{n}.',
    teams_name: 'Name',

    organize_title: 'Organize',
    organize_desc: 'Evenly organize people into teams.',
    organize_people: 'People',
    organize_teams: 'Teams',
    organize_press_start: 'Press Start to begin',
    organize_add_first: 'Add people and teams first',
    organize_members: 'member(s)',
    organize_awaiting: 'Awaiting members…',
    organize_start: 'Start',
    organize_pause: 'Pause',
    organize_resume: 'Resume',
    organize_reset: 'Reset',
    organize_next: 'Next',
    organize_speed: 'Speed',
    organize_queue_next: 'Next up',
    unknown: 'Unknown',

    confirm_remove_team: 'Are you sure you want to remove team "{name}"? This action cannot be undone.',
  },
  uk: {
    app_title: 'Організатор Команд',
    nav_home: 'Головна',
    nav_people: 'Люди',
    nav_teams: 'Команди',
    nav_organize: 'Організація',

    home_welcome: 'Ласкаво просимо до Організатора Команд',
    home_desc: 'Створюйте та керуйте списком людей, а потім розподіляйте їх по командах.',
    home_get_started: 'Почати: Додати людей',

    people_title: 'Люди',
    people_desc: 'Додайте людей, яких потрібно розподілити по командах.',
    people_total: 'Всього',
    people_add: 'Додати людину',
    people_remove_confirm: 'Ви впевнені, що хочете видалити людину{label}? Дію неможливо скасувати.',
    people_field_name: 'Імʼя',

    teams_title: 'Команди',
    teams_desc: 'Створюйте та керуйте командами.',
    teams_total: 'Всього',
    teams_add: 'Додати команду',
    teams_remove: 'Видалити',
    teams_color: 'Колір',
    teams_no_color: 'Без кольору',
    teams_no_teams_hint: 'Поки немає команд. Натисніть «Додати команду», щоб створити Команду №{n}.',
    teams_name: 'Назва',

    organize_title: 'Організація',
    organize_desc: 'Рівномірно розподіляйте людей по командах.',
    organize_people: 'Людей',
    organize_teams: 'Команд',
    organize_press_start: 'Натисніть «Почати», щоб розпочати',
    organize_add_first: 'Спочатку додайте людей і команди',
    organize_members: 'учасників',
    organize_awaiting: 'Очікування учасників…',
    organize_start: 'Почати',
    organize_pause: 'Пауза',
    organize_resume: 'Продовжити',
    organize_reset: 'Скинути',
    organize_next: 'Далі',
    organize_speed: 'Швидкість',
    organize_queue_next: 'Далі в черзі',
    unknown: 'Невідомо',

    confirm_remove_team: 'Ви впевнені, що хочете видалити команду «{name}»? Дію неможливо скасувати.',
  }
}

let i18nInitialized = false

function initI18nOnce() {
  if (i18nInitialized) return
  i18nInitialized = true
  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem(STORAGE_KEY) as Locale | null
      if (stored && (stored === 'en' || stored === 'uk')) locale.value = stored
    } catch {}
  }
  watch(locale, (val) => {
    try { localStorage.setItem(STORAGE_KEY, val) } catch {}
  })
}

export function useI18n() {
  initI18nOnce()

  const availableLocales = [
    { code: 'en', label: 'English' },
    { code: 'uk', label: 'Українська' },
  ] as const

  function setLocale(next: Locale) {
    if ((next as any) === 'en' || (next as any) === 'uk') locale.value = next as Locale
  }

  function format(msg: string, params?: Record<string, any>) {
    if (!params) return msg
    return msg.replace(/\{(\w+)\}/g, (_, k) => String(params[k] ?? ''))
  }

  function t(key: string, params?: Record<string, any>) {
    const msg = (catalog[locale.value] as any)[key] || (catalog.en as any)[key] || key
    return format(msg, params)
  }

  return {
    t,
    locale,
    setLocale,
    availableLocales,
  }
}
