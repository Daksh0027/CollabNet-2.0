import { createContext, useContext, useEffect } from "react";

const lightTheme = { theme: "light", toggle: () => {} };
const Ctx = createContext(lightTheme);

export function ThemeProvider({ children }) {
  useEffect(() => {
    document.documentElement.classList.remove("dark");
    try {
      localStorage.removeItem("theme");
    } catch {
      // Theme is fixed to light mode even when storage is unavailable.
    }
  }, []);

  return <Ctx.Provider value={lightTheme}>{children}</Ctx.Provider>;
}

export const useTheme = () => useContext(Ctx);
