// Browser storage wrapped in try/catch: private windows and sandboxed previews
// can throw or return nothing, and the demo must still work.
export function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem('frigi.' + key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}
export function save(key: string, value: unknown) {
  try {
    localStorage.setItem('frigi.' + key, JSON.stringify(value))
  } catch {
    /* storage unavailable: keep state in memory only */
  }
}
export function remove(key: string) {
  try { localStorage.removeItem('frigi.' + key) } catch { /* ignore */ }
}
