import type { Ingredient } from '../types'

// Catalogue of every ingredient the demo knows about.
export const INGREDIENTS: Ingredient[] = [
  { id: 'eggs', name: 'Eggs', category: 'protein', allergens: ['egg'], tags: ['animal'], staple: true },
  { id: 'milk', name: 'Milk', category: 'dairy', allergens: ['dairy'], tags: ['animal'], staple: true },
  { id: 'tomato', name: 'Tomatoes', category: 'produce', allergens: [], tags: [] },
  { id: 'spinach', name: 'Spinach', category: 'produce', allergens: [], tags: [] },
  { id: 'cheddar', name: 'Cheddar cheese', category: 'dairy', allergens: ['dairy'], tags: ['animal'] },
  { id: 'bread', name: 'Bread', category: 'grain', allergens: ['gluten'], tags: [] },
  { id: 'pasta', name: 'Pasta', category: 'grain', allergens: ['gluten'], tags: [] },
  { id: 'onion', name: 'Onions', category: 'produce', allergens: [], tags: [] },
  { id: 'pepper', name: 'Bell pepper', category: 'produce', allergens: [], tags: [] },
  { id: 'chicken', name: 'Chicken breast', category: 'protein', allergens: [], tags: ['meat', 'poultry', 'animal'] },
  { id: 'yogurt', name: 'Greek yogurt', category: 'dairy', allergens: ['dairy'], tags: ['animal'] },
  { id: 'lemon', name: 'Lemon', category: 'produce', allergens: [], tags: [] },
  { id: 'garlic', name: 'Garlic', category: 'produce', allergens: [], tags: [] },
  { id: 'butter', name: 'Butter', category: 'dairy', allergens: ['dairy'], tags: ['animal'], staple: true },
  { id: 'oil', name: 'Olive oil', category: 'pantry', allergens: [], tags: [], staple: true },
  { id: 'salt', name: 'Salt & pepper', category: 'pantry', allergens: [], tags: [], staple: true },
  { id: 'rice', name: 'Rice', category: 'grain', allergens: [], tags: [], staple: true },
  { id: 'flour', name: 'Flour', category: 'grain', allergens: ['gluten'], tags: [], staple: true },
  { id: 'sugar', name: 'Sugar', category: 'pantry', allergens: [], tags: [] },
  { id: 'soy', name: 'Soy sauce', category: 'pantry', allergens: ['soy', 'gluten'], tags: [] },
  { id: 'honey', name: 'Honey', category: 'pantry', allergens: [], tags: ['animal'] },
  { id: 'ginger', name: 'Ginger', category: 'produce', allergens: [], tags: [] },
  { id: 'spices', name: 'Garam masala', category: 'pantry', allergens: [], tags: [] },
  { id: 'cumin', name: 'Cumin & paprika', category: 'pantry', allergens: [], tags: [] },
  { id: 'chickpeas', name: 'Chickpeas', category: 'protein', allergens: [], tags: [] },
  { id: 'coconut', name: 'Coconut milk', category: 'pantry', allergens: [], tags: [] },
  { id: 'basil', name: 'Fresh basil', category: 'produce', allergens: [], tags: [] },
  { id: 'scallion', name: 'Spring onions', category: 'produce', allergens: [], tags: [] },
  { id: 'sesame', name: 'Sesame seeds', category: 'pantry', allergens: ['sesame'], tags: [] },
  { id: 'bakingpowder', name: 'Baking powder', category: 'pantry', allergens: [], tags: [] },
  { id: 'chilli', name: 'Chilli flakes', category: 'pantry', allergens: [], tags: [] },
  { id: 'mushroom', name: 'Mushrooms', category: 'produce', allergens: [], tags: [] },
  { id: 'carrot', name: 'Carrots', category: 'produce', allergens: [], tags: [] },
  { id: 'broccoli', name: 'Broccoli', category: 'produce', allergens: [], tags: [] },
  { id: 'tofu', name: 'Firm tofu', category: 'protein', allergens: ['soy'], tags: [] },
  { id: 'oatmilk', name: 'Oat milk', category: 'dairy', allergens: [], tags: [] },
  { id: 'salmon', name: 'Salmon fillet', category: 'protein', allergens: ['fish'], tags: ['fish', 'animal'] },
  { id: 'mozzarella', name: 'Mozzarella', category: 'dairy', allergens: ['dairy'], tags: ['animal'] },
  { id: 'banana', name: 'Banana', category: 'produce', allergens: [], tags: [] },
  { id: 'maple', name: 'Maple syrup', category: 'pantry', allergens: [], tags: [] },
  { id: 'tamari', name: 'Tamari (gluten-free soy)', category: 'pantry', allergens: ['soy'], tags: [] },
  { id: 'aquafaba', name: 'Aquafaba (chickpea water)', category: 'pantry', allergens: [], tags: [] },
]

export const ING: Record<string, Ingredient> = Object.fromEntries(INGREDIENTS.map((i) => [i.id, i]))
export const ingName = (id: string) => ING[id]?.name ?? id

export const STAPLES = ['oil', 'salt', 'butter', 'milk', 'eggs', 'rice', 'flour']

export const ALLERGEN_LABEL: Record<string, string> = {
  peanut: 'Peanut', treenut: 'Tree nut', dairy: 'Dairy', egg: 'Egg', gluten: 'Gluten',
  soy: 'Soy', fish: 'Fish', shellfish: 'Shellfish', sesame: 'Sesame',
}
export const DIET_LABEL: Record<string, string> = {
  none: 'None', vegetarian: 'Vegetarian', vegan: 'Vegan', pescatarian: 'Pescatarian', halal: 'Halal',
}
