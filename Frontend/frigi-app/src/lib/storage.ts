// Browser storage wrapped in try/catch: private windows and blocked site data can
// throw or return nothing, and the app must still work (state then lives in memory).
//
// Keys are namespaced "frigi.v2.*". Per-user data adds the user id, so two accounts
// on one device never see each other's fridge or saved recipes.

const PREFIX = 'frigi.v2.'

type Area = 'local' | 'session'
// The browser storage object for the chosen area.
const area = (a: Area): Storage => (a === 'local' ? localStorage : sessionStorage)

// Reads a saved value, or `fallback` when missing or unreadable.
export function load<T>(key: string, fallback: T, where: Area = 'local'): T {
  try {
    const raw = area(where).getItem(PREFIX + key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

// Saves a value as JSON; silently does nothing if storage is unavailable.
export function save(key: string, value: unknown, where: Area = 'local') {
  try { area(where).setItem(PREFIX + key, JSON.stringify(value)) } catch { /* storage unavailable */ }
}

// Deletes a saved value.
export function remove(key: string, where: Area = 'local') {
  try { area(where).removeItem(PREFIX + key) } catch { /* ignore */ }
}

// Storage key for data that belongs to one user.
export const userKey = (key: string, userId: number) => `${key}.${userId}`

/**
 * Keys written by the old in-browser demo (mock accounts with password hashes,
 * the "Alex" guest profile, sample inventory, demo saved-recipe ids, chef prefs
 * and swaps). Only these exact keys are removed; nothing else is touched.
 * Runs on every start, so old demo data cannot come back after a refresh.
 */
const LEGACY_DEMO_KEYS = ['session', 'profile', 'inventory', 'prefs', 'saved', 'subs', 'users'].map((k) => 'frigi.' + k)

// Deletes the old demo keys listed above.
export function removeLegacyDemoData() {
  for (const key of LEGACY_DEMO_KEYS) {
    try { localStorage.removeItem(key) } catch { /* ignore */ }
    try { sessionStorage.removeItem(key) } catch { /* ignore */ }
  }
}
