// Text helpers shared by ingredient search and ingredient icons.

/** Lowercase, strip accents and punctuation, turn ids like "ground_beef" into "ground beef". */
export function normalize(s: string): string {
  return s
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[_\-/]+/g, ' ')
    .replace(/[^a-z0-9 ]+/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Crude English singular, good enough for matching "tomatoes" to "tomato" or "berries" to "berry". */
export function singular(word: string): string {
  if (word.length <= 3) return word
  if (word.endsWith('ies')) return word.slice(0, -3) + 'y'
  if (/(oes|ches|shes|sses|xes)$/.test(word)) return word.slice(0, -2)
  if (word.endsWith('s') && !/(ss|us|is)$/.test(word)) return word.slice(0, -1)
  return word
}

/** Normalised words, each reduced to its singular form. */
export const words = (s: string) => normalize(s).split(' ').filter(Boolean).map(singular)

/** Key used to tell whether two typed ingredients are the same item. */
export const ingredientKey = (s: string) => words(s).join(' ')
