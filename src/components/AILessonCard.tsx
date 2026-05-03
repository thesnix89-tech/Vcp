import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { generateLesson, DEFAULT_MODEL } from "../lib/gemini";
import type { GeneratedLesson } from "../lib/gemini";
import { loadJSON, loadString, saveJSON, StorageKeys } from "../lib/storage";
import Markdown from "./Markdown";

const REFRESH_MS = 5 * 60 * 60 * 1000; // 5 hours

function fmtCountdown(ms: number): string {
  if (ms <= 0) return "00:00:00";
  const total = Math.floor(ms / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
}

export default function AILessonCard() {
  const [lesson, setLesson] = useState<GeneratedLesson | null>(() =>
    loadJSON<GeneratedLesson | null>(StorageKeys.dailyLesson, null)
  );
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [now, setNow] = useState(0);

  const generate = useCallback(async () => {
    const apiKey = loadString(StorageKeys.geminiApiKey) || "";
    const model = loadString(StorageKeys.geminiModel) || DEFAULT_MODEL;
    if (!apiKey) {
      setErr("Добавь Gemini API ключ в Настройках, чтобы ИИ генерировал обучения.");
      return;
    }
    setErr(null);
    setLoading(true);
    try {
      const next = await generateLesson(apiKey, model);
      setLesson(next);
      saveJSON(StorageKeys.dailyLesson, next);
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Не удалось сгенерировать материал.");
    } finally {
      setLoading(false);
    }
  }, []);

  // Tick countdown every second
  useEffect(() => {
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  // Auto-generate when missing or expired
  useEffect(() => {
    const apiKey = loadString(StorageKeys.geminiApiKey) || "";
    if (!apiKey) return;
    const expired = !lesson || now - lesson.generatedAt >= REFRESH_MS;
    if (expired && !loading) {
      void generate();
    }
    // We want this to fire when `now` crosses the refresh boundary
  }, [now, lesson, loading, generate]);

  const remaining = lesson ? Math.max(0, REFRESH_MS - (now - lesson.generatedAt)) : 0;
  const apiKeyMissing = !loadString(StorageKeys.geminiApiKey);

  return (
    <div className="card p-5 sm:p-6 border-accent/25 bg-gradient-to-br from-accent-tint to-bg-card">
      <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
        <div className="flex items-center gap-2.5">
          <span className="grid place-items-center w-8 h-8 rounded-lg bg-accent/15 text-accent">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
              <circle cx="12" cy="12" r="4" />
            </svg>
          </span>
          <div className="leading-tight">
            <div className="font-serif text-lg text-ink">
              {lesson?.kind === "lesson" ? "Мини-урок от ИИ" : "Факт от ИИ"}
            </div>
            <div className="text-[11px] text-ink-mute">Обновляется автоматически каждые 5 часов</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="text-xs text-ink-mute hidden sm:block">
            Новое обучение или факт через:
          </div>
          <div className="font-mono text-sm tabular-nums px-2.5 py-1 rounded-md border border-bg-line bg-bg-elev text-ink">
            {lesson ? fmtCountdown(remaining) : "—"}
          </div>
          <button
            type="button"
            onClick={() => void generate()}
            disabled={loading || apiKeyMissing}
            className="text-xs px-2.5 py-1 rounded-md text-ink-mute hover:text-ink hover:bg-bg-alt disabled:opacity-50 disabled:cursor-not-allowed"
            title="Сгенерировать новый материал сейчас"
          >
            {loading ? "…" : "Обновить"}
          </button>
        </div>
      </div>

      {err && (
        <div className="text-sm text-bad mb-3">
          {err}{" "}
          {err.toLowerCase().includes("ключ") && (
            <Link to="/settings" className="underline">
              Открыть настройки
            </Link>
          )}
        </div>
      )}

      {!lesson && !loading && !err && (
        <div className="text-sm text-ink-mute">
          {apiKeyMissing ? (
            <>
              ИИ-обучение появится здесь, как только ты добавишь Gemini-ключ в{" "}
              <Link to="/settings" className="text-accent underline">
                Настройках
              </Link>
              . Новый материал — каждые 5 часов.
            </>
          ) : (
            "Готовлю первый материал…"
          )}
        </div>
      )}

      {loading && !lesson && (
        <div className="text-sm text-ink-mute">Генерирую материал…</div>
      )}

      {lesson && (
        <div className="space-y-2">
          <h3 className="font-serif text-xl text-ink leading-snug">
            {lesson.title}
          </h3>
          <Markdown>{lesson.body}</Markdown>
          <div className="text-[11px] text-ink-faint pt-2">
            Сгенерировано:{" "}
            {new Date(lesson.generatedAt).toLocaleString("ru-RU", {
              day: "2-digit",
              month: "short",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </div>
        </div>
      )}
    </div>
  );
}
