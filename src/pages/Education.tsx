import { Link } from "react-router-dom";
import { useMemo, useState } from "react";
import { EDUCATION } from "../data/education";
import type { Article } from "../data/education";
import AILessonCard from "../components/AILessonCard";

const CATEGORIES: Article["category"][] = [
  "Основы",
  "Технический анализ",
  "Фундаментал",
  "Риски",
  "Психология",
];

export default function Education() {
  const [filter, setFilter] = useState<Article["category"] | "Все">("Все");
  const items = useMemo(
    () => (filter === "Все" ? EDUCATION : EDUCATION.filter((a) => a.category === filter)),
    [filter]
  );

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="h-section">Обучение</h1>
        <p className="text-sm text-ink-mute mt-1">
          Системные гайды по фундаменталу, теханализу, риск-менеджменту и психологии
        </p>
      </div>

      <AILessonCard />

      <div className="flex flex-wrap gap-2">
        {(["Все", ...CATEGORIES] as const).map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setFilter(c)}
            className={`px-3 py-1.5 rounded-lg text-sm border transition ${
              filter === c
                ? "bg-accent text-white border-accent"
                : "bg-bg-elev text-ink-soft border-bg-line hover:border-accent/40"
            }`}
          >
            {c}
          </button>
        ))}
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        {items.map((a) => (
          <Link
            key={a.slug}
            to={`/education/${a.slug}`}
            className="card p-5 hover:border-accent/40 hover:shadow-soft transition group"
          >
            <div className="flex items-center gap-2 text-xs">
              <span className="chip">{a.category}</span>
              <span className="text-ink-mute">{a.readMinutes} мин чтения</span>
            </div>
            <h3 className="text-lg font-semibold text-ink mt-3 group-hover:text-accent transition">
              {a.title}
            </h3>
            <p className="text-sm text-ink-mute mt-2 leading-relaxed">{a.description}</p>
            <div className="text-accent text-xs mt-4 font-medium">Читать →</div>
          </Link>
        ))}
      </div>
    </div>
  );
}
