import { useEffect, useState } from "react";
import { THEME_CONFIG } from "@/config";

type Theme = "light" | "dark";

const THEME_KEY = THEME_CONFIG.storageKey;

function getSystemTheme(): Theme {
  if (typeof window === "undefined") return THEME_CONFIG.defaultTheme;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function getInitialTheme(): Theme {
  if (typeof window === "undefined") return THEME_CONFIG.defaultTheme;
  const stored = window.localStorage.getItem(THEME_KEY);
  if (stored === "dark" || stored === "light") return stored;
  return getSystemTheme();
}

function applyTheme(theme: Theme): void {
  document.documentElement.classList.toggle(THEME_CONFIG.darkClass, theme === "dark");
}

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(getInitialTheme);

  useEffect(() => {
    applyTheme(theme);
    window.localStorage.setItem(THEME_KEY, theme);
  }, [theme]);

  const toggleTheme = () => setTheme((t) => (t === "dark" ? "light" : "dark"));

  const setDark = () => setTheme("dark");
  const setLight = () => setTheme("light");

  return {
    theme,
    toggleTheme,
    setDark,
    setLight,
    isDark: theme === "dark",
    isLight: theme === "light",
  };
}
