import { useMemo } from 'react'
import { formatQty } from '../lib/format'
import type { Recipe } from '../lib/types'
import { useApp } from '../state/AppState'

type Status = 'have' | 'missing' | 'swapped'

/** Ingredient rows with have/missing/swapped status, shared by the recipe page and cooking mode. */
export function useRecipeRows(recipe: Recipe | undefined) {
  const { subs } = useApp()
  return useMemo(() => {
    if (!recipe) return []
    const s = subs[recipe.optionId] ?? {}
    return recipe.ingredients.map((ing) => {
      const swap = s[ing.name]
      const status: Status = swap ? 'swapped' : ing.have ? 'have' : 'missing'
      return { ing, name: swap ?? ing.name, swap, status, qty: formatQty(ing.quantity, ing.unit) }
    })
  }, [recipe, subs])
}
