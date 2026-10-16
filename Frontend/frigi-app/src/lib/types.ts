// Shared domain types for Frigi. These mirror the shapes the UI needs; the API
// client (src/lib/api.ts) adapts backend responses into these.

export type Diet = 'none' | 'vegetarian' | 'vegan' | 'pescatarian' | 'halal'
export type Allergen =
  | 'peanut' | 'treenut' | 'dairy' | 'egg' | 'gluten' | 'soy' | 'fish' | 'shellfish' | 'sesame'

export type Cuisine = 'italian' | 'asian' | 'indian' | 'mediterranean' | 'other'
export type CuisinePick = Cuisine | 'any'
export type Mood = 'quick' | 'comfort' | 'healthy' | 'new'

export interface Profile {
  name: string
  email?: string
  age?: number
  householdSize: number
  diet: Diet
  allergies: Allergen[]
  /** false until the user has explicitly reviewed allergies ("Not yet specified") */
  allergiesSet: boolean
}

export type IngredientCategory = 'produce' | 'dairy' | 'protein' | 'grain' | 'pantry'
/** Tags used for diet filtering */
export type FoodTag = 'meat' | 'poultry' | 'pork' | 'fish' | 'shellfish' | 'animal' | 'alcohol'

export interface Ingredient {
  id: string
  name: string
  category: IngredientCategory
  allergens: Allergen[]
  tags: FoodTag[]
  /** staples are offered in “Did Frigi miss something?” */
  staple?: boolean
}

export interface Detection {
  ingredientId: string
  confidence: number
  /** normalised [x, y, w, h] in 0..1 relative to the photo */
  box: [number, number, number, number]
  imageIndex: number
}

export interface ScanResult {
  source: 'mock' | 'live'
  model: string
  detections: Detection[]
}

export interface RecipeIngredient {
  id: string
  qty: number
  unit: string
  optional?: boolean
  note?: string
}

export interface RecipeStep {
  text: string
  uses?: string[]
  timerMin?: number
}

export type DishArtKind =
  | 'omelette' | 'pasta' | 'shakshuka' | 'friedrice' | 'curry-green' | 'curry-orange'
  | 'toast' | 'stirfry' | 'bowl' | 'pancakes' | 'soup' | 'spaghetti'

export interface Recipe {
  id: string
  title: string
  blurb: string
  description: string
  cuisine: Cuisine
  moods: Mood[]
  prepMin: number
  cookMin: number
  baseServings: number
  difficulty: 'Easy' | 'Medium'
  rating: number
  art: DishArtKind
  mat: 'cream' | 'sun' | 'peach' | 'leaf'
  ingredients: RecipeIngredient[]
  steps: RecipeStep[]
}

export interface ChefPrefs {
  cuisine: CuisinePick
  mood: Mood
  /** minutes; 0 = no rush */
  time: number
  servings: number
}

export interface Recommendation {
  recipe: Recipe
  have: RecipeIngredient[]
  missing: RecipeIngredient[]
  optionalMissing: RecipeIngredient[]
  score: number
  fitsTime: boolean
  cuisineMatch: boolean
}

export interface RecommendationResult {
  items: Recommendation[]
  hidden: { recipe: Recipe; reason: string }[]
}

export interface Substitute {
  id: string
  name: string
  ratio: string
  note: string
}

export type ScenarioId = 'success' | 'empty' | 'allergy' | 'nomatch' | 'server' | 'expired'
