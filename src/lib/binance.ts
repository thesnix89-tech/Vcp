// Binance public API for klines (OHLC) — much higher free rate limit (~1200 req/min)
// vs CoinGecko free tier (~10-30 req/min). Used as primary chart source when the
// coin's symbol is listed against USDT on Binance; falls back to CoinGecko otherwise.

import type { OHLC } from "./coingecko";

const BASE = "https://api.binance.com/api/v3";

interface RawKline extends Array<unknown> {
  0: number; // open time
  1: string; // open
  2: string; // high
  3: string; // low
  4: string; // close
  5: string; // volume
  6: number; // close time
}

// Maps CoinGecko ids → Binance trading symbols (USDT pairs).
// Limited to the most popular ~70 coins; everything else falls back to CoinGecko.
const COINGECKO_TO_BINANCE: Record<string, string> = {
  bitcoin: "BTCUSDT",
  ethereum: "ETHUSDT",
  ripple: "XRPUSDT",
  binancecoin: "BNBUSDT",
  solana: "SOLUSDT",
  cardano: "ADAUSDT",
  dogecoin: "DOGEUSDT",
  tron: "TRXUSDT",
  "the-open-network": "TONUSDT",
  toncoin: "TONUSDT",
  "avalanche-2": "AVAXUSDT",
  "shiba-inu": "SHIBUSDT",
  polkadot: "DOTUSDT",
  chainlink: "LINKUSDT",
  "matic-network": "MATICUSDT",
  polygon: "MATICUSDT",
  "polygon-ecosystem-token": "POLUSDT",
  "wrapped-bitcoin": "WBTCUSDT",
  "bitcoin-cash": "BCHUSDT",
  litecoin: "LTCUSDT",
  near: "NEARUSDT",
  uniswap: "UNIUSDT",
  "internet-computer": "ICPUSDT",
  pepe: "PEPEUSDT",
  aptos: "APTUSDT",
  "ethereum-classic": "ETCUSDT",
  cosmos: "ATOMUSDT",
  filecoin: "FILUSDT",
  "hedera-hashgraph": "HBARUSDT",
  hedera: "HBARUSDT",
  "render-token": "RNDRUSDT",
  render: "RENDERUSDT",
  arbitrum: "ARBUSDT",
  optimism: "OPUSDT",
  stellar: "XLMUSDT",
  vechain: "VETUSDT",
  kaspa: "KASUSDT",
  monero: "XMRUSDT",
  fantom: "FTMUSDT",
  "the-graph": "GRTUSDT",
  algorand: "ALGOUSDT",
  "injective-protocol": "INJUSDT",
  injective: "INJUSDT",
  "sei-network": "SEIUSDT",
  sui: "SUIUSDT",
  dai: "DAIUSDT",
  "leo-token": "LEOUSDT",
  okb: "OKBUSDT",
  "fetch-ai": "FETUSDT",
  bittensor: "TAOUSDT",
  ondo: "ONDOUSDT",
  jupiter: "JUPUSDT",
  "pyth-network": "PYTHUSDT",
  blockstack: "STXUSDT",
  stacks: "STXUSDT",
  thorchain: "RUNEUSDT",
  tezos: "XTZUSDT",
  flare: "FLRUSDT",
  jasmy: "JASMYUSDT",
  worldcoin: "WLDUSDT",
  "axie-infinity": "AXSUSDT",
  sandbox: "SANDUSDT",
  "the-sandbox": "SANDUSDT",
  decentraland: "MANAUSDT",
  curve: "CRVUSDT",
  "curve-dao-token": "CRVUSDT",
  aave: "AAVEUSDT",
  "compound-governance-token": "COMPUSDT",
  maker: "MKRUSDT",
  pancakeswap: "CAKEUSDT",
  "pancakeswap-token": "CAKEUSDT",
  raydium: "RAYUSDT",
  bonk: "BONKUSDT",
  dogwifhat: "WIFUSDT",
  floki: "FLOKIUSDT",
  conflux: "CFXUSDT",
  "conflux-token": "CFXUSDT",
};

export function binanceSymbolFor(coingeckoId: string): string | null {
  return COINGECKO_TO_BINANCE[coingeckoId] ?? null;
}

// Maps requested days → Binance interval + limit.
// Binance returns at most 1000 candles per request.
function pickInterval(days: number): { interval: string; limit: number } {
  if (days <= 1) return { interval: "15m", limit: Math.ceil((days * 24 * 60) / 15) };
  if (days <= 7) return { interval: "1h", limit: days * 24 };
  if (days <= 30) return { interval: "4h", limit: Math.ceil((days * 24) / 4) };
  if (days <= 90) return { interval: "12h", limit: days * 2 };
  if (days <= 365) return { interval: "1d", limit: days };
  return { interval: "3d", limit: Math.ceil(days / 3) };
}

export async function fetchBinanceOHLC(
  symbol: string,
  days: number
): Promise<OHLC[]> {
  const { interval, limit } = pickInterval(days);
  const params = new URLSearchParams({
    symbol,
    interval,
    limit: String(Math.min(limit, 1000)),
  });
  const res = await fetch(`${BASE}/klines?${params.toString()}`, {
    headers: { Accept: "application/json" },
  });
  if (!res.ok) {
    throw new Error(`Binance ${res.status}: ${res.statusText}`);
  }
  const data = (await res.json()) as RawKline[];
  return data.map((k) => ({
    timestamp: k[0],
    open: parseFloat(k[1]),
    high: parseFloat(k[2]),
    low: parseFloat(k[3]),
    close: parseFloat(k[4]),
  }));
}

export async function fetchBinanceChart(
  symbol: string,
  days: number
): Promise<{ prices: [number, number][] }> {
  const ohlc = await fetchBinanceOHLC(symbol, days);
  return { prices: ohlc.map((c) => [c.timestamp, c.close] as [number, number]) };
}
