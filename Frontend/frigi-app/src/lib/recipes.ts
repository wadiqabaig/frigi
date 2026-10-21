// Helpers for working with recipes from the chef: matching ingredients to the
// user's fridge list and reading timings out of recipe steps.
import { words } from './text'
import type { RecipeOption, RecipeOrigin } from './types'

/** Longest "N minutes" mentioned in a recipe step, for the cooking-mode timer. */
export function stepMinutes(step: string): number | null {
  let best = 0
  for (const m of step.matchAll(/(\d+)(?:\s*(?:-|–|to)\s*(\d+))?\s*(minutes?|mins?|hours?|hrs?)\b/gi)) {
    const n = Number(m[2] ?? m[1])
    best = Math.max(best, /^h/i.test(m[3]) ? n * 60 : n)
  }
  return best > 0 && best <= 240 ? best : null
}

/**
 * True when a recipe ingredient is on the user's list. Mirrors the backend's
 * rule: the item's words must end the ingredient's name, so "large eggs" matches
 * "Eggs" but "chicken stock" does not match "Chicken".
 */
export function onList(ingredient: string, list: { name: string }[]): boolean {
  const iw = words(ingredient)
  return list.some((item) => {
    const w = words(item.name)
    return w.length > 0 && w.length <= iw.length && w.every((x, i) => iw[iw.length - w.length + i] === x)
  })
}

/**
 * Have/missing split for a recipe option. Fridge options come split by the backend;
 * search results are compared with the user's own list here.
 */
export function splitIngredients(option: RecipeOption, origin: RecipeOrigin, inventory: { name: string }[]) {
  if (origin === 'fridge') return { have: option.uses, missing: option.missing }
  const all = [...option.uses, ...option.missing]
  return { have: all.filter((n) => onList(n, inventory)), missing: all.filter((n) => !onList(n, inventory)) }
}
