import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

interface Tier {
  id: string;
  name: string;
  tagline: string;
  price: string;
  period: string;
  cta: string;
  ctaTo?: string;
  highlighted?: boolean;
  features: string[];
  note?: string;
}

const TIERS: Tier[] = [
  {
    id: "free",
    name: "Free",
    tagline: "Чтобы попробовать без обязательств",
    price: "$0",
    period: "навсегда",
    cta: "Начать бесплатно",
    ctaTo: "/analysis",
    features: [
      "До 5 ИИ-разборов монет в день",
      "Все технические индикаторы (RSI, MACD, SMA, EMA)",
      "Базовый чат с ИИ по результатам анализа",
      "Доступ к разделам «Обучение» и «Туториалы»",
      "Свой Gemini API-ключ — данные не уходят на сервер",
    ],
  },
  {
    id: "coin",
    name: "Coin",
    tagline: "Для тех, кто разбирает рынок регулярно",
    price: "$9",
    period: "в месяц",
    cta: "Оформить Coin",
    highlighted: true,
    features: [
      "Безлимитные ИИ-разборы монет",
      "Расширенный чат-урок с памятью между сессиями",
      "Сохранение истории анализов в облаке",
      "Авто-обучение: новый материал каждые 2 часа вместо 5",
      "Сравнение монет 1×1 (бета)",
      "Без ограничений на длину ответа",
    ],
    note: "Популярный",
  },
  {
    id: "ultimate",
    name: "Ultimate",
    tagline: "Всегда быть в курсе актуальных новостей и получать ответ быстрее всех",
    price: "$24",
    period: "в месяц",
    cta: "Оформить Ultimate",
    features: [
      "Всё, что есть в Coin",
      "Лента крипто-новостей с ИИ-резюме каждые 15 минут",
      "Приоритетная очередь — ответы Gemini в 2–3 раза быстрее",
      "Алерты по цене и сигналам индикаторов в Telegram/Email",
      "Эксклюзивные обзоры рынка от ИИ раз в неделю",
      "Доступ к мощным моделям (Gemini 2.5 Pro) без лимитов",
      "Личная поддержка в чате — ответ в течение часа",
    ],
  },
];

function CheckIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="flex-shrink-0 mt-0.5"
    >
      <polyline points="4 12 10 18 20 6" />
    </svg>
  );
}

function FeaturesModal({
  tier,
  onClose,
}: {
  tier: Tier;
  onClose: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center p-4 bg-black/40 backdrop-blur-md animate-[fadeIn_.15s_ease-out]"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={`Преимущества ${tier.name}`}
    >
      <div
        className="card w-full max-w-md p-6 sm:p-7 relative shadow-card"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Закрыть"
          className="absolute top-3 right-3 grid place-items-center w-8 h-8 rounded-md text-ink-mute hover:text-ink hover:bg-bg-alt"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
            <line x1="6" y1="6" x2="18" y2="18" />
            <line x1="18" y1="6" x2="6" y2="18" />
          </svg>
        </button>
        <div className="flex items-center gap-2">
          <h3 className="font-serif text-2xl text-ink tracking-tight">{tier.name}</h3>
          {tier.id === "ultimate" && (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-accent">
              <polygon points="12 2 15 9 22 10 17 15 18 22 12 19 6 22 7 15 2 10 9 9 12 2" />
            </svg>
          )}
        </div>
        <p className="mt-1 text-sm text-ink-mute leading-relaxed">{tier.tagline}</p>
        <div className="mt-4 flex items-baseline gap-1.5">
          <span className="font-serif text-3xl text-ink tracking-tight">{tier.price}</span>
          <span className="text-sm text-ink-mute">/ {tier.period}</span>
        </div>
        <div className="mt-5 pt-5 border-t border-bg-line">
          <div className="label mb-3">Что внутри</div>
          <ul className="space-y-2.5">
            {tier.features.map((f) => (
              <li key={f} className="flex items-start gap-2.5 text-sm text-ink-soft leading-relaxed">
                <span className={tier.highlighted ? "text-accent" : "text-ink-mute"}>
                  <CheckIcon />
                </span>
                <span>{f}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="mt-6">
          {tier.ctaTo ? (
            <Link
              to={tier.ctaTo}
              onClick={onClose}
              className={`w-full inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition ${
                tier.highlighted
                  ? "bg-accent hover:bg-accent-hover text-white"
                  : "bg-bg-elev hover:bg-bg-alt text-ink border border-bg-line"
              }`}
            >
              {tier.cta}
            </Link>
          ) : (
            <button
              type="button"
              disabled
              title="Скоро"
              className={`w-full inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium cursor-not-allowed ${
                tier.highlighted
                  ? "bg-accent text-white"
                  : "bg-bg-elev text-ink border border-bg-line"
              }`}
            >
              {tier.cta}
              <span className="text-xs opacity-75">· скоро</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function Pricing() {
  const [openTier, setOpenTier] = useState<Tier | null>(null);

  return (
    <div className="space-y-12">
      <section className="text-center max-w-2xl mx-auto pt-2">
        <span className="chip">
          <span className="w-1.5 h-1.5 rounded-full bg-accent" />
          Тарифы
        </span>
        <h1 className="h-display mt-5">Выбирай план под свой ритм.</h1>
        <p className="mt-5 text-ink-soft text-lg leading-relaxed">
          Free покрывает базу. Coin для тех, кто смотрит рынок каждый день.
          Ultimate — когда важна скорость и свежие новости.
        </p>
      </section>

      <section className="grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-4xl mx-auto">
        {TIERS.map((tier) => (
          <div
            key={tier.id}
            className={`relative card p-4 flex flex-col ${
              tier.highlighted ? "border-accent/50 ring-1 ring-accent/30" : ""
            }`}
          >
            {tier.note && (
              <span className="absolute -top-2.5 left-3 text-[10px] uppercase tracking-wider font-medium px-2 py-0.5 rounded-full bg-accent text-white">
                {tier.note}
              </span>
            )}
            <div className="flex items-center gap-1.5">
              <h2 className="font-serif text-lg text-ink tracking-tight">
                {tier.name}
              </h2>
              {tier.id === "ultimate" && (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="text-accent">
                  <polygon points="12 2 15 9 22 10 17 15 18 22 12 19 6 22 7 15 2 10 9 9 12 2" />
                </svg>
              )}
            </div>
            <div className="mt-2 flex items-baseline gap-1">
              <span className="font-serif text-2xl text-ink tracking-tight leading-none">
                {tier.price}
              </span>
              <span className="text-xs text-ink-mute">/ {tier.period}</span>
            </div>
            <p className="mt-2 text-xs text-ink-mute leading-snug line-clamp-2 min-h-[2.2rem]">
              {tier.tagline}
            </p>
            <button
              type="button"
              onClick={() => setOpenTier(tier)}
              className="mt-3 w-full inline-flex items-center justify-center gap-1.5 rounded-md px-3 py-2 text-xs font-medium transition bg-bg-subtle hover:bg-bg-alt text-ink border border-bg-line hover:border-accent/40"
            >
              Показать преимущества
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                <line x1="5" y1="12" x2="19" y2="12" />
                <polyline points="13 6 19 12 13 18" />
              </svg>
            </button>
          </div>
        ))}
      </section>

      <section className="card p-6 sm:p-8 max-w-4xl mx-auto">
        <h2 className="h-section mb-4">Часто спрашивают</h2>
        <div className="grid md:grid-cols-2 gap-x-8 gap-y-5 text-sm">
          <div>
            <div className="font-medium text-ink mb-1">
              Можно отменить в любой момент?
            </div>
            <p className="text-ink-mute leading-relaxed">
              Да. Подписка списывается раз в месяц, отмена — в один клик в
              Настройках. Доступ остаётся до конца оплаченного периода.
            </p>
          </div>
          <div>
            <div className="font-medium text-ink mb-1">
              Зачем платить, если Gemini API сам по себе бесплатный?
            </div>
            <p className="text-ink-mute leading-relaxed">
              Free хватает большинству. Платные планы дают то, чего нет у
              Gemini «из коробки»: лента новостей, алерты, история, приоритет
              в очереди и поддержка.
            </p>
          </div>
          <div>
            <div className="font-medium text-ink mb-1">
              Как Ultimate ускоряет ответы?
            </div>
            <p className="text-ink-mute leading-relaxed">
              Запросы идут через выделенный пул прокси с приоритетом перед
              free-тиром Google + параллельная обработка длинных ответов.
              Реально быстрее в 2–3 раза на тяжёлых разборах.
            </p>
          </div>
          <div>
            <div className="font-medium text-ink mb-1">
              Это финансовый совет?
            </div>
            <p className="text-ink-mute leading-relaxed">
              Нет. Ни на одном тарифе. Volchay Crypto — образовательный
              инструмент. Решения по сделкам ты принимаешь сам. NFA. DYOR.
            </p>
          </div>
        </div>
      </section>

      <section className="text-center">
        <p className="text-xs text-ink-faint">
          Цены ориентировочные. Платежи и оплата подписок появятся позже —
          сейчас все возможности доступны через свой Gemini API-ключ
          бесплатно.
        </p>
      </section>

      {openTier && (
        <FeaturesModal tier={openTier} onClose={() => setOpenTier(null)} />
      )}
    </div>
  );
}
