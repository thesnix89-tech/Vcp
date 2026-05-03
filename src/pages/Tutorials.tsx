import { Link } from "react-router-dom";
import { useMemo, useState } from "react";
import { TUTORIALS } from "../data/tutorials";
import type { Tutorial } from "../data/tutorials";

const LEVELS: Tutorial["level"][] = ["Новичок", "Средний", "Продвинутый"];

export default function Tutorials() {
  const [filter, setFilter] = useState<Tutorial["level"] | "Все">("Все");
  const items = useMemo(
    () => (filter === "Все" ? TUTORIALS : TUTORIALS.filter((t) => t.level === filter)),
    [filter]
  );

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="h-section">Туториалы</h1>
        <p className="text-sm text-ink-mute mt-1">
          Пошаговые инструкции — от настройки ключа до построения торгового плана
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {(["Все", ...LEVELS] as const).map((l) => (
          <button
            key={l}
            type="button"
            onClick={() => setFilter(l)}
            className={`px-3 py-1.5 rounded-lg text-sm border transition ${
              filter === l
                ? "bg-accent text-white border-accent"
                : "bg-bg-elev text-ink-soft border-bg-line hover:border-accent/40"
            }`}
          >
            {l}
          </button>
        ))}
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        {items.map((t) => (
          <Link
            key={t.slug}
            to={`/tutorials/${t.slug}`}
            className="card p-5 hover:border-accent/40 hover:shadow-soft transition group"
          >
            <div className="flex items-center gap-2 text-xs">
              <span
                className={`chip ${
                  t.level === "Новичок"
                    ? "border-good/30 text-good"
                    : t.level === "Средний"
                    ? "border-accent/30 text-accent"
                    : "border-bad/30 text-bad"
                }`}
              >
                {t.level}
              </span>
              <span className="text-ink-mute">{t.durationMinutes} мин</span>
            </div>
            <h3 className="text-lg font-semibold text-ink mt-3 group-hover:text-accent transition">
              {t.title}
            </h3>
            <p className="text-sm text-ink-mute mt-2 leading-relaxed">{t.description}</p>
            <div className="text-accent text-xs mt-4 font-medium">Открыть →</div>
          </Link>
        ))}
      </div>
    </div>
  );
}
