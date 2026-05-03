import { NavLink, Outlet, Link, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { useTheme } from "../lib/theme";
import type { Theme } from "../lib/theme";
import TutorChat from "./TutorChat";

const NAV = [
  { to: "/", label: "Главная", end: true },
  { to: "/analysis", label: "Анализ" },
  { to: "/markets", label: "Рынок" },
  { to: "/education", label: "Обучение" },
  { to: "/tutorials", label: "Туториалы" },
  { to: "/pricing", label: "Тарифы" },
  { to: "/account", label: "Кабинет" },
  { to: "/settings", label: "Настройки" },
];

const THEME_CYCLE: { mode: "light" | "dark" | "blackout"; label: string }[] = [
  { mode: "light", label: "Светлая" },
  { mode: "dark", label: "Тёмная" },
  { mode: "blackout", label: "Blackout" },
];

function ThemeToggle() {
  const { setTheme, resolved } = useTheme();
  const currentIdx = THEME_CYCLE.findIndex((t) => t.mode === resolved);
  const idx = currentIdx >= 0 ? currentIdx : 0;
  const current = THEME_CYCLE[idx];
  const nextIdx = (idx + 1) % THEME_CYCLE.length;
  const next: Theme = THEME_CYCLE[nextIdx].mode;
  return (
    <button
      type="button"
      aria-label={`Сменить тему. Сейчас: ${current.label}`}
      title={`Тема: ${current.label} · клик для смены`}
      onClick={() => setTheme(next)}
      className="group inline-flex items-center gap-2.5 h-9 pl-1 pr-3 rounded-lg border border-bg-line bg-bg-elev hover:border-accent/40 transition"
    >
      <span
        className={`relative inline-flex items-center w-14 h-6 rounded-md transition ${
          resolved === "blackout"
            ? "bg-black border border-accent/40"
            : resolved === "dark"
            ? "bg-accent"
            : "bg-bg-line"
        }`}
      >
        <span
          className={`absolute top-0.5 w-5 h-5 rounded-[5px] shadow-sm transition-transform grid place-items-center ${
            resolved === "blackout"
              ? "translate-x-[2.25rem] bg-accent"
              : resolved === "dark"
              ? "translate-x-[1.125rem] bg-white"
              : "translate-x-0.5 bg-white"
          }`}
        >
          {resolved === "blackout" ? (
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="5" fill="#FFFFFF"/>
            </svg>
          ) : resolved === "dark" ? (
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#1F1E1B" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
            </svg>
          ) : (
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#C96342" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="4" />
              <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
            </svg>
          )}
        </span>
      </span>
      <span className="hidden sm:inline text-xs font-medium text-ink-soft group-hover:text-ink whitespace-nowrap">
        {current.label}
      </span>
    </button>
  );
}

function BrandMark({ size = 32 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      aria-hidden="true"
      className="flex-shrink-0"
    >
      <defs>
        <radialGradient id="vlcCoinG" cx="0.4" cy="0.32" r="0.78">
          <stop offset="0" stopColor="#FFE99A" />
          <stop offset="0.55" stopColor="#F2C94C" />
          <stop offset="1" stopColor="#B58514" />
        </radialGradient>
        <radialGradient id="vlcCharG" cx="0.4" cy="0.4" r="0.7">
          <stop offset="0" stopColor="#5A2A0F" />
          <stop offset="1" stopColor="#1A0A02" />
        </radialGradient>
        <linearGradient id="vlcFireG" x1="0.5" y1="1" x2="0.5" y2="0">
          <stop offset="0" stopColor="#FFD25A" />
          <stop offset="0.45" stopColor="#E07A3F" />
          <stop offset="1" stopColor="#C96342" />
        </linearGradient>
      </defs>
      <circle cx="28" cy="30" r="20" fill="url(#vlcCoinG)" stroke="#8C6014" strokeWidth="1.2" />
      <circle cx="28" cy="30" r="16.5" fill="none" stroke="#D9A52A" strokeWidth="0.8" opacity="0.7" />
      <path d="M 36 22 A 9 9 0 1 0 36 38" fill="none" stroke="#3B2206" strokeWidth="3.2" strokeLinecap="round" />
      <path d="M 48 30 A 20 20 0 0 1 28 50 Q 32 48 36 44 Q 40 41 43 36 Q 46 33 48 30 Z" fill="url(#vlcCharG)" />
      <circle cx="44" cy="44" r="1.6" fill="#1A0A02" />
      <circle cx="40" cy="48" r="1.1" fill="#1A0A02" />
      <circle cx="48" cy="38" r="1.1" fill="#1A0A02" />
      <path d="M 41 50 Q 45 44 42 38 Q 47 42 49 36 Q 53 41 51 47 Q 56 44 57 50 Q 56 56 50 58 Q 44 58 41 54 Z" fill="url(#vlcFireG)" />
      <path d="M 45 52 Q 47 48 46 44 Q 49 47 50 43 Q 52 48 51 52 Q 49 55 46 55 Z" fill="#FFD25A" opacity="0.85" />
    </svg>
  );
}

function TutorButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      aria-label="Открыть чат-урок с ИИ"
      title="Чат-урок с ИИ"
      onClick={onClick}
      className="group inline-flex items-center gap-2 h-9 px-3 rounded-lg border border-bg-line bg-bg-elev hover:border-accent/40 transition"
    >
      <span className="grid place-items-center w-5 h-5 rounded-md bg-accent/10 text-accent">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
      </span>
      <span className="hidden sm:inline text-xs font-medium text-ink-soft group-hover:text-ink whitespace-nowrap">
        Чат-урок
      </span>
    </button>
  );
}

export default function Layout() {
  const [open, setOpen] = useState(false);
  const [tutorOpen, setTutorOpen] = useState(false);
  const location = useLocation();
  useEffect(() => {
    setOpen(false);
    window.scrollTo(0, 0);
  }, [location.pathname]);
  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-30 bg-bg/85 backdrop-blur-md border-b border-bg-line">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-3">
          <Link to="/" className="flex items-center gap-2.5">
            <BrandMark />
            <span className="font-serif text-lg tracking-tight text-ink whitespace-nowrap">
              Volchay Crypto
            </span>
          </Link>
          <nav className="hidden md:flex items-center gap-1">
            {NAV.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  `nav-pill ${isActive ? "nav-pill-active" : ""}`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
          <div className="flex items-center gap-1.5">
            <TutorButton onClick={() => setTutorOpen(true)} />
            <ThemeToggle />
            <button
              type="button"
              aria-label="Меню"
              onClick={() => setOpen((v) => !v)}
              className="md:hidden grid place-items-center w-9 h-9 rounded-md text-ink-mute hover:text-ink hover:bg-bg-alt"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <line x1="4" y1="6" x2="20" y2="6" />
                <line x1="4" y1="12" x2="20" y2="12" />
                <line x1="4" y1="18" x2="20" y2="18" />
              </svg>
            </button>
          </div>
        </div>
        {open && (
          <div className="md:hidden border-t border-bg-line bg-bg-elev">
            <div className="max-w-6xl mx-auto px-4 py-2 flex flex-col gap-1">
              {NAV.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  onClick={() => setOpen(false)}
                  className={({ isActive }) =>
                    `nav-pill text-sm ${isActive ? "nav-pill-active" : ""}`
                  }
                >
                  {item.label}
                </NavLink>
              ))}
            </div>
          </div>
        )}
      </header>

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-10">
        <Outlet />
      </main>

      <footer className="border-t border-bg-line py-8 text-center text-xs text-ink-mute">
        <p>
          Volchay Crypto · Образовательный инструмент анализа криптовалют ·
          Powered by Google Gemini & CoinGecko
        </p>
        <p className="mt-1 text-ink-faint">
          Не является финансовой рекомендацией. DYOR.
        </p>
      </footer>

      <TutorChat open={tutorOpen} onClose={() => setTutorOpen(false)} />
    </div>
  );
}
