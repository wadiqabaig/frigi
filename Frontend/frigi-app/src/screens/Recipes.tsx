import { motion } from 'framer-motion'
import { ArrowLeft, EyeOff, Info, Pencil, ShieldAlert } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { POSES } from '../assets'
import { CUISINE_LABEL, RecipeCard } from '../components/RecipeCard'
import { JourneySteps } from '../components/Shell'
import { Chip, IconButton, Mascot, Pill } from '../components/ui'
import { api } from '../lib/api'
import { ALLERGEN_LABEL, DIET_LABEL } from '../lib/data/ingredients'
import type { RecommendationResult } from '../lib/types'
import { useApp } from '../state/AppState'
import { StateView } from './States'

const MOOD_LABEL: Record<string, string> = { quick: 'Quick & Easy', comfort: 'Comfort Food', healthy: 'Healthy', new: 'Something New' }

export function Recipes() {
  const { inventory, prefs, profile, go, back } = useApp()
  const [res, setRes] = useState<RecommendationResult | null>(null)
  const [filter, setFilter] = useState<'all' | 'time' | 'ready'>('all')
  const [showHidden, setShowHidden] = useState(false)

  useEffect(() => { let on = true; api.recommendations(inventory, prefs, profile).then((r) => on && setRes(r)); return () => { on = false } }, [inventory, prefs, profile])

  const items = useMemo(() => {
    const all = res?.items ?? []
    if (filter === 'time') return all.filter((r) => r.fitsTime)
    if (filter === 'ready') return all.filter((r) => r.missing.length === 0)
    return all
  }, [res, filter])

  if (!res) return (
    <div className="grid min-h-[60vh] place-items-center"><Mascot pose="scanning" size={160} motionKind="tilt" /></div>
  )
  if (res.items.length === 0) return (
    <div>
      <div className="mb-4 flex items-center gap-3"><IconButton label="Back" onClick={back}><ArrowLeft size={20} /></IconButton><JourneySteps /></div>
      <StateView kind="no-recipes" />
    </div>
  )

  return (
    <div>
      <div className="mb-5 flex items-center gap-3 pr-12 lg:pr-0">
        <IconButton label="Back" onClick={back}><ArrowLeft size={20} /></IconButton>
        <JourneySteps />
      </div>

      <header className="relative overflow-hidden rounded-5xl bg-cream p-6 sm:p-8">
        <div aria-hidden className="absolute -right-10 -top-24 h-72 w-72 rounded-full bg-sun/35" />
        <div className="relative grid items-center gap-4 sm:grid-cols-[1fr_auto]">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-red">Chef Frigi recommends</p>
            <h1 className="mt-1 font-display text-[30px] font-semibold leading-tight text-brown sm:text-[40px] [text-wrap:balance]">{res.items.length} recipe{res.items.length === 1 ? '' : 's'} from your fridge</h1>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {prefs ? (<>
                <Pill tone="white">{prefs.cuisine === 'any' ? 'Any cuisine' : CUISINE_LABEL[prefs.cuisine]}</Pill>
                <Pill tone="white">{MOOD_LABEL[prefs.mood]}</Pill>
                <Pill tone="white">{prefs.time ? `${prefs.time} min` : 'No rush'}</Pill>
                <Pill tone="white">Serves {prefs.servings}</Pill>
              </>) : <Pill tone="white">Based on your ingredients</Pill>}
              {profile.diet !== 'none' && <Pill tone="leaf">{DIET_LABEL[profile.diet]}</Pill>}
              {profile.allergies.map((a) => <Pill key={a} tone="red">No {ALLERGEN_LABEL[a].toLowerCase()}</Pill>)}
              <button onClick={() => go('chef')} className="inline-flex items-center gap-1 rounded-full bg-brown px-3 py-1 text-xs font-bold text-white hover:bg-red"><Pencil size={11} /> Change</button>
            </div>
          </div>
          <div className="absolute -bottom-10 -right-4 w-[120px] sm:static sm:w-[170px]"><Mascot pose="recommends" size="100%" /></div>
        </div>
      </header>

      {/* Notices */}
      <div className="mt-4 space-y-2">
        {res.hidden.length > 0 && (
          <div className="rounded-3xl bg-white p-3 pl-4 shadow-soft">
            <div className="flex flex-wrap items-center gap-3">
              <EyeOff size={18} className="shrink-0 text-brown-70" />
              <p className="min-w-0 flex-1 text-sm font-semibold text-brown">Frigi hid {res.hidden.length} recipe{res.hidden.length > 1 ? 's' : ''} because {res.hidden.length > 1 ? 'they conflict' : 'it conflicts'} with your food preferences.</p>
              <button onClick={() => setShowHidden(!showHidden)} aria-expanded={showHidden} className="text-sm font-bold text-red hover:underline">{showHidden ? 'Hide details' : 'Why?'}</button>
            </div>
            {showHidden && (
              <motion.ul initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="mt-2 space-y-1 pl-8 text-sm text-brown-70">
                {res.hidden.map((h) => <li key={h.recipe.id}><span className="font-bold text-brown">{h.recipe.title}</span>: {h.reason}</li>)}
              </motion.ul>
            )}
          </div>
        )}
        {!profile.allergiesSet && (
          <div className="flex flex-wrap items-center gap-3 rounded-3xl bg-sun-50 p-3 pl-4">
            <ShieldAlert size={18} className="shrink-0 text-sun-700" />
            <p className="min-w-0 flex-1 text-sm font-semibold text-brown">Allergies not yet specified. Add them so Frigi can filter recipes for you.</p>
            <button onClick={() => go('profile')} className="text-sm font-bold text-red hover:underline">Set allergies</button>
          </div>
        )}
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2" role="group" aria-label="Filter recipes">
          <Chip size="sm" selected={filter === 'all'} onClick={() => setFilter('all')}>All</Chip>
          {prefs?.time ? <Chip size="sm" selected={filter === 'time'} onClick={() => setFilter('time')}>Fits {prefs.time} min</Chip> : null}
          <Chip size="sm" selected={filter === 'ready'} onClick={() => setFilter('ready')}>Nothing missing</Chip>
        </div>
        <p className="inline-flex items-center gap-1 text-xs font-semibold text-brown-50"><Info size={13} /> Sorted by how well each fits your fridge and answers</p>
      </div>

      {items.length ? (
        <div className="mt-4 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {items.map((r, i) => <RecipeCard key={r.recipe.id} rec={r} index={i} servings={prefs?.servings} />)}
        </div>
      ) : (
        <div className="mt-6 flex items-center gap-4 rounded-4xl bg-white p-5 shadow-soft">
          <img src={POSES.error} alt="" className="h-20 w-auto" />
          <p className="text-brown-70">No recipes match this filter. <button className="font-bold text-red hover:underline" onClick={() => setFilter('all')}>Show all</button></p>
        </div>
      )}
    </div>
  )
}
