import { useEffect, useState } from "react";
import {
  loadString,
  removeString,
  saveString,
  StorageKeys,
  loadJSON,
  saveJSON,
} from "../lib/storage";
import { DEFAULT_MODEL, GEMINI_MODELS, testApiKey } from "../lib/gemini";

interface HistoryEntry {
  coinId: string;
  coinName: string;
  symbol: string;
  timeframeDays: number;
  createdAt: number;
  preview: string;
}

export default function Settings() {
  const [apiKey, setApiKey] = useState("");
  const [model, setModel] = useState(DEFAULT_MODEL);
  const [show, setShow] = useState(false);
  const [status, setStatus] = useState<{ type: "ok" | "err" | "info"; text: string } | null>(null);
  const [testing, setTesting] = useState(false);
  const [history, setHistory] = useState<HistoryEntry[]>([]);

  useEffect(() => {
    const k = loadString(StorageKeys.geminiApiKey) || "";
    const m = loadString(StorageKeys.geminiModel) || DEFAULT_MODEL;
    setApiKey(k);
    setModel(m);
    setHistory(loadJSON<HistoryEntry[]>(StorageKeys.history, []));
  }, []);

  const save = () => {
    if (apiKey.trim()) {
      saveString(StorageKeys.geminiApiKey, apiKey.trim());
    } else {
      removeString(StorageKeys.geminiApiKey);
    }
    saveString(StorageKeys.geminiModel, model);
    setStatus({ type: "ok", text: "Сохранено локально (только в этом браузере)." });
  };

  const test = async () => {
    if (!apiKey.trim()) {
      setStatus({ type: "err", text: "Введите ключ перед проверкой." });
      return;
    }
    setTesting(true);
    setStatus({ type: "info", text: "Проверяю ключ..." });
    try {
      const ok = await testApiKey(apiKey.trim(), model);
      setStatus(
        ok
          ? { type: "ok", text: "Ключ работает! Модель ответила." }
          : { type: "err", text: "Ключ принят, но ответа нет." }
      );
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Ошибка проверки";
      setStatus({ type: "err", text: msg });
    } finally {
      setTesting(false);
    }
  };

  const clearHistory = () => {
    saveJSON(StorageKeys.history, []);
    setHistory([]);
  };

  return (
    <div className="space-y-8 max-w-2xl mx-auto">
      <div className="text-center">
        <h1 className="h-section">Настройки</h1>
        <p className="text-sm text-ink-mute mt-1">
          API ключ хранится только у тебя в браузере (localStorage). Никуда не
          отправляется, кроме официального Google API.
        </p>
      </div>

      <section className="card p-5 space-y-4">
        <div>
          <h2 className="font-semibold text-ink">Gemini API ключ</h2>
          <p className="text-xs text-ink-mute mt-1">
            Получить бесплатный ключ:{" "}
            <a
              href="https://aistudio.google.com/apikey"
              target="_blank"
              rel="noopener noreferrer"
              className="text-accent hover:underline"
            >
              aistudio.google.com/apikey
            </a>
          </p>
        </div>

        <div>
          <label className="label" htmlFor="apikey">
            Ключ
          </label>
          <div className="flex gap-2 mt-1">
            <input
              id="apikey"
              type={show ? "text" : "password"}
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="AIza..."
              className="input flex-1 font-mono text-xs"
              autoComplete="off"
              spellCheck={false}
            />
            <button
              type="button"
              onClick={() => setShow((v) => !v)}
              className="btn-ghost"
              aria-label={show ? "Скрыть" : "Показать"}
            >
              {show ? "Скрыть" : "Показать"}
            </button>
          </div>
        </div>

        <div>
          <label className="label" htmlFor="model">
            Модель
          </label>
          <select
            id="model"
            value={model}
            onChange={(e) => setModel(e.target.value)}
            className="input mt-1"
          >
            {GEMINI_MODELS.map((m) => (
              <option key={m.id} value={m.id}>
                {m.label}
              </option>
            ))}
          </select>
          <p className="text-xs text-ink-mute mt-1">
            Flash — быстрее и дешевле. Pro — глубже анализ, но медленнее.
          </p>
        </div>

        <div className="flex flex-wrap gap-2 pt-1">
          <button type="button" className="btn-primary" onClick={save}>
            Сохранить
          </button>
          <button
            type="button"
            className="btn-ghost"
            onClick={test}
            disabled={testing}
          >
            {testing ? "Проверяю..." : "Проверить ключ"}
          </button>
          {apiKey && (
            <button
              type="button"
              className="btn-ghost text-bad"
              onClick={() => {
                removeString(StorageKeys.geminiApiKey);
                setApiKey("");
                setStatus({ type: "ok", text: "Ключ удалён." });
              }}
            >
              Удалить ключ
            </button>
          )}
        </div>

        {status && (
          <div
            className={`text-sm rounded-lg p-3 border ${
              status.type === "ok"
                ? "bg-good/10 border-good/30 text-good"
                : status.type === "err"
                ? "bg-bad/10 border-bad/30 text-bad"
                : "bg-bg-elev border-bg-line text-ink-soft"
            }`}
          >
            {status.text}
          </div>
        )}
      </section>

      <section className="card p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-ink">История анализов</h2>
          {history.length > 0 && (
            <button
              type="button"
              className="text-xs text-bad hover:underline"
              onClick={clearHistory}
            >
              Очистить
            </button>
          )}
        </div>
        {history.length === 0 ? (
          <p className="text-sm text-ink-mute">
            Здесь появятся последние сгенерированные разборы (хранятся локально).
          </p>
        ) : (
          <ul className="space-y-2">
            {history.map((h) => (
              <li
                key={`${h.coinId}-${h.timeframeDays}-${h.createdAt}`}
                className="flex items-center justify-between border-b border-bg-line pb-2 last:border-0 last:pb-0"
              >
                <div>
                  <div className="text-ink text-sm font-medium">
                    {h.coinName}{" "}
                    <span className="uppercase text-ink-mute text-xs">
                      {h.symbol}
                    </span>
                    <span className="ml-2 text-xs text-ink-mute">
                      {h.timeframeDays}д
                    </span>
                  </div>
                  <div className="text-xs text-ink-mute">
                    {new Date(h.createdAt).toLocaleString("ru-RU")}
                  </div>
                </div>
                <a
                  href={`#/analysis?coin=${h.coinId}`}
                  className="text-accent text-xs hover:underline"
                >
                  Открыть →
                </a>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="card p-5 space-y-2 text-sm text-ink-soft">
        <h2 className="font-semibold text-ink">О приватности</h2>
        <p>
          Сайт — статика, без сервера. Запросы к Gemini идут напрямую из твоего
          браузера на <code>generativelanguage.googleapis.com</code>.
        </p>
        <p>
          Цены и метаданные — публичный API CoinGecko (без ключа).
        </p>
        <p>
          Локально в браузере хранятся: API ключ, выбранная модель, история
          анализов. Можно удалить в любой момент.
        </p>
      </section>
    </div>
  );
}
