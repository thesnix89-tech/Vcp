import { Link, useParams } from "react-router-dom";
import { TUTORIALS, getTutorial } from "../data/tutorials";
import Markdown from "../components/Markdown";

export default function TutorialArticle() {
  const { slug } = useParams();
  const tutorial = slug ? getTutorial(slug) : undefined;

  if (!tutorial) {
    return (
      <div className="text-center py-16">
        <p className="text-ink-mute">Туториал не найден.</p>
        <Link to="/tutorials" className="btn-primary mt-4 inline-flex">
          К списку
        </Link>
      </div>
    );
  }

  const idx = TUTORIALS.findIndex((a) => a.slug === tutorial.slug);
  const prev = idx > 0 ? TUTORIALS[idx - 1] : null;
  const next = idx < TUTORIALS.length - 1 ? TUTORIALS[idx + 1] : null;

  return (
    <article className="space-y-6 max-w-3xl mx-auto">
      <div>
        <Link to="/tutorials" className="text-sm text-accent hover:text-accent-hover">
          ← Все туториалы
        </Link>
        <div className="flex items-center gap-2 text-xs mt-3">
          <span
            className={`chip ${
              tutorial.level === "Новичок"
                ? "border-good/30 text-good"
                : tutorial.level === "Средний"
                ? "border-accent/30 text-accent"
                : "border-bad/30 text-bad"
            }`}
          >
            {tutorial.level}
          </span>
          <span className="text-ink-mute">{tutorial.durationMinutes} мин</span>
        </div>
      </div>

      <div className="card p-6 sm:p-8">
        <Markdown>{tutorial.content}</Markdown>
      </div>

      <nav className="flex items-stretch justify-between gap-3 text-sm">
        {prev ? (
          <Link
            to={`/tutorials/${prev.slug}`}
            className="card p-4 flex-1 hover:border-accent/40 transition"
          >
            <div className="text-xs text-ink-mute">← Предыдущий</div>
            <div className="text-ink mt-1 font-medium">{prev.title}</div>
          </Link>
        ) : (
          <div className="flex-1" />
        )}
        {next ? (
          <Link
            to={`/tutorials/${next.slug}`}
            className="card p-4 flex-1 text-right hover:border-accent/40 transition"
          >
            <div className="text-xs text-ink-mute">Следующий →</div>
            <div className="text-ink mt-1 font-medium">{next.title}</div>
          </Link>
        ) : (
          <div className="flex-1" />
        )}
      </nav>
    </article>
  );
}
