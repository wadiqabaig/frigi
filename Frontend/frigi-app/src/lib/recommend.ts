import { ING } from './data/ingredients'
import { RECIPES } from './data/recipes'
import { SUBSTITUTIONS } from './data/substitutions'
import { ALLERGEN_LABEL, DIET_LABEL } from './data/ingredients'
import type {
  ChefPrefs, Diet, Profile, Recipe, Recommendation, RecommendationResult, Substitute,
} from './types'
import { totalTime } from './format'

/** Why (if at all) a single ingredient conflicts with the profile. */
export function ingredientConflict(id: string, profile: Pick<Profile, 'diet' | 'allergies'>): string | null {
  const ing = ING[id]
  if (!ing) return null
  const allergen = ing.allergens.find((a) => profile.allergies.includes(a))
  if (allergen) return `contains ${ALLERGEN_LABEL[allergen].toLowerCase()}`
  if (!dietAllows(profile.diet, ing.tags)) return `isn’t ${DIET_LABEL[profile.diet].toLowerCase()}`
  return null
}

function dietAllows(diet: Diet, tags: string[]) {
  const has = (t: string) => tags.includes(t)
  switch (diet) {
    case 'vegetarian': return !['meat', 'poultry', 'pork', 'fish', 'shellfish'].some(has)
    case 'vegan': return !['meat', 'poultry', 'pork', 'fish', 'shellfish', 'animal'].some(has)
    case 'pescatarian': return !['meat', 'poultry', 'pork'].some(has)
    case 'halal': return !['pork', 'alcohol'].some(has)
    default: return true
  }
}

/** First required ingredient that conflicts, with a human reason. */
export function recipeConflict(recipe: Recipe, profile: Pick<Profile, 'diet' | 'allergies'>, subs: Record<string, string> = {}) {
  for (const ri of recipe.ingredients) {
    if (ri.optional) continue
    const id = subs[ri.id] ?? ri.id
    const why = ingredientConflict(id, profile)
    if (why) return { ingredientId: id, reason: why.startsWith('contains') ? `${why.replace('contains', 'Contains')} (${(ING[id]?.name ?? id).toLowerCase()})` : `${ING[id]?.name ?? id} ${why}` }
  }
  return null
}

export function recommend(
  inventory: string[],
  prefs: ChefPrefs | null,
  profile: Profile,
): RecommendationResult {
  const inv = new Set(inventory)
  const hidden: RecommendationResult['hidden'] = []
  const items: Recommendation[] = []

  for (const recipe of RECIPES) {
    const conflict = recipeConflict(recipe, profile)
    if (conflict) {
      hidden.push({ recipe, reason: conflict.reason })
      continue
    }
    const required = recipe.ingredients.filter((i) => !i.optional)
    const optional = recipe.ingredients.filter((i) => i.optional && !ingredientConflict(i.id, profile))
    const have = recipe.ingredients.filter((i) => inv.has(i.id) && !ingredientConflict(i.id, profile))
    const missing = required.filter((i) => !inv.has(i.id))
    const optionalMissing = optional.filter((i) => !inv.has(i.id))
    const haveRequired = required.length - missing.length

    if (inventory.length > 0 && (haveRequired < 2 || missing.length > 5)) continue

    const cuisineMatch = !prefs || prefs.cuisine === 'any' || prefs.cuisine === recipe.cuisine
    const fitsTime = !prefs || prefs.time === 0 || totalTime(recipe) <= prefs.time
    let score = inventory.length ? (haveRequired / required.length) * 60 - missing.length * 4 : recipe.rating * 10
    if (prefs) {
      if (prefs.cuisine !== 'any') score += cuisineMatch ? 30 : -10
      if (recipe.moods.includes(prefs.mood)) score += 14
      if (!fitsTime) score -= 25
    }
    items.push({ recipe, have, missing, optionalMissing, score, fitsTime, cuisineMatch })
  }
  items.sort((a, b) => b.score - a.score)
  return { items, hidden }
}

/** Swaps that are safe for this profile. An empty array means "no safe swap known". */
export function safeSubstitutes(id: string, profile: Profile): Substitute[] {
  return (SUBSTITUTIONS[id] ?? []).filter((s) => !ingredientConflict(s.id, profile))
}
