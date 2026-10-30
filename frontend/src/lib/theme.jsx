import { createContext, useCallback, useContext, useEffect, useState } from "react";

const THEME_STORAGE_KEY = "theme";
const MODES = ["light", "dark", "system"];
const Ctx = createContext({
  theme: "light",
  themeMode: "light",
  setThemeMode: () => {},
  toggle: () => {},
});

export function ThemeProvider({ children }) {
  const [themeMode, setThemeModeState] = useState(() => {
    try {
      const saved = localStorage.getItem(THEME_STORAGE_KEY);
      return MODES.includes(saved) ? saved : "light";
    } catch {
      return "light";
    }
  });
  const [systemPrefersDark, setSystemPrefersDark] = useState(false);

  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const updateSystemTheme = () => setSystemPrefersDark(media.matches);
    updateSystemTheme();
    media.addEventListener?.("change", updateSystemTheme);
    return () => media.removeEventListener?.("change", updateSystemTheme);
  }, []);

  const theme = themeMode === "system"
    ? systemPrefersDark ? "dark" : "light"
    : themeMode;

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    document.documentElement.style.colorScheme = theme;
  }, [theme]);

  const setThemeMode = useCallback((nextMode) => {
    if (!MODES.includes(nextMode)) return;
    localStorage.setItem(THEME_STORAGE_KEY, nextMode);
    setThemeModeState(nextMode);
  }, []);
  const toggle = useCallback(() => {
    setThemeMode(theme === "dark" ? "light" : "dark");
  }, [setThemeMode, theme]);

  return (
    <Ctx.Provider value={{ theme, themeMode, setThemeMode, toggle }}>
      {children}
    </Ctx.Provider>
  );
}

export const useTheme = () => useContext(Ctx);
