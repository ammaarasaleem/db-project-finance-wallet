import { useEffect, useMemo, useState } from "react";

type Theme = "light" | "dark";
type AccentTheme = "blue" | "green" | "purple" | "orange" | "pink";

const ACCENT_THEMES: AccentTheme[] = ["blue", "green", "purple", "orange", "pink"];

function getInitialTheme(): Theme {
  if (typeof window === "undefined") return "light";
  const stored = localStorage.getItem("fintrack-theme") as Theme | null;
  if (stored === "dark" || stored === "light") return stored;
  // Respect OS preference on first visit
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function getInitialAccentTheme(): AccentTheme {
  if (typeof window === "undefined") return "blue";
  const stored = localStorage.getItem("fintrack-accent") as AccentTheme | null;
  return stored && ACCENT_THEMES.includes(stored) ? stored : "blue";
}

function applyTheme(theme: Theme) {
  const root = document.documentElement;
  if (theme === "dark") {
    root.classList.add("dark");
  } else {
    root.classList.remove("dark");
  }
  localStorage.setItem("fintrack-theme", theme);
}

function applyAccentTheme(accent: AccentTheme) {
  const body = document.body;
  const root = document.documentElement;
  if (!body) return;
  ACCENT_THEMES.forEach((name) => {
    body.classList.remove(`theme-${name}`);
    root.classList.remove(`theme-${name}`);
  });
  body.classList.add(`theme-${accent}`);
  root.classList.add(`theme-${accent}`);
  localStorage.setItem("fintrack-accent", accent);
}

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(getInitialTheme);
  const [accentTheme, setAccentTheme] = useState<AccentTheme>(getInitialAccentTheme);

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  useEffect(() => {
    applyAccentTheme(accentTheme);
  }, [accentTheme]);

  const toggle = () => setTheme((t) => (t === "dark" ? "light" : "dark"));
  const setColorTheme = (next: AccentTheme) => setAccentTheme(next);
  const isDark = theme === "dark";
  const accent = useMemo(() => accentTheme, [accentTheme]);

  return { theme, toggle, setTheme, accent, setColorTheme, isDark };
}
