import { motion } from 'framer-motion'
import { ArrowLeft, ChefHat, Loader2, Pencil, Search, ShieldCheck, X } from 'lucide-react'
import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { POSES } from '../assets'
import { RecipeCard } from '../components/RecipeCard'
import { JourneySteps } from '../components/Shell'
import { Button, Chip, IconButton, Mascot, Pill } from '../components/ui'
import { api, isAborted, toApiError, type ApiError } from '../lib/api'
import { splitIngredients } from '../lib/recipes'
import type { Profile, RecipeOptions, RecipeOrigin } from '../lib/types'
import { ALLERGEN_LABEL, DIET_LABEL } from '../lib/vocab'
import { useApp, useProfile } from '../state/AppState'

/** Why a list is short or empty, in plain words. Never silent. */
function SafetyNotes({ result, profile }: { result: RecipeOptions; profile: Profile }) {
  const { go } = useApp()
  const filtered = result.removedBySafetyFilter
  if (!filtered && !result.notice && profile.diet !== 'halal') return null
  return (
    <div className="mt-4 space-y-2">
      {(filtered > 0 || result.notice) && (
        <div className="flex flex-wrap items-center gap-3 rounded-3xl bg-white p-3 pl-4 shadow-soft">
          <ShieldCheck size={18} className="shrink-0 text-leaf" />
          <p className="min-w-0 flex-1 text-sm font-semibold text-brown">
            {filtered > 0 && `Frigi’s safety filter left out ${filtered} recipe${filtered > 1 ? 's' : ''} that conflict${filtered === 1 ? 's' : ''} with your allergies or diet. `}
            {result.notice}
          </p>
          <button onClick={() => go('profile')} className="text-sm font-bold text-red hover:underline">Review preferences</button>
        </div>
      )}
      {profile.diet === 'halal' && (
        <p className="rounded-3xl bg-sun-50 p-3 pl-4 text-sm text-brown">
          <span className="font-bold">Halal:</span> recipes are screened for pork, alcohol and gelatine. Frigi can’t verify how meat was sourced or slaughtered, so check for halal certification when you buy it.
        </p>
      )}
    </div>
  )
}

// Lists the chef's recipes for the user's fridge, plus recipe search results.
export function Recipes() {
  const { chef, search, setSearch, inventory, go, back } = useApp()
  const profile = useProfile()
  const [view, setView] = useState<RecipeOrigin>(search && !chef ? 'search' : 'fridge')
  const [filter, setFilter] = useState<'all' | 'time' | 'ready'>('all')
  const [term, setTerm] = useState(search?.term ?? '')
  const [searching, setSearching] = useState(false)
  const [searchError, setSearchError] = useState<ApiError | null>(null)
  const ctrl = useRef<AbortController | null>(null)

  useEffect(() => () => ctrl.current?.abort(), [])

  // Runs a recipe search, cancelling any search still in progress.
  const runSearch = async (e?: FormEvent) => {
    e?.preventDefault()
    const t = term.trim()
    if (!t) return
    ctrl.current?.abort()
    const c = new AbortController()
    ctrl.current = c
    setView('search'); setSearching(true); setSearchError(null)
    try {
      const result = await api.searchRecipes(t, c.signal)
      setSearch({ term: t, result, createdAt: Date.now() })
    } catch (err) {
      if (isAborted(err)) return
      setSearch(null)
      setSearchError(toApiError(err, 'Recipe search failed. Please try again.'))
    } finally { if (ctrl.current === c) setSearching(false) }
  }
  // Cancels and clears the search, returning to the fridge recipes.
  const clearSearch = () => { ctrl.current?.abort(); setSearching(false); setSearch(null); setSearchError(null); setTerm(''); setView('fridge') }

  const result = view === 'fridge' ? chef?.result ?? null : search?.result ?? null
  const items = useMemo(() => {
    const all = result?.options ?? []
    if (filter === 'time' && chef?.answers.maxMinutes) return all.filter((o) => !o.minutes || o.minutes <= chef.answers.maxMinutes!)
    if (filter === 'ready') return all.filter((o) => splitIngredients(o, view, inventory).missing.length === 0)
    return all
  }, [result, filter, chef, view, inventory])

  return (
    <div>
      <div className="mb-5 flex items-center gap-3 pr-12 lg:pr-0">
        <IconButton label="Back" onClick={back}><ArrowLeft size={20} /></IconButton>
        <JourneySteps />
      </div>

      <header className="relative overflow-hidden rounded-5xl bg-cream p-6 sm:p-8">
        <div aria-hidden className="absolute -right-10 -top-24 h-72 w-72 rounded-full bg-sun/35" />
        <div className="relative grid items-center gap-4 sm:grid-cols-[1fr_auto]">
          <div className="min-w-0">
            <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-red">{view === 'search' ? 'Recipe search' : 'Chef Frigi recommends'}</p>
            <h1 className="mt-1 font-display text-[30px] font-semibold leading-tight text-brown sm:text-[40px] [text-wrap:balance]">
              {view === 'search'
                ? search ? `Recipes for “${search.term}”` : 'Find a recipe'
                : chef ? `${chef.result.options.length} recipe${chef.result.options.length === 1 ? '' : 's'} from your fridge` : 'Your recipes'}
            </h1>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {view === 'fridge' && chef && (<>
                {chef.answers.cuisine && <Pill tone="white">{chef.answers.cuisine}</Pill>}
                {chef.answers.mood && <Pill tone="white">{chef.answers.mood}</Pill>}
                {chef.answers.maxMinutes && <Pill tone="white">{chef.answers.maxMinutes} min</Pill>}
                {chef.answers.servings && <Pill tone="white">Serves {chef.answers.servings}</Pill>}
                <button onClick={() => go('chef')} className="inline-flex items-center gap-1 rounded-full bg-brown px-3 py-1 text-xs font-bold text-white hover:bg-red"><Pencil size={11} /> Change</button>
              </>)}
              {profile.diet !== 'none' && <Pill tone="leaf">{DIET_LABEL[profile.diet]}</Pill>}
              {profile.allergies.map((a) => <Pill key={a} tone="red">No {ALLERGEN_LABEL[a].toLowerCase()}</Pill>)}
            </div>
          </div>
          <div className="absolute -bottom-10 -right-4 w-[120px] sm:static sm:w-[170px]"><Mascot pose="recommends" size="100%" /></div>
        </div>
      </header>

      {/* Recipe search: by dish, ingredient or cuisine. Submitted, not per keystroke, because each search is a real Spoonacular lookup. */}
      <form onSubmit={runSearch} role="search" className="mt-5 flex gap-2">
        <label htmlFor="recipe-search" className="sr-only">Search recipes by dish, ingredient or cuisine</label>
        <div className="relative min-w-0 flex-1">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-brown-50" />
          <input id="recipe-search" value={term} onChange={(e) => setTerm(e.target.value)} maxLength={60} placeholder="Search recipes: beef, biryani, ramen, Italian…" autoComplete="off" className="h-12 w-full rounded-full bg-white pl-11 pr-11 text-[15px] text-brown shadow-soft ring-1 ring-inset ring-cream placeholder:text-brown-50 focus:outline-none focus:ring-2 focus:ring-red" />
          {(term || search) && <button type="button" onClick={clearSearch} aria-label="Clear recipe search" className="absolute right-2 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-full text-brown-50 hover:bg-cream-50"><X size={16} /></button>}
        </div>
        <Button type="submit" disabled={!term.trim() || searching} icon={searching ? <Loader2 size={17} className="animate-spin" /> : <Search size={17} />}>Search</Button>
      </form>

      {(chef || search || searching || searchError) && (
        <div className="mt-4 flex flex-wrap gap-2" role="tablist" aria-label="Recipe lists">
          <Chip size="sm" role="tab" aria-selected={view === 'fridge'} selected={view === 'fridge'} onClick={() => setView('fridge')}>From your fridge</Chip>
          {(search || searching || searchError) && <Chip size="sm" role="tab" aria-selected={view === 'search'} selected={view === 'search'} onClick={() => setView('search')}>Search results</Chip>}
        </div>
      )}

      {view === 'search' && searching ? (
        <div className="mt-6 flex flex-col items-center rounded-5xl bg-white py-10 shadow-soft" role="status">
          <Mascot pose="scanning" size={150} motionKind="tilt" />
          <p className="mt-3 font-display text-xl font-semibold text-brown">Searching recipes for “{term.trim()}”…</p>
          <p className="text-sm text-brown-70">Checking each one against your allergies and diet.</p>
        </div>
      ) : view === 'search' && searchError ? (
        <div className="mt-6 flex flex-col items-center rounded-5xl bg-white px-6 py-10 text-center shadow-soft" role="alert">
          <Mascot pose={searchError.code === 'NO_SAFE_RECIPES' ? 'allergy' : 'error'} size={150} />
          <p className="mt-3 font-display text-xl font-semibold text-brown">{searchError.code === 'NO_SAFE_RECIPES' ? 'No safe recipes found' : 'Recipe search didn’t work'}</p>
          <p className="mt-1 max-w-md text-sm text-brown-70">
            {searchError.message}
            {searchError.code === 'NO_SAFE_RECIPES' && (profile.allergies.length || profile.diet !== 'none') ? ' Your allergy and diet filters may have ruled out every match.' : ''}
          </p>
          <div className="mt-4 flex gap-2">
            <Button onClick={() => runSearch()}>Try again</Button>
            {searchError.code === 'NO_SAFE_RECIPES' && <Button variant="secondary" onClick={() => go('profile')}>Review preferences</Button>}
          </div>
        </div>
      ) : !result ? (
        <div className="mt-6 flex flex-col items-center rounded-5xl bg-white px-6 py-10 text-center shadow-soft">
          <div className="relative grid place-items-center"><div className="absolute h-48 w-48 rounded-full bg-sun-50" aria-hidden /><Mascot pose="mealPlan" size={160} /></div>
          <h2 className="mt-4 font-display text-2xl font-semibold text-brown">No recommendations yet</h2>
          <p className="mt-1 max-w-sm text-brown-70">Tell Chef Frigi what you’re in the mood for to get recipes that use your ingredients, or search above.</p>
          <Button className="mt-5" icon={<ChefHat size={18} />} onClick={() => go('chef')}>Ask Chef Frigi</Button>
        </div>
      ) : (
        <>
          <SafetyNotes result={result} profile={profile} />
          <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap gap-2" role="group" aria-label="Filter recipes">
              <Chip size="sm" selected={filter === 'all'} onClick={() => setFilter('all')}>All</Chip>
              {view === 'fridge' && chef?.answers.maxMinutes ? <Chip size="sm" selected={filter === 'time'} onClick={() => setFilter('time')}>Fits {chef.answers.maxMinutes} min</Chip> : null}
              <Chip size="sm" selected={filter === 'ready'} onClick={() => setFilter('ready')}>Nothing missing</Chip>
            </div>
          </div>
          {items.length ? (
            <div className="mt-4 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {items.map((o, i) => <RecipeCard key={o.optionId} option={o} origin={view} index={i} />)}
            </div>
          ) : (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-6 flex items-center gap-4 rounded-4xl bg-white p-5 shadow-soft">
              <img src={POSES.error} alt="" className="h-20 w-auto" />
              <p className="text-brown-70">No recipes match this filter. <button className="font-bold text-red hover:underline" onClick={() => setFilter('all')}>Show all</button></p>
            </motion.div>
          )}
        </>
      )}
    </div>
  )
}
