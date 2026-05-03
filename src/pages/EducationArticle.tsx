import { Link, useParams } from "react-router-dom";
import { EDUCATION, getArticle } from "../data/education";
import Markdown from "../components/Markdown";

export default function EducationArticle() {
  const { slug } = useParams();
  const article = slug ? getArticle(slug) : undefined;

  if (!article) {
    return (
      <div className="text-center py-16">
        <p className="text-ink-mute">Статья не найдена.</p>
        <Link to="/education" className="btn-primary mt-4 inline-flex">
          К списку
        </Link>
      </div>
    );
  }

  const idx = EDUCATION.findIndex((a) => a.slug === article.slug);
  const prev = idx > 0 ? EDUCATION[idx - 1] : null;
  const next = idx < EDUCATION.length - 1 ? EDUCATION[idx + 1] : null;

  return (
    <article className="space-y-6 max-w-3xl mx-auto">
      <div>
        <Link to="/education" className="text-sm text-accent hover:text-accent-hover">
          ← Все статьи
        </Link>
        <div className="flex items-center gap-2 text-xs mt-3">
          <span className="chip">{article.category}</span>
          <span className="text-ink-mute">{article.readMinutes} мин чтения</span>
        </div>
      </div>

      <div className="card p-6 sm:p-8">
        <Markdown>{article.content}</Markdown>
      </div>

      <nav className="flex items-stretch justify-between gap-3 text-sm">
        {prev ? (
          <Link
            to={`/education/${prev.slug}`}
            className="card p-4 flex-1 hover:border-accent/40 transition"
          >
            <div className="text-xs text-ink-mute">← Предыдущая</div>
            <div className="text-ink mt-1 font-medium">{prev.title}</div>
          </Link>
        ) : (
          <div className="flex-1" />
        )}
        {next ? (
          <Link
            to={`/education/${next.slug}`}
            className="card p-4 flex-1 text-right hover:border-accent/40 transition"
          >
            <div className="text-xs text-ink-mute">Следующая →</div>
            <div className="text-ink mt-1 font-medium">{next.title}</div>
          </Link>
        ) : (
          <div className="flex-1" />
        )}
      </nav>
    </article>
  );
}
