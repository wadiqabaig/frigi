import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { api, setAuthToken, setAuthTokenProvider, setUnauthorizedHandler, type AuthSession } from '../lib/api'
import { deleteAccount as deleteCognitoAccount, idToken, logOut } from '../lib/auth'
import { USE_COGNITO } from '../lib/config'
import { load, remove, removeLegacyDemoData, save, userKey } from '../lib/storage'
import type {
  ChefAnswers, IngredientRef, InventoryItem, Profile, Recipe, RecipeOption, RecipeOptions, RecipeOrigin, SavedRecipe, ScanResult, User,
} from '../lib/types'

export type ScreenName =
  | 'welcome' | 'signup' | 'login' | 'forgot' | 'home' | 'upload' | 'scanning' | 'ingredients' | 'chef'
  | 'recipes' | 'recipe' | 'cook' | 'done' | 'saved' | 'profile' | 'state'

export type StateKind =
  | 'no-ingredients' | 'bad-format' | 'too-many' | 'server' | 'no-recipes' | 'expired' | 'allergy' | 'success'

export interface Route { name: ScreenName; params?: Record<string, string | number> }

export interface Photo { id: string; url: string | null; name: string; file: File; heic?: boolean }

/** The last chef request and its options. The backend keeps options for 2 hours. */
export interface ChefSession { answers: ChefAnswers; ingredients: IngredientRef[]; result: RecipeOptions; createdAt: number }
/** The last recipe search and its results. */
export interface SearchSession { term: string; result: RecipeOptions; createdAt: number }

const PUBLIC: ScreenName[] = ['welcome', 'signup', 'login', 'forgot', 'state']
const OPTION_TTL_MS = 2 * 60 * 60 * 1000 - 60_000

interface StoredAuth { token: string; user: User }

// With Cognito, every request asks Amplify for a fresh ID token.
if (USE_COGNITO) setAuthTokenProvider(idToken)

interface Ctx {
  route: Route
  go: (name: ScreenName, params?: Route['params']) => void
  back: () => void
  replace: (name: ScreenName, params?: Route['params']) => void
  canGoBack: boolean
  boot: 'loading' | 'ready' | 'offline'
  retryBoot: () => void
  user: User | null
  profile: Profile | null
  setProfile: (p: Profile) => void
  /** Starts a session after log-in. With Cognito there is no AuthSession: its token is read per request. */
  startSession: (s?: AuthSession, prefs?: Partial<Omit<Profile, 'id' | 'email' | 'chefNotes'>>) => Promise<void>
  signOut: () => void
  deleteAccount: () => Promise<void>
  photos: Photo[]
  setPhotos: (p: Photo[]) => void
  scan: ScanResult | null
  setScan: (s: ScanResult | null) => void
  inventory: InventoryItem[]
  setInventory: (items: InventoryItem[]) => void
  chef: ChefSession | null
  setChef: (c: ChefSession | null) => void
  search: SearchSession | null
  setSearch: (s: SearchSession | null) => void
  findOption: (optionId: string) => { option: RecipeOption; origin: RecipeOrigin } | null
  recipes: Record<string, Recipe>
  rememberRecipe: (r: Recipe) => void
  saved: SavedRecipe[]
  isSaved: (r: Pick<Recipe, 'optionId' | 'title'>) => boolean
  toggleSaved: (r: Recipe) => boolean
  subs: Record<string, Record<string, string>>
  setSub: (recipeId: string, ingredient: string, swap: string | null) => void
  toast: string | null
  notify: (msg: string) => void
}

const AppCtx = createContext<Ctx | null>(null)

const NO_ITEMS: InventoryItem[] = []
const NO_SAVED: SavedRecipe[] = []
const NO_RECIPES: Record<string, Recipe> = {}

/** Per-user persisted state: reloads when the signed-in user changes. */
function useUserStore<T>(key: string, uid: number | null, fallback: T, where: 'local' | 'session' = 'local') {
  // Loads the stored value for this user, or the fallback when signed out.
  const read = (id: number | null) => (id ? load<T>(userKey(key, id), fallback, where) : fallback)
  const [state, setState] = useState(() => ({ uid, value: read(uid) }))
  let value = state.value
  if (state.uid !== uid) {
    value = read(uid)
    setState({ uid, value })
  }
  // Updates the value and saves it for the current user.
  const set = useCallback((next: T | ((prev: T) => T)) => {
    setState((s) => {
      const v = typeof next === 'function' ? (next as (p: T) => T)(s.value) : next
      if (s.uid) save(userKey(key, s.uid), v, where)
      return { uid: s.uid, value: v }
    })
  }, [key, where])
  return [value, set] as const
}

// Reads the JWT's `exp` claim; a token that can't be read is left for the backend to judge.
function tokenExpired(token: string) {
  try {
    const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')))
    return typeof payload.exp === 'number' && payload.exp * 1000 <= Date.now()
  } catch {
    return false
  }
}

// Drops chef results older than the backend keeps them.
const fresh = <T extends { createdAt: number }>(v: T | null) => (v && Date.now() - v.createdAt < OPTION_TTL_MS ? v : null)
// Treats recipes with the same option or title as the same saved recipe.
const sameRecipe = (a: Pick<Recipe, 'optionId' | 'title'>, b: Pick<Recipe, 'optionId' | 'title'>) =>
  a.optionId === b.optionId || a.title.trim().toLowerCase() === b.title.trim().toLowerCase()

// Holds navigation, the signed-in session and per-user data for the whole app.
export function AppProvider({ children }: { children: ReactNode }) {
  // Restore a remembered session once, on start. An expired token is dropped
  // and the user is told, rather than silently landing on the welcome screen.
  const [initial] = useState(() => {
    removeLegacyDemoData()
    const stored = load<StoredAuth | null>('auth', null)
    // Cognito keeps its own session; the backend answers 401 if it has ended.
    if (stored && USE_COGNITO) return { auth: stored, expired: false }
    if (stored && !tokenExpired(stored.token)) { setAuthToken(stored.token); return { auth: stored, expired: false } }
    if (stored) remove('auth')
    return { auth: null, expired: !!stored }
  })
  const [auth, setAuth] = useState<StoredAuth | null>(initial.auth)
  const [boot, setBoot] = useState<Ctx['boot']>(initial.auth ? 'loading' : 'ready')
  const [profile, setProfile] = useState<Profile | null>(null)
  const [stack, setStack] = useState<Route[]>(() => [
    initial.auth ? { name: 'home' } : initial.expired ? { name: 'state', params: { kind: 'expired' } } : { name: 'welcome' },
  ])
  const [photos, setPhotos] = useState<Photo[]>([])
  const [scan, setScan] = useState<ScanResult | null>(null)
  const [search, setSearch] = useState<SearchSession | null>(null)
  const [subs, setSubs] = useState<Record<string, Record<string, string>>>({})
  const [toast, setToast] = useState<string | null>(null)
  const toastTimer = useRef<number | undefined>(undefined)

  const uid = auth?.user.id ?? null
  const [inventory, setInventory] = useUserStore<InventoryItem[]>('inventory', uid, NO_ITEMS)
  const [saved, setSaved] = useUserStore<SavedRecipe[]>('saved', uid, NO_SAVED)
  const [chefRaw, setChef] = useUserStore<ChefSession | null>('chef', uid, null, 'session')
  const [recipes, setRecipes] = useUserStore<Record<string, Recipe>>('recipes', uid, NO_RECIPES, 'session')
  const chef = fresh(chefRaw)

  // Scrolls to the top after navigating.
  const scrollTop = () => { try { window.scrollTo({ top: 0 }) } catch { /* ignore */ } }

  // Forgets the token, profile and anything tied to the session.
  const clearSession = useCallback(() => {
    remove('auth')
    setAuthToken(null)
    setAuth(null)
    setProfile(null)
    setPhotos([]); setScan(null); setSearch(null); setSubs({})
    setBoot('ready')
  }, [])

  // Any authenticated request that comes back 401 ends the session.
  useEffect(() => {
    setUnauthorizedHandler(() => {
      clearSession()
      setStack([{ name: 'state', params: { kind: 'expired' } }])
    })
    return () => setUnauthorizedHandler(null)
  }, [clearSession])

  // Load the real profile for a remembered session.
  const [bootTry, setBootTry] = useState(0)
  useEffect(() => {
    if (!auth || profile) return
    const ctrl = new AbortController()
    setBoot('loading')
    api.getProfile(ctrl.signal)
      .then((p) => { setProfile(p); setBoot('ready') })
      .catch((e) => { if (!ctrl.signal.aborted && e?.kind !== 'unauthorized') setBoot('offline') })
    return () => ctrl.abort()
  }, [auth, profile, bootTry])

  const route = stack[stack.length - 1]
  const signedIn = !!auth

  // Sends signed-out users to the login page for any private screen.
  const guard = useCallback((r: Route): Route => (signedIn || PUBLIC.includes(r.name) ? r : { name: 'login' }), [signedIn])

  // Opens a screen on top of the history.
  const go = useCallback((name: ScreenName, params?: Route['params']) => {
    setStack((s) => [...s.slice(-30), guard({ name, params })]); scrollTop()
  }, [guard])
  // Swaps the current screen without adding history.
  const replace = useCallback((name: ScreenName, params?: Route['params']) => {
    setStack((s) => [...s.slice(0, -1), guard({ name, params })]); scrollTop()
  }, [guard])
  // Returns to the previous screen, or home if there is none.
  const back = useCallback(() => {
    setStack((s) => (s.length > 1 ? s.slice(0, -1) : [{ name: signedIn ? 'home' : 'welcome' }])); scrollTop()
  }, [signedIn])

  // Shows a toast for a few seconds.
  const notify = useCallback((msg: string) => {
    setToast(msg)
    window.clearTimeout(toastTimer.current)
    toastTimer.current = window.setTimeout(() => setToast(null), 2600)
  }, [])

  // Stores a new session after sign-up or log-in, once its profile has loaded.
  const startSession = useCallback(async (s?: AuthSession, prefs?: Partial<Omit<Profile, 'id' | 'email' | 'chefNotes'>>) => {
    if (s) setAuthToken(s.token)
    let p: Profile
    try {
      p = await api.getProfile()
      // Allergies, diet and household from the sign-up form, saved once the account exists.
      if (prefs && Object.keys(prefs).length) p = await api.updateProfile(prefs)
    } catch (e) { setAuthToken(null); throw e }
    const stored = { token: s?.token ?? '', user: s?.user ?? { id: p.id, name: p.name, email: p.email } }
    save('auth', stored)
    setAuth(stored)
    setProfile(p)
    setBoot('ready')
    setStack([{ name: 'home' }]); scrollTop()
  }, [])

  // Ends the session on this device and returns to the welcome page.
  const signOut = useCallback(() => {
    if (auth) {
      remove(userKey('chef', auth.user.id), 'session')
      remove(userKey('recipes', auth.user.id), 'session')
    }
    clearSession()
    if (USE_COGNITO) void logOut()
    setStack([{ name: 'welcome' }])
  }, [auth, clearSession])

  // Deletes the profile on the backend, then the Cognito account, then this device's copies.
  const deleteAccount = useCallback(async () => {
    await api.deleteProfile()
    if (USE_COGNITO) await deleteCognitoAccount()
    if (auth) {
      for (const k of ['inventory', 'saved']) remove(userKey(k, auth.user.id))
      for (const k of ['chef', 'recipes']) remove(userKey(k, auth.user.id), 'session')
    }
    clearSession()
    setStack([{ name: 'welcome' }])
  }, [auth, clearSession])

  // Finds a recipe option in the chef results or the search results.
  const findOption = useCallback((optionId: string) => {
    const f = chef?.result.options.find((o) => o.optionId === optionId)
    if (f) return { option: f, origin: 'fridge' as const }
    const s = search?.result.options.find((o) => o.optionId === optionId)
    return s ? { option: s, origin: 'search' as const } : null
  }, [chef, search])

  // Keeps a fetched recipe so cooking mode can open it.
  const rememberRecipe = useCallback((r: Recipe) => setRecipes((all) => ({ ...all, [r.recipeId]: r })), [setRecipes])

  // True when this recipe is already in the saved list.
  const isSaved = useCallback((r: Pick<Recipe, 'optionId' | 'title'>) => saved.some((s) => sameRecipe(s, r)), [saved])
  // Saves or unsaves a recipe; returns true when it is now saved.
  const toggleSaved = useCallback((r: Recipe) => {
    const now = !saved.some((s) => sameRecipe(s, r))
    setSaved((list) => (now ? [{ ...r, savedAt: Date.now() }, ...list.filter((s) => !sameRecipe(s, r))] : list.filter((s) => !sameRecipe(s, r))))
    return now
  }, [saved, setSaved])

  // Records (or clears) a swap chosen for one ingredient of a recipe.
  const setSub = useCallback((recipeId: string, ingredient: string, swap: string | null) => {
    setSubs((all) => {
      const cur = { ...(all[recipeId] ?? {}) }
      if (swap) cur[ingredient] = swap; else delete cur[ingredient]
      return { ...all, [recipeId]: cur }
    })
  }, [])

  const value = useMemo<Ctx>(() => ({
    route, go, back, replace, canGoBack: stack.length > 1,
    boot, retryBoot: () => setBootTry((n) => n + 1),
    user: auth?.user ?? null, profile, setProfile, startSession, signOut, deleteAccount,
    photos, setPhotos, scan, setScan,
    inventory, setInventory,
    chef, setChef, search, setSearch, findOption,
    recipes, rememberRecipe, saved, isSaved, toggleSaved, subs, setSub,
    toast, notify,
  }), [route, go, back, replace, stack.length, boot, auth, profile, startSession, signOut, deleteAccount, photos, scan, inventory, setInventory, chef, setChef, search, findOption, recipes, rememberRecipe, saved, isSaved, toggleSaved, subs, setSub, toast, notify])

  return <AppCtx.Provider value={value}>{children}</AppCtx.Provider>
}

// Access to the app state from any component.
export function useApp() {
  const c = useContext(AppCtx)
  if (!c) throw new Error('useApp outside provider')
  return c
}

/**
 * The route a page was opened with. While a page animates out, the app's current route has
 * already changed; reading this instead keeps the leaving page unchanged so the transition
 * can finish (otherwise it re-renders as "recipe expired" and the next page never appears).
 */
export const PageRouteContext = createContext<Route | null>(null)
export function usePageRoute(): Route {
  const page = useContext(PageRouteContext)
  const { route } = useApp()
  return page ?? route
}

/** The signed-in user's profile. Only call from screens behind the login guard. */
export function useProfile(): Profile {
  const { profile } = useApp()
  if (!profile) throw new Error('useProfile before the profile loaded')
  return profile
}
