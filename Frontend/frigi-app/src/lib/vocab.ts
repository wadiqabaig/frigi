import type { Allergen, Diet } from './types'

// Display labels for the contract's fixed vocabularies.
export const ALLERGENS: Allergen[] = ['peanut', 'tree_nut', 'dairy', 'egg', 'gluten', 'soy', 'fish', 'shellfish', 'sesame']
export const DIETS: Diet[] = ['none', 'vegetarian', 'vegan', 'pescatarian', 'halal']

export const ALLERGEN_LABEL: Record<Allergen, string> = {
  peanut: 'Peanut', tree_nut: 'Tree nut', dairy: 'Dairy', egg: 'Egg', gluten: 'Gluten',
  soy: 'Soy', fish: 'Fish', shellfish: 'Shellfish', sesame: 'Sesame',
}
export const DIET_LABEL: Record<Diet, string> = {
  none: 'None', vegetarian: 'Vegetarian', vegan: 'Vegan', pescatarian: 'Pescatarian', halal: 'Halal',
}

// Type guards for values coming back from the backend.
export const isAllergen = (v: string): v is Allergen => (ALLERGENS as string[]).includes(v)
export const isDiet = (v: string): v is Diet => (DIETS as string[]).includes(v)
