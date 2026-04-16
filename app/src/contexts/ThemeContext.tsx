import { createContext, useContext, useEffect, useState, useCallback, useRef, type ReactNode } from 'react'
import { useAppState } from './AppContext'
import { isInQuietHours } from '../lib/quietHours'

type Theme = 'light' | 'dark'

interface ThemeContextValue {
  theme: Theme
  adaptiveTheme: boolean
  setTheme: (t: Theme) => void
  setAdaptiveTheme: (on: boolean) => void
}

const ThemeCtx = createContext<ThemeContextValue | null>(null)

// localStorage keys
const LS_THEME = 'yaya_theme'
const LS_ADAPTIVE = 'yaya_adaptive_theme'
const LS_BEFORE_NIGHT = 'yaya_theme_before_night'
const LS_NIGHT_APPLIED = 'yaya_night_applied'

// Meta theme-color para status bar Android
const DARK_STATUS_BAR = '#0d0a27'
const LIGHT_STATUS_BAR = '#ffffff'

function readThemeFromStorage(): Theme {
  const v = localStorage.getItem(LS_THEME)
  return v === 'light' ? 'light' : 'dark'
}

function readAdaptiveFromStorage(): boolean {
  return localStorage.getItem(LS_ADAPTIVE) === 'true'
}

/**
 * Aplica a classe theme-light no <html> e atualiza o meta theme-color.
 * Chamado em todo render de mudança de `theme`.
 */
function applyThemeToDOM(theme: Theme) {
  const html = document.documentElement
  if (theme === 'light') {
    html.classList.add('theme-light')
  } else {
    html.classList.remove('theme-light')
  }
  // Atualiza a cor da status bar Android
  const meta = document.querySelector('meta[name="theme-color"]')
  if (meta) meta.setAttribute('content', theme === 'light' ? LIGHT_STATUS_BAR : DARK_STATUS_BAR)
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const { quietHours } = useAppState()
  const [theme, setThemeState] = useState<Theme>(() => readThemeFromStorage())
  const [adaptiveTheme, setAdaptiveThemeState] = useState<boolean>(() => readAdaptiveFromStorage())

  // Ref pra lógica adaptada ler valores atuais sem re-criar o interval
  const stateRef = useRef({ theme, adaptiveTheme, quietHours })
  stateRef.current = { theme, adaptiveTheme, quietHours }

  const setTheme = useCallback((t: Theme) => {
    setThemeState(t)
    localStorage.setItem(LS_THEME, t)
  }, [])

  const setAdaptiveTheme = useCallback((on: boolean) => {
    setAdaptiveThemeState(on)
    localStorage.setItem(LS_ADAPTIVE, on ? 'true' : 'false')
    // Se desligou, limpa o estado de "noite aplicada" pra não ter resíduo
    if (!on) {
      localStorage.removeItem(LS_NIGHT_APPLIED)
      localStorage.removeItem(LS_BEFORE_NIGHT)
    }
  }, [])

  // Aplica tema no DOM sempre que muda
  useEffect(() => {
    applyThemeToDOM(theme)
  }, [theme])

  /**
   * Lógica de iluminação adaptada — tabela de decisão:
   * - Ao entrar no noturno: snapshot do tema atual, se era light → dark
   * - Durante o noturno: usuário pode mexer livre, não afeta snapshot
   * - Ao sair do noturno: se snapshot era light → volta pra light
   *
   * Roda no mount + a cada 60s.
   */
  useEffect(() => {
    if (!adaptiveTheme) return

    function check() {
      const { theme: currentTheme, adaptiveTheme: enabled, quietHours: qh } = stateRef.current
      if (!enabled || !qh.enabled) return

      const inNight = isInQuietHours(qh)
      const nightApplied = localStorage.getItem(LS_NIGHT_APPLIED) === 'true'

      if (inNight && !nightApplied) {
        // Entrando no horário noturno — snapshot + eventual flip pra dark
        localStorage.setItem(LS_BEFORE_NIGHT, currentTheme)
        localStorage.setItem(LS_NIGHT_APPLIED, 'true')
        if (currentTheme === 'light') {
          setThemeState('dark')
          localStorage.setItem(LS_THEME, 'dark')
        }
        return
      }

      if (!inNight && nightApplied) {
        // Saindo do horário noturno — restore baseado no snapshot
        const before = localStorage.getItem(LS_BEFORE_NIGHT) as Theme | null
        localStorage.removeItem(LS_NIGHT_APPLIED)
        localStorage.removeItem(LS_BEFORE_NIGHT)
        if (before === 'light' && currentTheme !== 'light') {
          setThemeState('light')
          localStorage.setItem(LS_THEME, 'light')
        }
      }
    }

    check() // mount imediato
    const id = window.setInterval(check, 60_000)
    return () => window.clearInterval(id)
  }, [adaptiveTheme])

  return (
    <ThemeCtx.Provider value={{ theme, adaptiveTheme, setTheme, setAdaptiveTheme }}>
      {children}
    </ThemeCtx.Provider>
  )
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeCtx)
  if (!ctx) throw new Error('useTheme must be used inside <ThemeProvider>')
  return ctx
}
