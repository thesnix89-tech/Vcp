import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { fetchTopMarkets } from "../lib/coingecko";
import type { CoinMarket } from "../lib/coingecko";
import { formatLarge, formatPrice } from "../lib/coingecko";
import Sparkline from "../components/Sparkline";

export default function Home() {
  const [coins, setCoins] = useState<CoinMarket[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    fetchTopMarkets("usd", 8, 1)
      .then((data) => {
        if (!alive) return;
        setCoins(data);
      })
      .catch((e: unknown) => {
        const msg = e instanceof Error ? e.message : "Не удалось загрузить данные";
        if (alive) setErr(msg);
      })
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, []);

  return (
    <div className="space-y-16">
      <section className="pt-6 pb-2 text-center">
        <div className="max-w-3xl mx-auto">
          <h1 className="h-display">
            Спокойный взгляд на крипторынок.
          </h1>
          <p className="mt-6 text-ink-soft text-lg leading-relaxed mx-auto max-w-2xl">
            Volchay Crypto помогает разобраться в любой монете — без шума,
            без обещаний и без давления. Просто данные, индикаторы и
            аккуратный разбор от ИИ.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link to="/analysis" className="btn-hero-primary group">
              <span className="grid place-items-center w-7 h-7 rounded-full bg-white/15 group-hover:bg-white/25 transition">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="3 17 9 11 13 15 21 7" />
                  <polyline points="14 7 21 7 21 14" />
                </svg>
              </span>
              <span>Начать анализ</span>
              <svg className="w-4 h-4 transition-transform group-hover:translate-x-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                <line x1="5" y1="12" x2="19" y2="12" />
                <polyline points="13 6 19 12 13 18" />
              </svg>
            </Link>
            <Link to="/education" className="btn-hero-ghost group">
              <span className="grid place-items-center w-7 h-7 rounded-full bg-accent/10 text-accent">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="9" />
                  <line x1="12" y1="17" x2="12" y2="11" />
                  <circle cx="12" cy="7.5" r="1" fill="currentColor" stroke="none" />
                </svg>
              </span>
              <span>Как это работает</span>
            </Link>
          </div>
        </div>
      </section>

      <section>
        <div className="flex items-end justify-between mb-5">
          <div>
            <h2 className="h-section-left">Рынок сегодня</h2>
            <p className="text-sm text-ink-mute mt-1">
              Топ-8 по капитализации · CoinGecko
            </p>
          </div>
          <Link to="/markets" className="btn-link text-sm">
            Все монеты →
          </Link>
        </div>
        {err && (
          <div className="card p-4 text-sm text-bad">
            {err}
          </div>
        )}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="card p-4 animate-pulse h-32" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {coins.map((c) => {
              const change = c.price_change_percentage_24h ?? 0;
              const positive = change >= 0;
              return (
                <Link
                  key={c.id}
                  to={`/analysis?coin=${c.id}`}
                  className="card p-4 hover:border-accent/40 hover:shadow-soft transition"
                >
                  <div className="flex items-center gap-3">
                    <img
                      src={c.image}
                      alt={c.symbol}
                      width={32}
                      height={32}
                      className="rounded-full"
                      loading="lazy"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="text-ink font-medium truncate">{c.name}</div>
                      <div className="text-xs text-ink-mute uppercase tracking-wide">
                        {c.symbol}
                      </div>
                    </div>
                    <Sparkline
                      data={c.sparkline_in_7d?.price ?? []}
                      width={70}
                      height={28}
                    />
                  </div>
                  <div className="mt-3 flex items-end justify-between">
                    <div>
                      <div className="text-lg font-semibold text-ink">
                        ${formatPrice(c.current_price)}
                      </div>
                      <div className="text-xs text-ink-mute">
                        Cap ${formatLarge(c.market_cap)}
                      </div>
                    </div>
                    <span
                      className={`text-sm font-medium ${
                        positive ? "text-accent" : "text-bad"
                      }`}
                    >
                      {positive ? "+" : ""}
                      {change.toFixed(2)}%
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      <section>
        <h2 className="h-section mb-5">Что внутри</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {[
            {
              title: "Глубокий разбор",
              desc: "Gemini сводит фундаментал, технику и сентимент в один лаконичный отчёт.",
            },
            {
              title: "Технические индикаторы",
              desc: "RSI, MACD, скользящие средние и волатильность считаются автоматически.",
            },
            {
              title: "Чат по контексту",
              desc: "Уточняющие вопросы по тому же разбору — без повторного ввода данных.",
            },
            {
              title: "Живой рынок",
              desc: "Топ-100 монет, объёмы, динамика и спарклайны за 7 дней.",
            },
            {
              title: "Обучение",
              desc: "Гайды по фундаменталу, ТА, рискам и психологии — без воды.",
            },
            {
              title: "Туториалы",
              desc: "От получения API-ключа до построения торгового плана пошагово.",
            },
          ].map((f) => (
            <div key={f.title} className="card p-5">
              <div className="font-medium text-ink mb-1.5">{f.title}</div>
              <p className="text-sm text-ink-mute leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="card p-6 sm:p-8">
        <div className="grid md:grid-cols-2 gap-8 items-start">
          <div>
            <h3 className="h-section-left mb-4">Старт за три шага</h3>
            <ol className="space-y-4 text-ink-soft text-sm">
              <li className="flex gap-3">
                <span className="w-6 h-6 rounded-full bg-accent-tint text-accent-hover grid place-items-center text-xs font-semibold flex-shrink-0">
                  1
                </span>
                <span>
                  Возьми бесплатный Gemini API-ключ на{" "}
                  <a
                    href="https://aistudio.google.com/apikey"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-accent hover:underline"
                  >
                    aistudio.google.com
                  </a>
                  .
                </span>
              </li>
              <li className="flex gap-3">
                <span className="w-6 h-6 rounded-full bg-accent-tint text-accent-hover grid place-items-center text-xs font-semibold flex-shrink-0">
                  2
                </span>
                <span>
                  Вставь ключ в{" "}
                  <Link to="/settings" className="text-accent hover:underline">
                    Настройках
                  </Link>{" "}
                  — он остаётся только в твоём браузере.
                </span>
              </li>
              <li className="flex gap-3">
                <span className="w-6 h-6 rounded-full bg-accent-tint text-accent-hover grid place-items-center text-xs font-semibold flex-shrink-0">
                  3
                </span>
                <span>
                  Открой{" "}
                  <Link to="/analysis" className="text-accent hover:underline">
                    Анализ
                  </Link>
                  , выбери монету и получи разбор.
                </span>
              </li>
            </ol>
          </div>
          <div className="rounded-xl border border-bg-line bg-bg-subtle p-5">
            <div className="label mb-2">Пример</div>
            <pre className="text-xs text-ink-soft overflow-x-auto whitespace-pre-wrap leading-relaxed font-mono">{`> Анализ BTC, 30 дней

TL;DR: Bitcoin удерживается выше SMA50,
RSI 58 — нейтрально, MACD позитивный.

Поддержка: $X
Сопротивление: $Y

Сценарии:
  + пробой   $Y → $Z
  − откат    $X → $W`}</pre>
          </div>
        </div>
      </section>
    </div>
  );
}
