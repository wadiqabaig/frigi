/**
 * Frigi API client: the one place the UI talks to the backend.
 *
 * Endpoints and shapes follow docs/api-contract.md. Spoonacular and Gemini are
 * only ever reached through the backend; no third-party keys exist in this app.
 * Endpoints the backend does not offer yet are listed in docs/INTEGRATION.md.
 */
import { isAllergen, isDiet } from '../vocab'
import type {
  ChefAnswers, ChefQuestion, IngredientRef, IngredientSearchPage, Profile, Recipe, RecipeOption,
  RecipeOptions, ScanResult, SignUpInput, Swap, User,
} from '../types'
import type {
  AuthDto, ChefAnswersDto, ChefQuestionsDto, DetectDto, IngredientsDto, OptionsDto, ProfileDto,
  ProfileUpdateDto, RecipeDto, RecipeOptionDto, SwapDto,
} from './dto'
import { ApiError, request } from './http'
import { paginate, rankIngredients } from './ingredientSearch'

export { ApiError, errorMessage, isAborted, setAuthToken, setUnauthorizedHandler, toApiError } from './http'

export interface AuthSession { token: string; user: User }

// ---------------------------------------------------------------- mappers

// Converts the backend profile into the UI profile, dropping values outside the contract vocabularies.
const toProfile = (p: ProfileDto): Profile => ({
  id: p.id,
  name: p.name,
  email: p.email,
  age: p.age,
  householdSize: p.household_size,
  diet: isDiet(p.diet) ? p.diet : 'none',
  allergies: p.allergies.filter(isAllergen),
})

// Converts chef answers to the backend shape, leaving out anything unanswered.
const toAnswersDto = (a: ChefAnswers): ChefAnswersDto => ({
  cuisine: a.cuisine || undefined,
  mood: a.mood || undefined,
  max_minutes: a.maxMinutes || undefined,
  servings: a.servings || undefined,
  note: a.note?.trim().slice(0, 200) || undefined,
})

// Converts one recipe option from the backend shape.
const toOption = (o: RecipeOptionDto): RecipeOption => ({
  optionId: o.option_id,
  title: o.title,
  summary: o.summary,
  minutes: o.minutes,
  uses: o.uses,
  missing: o.missing,
  imageUrl: o.image_url,
  source: o.source,
})

// Converts a /chef/options response, keeping the safety-filter count and notice.
const toOptions = (r: OptionsDto): RecipeOptions => ({
  options: r.options.map(toOption),
  removedBySafetyFilter: r.removed_by_safety_filter,
  notice: r.notice,
})

// Keeps a value between 0 and 1.
const clamp01 = (n: number) => Math.min(1, Math.max(0, n))

// Converts a /detect response, turning pixel boxes into 0..1 fractions of each photo.
function toScan(r: DetectDto): ScanResult {
  return {
    photos: r.photos.map((p) => ({
      index: p.index,
      width: p.width,
      height: p.height,
      detections: p.detections.map((d) => {
        const [x1, y1, x2, y2] = d.box
        const w = p.width || 1, h = p.height || 1
        return {
          id: d.id, name: d.name, confidence: d.confidence,
          box: [clamp01(x1 / w), clamp01(y1 / h), clamp01((x2 - x1) / w), clamp01((y2 - y1) / h)] as [number, number, number, number],
        }
      }),
    })),
    ingredients: r.ingredients.map((i) => ({ id: i.id, name: i.name, confidence: i.confidence, count: i.count, photos: i.photos })),
    askAboutStaples: r.ask_about_staples,
    model: r.model,
    elapsedMs: r.elapsed_ms,
  }
}

// ---------------------------------------------------------------- ingredient catalogue

let catalogue: Promise<IngredientsDto> | null = null

/** GET /ingredients, fetched once per page load and shared. A failure is not cached. */
function loadCatalogue(): Promise<IngredientsDto> {
  catalogue ??= request<IngredientsDto>('/ingredients').catch((e) => { catalogue = null; throw e })
  return catalogue
}

// Stops early when the caller cancelled while a shared request was in flight.
const throwIfAborted = (signal?: AbortSignal) => {
  if (signal?.aborted) throw new ApiError('aborted', 0, 'ABORTED', 'Request cancelled.')
}

// ---------------------------------------------------------------- public API

export const api = {
  // Creates an account and returns its session token.
  async signUp(input: SignUpInput): Promise<AuthSession> {
    return request<AuthDto>('/auth/signup', {
      method: 'POST',
      body: {
        name: input.name, email: input.email, password: input.password, age: input.age,
        allergies: input.allergies, diet: input.diet, household_size: input.householdSize,
      },
    })
  },

  // Logs in with email and password and returns a session token.
  async logIn(email: string, password: string): Promise<AuthSession> {
    return request<AuthDto>('/auth/login', { method: 'POST', body: { email, password } })
  },

  // Loads the signed-in user's profile.
  async getProfile(signal?: AbortSignal): Promise<Profile> {
    return toProfile(await request<ProfileDto>('/profile', { auth: true, signal }))
  },

  /** Sends only the fields that changed; returns the full saved profile. */
  async updateProfile(changes: Partial<Omit<Profile, 'id' | 'email'>>): Promise<Profile> {
    const body: ProfileUpdateDto = {}
    if (changes.name !== undefined) body.name = changes.name
    if (changes.age !== undefined) body.age = changes.age
    if (changes.allergies !== undefined) body.allergies = changes.allergies
    if (changes.diet !== undefined) body.diet = changes.diet
    if (changes.householdSize !== undefined) body.household_size = changes.householdSize
    return toProfile(await request<ProfileDto>('/profile', { method: 'PUT', body, auth: true }))
  },

  /** Common staples to offer on the confirm screen (FR5). */
  async staples(signal?: AbortSignal): Promise<IngredientRef[]> {
    const c = await loadCatalogue()
    throwIfAborted(signal)
    return c.staples
  },

  /**
   * Ingredient autocomplete over the backend catalogue (GET /ingredients).
   * Returns an empty page for no match; the UI then offers to add the text as a
   * custom ingredient (contract: `"id": null`). Never returns invented items.
   */
  async searchIngredients(query: string, opts: { offset?: number; limit?: number; signal?: AbortSignal } = {}): Promise<IngredientSearchPage> {
    const { offset = 0, limit = 8, signal } = opts
    const c = await loadCatalogue()
    throwIfAborted(signal)
    const seen = new Set<string>()
    const all = [...c.detectable, ...c.staples].filter((i) => {
      const k = (i.id ?? '') + '|' + i.name.toLowerCase()
      if (seen.has(k)) return false
      seen.add(k)
      return true
    })
    return paginate(rankIngredients(all, query), offset, limit)
  },

  /** Exact catalogue entry for a typed name, so "Beef" keeps the detector id "beef". */
  async resolveIngredient(name: string): Promise<IngredientRef> {
    const page = await api.searchIngredients(name, { limit: 1 }).catch(() => null)
    const top = page?.items[0]
    return top && top.name.toLowerCase() === name.trim().toLowerCase() ? top : { id: null, name: name.trim() }
  },

  /** POST /detect with 1–3 photos (RF-DETR Small on the backend). */
  async detect(files: File[], signal?: AbortSignal): Promise<ScanResult> {
    const form = new FormData()
    files.forEach((f) => form.append('photos', f, f.name))
    return toScan(await request<DetectDto>('/detect', { method: 'POST', body: form, signal, timeoutMs: 120_000 }))
  },

  // Loads the chef's tap-to-answer questions.
  async chefQuestions(signal?: AbortSignal): Promise<ChefQuestion[]> {
    return (await request<ChefQuestionsDto>('/chef/questions', { signal })).questions
  },

  /** POST /chef/options: Spoonacular recipes for these ingredients, safety-filtered by the backend. */
  async recipeOptions(ingredients: IngredientRef[], answers: ChefAnswers, signal?: AbortSignal): Promise<RecipeOptions> {
    const body = { ingredients: ingredients.map(({ id, name }) => ({ id, name })), answers: toAnswersDto(answers) }
    return toOptions(await request<OptionsDto>('/chef/options', { method: 'POST', body, auth: true, signal, timeoutMs: 90_000 }))
  },

  /**
   * Recipe search by dish, ingredient or cuisine.
   *
   * The backend has no dedicated recipe-search endpoint yet, so this asks
   * /chef/options with the search term as the only ingredient (Spoonacular's
   * includeIngredients) and the term as a note for the chef. Results go through
   * the same allergy and diet filter as every other recipe. Swap this body for a
   * real search endpoint when one exists (docs/INTEGRATION.md).
   */
  async searchRecipes(term: string, signal?: AbortSignal): Promise<RecipeOptions> {
    const ingredient = await api.resolveIngredient(term)
    throwIfAborted(signal)
    return api.recipeOptions([ingredient], { note: `Find recipes for: ${term.trim()}` }, signal)
  },

  /** POST /chef/recipe: the full recipe scaled to `servings` (FR8). */
  async recipe(option: Pick<RecipeOption, 'optionId' | 'summary' | 'source'>, servings: number, signal?: AbortSignal): Promise<Recipe> {
    const r = await request<RecipeDto>('/chef/recipe', { method: 'POST', body: { option_id: option.optionId, servings }, auth: true, signal, timeoutMs: 60_000 })
    return {
      recipeId: r.recipe_id,
      optionId: option.optionId,
      title: r.title,
      summary: option.summary,
      servings: r.servings,
      minutes: r.minutes,
      ingredients: r.ingredients,
      steps: r.steps,
      safety: { checked: r.safety.checked, allergies: r.safety.allergies.filter(isAllergen), diet: isDiet(r.safety.diet) ? r.safety.diet : 'none' },
      imageUrl: r.image_url,
      source: option.source,
    }
  },

  /** POST /chef/swap: safe replacements for a missing ingredient (FR9). */
  async swaps(recipeId: string, missing: string, signal?: AbortSignal): Promise<Swap[]> {
    return (await request<SwapDto>('/chef/swap', { method: 'POST', body: { recipe_id: recipeId, missing }, auth: true, signal, timeoutMs: 60_000 })).swaps
  },
}
