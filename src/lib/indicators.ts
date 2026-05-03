import type { OHLC } from "./coingecko";

export function sma(values: number[], period: number): (number | null)[] {
  const out: (number | null)[] = new Array(values.length).fill(null);
  if (period <= 0) return out;
  let sum = 0;
  for (let i = 0; i < values.length; i++) {
    sum += values[i];
    if (i >= period) sum -= values[i - period];
    if (i >= period - 1) out[i] = sum / period;
  }
  return out;
}

export function ema(values: number[], period: number): (number | null)[] {
  const out: (number | null)[] = new Array(values.length).fill(null);
  if (values.length < period) return out;
  const k = 2 / (period + 1);
  // seed with sma
  let seed = 0;
  for (let i = 0; i < period; i++) seed += values[i];
  let prev = seed / period;
  out[period - 1] = prev;
  for (let i = period; i < values.length; i++) {
    prev = values[i] * k + prev * (1 - k);
    out[i] = prev;
  }
  return out;
}

export function rsi(values: number[], period = 14): (number | null)[] {
  const out: (number | null)[] = new Array(values.length).fill(null);
  if (values.length <= period) return out;
  let gains = 0;
  let losses = 0;
  for (let i = 1; i <= period; i++) {
    const change = values[i] - values[i - 1];
    if (change >= 0) gains += change;
    else losses -= change;
  }
  let avgGain = gains / period;
  let avgLoss = losses / period;
  out[period] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);
  for (let i = period + 1; i < values.length; i++) {
    const change = values[i] - values[i - 1];
    const gain = change > 0 ? change : 0;
    const loss = change < 0 ? -change : 0;
    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;
    out[i] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);
  }
  return out;
}

export function macd(
  values: number[],
  fast = 12,
  slow = 26,
  signal = 9
): { macd: (number | null)[]; signal: (number | null)[]; histogram: (number | null)[] } {
  const fastEma = ema(values, fast);
  const slowEma = ema(values, slow);
  const macdLine: (number | null)[] = values.map((_, i) => {
    const f = fastEma[i];
    const s = slowEma[i];
    if (f === null || s === null) return null;
    return f - s;
  });
  // signal is EMA of macdLine, but only over its non-null part
  const startIdx = macdLine.findIndex((v) => v !== null);
  const signalLine: (number | null)[] = new Array(values.length).fill(null);
  if (startIdx !== -1) {
    const slice = macdLine.slice(startIdx).map((v) => (v === null ? 0 : v));
    const sig = ema(slice, signal);
    for (let i = 0; i < sig.length; i++) {
      signalLine[startIdx + i] = sig[i];
    }
  }
  const hist: (number | null)[] = values.map((_, i) => {
    const m = macdLine[i];
    const s = signalLine[i];
    if (m === null || s === null) return null;
    return m - s;
  });
  return { macd: macdLine, signal: signalLine, histogram: hist };
}

export interface IndicatorSnapshot {
  closes: number[];
  current: number;
  rsi14: number | null;
  sma20: number | null;
  sma50: number | null;
  sma200: number | null;
  ema12: number | null;
  ema26: number | null;
  macd: number | null;
  macdSignal: number | null;
  macdHist: number | null;
  high: number;
  low: number;
  changePct: number | null;
  volatilityPct: number | null;
  trend: "uptrend" | "downtrend" | "sideways";
  signals: string[];
}

function lastNonNull(arr: (number | null)[]): number | null {
  for (let i = arr.length - 1; i >= 0; i--) {
    if (arr[i] !== null) return arr[i] as number;
  }
  return null;
}

export function computeIndicators(ohlc: OHLC[]): IndicatorSnapshot {
  const closes = ohlc.map((c) => c.close);
  const highs = ohlc.map((c) => c.high);
  const lows = ohlc.map((c) => c.low);
  const current = closes[closes.length - 1] ?? 0;
  const first = closes[0] ?? current;
  const high = Math.max(...highs);
  const low = Math.min(...lows);
  const rsiArr = rsi(closes, 14);
  const sma20Arr = sma(closes, 20);
  const sma50Arr = sma(closes, 50);
  const sma200Arr = sma(closes, 200);
  const ema12Arr = ema(closes, 12);
  const ema26Arr = ema(closes, 26);
  const m = macd(closes);

  const sma20 = lastNonNull(sma20Arr);
  const sma50 = lastNonNull(sma50Arr);
  const sma200 = lastNonNull(sma200Arr);
  const ema12v = lastNonNull(ema12Arr);
  const ema26v = lastNonNull(ema26Arr);
  const macdLast = lastNonNull(m.macd);
  const macdSignal = lastNonNull(m.signal);
  const macdHist = lastNonNull(m.histogram);
  const rsi14 = lastNonNull(rsiArr);

  const changePct = first ? ((current - first) / first) * 100 : null;

  // volatility: stddev of returns
  const returns: number[] = [];
  for (let i = 1; i < closes.length; i++) {
    if (closes[i - 1]) returns.push((closes[i] - closes[i - 1]) / closes[i - 1]);
  }
  const mean =
    returns.length > 0 ? returns.reduce((a, b) => a + b, 0) / returns.length : 0;
  const variance =
    returns.length > 0
      ? returns.reduce((a, b) => a + (b - mean) ** 2, 0) / returns.length
      : 0;
  const volatility = Math.sqrt(variance) * 100;

  let trend: IndicatorSnapshot["trend"] = "sideways";
  if (sma20 !== null && sma50 !== null) {
    if (current > sma20 && sma20 > sma50) trend = "uptrend";
    else if (current < sma20 && sma20 < sma50) trend = "downtrend";
  }

  const signals: string[] = [];
  if (rsi14 !== null) {
    if (rsi14 > 70) signals.push("RSI > 70 — перекупленность");
    else if (rsi14 < 30) signals.push("RSI < 30 — перепроданность");
  }
  if (sma20 !== null && sma50 !== null) {
    const prevSma20 = sma20Arr[sma20Arr.length - 2] ?? null;
    const prevSma50 = sma50Arr[sma50Arr.length - 2] ?? null;
    if (
      prevSma20 !== null &&
      prevSma50 !== null &&
      prevSma20 <= prevSma50 &&
      sma20 > sma50
    ) {
      signals.push("Golden Cross (SMA20 пересекла SMA50 снизу вверх)");
    }
    if (
      prevSma20 !== null &&
      prevSma50 !== null &&
      prevSma20 >= prevSma50 &&
      sma20 < sma50
    ) {
      signals.push("Death Cross (SMA20 пересекла SMA50 сверху вниз)");
    }
  }
  if (macdLast !== null && macdSignal !== null) {
    if (macdLast > macdSignal) signals.push("MACD выше сигнальной линии — бычий импульс");
    else signals.push("MACD ниже сигнальной линии — медвежий импульс");
  }
  if (current > high * 0.98) signals.push("Цена у локального максимума");
  if (current < low * 1.02) signals.push("Цена у локального минимума");

  return {
    closes,
    current,
    rsi14,
    sma20,
    sma50,
    sma200,
    ema12: ema12v,
    ema26: ema26v,
    macd: macdLast,
    macdSignal,
    macdHist,
    high,
    low,
    changePct,
    volatilityPct: Number.isFinite(volatility) ? volatility : null,
    trend,
    signals,
  };
}
