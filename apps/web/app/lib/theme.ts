import { useState, useCallback } from 'react'

const STORAGE_KEY = 'theme'
const COOKIE_KEY = 'theme'
const COOKIE_MAX_AGE = 365 * 24 * 60 * 60 // 1 year

export type Theme = 'light' | 'dark'

function getThemeFromCookie(): Theme | null {
  if (typeof document === 'undefined') return null
  const m = document.cookie.match(new RegExp(`(?:^|; )${COOKIE_KEY}=([^;]*)`))
  const v = m?.[1]
  if (v === 'light' || v === 'dark') return v
  return null
}

export function getStoredTheme(): Theme {
  if (typeof document === 'undefined') return 'dark'
  const fromCookie = getThemeFromCookie()
  if (fromCookie) return fromCookie
  try {
    const stored = localStorage.getItem(STORAGE_KEY) as Theme | null
    if (stored === 'light' || stored === 'dark') return stored
  } catch {
    // Gizli sekme vb. localStorage erişilemezse dark varsayılan
  }
  return 'dark'
}

export function applyTheme(theme: Theme): void {
  const root = document.documentElement
  if (theme === 'dark') {
    root.classList.add('dark')
  } else {
    root.classList.remove('dark')
  }
}

export function setTheme(theme: Theme): void {
  localStorage.setItem(STORAGE_KEY, theme)
  document.cookie = `${COOKIE_KEY}=${theme}; path=/; max-age=${COOKIE_MAX_AGE}; SameSite=Lax`
  applyTheme(theme)
}

export function initTheme(): void {
  applyTheme(getStoredTheme())
}

export function useTheme(): [Theme, (theme: Theme) => void] {
  const [theme, setThemeState] = useState<Theme>(getStoredTheme)
  const updateTheme = useCallback((t: Theme) => {
    setTheme(t)
    setThemeState(t)
  }, [])
  return [theme, updateTheme]
}
