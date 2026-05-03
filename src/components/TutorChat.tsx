import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { streamTutor, DEFAULT_MODEL } from "../lib/gemini";
import type { ChatMessage } from "../lib/gemini";
import { loadJSON, loadString, saveJSON, StorageKeys } from "../lib/storage";
import Markdown from "./Markdown";

const SUGGESTIONS = [
  "Объясни простыми словами что такое блокчейн",
  "Чем отличаются биткоин и эфир",
  "Что такое RSI и как им пользоваться",
  "Как защитить свой кошелёк от взлома",
  "Что такое DeFi и зачем оно нужно",
];

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function TutorChat({ open, onClose }: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>(() =>
    loadJSON<ChatMessage[]>(StorageKeys.tutorHistory, [])
  );
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    saveJSON(StorageKeys.tutorHistory, messages);
  }, [messages]);

  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const ask = async (q: string) => {
    const apiKey = loadString(StorageKeys.geminiApiKey) || "";
    const model = loadString(StorageKeys.geminiModel) || DEFAULT_MODEL;
    if (!apiKey) {
      setErr(
        "Сначала добавь Gemini API ключ в Настройках — без него ИИ-репетитор не работает."
      );
      return;
    }
    if (!q.trim() || loading) return;
    setErr(null);
    const next = [...messages, { role: "user" as const, content: q.trim() }];
    setMessages(next);
    setInput("");
    setLoading(true);
    let acc = "";
    setMessages([...next, { role: "model", content: "" }]);
    try {
      await streamTutor(apiKey, model, messages, q.trim(), (chunk) => {
        acc += chunk;
        setMessages([...next, { role: "model", content: acc }]);
      });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Ошибка ответа.";
      setErr(msg);
      setMessages(next);
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void ask(input);
  };

  const clearChat = () => {
    setMessages([]);
    setErr(null);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex">
      <button
        type="button"
        aria-label="Закрыть"
        onClick={onClose}
        className="flex-1 bg-black/40 backdrop-blur-sm"
      />
      <aside className="w-full max-w-md bg-bg-elev border-l border-bg-line flex flex-col h-full shadow-xl">
        <header className="flex items-center justify-between px-4 h-14 border-b border-bg-line shrink-0">
          <div className="flex items-center gap-2">
            <span className="grid place-items-center w-8 h-8 rounded-lg bg-accent/10 text-accent">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
            </span>
            <div className="leading-tight">
              <div className="font-serif text-base text-ink">Чат-урок</div>
              <div className="text-[11px] text-ink-mute">ИИ-репетитор по крипте</div>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {messages.length > 0 && (
              <button
                type="button"
                onClick={clearChat}
                className="text-xs px-2 py-1 rounded-md text-ink-mute hover:text-ink hover:bg-bg-alt"
                title="Очистить диалог"
              >
                Очистить
              </button>
            )}
            <button
              type="button"
              aria-label="Закрыть"
              onClick={onClose}
              className="grid place-items-center w-8 h-8 rounded-md text-ink-mute hover:text-ink hover:bg-bg-alt"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        </header>

        <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
          {messages.length === 0 ? (
            <div className="space-y-4">
              <div className="card p-4 text-sm text-ink-soft">
                Привет! Я объясню любую тему по криптовалютам и блокчейну простым языком — спроси что хочешь или выбери из подсказок ниже.
              </div>
              <div className="space-y-2">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => void ask(s)}
                    className="w-full text-left text-sm px-3 py-2 rounded-lg border border-bg-line bg-bg-card hover:border-accent/40 hover:bg-bg-alt transition text-ink-soft"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((m, i) => (
              <div
                key={i}
                className={
                  m.role === "user"
                    ? "ml-auto max-w-[85%] rounded-2xl rounded-tr-md bg-accent text-white px-3.5 py-2 text-sm"
                    : "mr-auto max-w-[92%] text-sm"
                }
              >
                {m.role === "user" ? (
                  <div className="whitespace-pre-wrap">{m.content}</div>
                ) : m.content ? (
                  <Markdown>{m.content}</Markdown>
                ) : (
                  <div className="text-ink-mute italic">Печатает…</div>
                )}
              </div>
            ))
          )}
          {err && (
            <div className="card p-3 text-sm text-bad border-bad/30">
              {err}{" "}
              {err.includes("ключ") && (
                <Link to="/settings" onClick={onClose} className="underline">
                  Открыть настройки
                </Link>
              )}
            </div>
          )}
        </div>

        <form
          onSubmit={onSubmit}
          className="px-3 py-3 border-t border-bg-line shrink-0 bg-bg-elev"
        >
          <div className="flex items-end gap-2">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void ask(input);
                }
              }}
              rows={1}
              placeholder="Спроси про крипту, блокчейн, индикаторы…"
              className="flex-1 resize-none input min-h-[40px] max-h-32"
              disabled={loading}
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="h-10 px-3 rounded-md bg-accent text-white text-sm font-medium hover:bg-accent-hover disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              {loading ? "…" : "Спросить"}
            </button>
          </div>
        </form>
      </aside>
    </div>
  );
}
