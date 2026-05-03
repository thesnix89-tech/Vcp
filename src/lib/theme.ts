import { useEffect, useState } from "react";

export type Theme = "light" | "dark" | "blackout" | "system";

const STORAGE_KEY = "cryptomind:theme";

export function getStoredTheme(): Theme {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    if (v === "light" || v === "dark" || v === "blackout" || v === "system")
      return v;
  } catch {
    // ignore
  }
  return "system";
}

function prefersDark(): boolean {
  return (
    typeof window !== "undefined" &&
    window.matchMedia &&
    window.matchMedia("(prefers-color-scheme: dark)").matches
  );
}

function resolveTheme(theme: Theme): "light" | "dark" | "blackout" {
  if (theme === "blackout") return "blackout";
  if (theme === "dark") return "dark";
  if (theme === "light") return "light";
  return prefersDark() ? "dark" : "light";
}

export function applyTheme(theme: Theme): void {
  const root = document.documentElement;
  const resolved = resolveTheme(theme);
  root.classList.toggle("dark", resolved === "dark" || resolved === "blackout");
  root.classList.toggle("blackout", resolved === "blackout");
}

export function useTheme(): {
  theme: Theme;
  setTheme: (t: Theme) => void;
  resolved: "light" | "dark" | "blackout";
} {
  const [theme, setThemeState] = useState<Theme>(() => getStoredTheme());
  const [resolved, setResolved] = useState<"light" | "dark" | "blackout">(
    () => resolveTheme(theme)
  );

  useEffect(() => {
    applyTheme(theme);
    setResolved(resolveTheme(theme));
  }, [theme]);

  useEffect(() => {
    if (theme !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => {
      applyTheme("system");
      setResolved(resolveTheme("system"));
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [theme]);

  const setTheme = (t: Theme) => {
    try {
      localStorage.setItem(STORAGE_KEY, t);
    } catch {
      // ignore
    }
    setThemeState(t);
  };

  return { theme, setTheme, resolved };
}
