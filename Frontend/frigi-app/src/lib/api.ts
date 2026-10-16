/**
 * Frigi API client — the ONE place the UI talks to a backend.
 *
 * USE_MOCK_API = true  → everything runs in the browser with demo data.
 * USE_MOCK_API = false → calls the Frigi backend at API_BASE_URL.
 *
 * The backend contract lives in the `frigi` repo at docs/api-contract.md.
 * It was NOT available when this frontend was built, so every real endpoint
 * below is a clearly marked ADAPTER PLACEHOLDER: the paths and payloads are
 * guesses to be replaced with the documented shapes. Nothing here claims to be
 * a confirmed endpoint. Only the adapter functions need to change; the UI uses
 * the typed results.
 */
import { mockLogIn, mockSaveUserProfile, mockSignUp } from './auth'
import { RECIPE_BY_ID } from './data/recipes'
import { mockDetections } from './data/scenarios'
import { recommend, safeSubstitutes } from './recommend'
import type {
  ChefPrefs, Profile, Recipe, RecommendationResult, ScanResult, ScenarioId, Substitute,
} from './types'

export const USE_MOCK_API = true
export const API_BASE_URL = 'http://localhost:8000' // TODO: confirm from docs/api-contract.md

export class ApiError extends Error {
  kind: 'server' | 'expired' | 'validation' | 'network'
  constructor(kind: ApiError['kind'], message: string) {
    super(message)
    this.kind = kind
  }
}

/** Demo-only: the scenario selected in the demo menu changes mock responses. */
let scenario: ScenarioId = 'success'
export const setScenario = (s: ScenarioId) => { scenario = s }
export const getScenario = () => scenario

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms))

// ---------------------------------------------------------------------------
// Real-mode helper (placeholder until the contract is wired in)
// ---------------------------------------------------------------------------
let token: string | null = null
async function http<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(API_BASE_URL + path, {
    ...init,
    headers: {
      ...(init.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init.headers,
    },
  }).catch(() => { throw new ApiError('network', 'We couldn’t reach Frigi’s kitchen. Check your connection.') })
  if (res.status === 401) throw new ApiError('expired', 'Your session has expired.')
  if (res.status >= 500) throw new ApiError('server', 'Frigi’s AI is busy right now.')
  if (!res.ok) throw new ApiError('validation', (await res.text()) || 'Request failed')
  return res.json() as Promise<T>
}

// ---------------------------------------------------------------------------
// Public API used by the UI
// ---------------------------------------------------------------------------
export const api = {
  async signUp(email: string, password: string, profile: Profile): Promise<Profile> {
    if (USE_MOCK_API) { await wait(500); return mockSignUp(email, password, profile) }
    // ADAPTER PLACEHOLDER — replace with documented auth/register shape
    const r = await http<{ token: string; profile: Profile }>('/auth/register', { method: 'POST', body: JSON.stringify({ email, password, ...profile }) })
    token = r.token
    return r.profile
  },

  async logIn(email: string, password: string): Promise<Profile> {
    if (USE_MOCK_API) { await wait(500); return mockLogIn(email, password) }
    // ADAPTER PLACEHOLDER
    const r = await http<{ token: string; profile: Profile }>('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) })
    token = r.token
    return r.profile
  },

  async saveProfile(profile: Profile): Promise<Profile> {
    if (USE_MOCK_API) { await wait(250); mockSaveUserProfile(profile); return profile }
    // ADAPTER PLACEHOLDER — the backend already supports profile saving
    return http<Profile>('/profile', { method: 'PUT', body: JSON.stringify(profile) })
  },

  /** Ingredient detection (RF-DETR Small on the backend). */
  async scanFridge(photos: File[], photoCount = photos.length): Promise<ScanResult> {
    if (USE_MOCK_API) {
      await wait(2400)
      if (scenario === 'server') throw new ApiError('server', 'Frigi’s AI is busy right now.')
      if (scenario === 'expired') throw new ApiError('expired', 'Your session has expired.')
      return { source: 'mock', model: 'RF-DETR Small (simulated)', detections: mockDetections(scenario, photoCount) }
    }
    // ADAPTER PLACEHOLDER — backend already supports detection; map its response here
    const form = new FormData()
    photos.forEach((p) => form.append('images', p))
    const r = await http<ScanResult>('/detect', { method: 'POST', body: form })
    return { ...r, source: 'live' }
  },

  async confirmIngredients(ids: string[]): Promise<string[]> {
    if (USE_MOCK_API) return ids
    // ADAPTER PLACEHOLDER
    return http<string[]>('/inventory', { method: 'PUT', body: JSON.stringify({ ingredients: ids }) })
  },

  /** Recipe recommendations (Spoonacular + Gemini ranking, planned). */
  async recommendations(inventory: string[], prefs: ChefPrefs | null, profile: Profile): Promise<RecommendationResult> {
    if (USE_MOCK_API) {
      await wait(300)
      const r = recommend(inventory, prefs, profile)
      return scenario === 'nomatch' ? { items: [], hidden: r.hidden } : r
    }
    // ADAPTER PLACEHOLDER — planned Spoonacular-backed endpoint
    return http<RecommendationResult>('/recipes/recommend', { method: 'POST', body: JSON.stringify({ inventory, prefs }) })
  },

  async recipe(id: string): Promise<Recipe | undefined> {
    if (USE_MOCK_API) return RECIPE_BY_ID[id]
    return http<Recipe>(`/recipes/${encodeURIComponent(id)}`) // ADAPTER PLACEHOLDER
  },

  async substitutes(ingredientId: string, profile: Profile): Promise<Substitute[]> {
    if (USE_MOCK_API) { await wait(500); return safeSubstitutes(ingredientId, profile) }
    return http<Substitute[]>(`/substitutes/${encodeURIComponent(ingredientId)}`) // ADAPTER PLACEHOLDER
  },

  /**
   * Chef conversation (Gemini, planned). In demo mode Chef Frigi's lines are
   * scripted in screens/Chef.tsx; this hook is where a live model reply would go.
   */
  async chefReply(_history: { role: 'user' | 'frigi'; text: string }[]): Promise<string | null> {
    if (USE_MOCK_API) return null
    const r = await http<{ reply: string }>('/chef/chat', { method: 'POST', body: JSON.stringify({ history: _history }) }) // ADAPTER PLACEHOLDER
    return r.reply
  },
}
