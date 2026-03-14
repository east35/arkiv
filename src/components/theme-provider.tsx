import { createContext, useContext, useEffect, useState } from "react"
import { usePreferences } from "@/hooks/usePreferences"
import { useShelfStore } from "@/store/useShelfStore"

type Theme = "dark" | "light" | "system"

type ThemeProviderProps = {
  children: React.ReactNode
  defaultTheme?: Theme
  storageKey?: string
}

type ThemeProviderState = {
  theme: Theme
  setTheme: (theme: Theme) => void
}

const initialState: ThemeProviderState = {
  theme: "system",
  setTheme: () => null,
}

const ThemeProviderContext = createContext<ThemeProviderState>(initialState)

export function ThemeProvider({
  children,
  defaultTheme = "system",
  storageKey = "vite-ui-theme",
}: ThemeProviderProps) {
  const [theme, setThemeState] = useState<Theme>(
    () => (localStorage.getItem(storageKey) as Theme) || defaultTheme
  )
  
  const { preferences } = useShelfStore()
  const { updatePreferences } = usePreferences()

  // Sync from DB when preferences load
  useEffect(() => {
    if (preferences?.theme && preferences.theme !== theme) {
       setThemeState(preferences.theme)
    }
  }, [preferences?.theme])

  useEffect(() => {
    const root = window.document.documentElement
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)")

    const applyTheme = (nextTheme: Theme) => {
      root.classList.remove("light", "dark")

      if (nextTheme === "system") {
        root.classList.add(mediaQuery.matches ? "dark" : "light")
        return
      }

      root.classList.add(nextTheme)
    }

    applyTheme(theme)

    if (theme !== "system") return

    const handleChange = () => applyTheme("system")
    mediaQuery.addEventListener("change", handleChange)

    return () => mediaQuery.removeEventListener("change", handleChange)
  }, [theme])

  const setTheme = (newTheme: Theme) => {
    localStorage.setItem(storageKey, newTheme)
    setThemeState(newTheme)
    
    // Persist to DB if user is logged in and it's different
    if (preferences && preferences.theme !== newTheme) {
        updatePreferences({ theme: newTheme })
    }
  }

  return (
    <ThemeProviderContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeProviderContext.Provider>
  )
}

export const useTheme = () => {
  const context = useContext(ThemeProviderContext)

  if (context === undefined)
    throw new Error("useTheme must be used within a ThemeProvider")

  return context
}
