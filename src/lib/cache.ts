// Simple in-memory cache with 90-second TTL.
// Persists across React navigations (module scope), cleared on full page refresh.
const store: Record<string, { data: unknown; ts: number }> = {};
const TTL = 90_000;

export const getCache = <T>(key: string): T | null => {
  const entry = store[key];
  if (!entry) return null;
  if (Date.now() - entry.ts > TTL) { delete store[key]; return null; }
  return entry.data as T;
};

export const setCache = (key: string, data: unknown) => {
  store[key] = { data, ts: Date.now() };
};

export const clearCache = (key: string) => {
  delete store[key];
};
