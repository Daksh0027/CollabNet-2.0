import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/lib/theme";

export default function ThemeToggle({ className = "" }) {
  const { theme, toggle } = useTheme();
  return (
    <button
      onClick={toggle}
      title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
      className={`relative flex h-9 w-9 items-center justify-center overflow-hidden rounded-full border border-border text-muted-foreground transition-colors hover:border-primary hover:text-primary ${className}`}
      data-testid="theme-toggle-button"
    >
      <Sun className={`absolute h-4 w-4 transition-all duration-300 ${theme === "dark" ? "translate-y-5 opacity-0" : "translate-y-0 opacity-100"}`} />
      <Moon className={`absolute h-4 w-4 transition-all duration-300 ${theme === "dark" ? "translate-y-0 opacity-100" : "-translate-y-5 opacity-0"}`} />
    </button>
  );
}
