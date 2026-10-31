import { useCallback, useLayoutEffect, useMemo, useState, type ReactNode } from 'react'
import { Theme, ThemeProvider } from '@juspay/blend-design-system'
import { blendComponentTokens, blendFoundationTokens, themeVars, type ThemeMode } from './tokens'
import { ThemeModeContext } from './themeMode'

const STORAGE_KEY = 'collabonet-theme'

function readStoredMode(fallback: ThemeMode): ThemeMode {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY)
    return stored === 'dark' || stored === 'light' ? stored : fallback
  } catch {
    return fallback
  }
}

type BlendProviderProps = {
  theme?: ThemeMode
  children: ReactNode
}

/**
 * Stand-in for the `src/blend/provider` that `blend-studio init` would
 * generate. Wraps Blend's ThemeProvider and mirrors the active theme's
 * foundation tokens onto :root as CSS custom properties for custom styles.
 */
export function BlendProvider({ theme = 'light', children }: BlendProviderProps) {
  const [mode, setMode] = useState<ThemeMode>(() => readStoredMode(theme))

  useLayoutEffect(() => {
    const root = document.documentElement
    for (const [name, value] of Object.entries(themeVars(mode))) {
      root.style.setProperty(name, value)
    }
    root.dataset.theme = mode
    root.style.colorScheme = mode
    try {
      window.localStorage.setItem(STORAGE_KEY, mode)
    } catch {
      // Storage can be unavailable (private mode); the toggle still works.
    }
  }, [mode])

  const toggleMode = useCallback(() => setMode((m) => (m === 'dark' ? 'light' : 'dark')), [])
  const value = useMemo(() => ({ mode, setMode, toggleMode }), [mode, toggleMode])

  return (
    <ThemeModeContext.Provider value={value}>
      <ThemeProvider
        theme={mode === 'dark' ? Theme.DARK : Theme.LIGHT}
        foundationTokens={blendFoundationTokens}
        componentTokens={blendComponentTokens}
      >
        {children}
      </ThemeProvider>
    </ThemeModeContext.Provider>
  )
}
