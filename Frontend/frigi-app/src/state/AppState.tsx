import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { setScenario as apiSetScenario } from '../lib/api'
import { load, remove, save } from '../lib/storage'
import type { ChefPrefs, Profile, ScanResult, ScenarioId } from '../lib/types'

export type ScreenName =
  | 'welcome' | 'signup' | 'login' | 'home' | 'upload' | 'scanning' | 'ingredients' | 'chef'
  | 'recipes' | 'recipe' | 'cook' | 'done' | 'saved' | 'profile' | 'states' | 'state'

export type StateKind =
  | 'no-ingredients' | 'bad-format' | 'too-many' | 'server' | 'no-recipes' | 'expired' | 'allergy' | 'success'

export interface Route { name: ScreenName; params?: Record<string, string | number> }

export interface Photo { id: string; url: string | null; name: string; file?: File; heic?: boolean; sample?: boolean }

export interface Session { kind: 'guest' | 'user'; email?: string }

export const DEMO_PROFILE: Profile = {
  name: 'Alex', householdSize: 2, diet: 'none', allergies: [], allergiesSet: false,
}

const PUBLIC: ScreenName[] = ['welcome', 'signup', 'login', 'state']

interface Ctx {
  route: Route
  go: (name: ScreenName, params?: Route['params']) => void
  back: () => void
  replace: (name: ScreenName, params?: Route['params']) => void
  canGoBack: boolean
  session: Session | null
  startSession: (s: Session, profile?: Profile) => void
  signOut: () => void
  profile: Profile
  setProfile: (p: Profile) => void
  photos: Photo[]
  setPhotos: (p: Photo[]) => void
  scan: ScanResult | null
  setScan: (s: ScanResult | null) => void
  inventory: string[]
  setInventory: (ids: string[]) => void
  prefs: ChefPrefs | null
  setPrefs: (p: ChefPrefs | null) => void
  saved: string[]
  toggleSaved: (id: string) => boolean
  subs: Record<string, Record<string, string>>
  setSub: (recipeId: string, ingredientId: string, subId: string | null) => void
  scenario: ScenarioId
  setScenario: (s: ScenarioId) => void
  toast: string | null
  notify: (msg: string) => void
  resetDemo: () => void
}

const AppCtx = createContext<Ctx | null>(null)

export function AppProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(() => load('session', null))
  const [stack, setStack] = useState<Route[]>(() => [{ name: load<Session | null>('session', null) ? 'home' : 'welcome' }])
  const [profile, setProfileState] = useState<Profile>(() => load('profile', DEMO_PROFILE))
  const [photos, setPhotos] = useState<Photo[]>([])
  const [scan, setScan] = useState<ScanResult | null>(null)
  const [inventory, setInventoryState] = useState<string[]>(() => load('inventory', []))
  const [prefs, setPrefsState] = useState<ChefPrefs | null>(() => load('prefs', null))
  const [saved, setSaved] = useState<string[]>(() => load('saved', []))
  const [subs, setSubs] = useState<Record<string, Record<string, string>>>(() => load('subs', {}))
  const [scenario, setScenarioState] = useState<ScenarioId>('success')
  const [toast, setToast] = useState<string | null>(null)
  const toastTimer = useRef<number | undefined>(undefined)

  useEffect(() => save('profile', profile), [profile])
  useEffect(() => save('inventory', inventory), [inventory])
  useEffect(() => save('prefs', prefs), [prefs])
  useEffect(() => save('saved', saved), [saved])
  useEffect(() => save('subs', subs), [subs])

  const route = stack[stack.length - 1]

  const guard = useCallback((r: Route): Route => {
    if (!PUBLIC.includes(r.name) && scenario === 'expired') return { name: 'state', params: { kind: 'expired' } }
    return r
  }, [scenario])

  const scrollTop = () => { try { window.scrollTo({ top: 0 }) } catch { /* ignore */ } }

  const go = useCallback((name: ScreenName, params?: Route['params']) => {
    setStack((s) => [...s.slice(-30), guard({ name, params })]); scrollTop()
  }, [guard])
  const replace = useCallback((name: ScreenName, params?: Route['params']) => {
    setStack((s) => [...s.slice(0, -1), guard({ name, params })]); scrollTop()
  }, [guard])
  const back = useCallback(() => {
    setStack((s) => (s.length > 1 ? s.slice(0, -1) : [{ name: session ? 'home' : 'welcome' }])); scrollTop()
  }, [session])

  const notify = useCallback((msg: string) => {
    setToast(msg)
    window.clearTimeout(toastTimer.current)
    toastTimer.current = window.setTimeout(() => setToast(null), 2600)
  }, [])

  const startSession = useCallback((s: Session, p?: Profile) => {
    setSession(s); save('session', s)
    if (p) setProfileState(p)
    setStack([{ name: 'home' }]); scrollTop()
  }, [])

  const signOut = useCallback(() => {
    setSession(null); remove('session'); setStack([{ name: 'welcome' }])
  }, [])

  const setScenario = useCallback((s: ScenarioId) => {
    setScenarioState(s); apiSetScenario(s)
    if (s === 'allergy') setProfileState((p) => ({ ...p, allergies: ['dairy'], allergiesSet: true }))
  }, [])

  const toggleSaved = useCallback((id: string) => {
    const now = !saved.includes(id)
    setSaved((s) => (now ? [...s.filter((x) => x !== id), id] : s.filter((x) => x !== id)))
    return now
  }, [saved])

  const setSub = useCallback((recipeId: string, ingredientId: string, subId: string | null) => {
    setSubs((all) => {
      const cur = { ...(all[recipeId] ?? {}) }
      if (subId) cur[ingredientId] = subId; else delete cur[ingredientId]
      return { ...all, [recipeId]: cur }
    })
  }, [])

  const resetDemo = useCallback(() => {
    ;['profile', 'inventory', 'prefs', 'saved', 'subs'].forEach(remove)
    setProfileState(DEMO_PROFILE); setInventoryState([]); setPrefsState(null); setSaved([]); setSubs({})
    setPhotos([]); setScan(null); setScenarioState('success'); apiSetScenario('success')
    setStack([{ name: session ? 'home' : 'welcome' }])
  }, [session])

  const value = useMemo<Ctx>(() => ({
    route, go, back, replace, canGoBack: stack.length > 1,
    session, startSession, signOut,
    profile, setProfile: setProfileState,
    photos, setPhotos, scan, setScan,
    inventory, setInventory: setInventoryState,
    prefs, setPrefs: setPrefsState,
    saved, toggleSaved, subs, setSub,
    scenario, setScenario, toast, notify, resetDemo,
  }), [route, go, back, replace, stack.length, session, startSession, signOut, profile, photos, scan, inventory, prefs, saved, toggleSaved, subs, setSub, scenario, setScenario, toast, notify, resetDemo])

  return <AppCtx.Provider value={value}>{children}</AppCtx.Provider>
}

export function useApp() {
  const c = useContext(AppCtx)
  if (!c) throw new Error('useApp outside provider')
  return c
}
