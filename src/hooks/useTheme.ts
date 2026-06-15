import { useState, useEffect } from 'react'

type Theme = 'light' | 'dark'

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>(function () {
    if (typeof window === 'undefined') return 'light'
    const saved = localStorage.getItem('allocate-theme') as Theme | null
    if (saved) return saved
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  })

  useEffect(function () {
    const root = document.documentElement
    if (theme === 'dark') {
      root.classList.add('dark')
    } else {
      root.classList.remove('dark')
    }
    localStorage.setItem('allocate-theme', theme)
  }, [theme])

  function setTheme(t: Theme) {
    setThemeState(t)
  }

  return { theme, setTheme }
}
