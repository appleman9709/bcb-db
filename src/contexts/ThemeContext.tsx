import React, { createContext, useContext, useEffect, useMemo, useState } from 'react'

type Theme = 'light' | 'dark'

interface ThemeContextType {
  theme: Theme
  setTheme: (theme: Theme) => void
  actualTheme: Theme
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof window === 'undefined') return 'light'
    const savedTheme = localStorage.getItem('theme') as Theme | null
    return savedTheme ?? 'light'
  })

  const actualTheme = useMemo(() => theme, [theme])

  useEffect(() => {
    if (typeof window === 'undefined') return

    localStorage.setItem('theme', theme)

    const root = document.documentElement
    root.classList.remove('theme-light', 'theme-dark')
    root.classList.add(`theme-${theme}`)

    const lightThemeColor = '#d6e7fe'
    const darkThemeColor = '#0b1224'
    const themeColor = theme === 'dark' ? darkThemeColor : lightThemeColor
    const statusBarStyle = 'black-translucent'

    document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]').forEach((meta) => {
      const media = meta.getAttribute('media')

      if (media?.includes('dark')) {
        meta.setAttribute('content', darkThemeColor)
        return
      }

      if (media?.includes('light')) {
        meta.setAttribute('content', lightThemeColor)
        return
      }

      meta.setAttribute('content', themeColor)
    })

    const statusBarMeta = document.querySelector<HTMLMetaElement>(
      'meta[name="apple-mobile-web-app-status-bar-style"]'
    )

    if (statusBarMeta) {
      statusBarMeta.setAttribute('content', statusBarStyle)
    }
  }, [theme])

  return (
    <ThemeContext.Provider value={{ theme, setTheme, actualTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}
