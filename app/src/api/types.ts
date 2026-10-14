// Shapes from docs/api-contract.md. Keep these in step with the backend.

export type Allergy =
  | 'peanut' | 'tree_nut' | 'dairy' | 'egg' | 'gluten' | 'soy' | 'fish' | 'shellfish' | 'sesame';
export type Diet = 'none' | 'vegetarian' | 'vegan' | 'pescatarian' | 'halal';

export const ALLERGIES: { value: Allergy; label: string }[] = [
  { value: 'peanut', label: 'Peanuts' },
  { value: 'tree_nut', label: 'Tree nuts' },
  { value: 'dairy', label: 'Dairy' },
  { value: 'egg', label: 'Eggs' },
  { value: 'gluten', label: 'Gluten' },
  { value: 'soy', label: 'Soy' },
  { value: 'fish', label: 'Fish' },
  { value: 'shellfish', label: 'Shellfish' },
  { value: 'sesame', label: 'Sesame' },
];

export const DIETS: { value: Diet; label: string }[] = [
  { value: 'none', label: 'No diet' },
  { value: 'vegetarian', label: 'Vegetarian' },
  { value: 'vegan', label: 'Vegan' },
  { value: 'pescatarian', label: 'Pescatarian' },
  { value: 'halal', label: 'Halal' },
];

export interface Profile {
  id: number;
  name: string;
  email: string;
  age: number | null;
  allergies: Allergy[];
  diet: Diet;
  household_size: number;
}

export interface SignupInput {
  name: string;
  email: string;
  password: string;
  age?: number;
  allergies: Allergy[];
  diet: Diet;
  household_size: number;
}

export interface AuthResult {
  token: string;
  user: { id: number; name: string; email: string };
}

export interface Ingredient {
  id: string | null;
  name: string;
}

export interface Detection {
  id: string;
  name: string;
  confidence: number;
  box: [number, number, number, number];
}

export interface DetectResult {
  photos: { index: number; width: number; height: number; detections: Detection[] }[];
  ingredients: { id: string; name: string; confidence: number; count: number; photos: number[] }[];
  ask_about_staples: Ingredient[];
  model: string;
  elapsed_ms: number;
}

export interface ChefQuestion {
  key: 'cuisine' | 'mood' | 'max_minutes' | 'servings';
  text: string;
  options: string[];
}

export interface ChefAnswers {
  cuisine?: string;
  mood?: string;
  max_minutes?: number;
  servings?: number;
  note?: string;
}

export interface RecipeOption {
  option_id: string;
  title: string;
  summary: string;
  minutes: number | null;
  uses: string[];
  missing: string[];
  image_url: string | null;
  source: 'spoonacular' | 'llm';
}

export interface OptionsResult {
  options: RecipeOption[];
  removed_by_safety_filter: number;
  notice: string | null;
}

export interface Recipe {
  recipe_id: string;
  title: string;
  servings: number;
  minutes: number | null;
  ingredients: { name: string; quantity: number; unit: string; have: boolean }[];
  steps: string[];
  safety: { checked: boolean; allergies: Allergy[]; diet: Diet };
  image_url: string | null;
}

export interface SwapResult {
  missing: string;
  swaps: { name: string; note: string }[];
}

/** A photo chosen in the app, before upload. */
export interface PickedPhoto {
  uri: string;
  mimeType: string;
  fileName: string;
}
