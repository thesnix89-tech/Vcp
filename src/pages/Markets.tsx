import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { fetchTopMarkets, formatLarge, formatPrice } from "../lib/coingecko";
import type { CoinMarket } from "../lib/coingecko";
import Sparkline from "../components/Sparkline";

export default function Markets() {
  const [coins, setCoins] = useState<CoinMarket[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState<
    "rank" | "price" | "24h" | "7d" | "volume" | "cap"
  >("rank");

  useEffect(() => {
    let alive = true;
    setLoading(true);
    fetchTopMarkets("usd", 100, 1)
      .then((d) => {
        if (alive) setCoins(d);
      })
      .catch((e: unknown) => {
        if (alive) setErr(e instanceof Error ? e.message : "Ошибка загрузки");
      })
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = coins;
    if (q) {
      list = list.filter(
        (c) =>
          c.name.toLowerCase().includes(q) || c.symbol.toLowerCase().includes(q)
      );
    }
    const sorted = [...list];
    sorted.sort((a, b) => {
      switch (sortKey) {
        case "price":
          return b.current_price - a.current_price;
        case "24h":
          return (
            (b.price_change_percentage_24h ?? 0) -
            (a.price_change_percentage_24h ?? 0)
          );
        case "7d":
          return (
            (b.price_change_percentage_7d_in_currency ?? 0) -
            (a.price_change_percentage_7d_in_currency ?? 0)
          );
        case "volume":
          return b.total_volume - a.total_volume;
        case "cap":
          return b.market_cap - a.market_cap;
        case "rank":
        default:
          return (a.market_cap_rank ?? 9999) - (b.market_cap_rank ?? 9999);
      }
    });
    return sorted;
  }, [coins, query, sortKey]);

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="h-section">Рынок</h1>
        <p className="text-sm text-ink-mute mt-1">
          Топ-100 по капитализации · CoinGecko
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Поиск по имени или тикеру (BTC, eth, solana...)"
          className="input flex-1"
        />
        <select
          value={sortKey}
          onChange={(e) => setSortKey(e.target.value as typeof sortKey)}
          className="input sm:max-w-[220px]"
        >
          <option value="rank">Сортировка: по рангу</option>
          <option value="cap">По капитализации</option>
          <option value="price">По цене</option>
          <option value="24h">По росту 24ч</option>
          <option value="7d">По росту 7д</option>
          <option value="volume">По объёму</option>
        </select>
      </div>

      {err && (
        <div className="card p-4 text-sm text-bad border-bad/30">
          {err}
        </div>
      )}

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-ink-mute border-b border-bg-line">
                <th className="px-4 py-3 font-medium">#</th>
                <th className="px-4 py-3 font-medium">Монета</th>
                <th className="px-4 py-3 font-medium text-right">Цена</th>
                <th className="px-4 py-3 font-medium text-right">24ч</th>
                <th className="px-4 py-3 font-medium text-right hidden md:table-cell">
                  7д
                </th>
                <th className="px-4 py-3 font-medium text-right hidden lg:table-cell">
                  Капитализация
                </th>
                <th className="px-4 py-3 font-medium text-right hidden lg:table-cell">
                  Объём 24ч
                </th>
                <th className="px-4 py-3 font-medium hidden xl:table-cell">7д</th>
                <th className="px-4 py-3 font-medium text-right">Анализ</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 10 }).map((_, i) => (
                  <tr key={i} className="border-b border-bg-line">
                    <td colSpan={9} className="px-4 py-4">
                      <div className="h-6 bg-bg-elev rounded animate-pulse" />
                    </td>
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-ink-mute">
                    Ничего не найдено
                  </td>
                </tr>
              ) : (
                filtered.map((c) => {
                  const ch24 = c.price_change_percentage_24h ?? 0;
                  const ch7 = c.price_change_percentage_7d_in_currency ?? 0;
                  return (
                    <tr
                      key={c.id}
                      className="border-b border-bg-line last:border-0 hover:bg-bg-subtle/70 transition"
                    >
                      <td className="px-4 py-3 text-ink-mute">
                        {c.market_cap_rank ?? "—"}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <img
                            src={c.image}
                            alt={c.symbol}
                            width={22}
                            height={22}
                            className="rounded-full"
                            loading="lazy"
                          />
                          <div>
                            <div className="text-ink font-medium">{c.name}</div>
                            <div className="text-xs text-ink-mute uppercase">
                              {c.symbol}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right text-ink">
                        ${formatPrice(c.current_price)}
                      </td>
                      <td
                        className={`px-4 py-3 text-right font-medium ${
                          ch24 >= 0 ? "text-accent" : "text-bad"
                        }`}
                      >
                        {ch24 >= 0 ? "+" : ""}
                        {ch24.toFixed(2)}%
                      </td>
                      <td
                        className={`px-4 py-3 text-right font-medium hidden md:table-cell ${
                          ch7 >= 0 ? "text-accent" : "text-bad"
                        }`}
                      >
                        {ch7 >= 0 ? "+" : ""}
                        {ch7.toFixed(2)}%
                      </td>
                      <td className="px-4 py-3 text-right text-ink-soft hidden lg:table-cell">
                        ${formatLarge(c.market_cap)}
                      </td>
                      <td className="px-4 py-3 text-right text-ink-soft hidden lg:table-cell">
                        ${formatLarge(c.total_volume)}
                      </td>
                      <td className="px-4 py-3 hidden xl:table-cell">
                        <Sparkline
                          data={c.sparkline_in_7d?.price ?? []}
                          width={90}
                          height={28}
                        />
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link
                          to={`/analysis?coin=${c.id}`}
                          className="text-accent hover:text-accent-hover text-xs font-medium"
                        >
                          Разбор →
                        </Link>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
