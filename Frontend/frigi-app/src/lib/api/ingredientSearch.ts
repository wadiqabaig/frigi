import { normalize, singular, words } from '../text'
import type { IngredientRef, IngredientSearchPage } from '../types'

/**
 * Ranks catalogue entries against a query: case-insensitive, accent-insensitive,
 * plural-insensitive, partial words allowed. Lower score = better match.
 *
 * The catalogue itself comes from the backend (GET /ingredients). When the backend
 * offers a server-side search endpoint, only `searchIngredients` in ./index.ts changes.
 */

// Regional spellings and common names for the same food, so "aubergine" finds
// "eggplant" and "mince" finds "ground beef". This is matching vocabulary,
// not a list of ingredients.
const ALIASES: Record<string, string[]> = {
  aubergine: ['eggplant'], brinjal: ['eggplant'], capsicum: ['bell pepper'], courgette: ['zucchini'],
  zucchini: ['courgette'], coriander: ['cilantro'], cilantro: ['coriander'], prawn: ['shrimp'],
  shrimp: ['prawn'], mince: ['ground beef'], minced: ['ground beef'], yoghurt: ['yogurt'],
  chilli: ['chili'], chile: ['chili'], scallion: ['spring onion', 'green onion'], soda: ['fizzy drink'],
  pop: ['fizzy drink'], 'sweet corn': ['corn'], maize: ['corn'], 'garbanzo': ['chickpea'],
  margarine: ['butter or spread'], spread: ['butter or spread'], greens: ['leafy greens'],
  lettuce: ['leafy greens'], kale: ['leafy greens'], 'oat milk': ['plant milk'], 'soy milk': ['plant milk'],
  'almond milk': ['plant milk'], water: ['water bottle'],
}

// Returns the query plus any alternative names it is known by.
function expand(query: string): string[] {
  const q = normalize(query)
  const out = new Set([q, words(q).join(' ')])
  for (const [alias, targets] of Object.entries(ALIASES)) {
    if (q === alias || singular(q) === alias) targets.forEach((t) => out.add(t))
  }
  return [...out].filter(Boolean)
}

// Scores how well one catalogue name matches the query, or null for no match.
function score(name: string, query: string): number | null {
  const n = normalize(name)
  const nw = words(n)
  const qw = words(query)
  if (!qw.length) return null
  if (n === query || nw.join(' ') === qw.join(' ')) return 0
  if (n.startsWith(query)) return 1
  // every query word starts some word of the name: "gro bee" -> "ground beef"
  if (qw.every((w) => nw.some((x) => x.startsWith(w)))) return 2 + (nw[0].startsWith(qw[0]) ? 0 : 1)
  if (n.includes(query)) return 4
  return null
}

// Returns the catalogue entries that match the query, best match first.
export function rankIngredients(catalogue: IngredientRef[], query: string): IngredientRef[] {
  const variants = expand(query)
  if (!variants.length) return []
  const scored: { item: IngredientRef; s: number }[] = []
  for (const item of catalogue) {
    let best: number | null = null
    for (const v of variants) {
      const s = score(item.name, v) ?? (item.id ? score(item.id, v) : null)
      if (s !== null && (best === null || s < best)) best = s
    }
    if (best !== null) scored.push({ item, s: best })
  }
  return scored.sort((a, b) => a.s - b.s || a.item.name.length - b.item.name.length || a.item.name.localeCompare(b.item.name)).map((x) => x.item)
}

// Returns one page of results with the total count.
export function paginate(items: IngredientRef[], offset: number, limit: number): IngredientSearchPage {
  return { items: items.slice(offset, offset + limit), total: items.length, hasMore: offset + limit < items.length }
}
