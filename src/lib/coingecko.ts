const BASE = "https://api.coingecko.com/api/v3";

export interface CoinMarket {
  id: string;
  symbol: string;
  name: string;
  image: string;
  current_price: number;
  market_cap: number;
  market_cap_rank: number;
  total_volume: number;
  high_24h: number;
  low_24h: number;
  price_change_24h: number;
  price_change_percentage_24h: number;
  price_change_percentage_7d_in_currency?: number;
  price_change_percentage_30d_in_currency?: number;
  circulating_supply: number;
  total_supply: number | null;
  ath: number;
  ath_change_percentage: number;
  atl: number;
  atl_change_percentage: number;
  sparkline_in_7d?: { price: number[] };
}

export interface CoinDetail {
  id: string;
  symbol: string;
  name: string;
  description: { en: string; ru?: string };
  links: {
    homepage: string[];
    blockchain_site: string[];
    twitter_screen_name: string;
    subreddit_url: string;
    repos_url: { github: string[] };
  };
  image: { large: string };
  market_data: {
    current_price: Record<string, number>;
    market_cap: Record<string, number>;
    total_volume: Record<string, number>;
    high_24h: Record<string, number>;
    low_24h: Record<string, number>;
    price_change_percentage_24h: number;
    price_change_percentage_7d: number;
    price_change_percentage_14d: number;
    price_change_percentage_30d: number;
    price_change_percentage_60d: number;
    price_change_percentage_200d: number;
    price_change_percentage_1y: number;
    ath: Record<string, number>;
    ath_change_percentage: Record<string, number>;
    atl: Record<string, number>;
    circulating_supply: number;
    total_supply: number | null;
    max_supply: number | null;
  };
  sentiment_votes_up_percentage: number;
  sentiment_votes_down_percentage: number;
  community_score?: number;
  developer_score?: number;
}

export interface OHLC {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
}

async function request<T>(path: string, retries = 2): Promise<T> {
  let lastErr: unknown = null;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(`${BASE}${path}`, {
        headers: { Accept: "application/json" },
      });
      if (res.status === 429 && attempt < retries) {
        const wait = 600 * (attempt + 1) + Math.random() * 300;
        await new Promise((r) => setTimeout(r, wait));
        continue;
      }
      if (!res.ok) {
        throw new Error(`CoinGecko ${res.status}: ${res.statusText}`);
      }
      return (await res.json()) as T;
    } catch (e) {
      lastErr = e;
      if (attempt < retries) {
        const wait = 400 * (attempt + 1);
        await new Promise((r) => setTimeout(r, wait));
        continue;
      }
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error("CoinGecko request failed");
}

export async function fetchTopMarkets(
  vsCurrency = "usd",
  perPage = 50,
  page = 1
): Promise<CoinMarket[]> {
  const params = new URLSearchParams({
    vs_currency: vsCurrency,
    order: "market_cap_desc",
    per_page: String(perPage),
    page: String(page),
    sparkline: "true",
    price_change_percentage: "24h,7d,30d",
  });
  return request<CoinMarket[]>(`/coins/markets?${params.toString()}`);
}

export async function searchCoins(
  query: string
): Promise<{ coins: { id: string; name: string; symbol: string; thumb: string; market_cap_rank: number | null }[] }> {
  const params = new URLSearchParams({ query });
  return request(`/search?${params.toString()}`);
}

export async function fetchCoinDetail(id: string): Promise<CoinDetail> {
  const params = new URLSearchParams({
    localization: "false",
    tickers: "false",
    community_data: "true",
    developer_data: "true",
    sparkline: "false",
  });
  return request<CoinDetail>(`/coins/${encodeURIComponent(id)}?${params.toString()}`);
}

export async function fetchMarketChart(
  id: string,
  days = 30,
  vsCurrency = "usd"
): Promise<{ prices: [number, number][]; total_volumes: [number, number][] }> {
  const params = new URLSearchParams({
    vs_currency: vsCurrency,
    days: String(days),
  });
  return request(`/coins/${encodeURIComponent(id)}/market_chart?${params.toString()}`);
}

export async function fetchOHLC(
  id: string,
  days = 14,
  vsCurrency = "usd"
): Promise<OHLC[]> {
  const params = new URLSearchParams({
    vs_currency: vsCurrency,
    days: String(days),
  });
  const raw = await request<number[][]>(`/coins/${encodeURIComponent(id)}/ohlc?${params.toString()}`);
  return raw.map(([t, o, h, l, c]) => ({ timestamp: t, open: o, high: h, low: l, close: c }));
}

export function formatPrice(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  if (value >= 1000) {
    return value.toLocaleString("en-US", { maximumFractionDigits: 2 });
  }
  if (value >= 1) {
    return value.toLocaleString("en-US", { maximumFractionDigits: 4 });
  }
  if (value >= 0.01) {
    return value.toLocaleString("en-US", { maximumFractionDigits: 6 });
  }
  return value.toExponential(2);
}

export function formatLarge(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return "—";
  const abs = Math.abs(value);
  if (abs >= 1e12) return `${(value / 1e12).toFixed(2)}T`;
  if (abs >= 1e9) return `${(value / 1e9).toFixed(2)}B`;
  if (abs >= 1e6) return `${(value / 1e6).toFixed(2)}M`;
  if (abs >= 1e3) return `${(value / 1e3).toFixed(2)}K`;
  return value.toLocaleString("en-US", { maximumFractionDigits: 2 });
}
