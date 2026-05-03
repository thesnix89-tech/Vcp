import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  fetchCoinDetail,
  fetchMarketChart,
  fetchOHLC,
  searchCoins,
  formatPrice,
  formatLarge,
} from "../lib/coingecko";
import type { CoinDetail } from "../lib/coingecko";
import { binanceSymbolFor, fetchBinanceOHLC } from "../lib/binance";
import { computeIndicators } from "../lib/indicators";
import type { IndicatorSnapshot } from "../lib/indicators";
import { analyzeCoin, chatAboutCoin, DEFAULT_MODEL } from "../lib/gemini";
import type { ChatMessage } from "../lib/gemini";
import { loadString, StorageKeys, saveJSON, loadJSON } from "../lib/storage";
import PriceChart from "../components/PriceChart";
import Markdown from "../components/Markdown";

const TIMEFRAMES = [
  { days: 7, label: "7д" },
  { days: 14, label: "14д" },
  { days: 30, label: "30д" },
  { days: 90, label: "90д" },
  { days: 180, label: "180д" },
  { days: 365, label: "1г" },
];

interface SearchHit {
  id: string;
  name: string;
  symbol: string;
  thumb: string;
  market_cap_rank: number | null;
}

interface HistoryEntry {
  coinId: string;
  coinName: string;
  symbol: string;
  timeframeDays: number;
  createdAt: number;
  preview: string;
}

export default function Analysis() {
  const [params, setParams] = useSearchParams();
  const initialCoin = params.get("coin") || "bitcoin";
  const [coinId, setCoinId] = useState(initialCoin);
  const [days, setDays] = useState(30);

  const [searchQ, setSearchQ] = useState("");
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [searchOpen, setSearchOpen] = useState(false);
  const debounceRef = useRef<number | null>(null);

  const [coin, setCoin] = useState<CoinDetail | null>(null);
  const [chart, setChart] = useState<{ timestamp: number; price: number }[]>([]);
  const [indicators, setIndicators] = useState<IndicatorSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [coinErr, setCoinErr] = useState<string | null>(null);

  const [aiText, setAiText] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiErr, setAiErr] = useState<string | null>(null);

  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);

  const apiKey = loadString(StorageKeys.geminiApiKey) || "";
  const model = loadString(StorageKeys.geminiModel) || DEFAULT_MODEL;

  const loadCoin = useCallback(async (id: string, d: number) => {
    setLoading(true);
    setCoinErr(null);
    setCoin(null);
    setChart([]);
    setIndicators(null);
    const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
    const friendly = (raw: string) =>
      /429|rate/i.test(raw)
        ? "CoinGecko ограничил запросы (rate limit). Подожди 30–60 сек и нажми «Повторить»."
        : raw.toLowerCase().includes("failed to fetch")
        ? "Не удалось связаться с CoinGecko. Проверь интернет и нажми «Повторить»."
        : raw || "Не удалось загрузить данные монеты.";
    try {
      // 1) Coin metadata (CoinGecko — only place that has rich descriptions/links)
      const detail = await fetchCoinDetail(id);
      setCoin(detail);

      // 2) Charts/OHLC: prefer Binance (1200 req/min free) for the ~70 most-popular
      // coins, fall back to CoinGecko otherwise.
      let prices: { timestamp: number; price: number }[] = [];
      let ohlcOk = false;
      let priceErr: string | null = null;

      const binanceSymbol = binanceSymbolFor(id);
      if (binanceSymbol) {
        try {
          const ohlc = await fetchBinanceOHLC(binanceSymbol, d);
          if (ohlc.length > 0) {
            setIndicators(computeIndicators(ohlc));
            ohlcOk = true;
            prices = ohlc.map((c) => ({ timestamp: c.timestamp, price: c.close }));
            setChart(prices);
          }
        } catch (e) {
          priceErr = e instanceof Error ? e.message : String(e);
        }
      }

      // CoinGecko fallback (sequential with small spacing)
      if (prices.length === 0) {
        await sleep(250);
        try {
          const mc = await fetchMarketChart(id, d);
          prices = mc.prices.map(([t, p]) => ({ timestamp: t, price: p }));
          setChart(prices);
        } catch (e) {
          priceErr = e instanceof Error ? e.message : String(e);
        }
      }

      if (!ohlcOk) {
        await sleep(250);
        try {
          const ohlc = await fetchOHLC(id, Math.min(d, 365));
          if (ohlc.length > 0) {
            setIndicators(computeIndicators(ohlc));
            ohlcOk = true;
          }
        } catch {
          // ignore — will fall back to market_chart prices below
        }
      }

      // Last-resort: synthesize OHLC from price series so indicators still render
      if (!ohlcOk && prices.length > 0) {
        const synthetic = prices.map((p) => ({
          timestamp: p.timestamp,
          open: p.price,
          high: p.price,
          low: p.price,
          close: p.price,
        }));
        setIndicators(computeIndicators(synthetic));
      }

      if (prices.length === 0 && priceErr) {
        setCoinErr(friendly(priceErr));
      }
    } catch (e: unknown) {
      setCoinErr(friendly(e instanceof Error ? e.message : ""));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCoin(coinId, days);
    setAiText("");
    setAiErr(null);
    setChatHistory([]);
  }, [coinId, days, loadCoin]);

  useEffect(() => {
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    if (!searchQ.trim()) {
      setHits([]);
      return;
    }
    debounceRef.current = window.setTimeout(async () => {
      try {
        const r = await searchCoins(searchQ.trim());
        setHits(r.coins.slice(0, 10));
      } catch {
        setHits([]);
      }
    }, 300);
    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };
  }, [searchQ]);

  const runAnalysis = useCallback(async () => {
    if (!coin || !indicators) return;
    if (!apiKey) {
      setAiErr(
        "Сначала добавьте Gemini API ключ в Настройках. Бесплатный ключ: https://aistudio.google.com/apikey"
      );
      return;
    }
    setAiLoading(true);
    setAiErr(null);
    setAiText("");
    try {
      const full = await analyzeCoin(
        apiKey,
        model,
        { coin, indicators, timeframeDays: days },
        (chunk) => setAiText((prev) => prev + chunk)
      );
      const history = loadJSON<HistoryEntry[]>(StorageKeys.history, []);
      const next = [
        {
          coinId: coin.id,
          coinName: coin.name,
          symbol: coin.symbol,
          timeframeDays: days,
          createdAt: Date.now(),
          preview: full.slice(0, 200),
        },
        ...history.filter((h) => !(h.coinId === coin.id && h.timeframeDays === days)),
      ].slice(0, 15);
      saveJSON(StorageKeys.history, next);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Ошибка Gemini";
      setAiErr(msg);
    } finally {
      setAiLoading(false);
    }
  }, [apiKey, coin, days, indicators, model]);

  const sendChat = useCallback(async () => {
    if (!chatInput.trim() || !coin || !indicators || !apiKey) return;
    const userMsg = chatInput.trim();
    setChatInput("");
    setChatHistory((h) => [...h, { role: "user", content: userMsg }]);
    setChatLoading(true);
    try {
      const reply = await chatAboutCoin(
        apiKey,
        model,
        chatHistory,
        userMsg,
        { coin, indicators, timeframeDays: days }
      );
      setChatHistory((h) => [...h, { role: "model", content: reply }]);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Ошибка";
      setChatHistory((h) => [
        ...h,
        { role: "model", content: `⚠️ ${msg}` },
      ]);
    } finally {
      setChatLoading(false);
    }
  }, [apiKey, chatHistory, chatInput, coin, days, indicators, model]);

  const priceUsd = coin?.market_data.current_price.usd ?? null;
  const change24 = coin?.market_data.price_change_percentage_24h ?? 0;
  const positive24 = change24 >= 0;

  const indicatorRows = useMemo(() => {
    if (!indicators) return [] as { label: string; value: string; hint?: string }[];
    const fmt = (v: number | null) =>
      v === null ? "—" : v.toLocaleString("en-US", { maximumFractionDigits: 4 });
    return [
      { label: "RSI(14)", value: fmt(indicators.rsi14), hint: "30/70 — пере-/перекуплен" },
      { label: "SMA20", value: fmt(indicators.sma20) },
      { label: "SMA50", value: fmt(indicators.sma50) },
      { label: "SMA200", value: fmt(indicators.sma200) },
      { label: "EMA12", value: fmt(indicators.ema12) },
      { label: "EMA26", value: fmt(indicators.ema26) },
      { label: "MACD", value: fmt(indicators.macd) },
      { label: "MACD Signal", value: fmt(indicators.macdSignal) },
      { label: "Волатильность", value: indicators.volatilityPct === null ? "—" : `${indicators.volatilityPct.toFixed(2)}%` },
      { label: "Тренд", value: indicators.trend },
    ];
  }, [indicators]);

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="h-section">AI Анализ</h1>
        <p className="text-sm text-ink-mute mt-1">
          Выбери монету, таймфрейм и запусти разбор от Gemini
        </p>
      </div>

      <div className="card p-4 sm:p-5 space-y-4">
        <div className="flex flex-col lg:flex-row gap-3">
          <div className="relative flex-1">
            <input
              type="search"
              value={searchQ}
              onFocus={() => setSearchOpen(true)}
              onBlur={() => setTimeout(() => setSearchOpen(false), 150)}
              onChange={(e) => {
                setSearchQ(e.target.value);
                setSearchOpen(true);
              }}
              placeholder="Найти монету (BTC, ethereum, sol...)"
              className="input"
            />
            {searchOpen && hits.length > 0 && (
              <div className="absolute z-20 mt-1 w-full card max-h-72 overflow-y-auto">
                {hits.map((h) => (
                  <button
                    key={h.id}
                    type="button"
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-bg-elev text-left"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      setCoinId(h.id);
                      setParams({ coin: h.id });
                      setSearchQ("");
                      setHits([]);
                      setSearchOpen(false);
                    }}
                  >
                    <img src={h.thumb} alt="" width={20} height={20} className="rounded-full" />
                    <span className="text-ink">{h.name}</span>
                    <span className="text-xs text-ink-mute uppercase">{h.symbol}</span>
                    {h.market_cap_rank && (
                      <span className="ml-auto text-xs text-ink-mute">
                        #{h.market_cap_rank}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="flex gap-1 overflow-x-auto">
            {TIMEFRAMES.map((tf) => (
              <button
                key={tf.days}
                type="button"
                onClick={() => setDays(tf.days)}
                className={`px-3 py-2 rounded-lg text-sm whitespace-nowrap border transition ${
                  days === tf.days
                    ? "bg-accent text-white border-accent"
                    : "bg-bg-elev text-ink-soft border-bg-line hover:border-accent/40"
                }`}
              >
                {tf.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {coinErr && (
        <div className="card p-4 text-sm text-bad border-bad/30 flex items-center justify-between gap-3">
          <span>{coinErr}</span>
          <button
            type="button"
            onClick={() => loadCoin(coinId, days)}
            className="shrink-0 px-3 py-1.5 rounded-md text-xs font-medium bg-bad/10 hover:bg-bad/20 text-bad transition"
          >
            Повторить
          </button>
        </div>
      )}

      {loading ? (
        <div className="card p-8 text-center text-ink-mute">Загрузка данных...</div>
      ) : coin ? (
        <>
          <div className="card p-5">
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <img src={coin.image.large} alt={coin.symbol} width={56} height={56} className="rounded-full" />
              <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-xl font-semibold text-ink">{coin.name}</h2>
                  <span className="chip uppercase">{coin.symbol}</span>
                </div>
                <div className="flex items-baseline gap-3 mt-1">
                  <span className="text-3xl font-bold text-ink">
                    ${formatPrice(priceUsd)}
                  </span>
                  <span
                    className={`text-base font-medium ${
                      positive24 ? "text-accent" : "text-bad"
                    }`}
                  >
                    {positive24 ? "+" : ""}
                    {change24.toFixed(2)}% (24ч)
                  </span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm sm:text-right">
                <div>
                  <div className="text-xs text-ink-mute">Капитализация</div>
                  <div className="text-ink font-medium">
                    ${formatLarge(coin.market_data.market_cap.usd)}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-ink-mute">Объём 24ч</div>
                  <div className="text-ink font-medium">
                    ${formatLarge(coin.market_data.total_volume.usd)}
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-5">
              <PriceChart data={chart} />
            </div>
          </div>

          <div className="grid lg:grid-cols-2 gap-4">
            <div className="card p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-semibold text-ink">Индикаторы</h3>
                <span className="chip">{days} дней</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                {indicatorRows.map((r) => (
                  <div
                    key={r.label}
                    className="flex justify-between border-b border-bg-line py-1.5"
                    title={r.hint}
                  >
                    <span className="text-ink-mute">{r.label}</span>
                    <span className="text-ink font-medium">{r.value}</span>
                  </div>
                ))}
              </div>
              {indicators && indicators.signals.length > 0 && (
                <div className="mt-4">
                  <div className="text-xs uppercase text-ink-mute mb-2">Сигналы</div>
                  <ul className="space-y-1 text-sm text-ink-soft">
                    {indicators.signals.map((s) => (
                      <li key={s} className="flex items-start gap-2">
                        <span className="text-accent mt-0.5">▸</span>
                        <span>{s}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <div className="card p-5">
              <h3 className="text-lg font-semibold text-ink mb-3">
                Метаданные проекта
              </h3>
              <dl className="text-sm space-y-2">
                <div className="flex justify-between gap-2">
                  <dt className="text-ink-mute">ATH</dt>
                  <dd className="text-ink">
                    ${formatPrice(coin.market_data.ath.usd)}{" "}
                    <span className="text-bad text-xs">
                      ({coin.market_data.ath_change_percentage.usd?.toFixed(1)}%)
                    </span>
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-ink-mute">ATL</dt>
                  <dd className="text-ink">
                    ${formatPrice(coin.market_data.atl.usd)}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-ink-mute">Циркулирует</dt>
                  <dd className="text-ink">
                    {formatLarge(coin.market_data.circulating_supply)}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-ink-mute">Макс. эмиссия</dt>
                  <dd className="text-ink">
                    {coin.market_data.max_supply
                      ? formatLarge(coin.market_data.max_supply)
                      : "не ограничено"}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-ink-mute">Сентимент</dt>
                  <dd className="text-ink">
                    <span className="text-accent">
                      {coin.sentiment_votes_up_percentage?.toFixed(0) ?? "—"}%
                    </span>
                    {" / "}
                    <span className="text-bad">
                      {coin.sentiment_votes_down_percentage?.toFixed(0) ?? "—"}%
                    </span>
                  </dd>
                </div>
                {coin.links.homepage[0] && (
                  <div className="flex justify-between">
                    <dt className="text-ink-mute">Сайт</dt>
                    <dd>
                      <a
                        href={coin.links.homepage[0]}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-accent hover:underline"
                      >
                        {new URL(coin.links.homepage[0]).host}
                      </a>
                    </dd>
                  </div>
                )}
              </dl>
            </div>
          </div>

          <div className="card p-5">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <div>
                <h3 className="text-lg font-semibold text-ink">
                  Разбор от Gemini
                </h3>
                <p className="text-xs text-ink-mute">
                  Модель: {model} · Таймфрейм: {days} дн.
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  className="btn-primary"
                  disabled={aiLoading}
                  onClick={runAnalysis}
                >
                  {aiLoading ? "Генерирую..." : aiText ? "Сгенерировать заново" : "Сгенерировать анализ"}
                </button>
                {!apiKey && (
                  <Link to="/settings" className="btn-ghost">
                    Добавить ключ
                  </Link>
                )}
              </div>
            </div>

            {aiErr && (
              <div className="rounded-lg bg-bad/10 border border-bad/30 p-3 text-sm text-bad">
                {aiErr}
              </div>
            )}

            {!aiText && !aiLoading && !aiErr && (
              <div className="text-sm text-ink-mute leading-relaxed">
                Нажми «Сгенерировать анализ» — ИИ возьмёт данные выше (цена, индикаторы,
                фундаментал) и подготовит подробный разбор с уровнями, сценариями и
                образовательными стратегиями.
              </div>
            )}

            {(aiText || aiLoading) && (
              <div className="mt-2">
                <Markdown>{aiText || (aiLoading ? "_Генерирую разбор..._" : "")}</Markdown>
                {aiLoading && (
                  <div className="text-xs text-ink-mute mt-2 animate-pulse">
                    ▍ Стриминг ответа...
                  </div>
                )}
              </div>
            )}
          </div>

          {aiText && (
            <div className="card p-5">
              <h3 className="text-lg font-semibold text-ink mb-3">
                Чат с аналитиком
              </h3>
              <p className="text-xs text-ink-mute mb-4">
                Задавай уточняющие вопросы по этой монете. ИИ помнит данные разбора.
              </p>
              <div className="space-y-3">
                {chatHistory.map((m, i) => (
                  <div
                    key={i}
                    className={`rounded-xl p-3 text-sm ${
                      m.role === "user"
                        ? "bg-accent/15 border border-accent/30 ml-8"
                        : "bg-bg-elev border border-bg-line mr-8"
                    }`}
                  >
                    <div className="text-xs text-ink-mute mb-1">
                      {m.role === "user" ? "Ты" : "Gemini"}
                    </div>
                    <Markdown>{m.content}</Markdown>
                  </div>
                ))}
                {chatLoading && (
                  <div className="text-xs text-ink-mute animate-pulse">
                    Gemini печатает...
                  </div>
                )}
              </div>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  sendChat();
                }}
                className="mt-4 flex gap-2"
              >
                <input
                  className="input flex-1"
                  placeholder="Например: какие риски в краткосроке?"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  disabled={chatLoading}
                />
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={chatLoading || !chatInput.trim()}
                >
                  Спросить
                </button>
              </form>
            </div>
          )}
        </>
      ) : null}
    </div>
  );
}
