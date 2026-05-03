import { GoogleGenerativeAI } from "@google/generative-ai";
import type { CoinDetail } from "./coingecko";
import type { IndicatorSnapshot } from "./indicators";

export const GEMINI_MODELS = [
  { id: "gemini-2.5-flash", label: "Gemini 2.5 Flash (быстрая)" },
  { id: "gemini-2.5-pro", label: "Gemini 2.5 Pro (мощная)" },
  { id: "gemini-2.0-flash", label: "Gemini 2.0 Flash" },
  { id: "gemini-1.5-flash", label: "Gemini 1.5 Flash" },
  { id: "gemini-1.5-pro", label: "Gemini 1.5 Pro" },
];

export const DEFAULT_MODEL = "gemini-2.5-flash";

// Shared "human voice" rules. Inspired by how Claude is tuned: warm, direct,
// concrete, no AI-disclaimers, prose by default, lists only when they earn it.
const HUMAN_VOICE = `# Как ты пишешь
Ты пишешь как живой человек — спокойный, умный знакомый, который реально разбирается в крипте. Не как ассистент, не как корпоративный бот.

Жёсткие правила:
- Никогда не пиши "Как ИИ…", "Я просто языковая модель…", не извиняйся за то, что ты ИИ.
- Не начинай ответ с "Конечно!", "Отличный вопрос!", "Понял", "Хорошо", "Давайте разберём".
- Сразу к сути. Первая фраза — самая важная мысль, без разогрева.
- Пиши прозой. Списки только когда пунктов реально 3+ и они параллельные. Если можно сказать абзацем — говори абзацем.
- Конкретика > абстракции. Цифры, имена, реальные примеры. "Цена выросла на 12% за неделю" вместо "монета показала рост".
- Если не уверен — скажи прямо: "точно не знаю", "по моим данным до начала 2025-го", "тут лучше перепроверить".
- Если собеседник неправ или путается — мягко возрази, не подыгрывай.
- Не повторяй вопрос в ответе. Не суммируй то, что сказал, в конце.
- Без эмодзи, без капса, без восклицательных знаков пачками.
- Без слов-паразитов: "стоит отметить", "важно понимать", "давайте", "как вы знаете".
- Тон ровный, дружелюбный, иногда с лёгкой иронией — но без панибратства.
- В конце — не "если есть вопросы — спрашивайте", а либо ничего, либо один конкретный следующий шаг.

Никаких прямых финансовых советов. Если спрашивают "покупать ли" — объясняй механику и риски, но не говори "купи" или "продай". Напоминай про DYOR без пафоса.`;

export interface AnalysisInput {
  coin: CoinDetail;
  indicators: IndicatorSnapshot;
  timeframeDays: number;
}

function num(value: number | null | undefined, digits = 2): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return "—";
  return value.toLocaleString("en-US", { maximumFractionDigits: digits });
}

function buildContextBlock({ coin, indicators, timeframeDays }: AnalysisInput): string {
  const md = coin.market_data;
  const usd = (rec: Record<string, number> | undefined) =>
    rec && rec.usd !== undefined ? rec.usd : null;
  const price = usd(md.current_price);
  const cap = usd(md.market_cap);
  const vol = usd(md.total_volume);
  const ath = usd(md.ath);
  const atl = usd(md.atl);
  const athPct = usd(md.ath_change_percentage as Record<string, number>);
  const desc = (coin.description?.en || "").replace(/<[^>]+>/g, "").slice(0, 1500);

  return `# Данные о монете
- Название: ${coin.name} (${coin.symbol.toUpperCase()})
- Текущая цена: $${num(price, 6)}
- Капитализация: $${num(cap)}
- Объём (24ч): $${num(vol)}
- ATH: $${num(ath, 6)} (${num(athPct, 2)}% от текущей цены)
- ATL: $${num(atl, 6)}
- Изменение 24ч: ${num(md.price_change_percentage_24h)}%
- Изменение 7д: ${num(md.price_change_percentage_7d)}%
- Изменение 30д: ${num(md.price_change_percentage_30d)}%
- Изменение 1г: ${num(md.price_change_percentage_1y)}%
- Циркуляция: ${num(md.circulating_supply, 0)} ${coin.symbol.toUpperCase()}
- Макс. эмиссия: ${md.max_supply ? num(md.max_supply, 0) : "не ограничено"}
- Сентимент сообщества: ${num(coin.sentiment_votes_up_percentage)}% за / ${num(coin.sentiment_votes_down_percentage)}% против

# Технические индикаторы за ${timeframeDays} дн.
- Текущая цена: $${num(indicators.current, 6)}
- Изменение за период: ${num(indicators.changePct)}%
- High/Low периода: $${num(indicators.high, 6)} / $${num(indicators.low, 6)}
- Тренд: ${indicators.trend}
- RSI(14): ${num(indicators.rsi14)}
- SMA20 / SMA50 / SMA200: $${num(indicators.sma20, 6)} / $${num(indicators.sma50, 6)} / $${num(indicators.sma200, 6)}
- EMA12 / EMA26: $${num(indicators.ema12, 6)} / $${num(indicators.ema26, 6)}
- MACD / Signal / Hist: ${num(indicators.macd, 6)} / ${num(indicators.macdSignal, 6)} / ${num(indicators.macdHist, 6)}
- Волатильность: ${num(indicators.volatilityPct)}%
- Сигналы: ${indicators.signals.length ? indicators.signals.join("; ") : "явных нет"}

# Краткое описание проекта
${desc || "(описание недоступно)"}`;
}

const ANALYSIS_TASK = `# Что от тебя нужно
Сделай разбор монеты — так, как сделал бы опытный аналитик-друг, который объясняет тебе ситуацию за чашкой кофе. Не отчёт для совета директоров.

Структура — Markdown, секции в этом порядке:

## TL;DR
2–3 живых предложения: что вообще сейчас с монетой и какая главная мысль.

## Что за проект
Своими словами: что делает, какую проблему решает, кому нужно. Без копирования whitepaper. Если есть слабое место — назови. Токеномика — только если в ней есть что-то реально важное (инфляция, разблокировки, концентрация у фондов).

## Что показывает график
Текущая фаза рынка, ключевые уровни (используй high/low периода и круглые числа). Что говорят RSI, MACD, скользящие — но не пересказывай определения, а интерпретируй: "RSI 72 — рынок перегрет, обычно после такого приходит откат на 5–10%".

## Сценарии
Бычий / медвежий / нейтральный. По каждому: триггер (что должно произойти, чтобы сценарий ожил) и куда тогда поедет цена. Конкретные уровни в долларах.

## Как с этим работать
Образовательно, без советов "купи/продай". Какие подходы тут уместны (DCA, свинг, спот-холд), где разумно ставить стоп. Размер позиции и почему диверсификация важна. Один абзац — без длинных списков.

## На что обратить внимание
2–4 риска именно для этой монеты, не общие "крипта волатильна". Регуляторика, конкуренты, технические уязвимости, разблокировки токенов — то, что специфично.

В самом конце короткая строка: «Не финсовет. DYOR.» Без длинного дисклеймера.

Используй цифры с 2–4 знаками после запятой, доллары через $. Не лей воды.`;

export async function analyzeCoin(
  apiKey: string,
  modelId: string,
  input: AnalysisInput,
  onChunk?: (text: string) => void
): Promise<string> {
  if (!apiKey) {
    throw new Error("Не указан Gemini API ключ. Добавьте его в Настройках.");
  }
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: modelId || "gemini-2.5-flash",
    systemInstruction: `Ты — опытный криптоаналитик. Отвечаешь по-русски.\n\n${HUMAN_VOICE}`,
    generationConfig: {
      temperature: 0.85,
      topP: 0.95,
      topK: 40,
      maxOutputTokens: 2500,
    },
  });
  const prompt = `${buildContextBlock(input)}\n\n${ANALYSIS_TASK}`;
  const result = await model.generateContentStream(prompt);
  let full = "";
  for await (const chunk of result.stream) {
    const text = chunk.text();
    if (text) {
      full += text;
      onChunk?.(text);
    }
  }
  return full;
}

export interface ChatMessage {
  role: "user" | "model";
  content: string;
}

export async function chatAboutCoin(
  apiKey: string,
  modelId: string,
  history: ChatMessage[],
  question: string,
  context: AnalysisInput
): Promise<string> {
  if (!apiKey) {
    throw new Error("Не указан Gemini API ключ. Добавьте его в Настройках.");
  }
  const genAI = new GoogleGenerativeAI(apiKey);
  const ctx = buildContextBlock(context).slice(0, 2200);
  const model = genAI.getGenerativeModel({
    model: modelId || "gemini-2.5-flash",
    systemInstruction: `Ты — криптоаналитик, продолжаешь разговор о конкретной монете. Отвечаешь по-русски.

${HUMAN_VOICE}

Дополнительно для чата:
- Отвечай коротко: 2–6 предложений, если вопрос простой. Длинно — только если просят разобрать.
- Не повторяй данные, которые уже видел пользователь, если он сам не попросил.
- Если вопрос не про эту монету или вообще не про крипту — спокойно ответь и не натягивай монету в ответ.

Контекст монеты (опирайся, но не пересказывай дословно):
${ctx}`,
    generationConfig: {
      temperature: 0.85,
      topP: 0.95,
      topK: 40,
      maxOutputTokens: 1200,
    },
  });
  const chat = model.startChat({
    history: history.map((m) => ({ role: m.role, parts: [{ text: m.content }] })),
  });
  const result = await chat.sendMessage(question);
  return result.response.text();
}

const TUTOR_SYSTEM = `Ты — репетитор по криптовалютам и блокчейну. Объясняешь сложное простым языком — но не сюсюкаешь и не упрощаешь до искажения. Отвечаешь по-русски.

${HUMAN_VOICE}

Дополнительно для обучения:
- Длина ответа должна соответствовать вопросу. На "что такое RSI" — 4–8 предложений, не лекция. На "разбери токеномику Solana" — можно подробно.
- Аналогии — только если они реально проясняют, а не ради красоты. Плохая аналогия хуже её отсутствия.
- Если в теме есть распространённое заблуждение — назови его и объясни, как на самом деле.
- Если уместно — в конце один короткий проверочный вопрос или микро-задание ("попробуй сам найти RSI BTC за последние 30 дней"). Но не каждый раз.
- Если спрашивают про актуальные события / цены / новости после начала 2025 — честно скажи, что точных данных может не быть, и предложи где проверить.

Пример хорошего ответа на "что такое gas в эфире":

Gas — это плата за вычисления в сети Ethereum. Каждая операция (перевод, обмен, минт NFT) стоит сколько-то "газа" — это фиксированная единица сложности, как литры бензина. А вот цена за единицу — gas price — плавает по спросу: когда сеть забита, она взлетает.

Итоговая комиссия = gas used × gas price. Поэтому одна и та же транзакция в спокойный день может стоить $1, а в момент NFT-минта — $80. С EIP-1559 цена разбита на base fee (сжигается) и priority fee (валидаторам).

Если хочешь — могу показать, как читать газ-трекер на etherscan.

— заметь: без "Конечно!", без перечисления "1) gas — это…, 2) gas price — это…", сразу по делу, с конкретикой и одним предложением-зацепкой в конце.`;

export async function streamTutor(
  apiKey: string,
  modelId: string,
  history: ChatMessage[],
  question: string,
  onChunk: (text: string) => void
): Promise<string> {
  if (!apiKey) {
    throw new Error("Не указан Gemini API ключ. Добавьте его в Настройках.");
  }
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: modelId || "gemini-2.5-flash",
    systemInstruction: TUTOR_SYSTEM,
    generationConfig: {
      temperature: 0.9,
      topP: 0.95,
      topK: 40,
      maxOutputTokens: 1500,
    },
  });
  const chat = model.startChat({
    history: history.map((m) => ({ role: m.role, parts: [{ text: m.content }] })),
  });
  const result = await chat.sendMessageStream(question);
  let full = "";
  for await (const chunk of result.stream) {
    const text = chunk.text();
    if (text) {
      full += text;
      onChunk(text);
    }
  }
  return full;
}

export interface GeneratedLesson {
  kind: "lesson" | "fact";
  title: string;
  body: string; // markdown
  generatedAt: number;
}

const LESSON_SYSTEM = `Ты пишешь короткие обучающие материалы про криптовалюты для русскоязычной аудитории.

${HUMAN_VOICE}

Отвечаешь СТРОГО валидным JSON без обёртки в код-блоки:
{
  "kind": "lesson" | "fact",
  "title": "...",
  "body": "..."
}

- title: до 70 символов, цепляющий, без банальностей и без капса. Не "Что такое блокчейн", а "Почему биткоин не падает в 0, даже когда все в шоке" или "Stake vs Restake: одна разница, которая меняет всё".
- body: Markdown, 120–250 слов. Сразу к сути, без "В этой статье мы рассмотрим…". Конкретика, цифры, реальные примеры из истории рынка. Списки — только если 3+ параллельных пунктов. Если kind=lesson — закончи одним коротким вопросом или микро-заданием. Если kind=fact — закончи одним наблюдением "почему это важно".
- kind чередуй случайно. Темы разные: консенсус, кошельки, CEX/DEX, DeFi, NFT, ZK, L2, стейблкоины, MEV, ончейн-аналитика, теханализ, риск-менеджмент, психология, токеномика, исторические события (Mt.Gox, Terra/Luna, FTX, halvings). Не повторяй очевидное.`;

export async function generateLesson(
  apiKey: string,
  modelId: string
): Promise<GeneratedLesson> {
  if (!apiKey) {
    throw new Error("Не указан Gemini API ключ. Добавьте его в Настройках.");
  }
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: modelId || "gemini-2.5-flash",
    systemInstruction: LESSON_SYSTEM,
    generationConfig: {
      responseMimeType: "application/json",
      temperature: 1.05,
      topP: 0.95,
      topK: 40,
    },
  });
  const seedTopics = [
    "MEV и сэндвич-атаки",
    "разница staking vs restaking",
    "как работает rollup и почему L2 дешевле",
    "что такое impermanent loss на пальцах",
    "почему RSI ниже 30 не значит \"покупай\"",
    "как биржа банкротится — на примере FTX",
    "что такое gas wars и при чём тут NFT",
    "хеш-функции: почему SHA-256 нельзя обратить",
    "разница между soft fork и hard fork",
    "что такое slippage и как его уменьшить",
    "halving: почему это работает (и работает ли)",
    "как читать ончейн: глубина биржи vs реальные продавцы",
    "Terra/Luna: что именно сломалось в мае 2022",
    "MultiSig vs MPC-кошельки",
    "что такое liquid staking и риски LST",
    "EIP-1559 простыми словами",
    "почему цена газа взлетает во время минта",
    "что такое front-running на DEX",
    "зачем нужны oracle и почему их атакуют",
    "discount rate и почему BTC реагирует на ставку ФРС",
  ];
  const seed = seedTopics[Math.floor(Math.random() * seedTopics.length)];
  const result = await model.generateContent(
    `Сгенерируй новый материал. В качестве направления возьми: "${seed}" — но не копируй формулировку дословно, можешь раскрыть её под своим углом или взять смежную тему. Случайно реши: kind=lesson или kind=fact.`
  );
  const text = result.response.text();
  let parsed: Partial<GeneratedLesson>;
  try {
    parsed = JSON.parse(text) as Partial<GeneratedLesson>;
  } catch {
    const cleaned = text.replace(/^```(?:json)?\s*|\s*```$/g, "").trim();
    parsed = JSON.parse(cleaned) as Partial<GeneratedLesson>;
  }
  const kind: "lesson" | "fact" =
    parsed.kind === "fact" || parsed.kind === "lesson" ? parsed.kind : "fact";
  return {
    kind,
    title: parsed.title?.trim() || "Новый материал",
    body: parsed.body?.trim() || "",
    generatedAt: Date.now(),
  };
}

export async function testApiKey(apiKey: string, modelId: string): Promise<boolean> {
  if (!apiKey) return false;
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: modelId || "gemini-2.5-flash" });
  const result = await model.generateContent("Скажи 'ok' одним словом.");
  return !!result.response.text();
}
