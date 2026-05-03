import { Link } from "react-router-dom";

export default function NotFound() {
  return (
    <div className="text-center py-20">
      <div className="text-6xl mb-4">🤖</div>
      <h1 className="h-section">404 — страница не найдена</h1>
      <p className="text-ink-mute mt-2">
        Возможно, она переехала или ещё не создана.
      </p>
      <Link to="/" className="btn-primary mt-6 inline-flex">
        На главную
      </Link>
    </div>
  );
}
