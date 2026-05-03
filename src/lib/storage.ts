const KEY_PREFIX = "cryptomind:";

export function loadString(key: string): string | null {
  try {
    return localStorage.getItem(KEY_PREFIX + key);
  } catch {
    return null;
  }
}

export function saveString(key: string, value: string): void {
  try {
    localStorage.setItem(KEY_PREFIX + key, value);
  } catch {
    // ignore quota / privacy errors
  }
}

export function removeString(key: string): void {
  try {
    localStorage.removeItem(KEY_PREFIX + key);
  } catch {
    // ignore
  }
}

export function loadJSON<T>(key: string, fallback: T): T {
  const raw = loadString(key);
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function saveJSON<T>(key: string, value: T): void {
  saveString(key, JSON.stringify(value));
}

export const StorageKeys = {
  geminiApiKey: "gemini_api_key",
  geminiModel: "gemini_model",
  history: "analysis_history",
  theme: "theme",
  tutorHistory: "tutor_history",
  dailyLesson: "daily_lesson",
  profile: "profile",
  watchlist: "watchlist",
  joinedAt: "joined_at",
} as const;
