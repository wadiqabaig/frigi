// Wire shapes from docs/api-contract.md (v1.0). Field names are the backend's
// snake_case; src/lib/api/index.ts maps them to the UI types in src/lib/types.ts.

export interface ErrorBody { error: { code: string; message: string } }

export interface UserBriefDto { id: number; name: string; email: string }
export interface AuthDto { token: string; user: UserBriefDto }

export interface SignupDto {
  name: string
  email: string
  password: string
  age?: number
  allergies: string[]
  diet: string
  household_size: number
}

export interface NoteDto { id: string; text: string; created_at: string }

export interface ProfileDto {
  id: number
  name: string
  email: string
  age: number | null
  allergies: string[]
  diet: string
  household_size: number
  chef_notes?: NoteDto[]
  recipe_notes?: RecipeNoteDto[]
}

export interface RecipeNoteDto { id: string; recipe_key: string; recipe_title: string; text: string; created_at: string }

export type ProfileUpdateDto = Partial<Pick<ProfileDto, 'name' | 'age' | 'allergies' | 'diet' | 'household_size'>>

export interface IngredientDto { id: string | null; name: string }
export interface IngredientsDto { detectable: IngredientDto[]; staples: IngredientDto[] }

export interface DetectionDto { id: string; name: string; confidence: number; box: [number, number, number, number] }
export interface PhotoResultDto { index: number; width: number; height: number; detections: DetectionDto[]; sharpness?: number; blurry?: boolean }
export interface MergedIngredientDto { id: string; name: string; confidence: number; count: number; photos: number[] }
export interface DetectDto {
  photos: PhotoResultDto[]
  ingredients: MergedIngredientDto[]
  ask_about_staples: IngredientDto[]
  model: string
  elapsed_ms: number
}

export interface ChefQuestionDto { key: string; text: string; options: string[] }
export interface ChefQuestionsDto { questions: ChefQuestionDto[] }

export interface ChefAnswersDto {
  cuisine?: string
  meal_type?: string
  mood?: string
  max_minutes?: number
  servings?: number
  note?: string
}

export interface RecipeOptionDto {
  option_id: string
  title: string
  summary: string
  minutes: number | null
  uses: string[]
  missing: string[]
  image_url: string | null
  source: 'spoonacular' | 'llm'
}
export interface OptionsDto { options: RecipeOptionDto[]; removed_by_safety_filter: number; removed_by_your_notes?: number; notice: string | null }

export interface RecipeIngredientDto { name: string; quantity: number; unit: string; have: boolean; note?: string | null }
export interface RecipeDto {
  recipe_id: string
  title: string
  servings: number
  minutes: number | null
  ingredients: RecipeIngredientDto[]
  steps: string[]
  safety: { checked: boolean; allergies: string[]; diet: string }
  image_url: string | null
}

export interface SwapDto { missing: string; swaps: { name: string; note: string }[] }
