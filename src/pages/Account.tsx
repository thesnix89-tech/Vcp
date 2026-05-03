import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  loadJSON,
  loadString,
  saveJSON,
  saveString,
  StorageKeys,
} from "../lib/storage";
import { fetchTopMarkets, formatPrice, type CoinMarket } from "../lib/coingecko";

interface HistoryEntry {
  coinId: string;
  coinName: string;
  symbol: string;
  timeframeDays: number;
  createdAt: number;
  preview: string;
}

type Plan = "free" | "coin" | "ultimate";

interface Profile {
  nickname: string;
  plan: Plan;
  notifications: boolean;
  autoLessons: boolean;
}

const DEFAULT_PROFILE: Profile = {
  nickname: "Wolf",
  plan: "ultimate",
  notifications: true,
  autoLessons: true,
};

const PLAN_LABEL: Record<Plan, string> = {
  free: "Free",
  coin: "Coin",
  ultimate: "Ultimate",
};

function PlanBadge({ plan }: { plan: Plan }) {
  if (plan === "ultimate") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-accent text-white tracking-wide">
        <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
          <polygon points="12 2 15 9 22 10 17 15 18 22 12 19 6 22 7 15 2 10 9 9 12 2" />
        </svg>
        ULTIMATE
      </span>
    );
  }
  if (plan === "coin") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-accent-tint text-accent border border-accent/30 tracking-wide">
        COIN
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-bg-elev text-ink-mute border border-bg-line tracking-wide">
      FREE
    </span>
  );
}

function getInitials(nickname: string): string {
  const t = nickname.trim();
  if (!t) return "?";
  const parts = t.split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]).join("").toUpperCase();
}

function relTime(ts: number, now: number): string {
  const diff = now - ts;
  const min = Math.round(diff / 60_000);
  if (min < 1) return "только что";
  if (min < 60) return `${min} мин назад`;
  const hrs = Math.round(min / 60);
  if (hrs < 24) return `${hrs} ч назад`;
  const days = Math.round(hrs / 24);
  if (days < 30) return `${days} дн назад`;
  const months = Math.round(days / 30);
  return `${months} мес назад`;
}

function StatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string | number;
  hint?: string;
}) {
  return (
    <div className="card p-4">
      <div className="label">{label}</div>
      <div className="mt-1.5 font-serif text-2xl text-ink tracking-tight">
        {value}
      </div>
      {hint && <div className="mt-1 text-xs text-ink-faint">{hint}</div>}
    </div>
  );
}

export default function Account() {
  const [profile, setProfile] = useState<Profile>(DEFAULT_PROFILE);
  const [editingName, setEditingName] = useState(false);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [watchlist, setWatchlist] = useState<string[]>([]);
  const [topMarkets, setTopMarkets] = useState<CoinMarket[]>([]);
  const [joinedAt, setJoinedAt] = useState<number>(0);
  const [now, setNow] = useState<number>(0);
  const [hasApiKey, setHasApiKey] = useState(false);

  useEffect(() => {
    const stored = loadJSON<Profile>(StorageKeys.profile, DEFAULT_PROFILE);
    const sanitized: Profile = {
      nickname: stored.nickname || DEFAULT_PROFILE.nickname,
      plan: stored.plan || DEFAULT_PROFILE.plan,
      notifications:
        typeof stored.notifications === "boolean"
          ? stored.notifications
          : DEFAULT_PROFILE.notifications,
      autoLessons:
        typeof stored.autoLessons === "boolean"
          ? stored.autoLessons
          : DEFAULT_PROFILE.autoLessons,
    };
    setProfile(sanitized);
    setHistory(loadJSON<HistoryEntry[]>(StorageKeys.history, []));
    setWatchlist(loadJSON<string[]>(StorageKeys.watchlist, []));
    setHasApiKey(Boolean(loadString(StorageKeys.geminiApiKey)));

    const nowMs = Date.now();
    setNow(nowMs);
    const joined = loadString(StorageKeys.joinedAt);
    if (joined) {
      setJoinedAt(Number(joined));
    } else {
      saveString(StorageKeys.joinedAt, String(nowMs));
      setJoinedAt(nowMs);
    }

    fetchTopMarkets("usd", 30, 1)
      .then(setTopMarkets)
      .catch(() => {
        // ignore — offline or rate-limited
      });
  }, []);

  const updateProfile = (patch: Partial<Profile>) => {
    setProfile((prev) => {
      const next = { ...prev, ...patch };
      saveJSON(StorageKeys.profile, next);
      return next;
    });
  };

  const toggleWatch = (coinId: string) => {
    setWatchlist((prev) => {
      const next = prev.includes(coinId)
        ? prev.filter((id) => id !== coinId)
        : [...prev, coinId];
      saveJSON(StorageKeys.watchlist, next);
      return next;
    });
  };

  const stats = useMemo(() => {
    const total = history.length;
    const counts: Record<string, number> = {};
    for (const h of history) {
      counts[h.coinName] = (counts[h.coinName] || 0) + 1;
    }
    let favorite = "—";
    let max = 0;
    for (const [name, count] of Object.entries(counts)) {
      if (count > max) {
        max = count;
        favorite = name;
      }
    }
    const days =
      now && joinedAt
        ? Math.max(1, Math.round((now - joinedAt) / 86_400_000))
        : 1;
    return { total, favorite, days };
  }, [history, joinedAt, now]);

  const watchedCoins = useMemo(
    () => topMarkets.filter((c) => watchlist.includes(c.id)),
    [topMarkets, watchlist]
  );

  const suggestableCoins = useMemo(
    () => topMarkets.filter((c) => !watchlist.includes(c.id)).slice(0, 12),
    [topMarkets, watchlist]
  );

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      <div className="text-center">
        <span className="chip">
          <span className="w-1.5 h-1.5 rounded-full bg-accent" />
          Личный кабинет
        </span>
        <h1 className="h-section mt-3">Твой Volchay</h1>
        <p className="text-sm text-ink-mute mt-1">
          Профиль, статистика, watchlist и быстрые действия — всё в одном месте.
        </p>
      </div>

      {/* Profile card */}
      <div className="card p-5 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center gap-5">
          <div
            className="w-16 h-16 rounded-xl grid place-items-center text-white text-xl font-serif font-semibold flex-shrink-0"
            style={{
              background:
                "linear-gradient(135deg, rgb(var(--c-accent)) 0%, rgb(var(--c-accent-hover)) 100%)",
            }}
            aria-hidden="true"
          >
            {getInitials(profile.nickname)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              {editingName ? (
                <input
                  autoFocus
                  className="input max-w-[240px] py-1.5"
                  value={profile.nickname}
                  onChange={(e) => updateProfile({ nickname: e.target.value })}
                  onBlur={() => setEditingName(false)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") setEditingName(false);
                  }}
                />
              ) : (
                <button
                  type="button"
                  onClick={() => setEditingName(true)}
                  title="Изменить никнейм"
                  className="font-serif text-2xl text-ink tracking-tight hover:text-accent-hover transition"
                >
                  {profile.nickname}
                </button>
              )}
              <PlanBadge plan={profile.plan} />
            </div>
            <div className="mt-1 text-sm text-ink-mute">
              C нами {stats.days}{" "}
              {stats.days === 1 ? "день" : stats.days < 5 ? "дня" : "дней"} ·{" "}
              {hasApiKey ? "Gemini-ключ подключён" : "Без Gemini-ключа"}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link to="/analysis" className="btn-primary">
              Новый анализ
            </Link>
            <Link to="/settings" className="btn-ghost">
              Настройки
            </Link>
          </div>
        </div>
      </div>

      {/* Stats grid */}
      <div>
        <div className="text-center mb-4">
          <h2 className="h-section">Статистика</h2>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard
            label="Анализов сделано"
            value={stats.total}
            hint={stats.total === 0 ? "Запусти первый разбор" : "Из всей истории"}
          />
          <StatCard
            label="Любимая монета"
            value={stats.favorite}
            hint={
              stats.total === 0 ? "Появится после анализа" : "Чаще всего разбирал"
            }
          />
          <StatCard
            label="Watchlist"
            value={watchlist.length}
            hint={
              watchlist.length === 0 ? "Добавь ниже монеты" : "Активно отслеживаешь"
            }
          />
          <StatCard
            label="Текущий план"
            value={PLAN_LABEL[profile.plan]}
            hint={profile.plan === "ultimate" ? "Полный доступ" : "Можно прокачать"}
          />
        </div>
      </div>

      {/* Plan switcher (visual only, since payments are not implemented) */}
      <div className="card p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div>
            <div className="font-serif text-lg text-ink tracking-tight">
              План подписки
            </div>
            <p className="text-xs text-ink-mute mt-0.5">
              Пока визуально — оплата появится позже. Можно потыкать состояние.
            </p>
          </div>
          <Link to="/pricing" className="btn-link text-sm">
            Сравнить тарифы →
          </Link>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {(["free", "coin", "ultimate"] as Plan[]).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => updateProfile({ plan: p })}
              className={`px-3 py-2.5 rounded-lg text-sm font-medium transition border ${
                profile.plan === p
                  ? "bg-accent text-white border-accent"
                  : "bg-bg-elev text-ink border-bg-line hover:border-accent/40"
              }`}
            >
              {PLAN_LABEL[p]}
            </button>
          ))}
        </div>
      </div>

      {/* Watchlist */}
      <div>
        <div className="text-center mb-4">
          <h2 className="h-section">Watchlist</h2>
          <p className="text-sm text-ink-mute mt-1">
            Монеты, за которыми следишь. Тыкни на карточку для разбора.
          </p>
        </div>
        {watchedCoins.length === 0 ? (
          <div className="card p-6 text-center text-sm text-ink-mute">
            Пока пусто. Добавь монеты ниже — они появятся здесь.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {watchedCoins.map((c) => {
              const change = c.price_change_percentage_24h;
              const positive = change >= 0;
              return (
                <div key={c.id} className="card p-4 flex items-center gap-3">
                  <img
                    src={c.image}
                    alt={c.name}
                    className="w-9 h-9 rounded-lg flex-shrink-0"
                  />
                  <Link
                    to="/analysis"
                    state={{ coinId: c.id }}
                    className="flex-1 min-w-0"
                  >
                    <div className="font-medium text-ink truncate">{c.name}</div>
                    <div className="text-xs text-ink-mute uppercase tracking-wide">
                      {c.symbol}
                    </div>
                  </Link>
                  <div className="text-right flex-shrink-0">
                    <div className="font-medium text-ink">
                      {formatPrice(c.current_price)}
                    </div>
                    <div
                      className={`text-xs font-medium ${
                        positive ? "text-accent" : "text-bad"
                      }`}
                    >
                      {positive ? "+" : ""}
                      {change.toFixed(2)}%
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => toggleWatch(c.id)}
                    title="Убрать из watchlist"
                    className="grid place-items-center w-8 h-8 rounded-md text-ink-mute hover:text-bad hover:bg-bg-alt transition flex-shrink-0"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M19 6l-2 14a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2L5 6" />
                    </svg>
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {suggestableCoins.length > 0 && (
          <div className="mt-5">
            <div className="label mb-2 text-center">Добавить в watchlist</div>
            <div className="flex flex-wrap gap-2 justify-center">
              {suggestableCoins.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => toggleWatch(c.id)}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-bg-line bg-bg-elev hover:border-accent/40 hover:bg-bg-alt text-sm text-ink-soft transition"
                >
                  <img src={c.image} alt="" className="w-4 h-4 rounded-full" />
                  <span>{c.name}</span>
                  <span className="text-ink-faint text-xs uppercase">
                    {c.symbol}
                  </span>
                  <span className="text-accent ml-0.5">+</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Recent activity */}
      <div>
        <div className="text-center mb-4">
          <h2 className="h-section">Последние анализы</h2>
        </div>
        {history.length === 0 ? (
          <div className="card p-6 text-center text-sm text-ink-mute">
            История пуста. Запусти первый разбор —{" "}
            <Link to="/analysis" className="btn-link">
              Анализ
            </Link>
            .
          </div>
        ) : (
          <div className="card divide-y divide-bg-line">
            {history.slice(0, 8).map((h, idx) => (
              <Link
                key={`${h.coinId}-${h.createdAt}-${idx}`}
                to="/analysis"
                state={{ coinId: h.coinId }}
                className="flex items-start gap-4 p-4 hover:bg-bg-alt/50 transition"
              >
                <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-accent-tint text-accent grid place-items-center font-serif text-sm uppercase">
                  {h.symbol.slice(0, 3)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-ink">{h.coinName}</span>
                    <span className="text-xs text-ink-faint">
                      · {h.timeframeDays}д
                    </span>
                  </div>
                  <div className="text-sm text-ink-mute mt-0.5 line-clamp-2">
                    {h.preview}
                  </div>
                </div>
                <div className="text-xs text-ink-faint flex-shrink-0">
                  {now ? relTime(h.createdAt, now) : ""}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Preferences */}
      <div className="card p-5 sm:p-6 space-y-3">
        <div className="font-serif text-lg text-ink tracking-tight">
          Предпочтения
        </div>
        <div className="flex items-center justify-between gap-4">
          <div className="flex-1">
            <div className="text-sm font-medium text-ink">Уведомления</div>
            <div className="text-xs text-ink-mute mt-0.5">
              Получать оповещения о новых обучающих материалах и сильных сигналах.
            </div>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={profile.notifications}
            onClick={() =>
              updateProfile({ notifications: !profile.notifications })
            }
            className={`relative w-11 h-6 rounded-md transition flex-shrink-0 ${
              profile.notifications ? "bg-accent" : "bg-bg-line"
            }`}
          >
            <span
              className={`absolute top-0.5 w-5 h-5 rounded-[5px] bg-white shadow-sm transition-transform ${
                profile.notifications ? "translate-x-[1.375rem]" : "translate-x-0.5"
              }`}
            />
          </button>
        </div>
        <div className="border-t border-bg-line" />
        <div className="flex items-center justify-between gap-4">
          <div className="flex-1">
            <div className="text-sm font-medium text-ink">
              Авто-обучение каждые 5 часов
            </div>
            <div className="text-xs text-ink-mute mt-0.5">
              ИИ генерирует короткие разборы и факты автоматически на странице
              «Обучение».
            </div>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={profile.autoLessons}
            onClick={() =>
              updateProfile({ autoLessons: !profile.autoLessons })
            }
            className={`relative w-11 h-6 rounded-md transition flex-shrink-0 ${
              profile.autoLessons ? "bg-accent" : "bg-bg-line"
            }`}
          >
            <span
              className={`absolute top-0.5 w-5 h-5 rounded-[5px] bg-white shadow-sm transition-transform ${
                profile.autoLessons ? "translate-x-[1.375rem]" : "translate-x-0.5"
              }`}
            />
          </button>
        </div>
      </div>
    </div>
  );
}
