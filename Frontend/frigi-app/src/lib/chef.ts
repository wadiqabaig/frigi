// Turning the chef chat's tap and typed answers into a /chef/options request.
import { normalize } from './text'
import type { ChefAnswers, ChefQuestion } from './types'

// True for questions answered with a number (minutes or people).
const isNumeric = (key: string) => key === 'max_minutes' || key === 'servings'

// Shows an answer the way the user reads it, e.g. "30 min" or "2 people".
export function answerLabel(key: string, value: string) {
  if (key === 'max_minutes') return `${value} min`
  if (key === 'servings') return `${value} ${value === '1' ? 'person' : 'people'}`
  return value
}

/**
 * Turns typed text into an answer. Numeric questions need a number; every other question takes
 * the matching option, or the typed words themselves (e.g. "Pakistani"). Null means "ask again".
 */
export function parseAnswer(q: ChefQuestion, raw: string): string | null {
  const t = normalize(raw)
  if (!t) return null
  if (isNumeric(q.key)) {
    const n = parseInt(t.match(/\d+/)?.[0] ?? '', 10)
    if (!n) return null
    const minutes = /hour|hr/.test(t) ? n * 60 : n
    if (q.key === 'max_minutes') return minutes >= 5 && minutes <= 240 ? String(minutes) : null
    return n >= 1 && n <= 20 ? String(n) : null
  }
  const opts = q.options.map((o) => ({ o, n: normalize(o) }))
  const match = (opts.find((x) => x.n === t) ?? opts.find((x) => t.includes(x.n) || (t.length >= 3 && x.n.includes(t))))?.o
  return match ?? raw.trim().replace(/\s+/g, ' ').slice(0, 50)
}

// Turns the answers collected in the chat into the typed request for /chef/options.
export function toChefAnswers(raw: Record<string, string>, note: string): ChefAnswers {
  return {
    cuisine: raw.cuisine,
    mealType: raw.meal_type,
    mood: raw.mood,
    maxMinutes: raw.max_minutes ? Number(raw.max_minutes) : undefined,
    servings: raw.servings ? Number(raw.servings) : undefined,
    note: note || undefined,
  }
}
