import {
  useCallback,
  useLayoutEffect,
  useMemo,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import { Theme, ThemeProvider } from "@juspay/blend-design-system";
import {
  blendComponentTokens,
  blendFoundationTokens,
  themeVars,
  type ThemeMode,
} from "./tokens";
import { ThemeModeContext } from "./themeMode";

const STORAGE_KEY = "collabonet-theme";

function readStoredMode(fallback: ThemeMode): ThemeMode {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    return stored === "dark" || stored === "light" ? stored : fallback;
  } catch {
    return fallback;
  }
}

type BlendProviderProps = {
  theme?: ThemeMode;
  children: ReactNode;
};

/** Keep Blend variables local so dashboard tokens and theme stay untouched. */
export function BlendProvider({
  theme = "light",
  children,
}: BlendProviderProps) {
  const [mode, setMode] = useState<ThemeMode>(() => readStoredMode(theme));

  useLayoutEffect(() => {
    const root = document.documentElement;
    root.classList.add("blend-landing-active");
    return () => root.classList.remove("blend-landing-active");
  }, []);

  useLayoutEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, mode);
    } catch {
      // The theme toggle also works when browser storage is unavailable.
    }
  }, [mode]);

  const toggleMode = useCallback(
    () => setMode((m) => (m === "dark" ? "light" : "dark")),
    [],
  );
  const value = useMemo(
    () => ({ mode, setMode, toggleMode }),
    [mode, toggleMode],
  );
  const styles = useMemo(
    () => ({ ...themeVars(mode), colorScheme: mode }) as CSSProperties,
    [mode],
  );

  return (
    <ThemeModeContext.Provider value={value}>
      <ThemeProvider
        theme={mode === "dark" ? Theme.DARK : Theme.LIGHT}
        foundationTokens={blendFoundationTokens}
        componentTokens={blendComponentTokens[mode]}
      >
        <div className="blend-landing" data-theme={mode} style={styles}>
          {children}
        </div>
      </ThemeProvider>
    </ThemeModeContext.Provider>
  );
}
