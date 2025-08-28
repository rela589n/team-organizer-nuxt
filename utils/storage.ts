/**
 * Tiny persistence helpers to centralize JSON parsing/stringifying
 * and provide consistent, contextual error logs. Keeping this small
 * avoids over-engineering while removing duplication in composables.
 */

/** Safely parse JSON with a fallback value on failure. */
export function safeParseJSON<T>(raw: string, fallback: T, context: string): T {
  try {
    return JSON.parse(raw) as T
  } catch (err) {
    console.error(`[storage] Failed to parse JSON for ${context}:`, err)
    return fallback
  }
}

/** Load a value from localStorage. If missing or failing to parse, returns fallback. */
export function loadState<T>(key: string, fallback: T, context: string): T {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return fallback
    return safeParseJSON<T>(raw, fallback, context)
  } catch (err) {
    console.error(`[storage] Failed to load key ${key}:`, err)
    return fallback
  }
}

/** Save a value to localStorage with error handling. */
export function saveState<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch (err) {
    console.error(`[storage] Failed to save key ${key}:`, err)
  }
}
