// UI-facing domain types. The API layer (src/lib/api) maps backend responses into
// these, so screens never depend on wire field names.

/** Fixed vocabularies from docs/api-contract.md. */
export type Diet = 'none' | 'vegetarian' | 'vegan' | 'pescatarian' | 'halal'
export type Allergen =
  | 'peanut' | 'tree_nut' | 'dairy' | 'egg' | 'gluten' | 'soy' | 'fish' | 'shellfish' | 'sesame'

export interface User { id: number; name: string; email: string }

export interface Profile {
  id: number
  name: string
  email: string
  age: number | null
  householdSize: number
  diet: Diet
  allergies: Allergen[]
  /** Things to change next time, saved after cooking and sent to the chef. */
  chefNotes: ChefNote[]
}

export interface ChefNote { id: string; text: string; createdAt: string }

export interface SignUpInput {
  name: string
  email: string
  password: string
  age?: number
  allergies: Allergen[]
  diet: Diet
  householdSize: number
}

/**
 * An ingredient as the backend knows it. `id` is one of the detector's classes
 * (e.g. "ground_beef"), or null for anything the user typed that is not one.
 */
export interface IngredientRef { id: string | null; name: string }

/** An item on the user's confirmed fridge list. */
export interface InventoryItem extends IngredientRef {
  /** Detector confidence (0..1) when it came from a scan. */
  confidence?: number
  source: 'detected' | 'catalogue' | 'manual' | 'staple'
}

export interface IngredientSearchPage {
  items: IngredientRef[]
  total: number
  hasMore: boolean
}

export interface Detection {
  id: string
  name: string
  confidence: number
  /** Normalised [x, y, w, h] in 0..1 of the original photo. */
  box: [number, number, number, number]
}

export interface ScanPhoto {
  index: number; width: number; height: number; detections: Detection[]
  /** Edge sharpness; `blurry` is true when it is too low to trust the scan. */
  sharpness: number; blurry: boolean
}

export interface ScanResult {
  photos: ScanPhoto[]
  /** Merged across photos with duplicates removed (FR4). */
  ingredients: (IngredientRef & { id: string; confidence: number; count: number; photos: number[] })[]
  askAboutStaples: IngredientRef[]
  model: string
  elapsedMs: number
}

export interface ChefQuestion { key: string; text: string; options: string[] }

/** Answers to the chef's questions, keyed by question key, plus a free-text note. */
export interface ChefAnswers {
  cuisine?: string
  mealType?: string
  mood?: string
  maxMinutes?: number
  servings?: number
  note?: string
}

export type RecipeSource = 'spoonacular' | 'llm'

/** Where a recipe option came from: the chef's fridge-based picks, or a recipe search. */
export type RecipeOrigin = 'fridge' | 'search'

export interface RecipeOption {
  optionId: string
  title: string
  summary: string
  minutes: number | null
  uses: string[]
  missing: string[]
  imageUrl: string | null
  source: RecipeSource
}

export interface RecipeOptions {
  options: RecipeOption[]
  /** Recipes the backend's safety filter blocked for this user's allergies or diet. */
  removedBySafetyFilter: number
  /** Recipes left out because of the user's saved notes, e.g. "no mushrooms". */
  removedByYourNotes: number
  notice: string | null
}

export interface RecipeIngredient { name: string; quantity: number; unit: string; have: boolean; note?: string | null }

export interface SafetyCheck { checked: boolean; allergies: Allergen[]; diet: Diet }

export interface Recipe {
  recipeId: string
  optionId: string
  title: string
  summary: string
  servings: number
  minutes: number | null
  ingredients: RecipeIngredient[]
  steps: string[]
  safety: SafetyCheck
  imageUrl: string | null
  source: RecipeSource
}

export interface SavedRecipe extends Recipe { savedAt: number }

export interface Swap { name: string; note: string }
