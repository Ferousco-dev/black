const CACHE_PREFIX = "chronicles:cache:";
const DEFAULT_TTL_MS = 5 * 60 * 1000;

export const buildCacheKey = (...parts) =>
  `${CACHE_PREFIX}${parts.map((p) => encodeURIComponent(String(p))).join(":")}`;

export const getCache = (key) => {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    if (parsed.expiresAt && Date.now() > parsed.expiresAt) {
      localStorage.removeItem(key);
      return null;
    }
    return parsed.value ?? null;
  } catch {
    return null;
  }
};

export const setCache = (key, value, ttlMs = DEFAULT_TTL_MS) => {
  try {
    const payload = {
      value,
      expiresAt: ttlMs ? Date.now() + ttlMs : null,
    };
    localStorage.setItem(key, JSON.stringify(payload));
  } catch {
    // Ignore storage failures (private mode, quota, etc.)
  }
};

export const clearCache = (key) => {
  try {
    localStorage.removeItem(key);
  } catch {
    // no-op
  }
};
