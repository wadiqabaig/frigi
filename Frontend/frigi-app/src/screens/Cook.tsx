import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { ArrowLeft, ArrowRight, Bookmark, Home, Pause, Play, RotateCcw, Timer, X } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { ICONS } from '../assets'
import { IngredientIcon } from '../components/IngredientIcon'
import { Button, IconButton, Mascot } from '../components/ui'
import { useRecipeRows } from '../hooks/useRecipeRows'
import { cx } from '../lib/format'
import { stepMinutes } from '../lib/recipes'
import { words } from '../lib/text'
import type { Recipe } from '../lib/types'
import { useApp } from '../state/AppState'
import { StateView } from './States'

const STEP_ICONS = [ICONS.knife, ICONS.whisk, ICONS.cooking, ICONS.onion, ICONS.broccoli, ICONS.hen]

/** The recipe being cooked: one fetched this session, or a saved snapshot. */
function useCookRecipe(): Recipe | undefined {
  const { route, recipes, saved } = useApp()
  const recipeId = route.params?.recipeId ? String(route.params.recipeId) : null
  const savedId = route.params?.savedId ? String(route.params.savedId) : null
  if (recipeId) return recipes[recipeId] ?? saved.find((s) => s.recipeId === recipeId)
  if (savedId) return saved.find((s) => s.optionId === savedId)
  return undefined
}

/** True when the step text mentions the ingredient's main word ("Dice the onion" -> "Red onion"). */
function mentions(step: string, ingredient: string) {
  const sw = new Set(words(step))
  const iw = words(ingredient)
  return iw.length > 0 && sw.has(iw[iw.length - 1])
}

// Countdown timer for a step that mentions a cooking time.
function StepTimer({ minutes }: { minutes: number }) {
  const [left, setLeft] = useState(minutes * 60)
  const [on, setOn] = useState(false)
  useEffect(() => { setLeft(minutes * 60); setOn(false) }, [minutes])
  useEffect(() => {
    if (!on) return
    const t = setInterval(() => setLeft((l) => (l <= 1 ? (setOn(false), 0) : l - 1)), 1000)
    return () => clearInterval(t)
  }, [on])
  const mm = String(Math.floor(left / 60)).padStart(2, '0'), ss = String(left % 60).padStart(2, '0')
  return (
    <div className="inline-flex items-center gap-2 rounded-full bg-white p-1.5 pl-4 shadow-soft">
      <Timer size={18} className="text-red" />
      <span className="font-display text-xl font-semibold tabular-nums text-brown" aria-live="off">{left === 0 ? 'Done!' : `${mm}:${ss}`}</span>
      <button onClick={() => (left === 0 ? setLeft(minutes * 60) : setOn(!on))} aria-label={on ? 'Pause timer' : left === 0 ? 'Reset timer' : `Start ${minutes} minute timer`} className="grid h-10 w-10 place-items-center rounded-full bg-red text-white">
        {left === 0 ? <RotateCcw size={16} /> : on ? <Pause size={16} /> : <Play size={16} />}
      </button>
    </div>
  )
}

// Step-by-step cooking mode.
export function Cook() {
  const { back, replace, route } = useApp()
  const recipe = useCookRecipe()
  const rows = useRecipeRows(recipe)
  const [i, setI] = useState(0)
  const [dir, setDir] = useState(1)
  const reduce = useReducedMotion()
  const total = recipe?.steps.length ?? 0

  // Moves to the next step, or to the finish screen after the last one.
  const next = useCallback(() => { if (i < total - 1) { setDir(1); setI(i + 1) } else replace('done', route.params) }, [i, total, replace, route.params])
  const prev = useCallback(() => { if (i > 0) { setDir(-1); setI(i - 1) } }, [i])

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => { if (e.key === 'ArrowRight') next(); if (e.key === 'ArrowLeft') prev() }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [next, prev])

  // Keep the screen awake while cooking, where the browser allows it.
  useEffect(() => {
    let lock: { release: () => Promise<void> } | null = null
    const nav = navigator as Navigator & { wakeLock?: { request: (t: 'screen') => Promise<{ release: () => Promise<void> }> } }
    nav.wakeLock?.request('screen').then((l) => { lock = l }).catch(() => {})
    return () => { lock?.release().catch(() => {}) }
  }, [])

  if (!recipe || !total) return (
    <div className="mx-auto flex min-h-screen max-w-2xl flex-col justify-center p-6">
      <StateView kind="no-recipes" title="This recipe isn’t available any more" body="Open it again from Chef Frigi or your saved recipes to keep cooking." actions={[{ label: 'Go back', run: back }]} />
    </div>
  )
  const step = recipe.steps[i]
  const minutes = stepMinutes(step)
  const uses = rows.filter((r) => mentions(step, r.ing.name))

  return (
    <div className="flex min-h-screen flex-col bg-paper pl-[max(16px,env(safe-area-inset-left,0px))] pr-[max(16px,env(safe-area-inset-right,0px))] pb-[max(16px,env(safe-area-inset-bottom,0px))] pt-4 sm:px-8">
      <header className="mx-auto flex w-full max-w-5xl items-center gap-3">
        <IconButton label="Exit cooking mode" onClick={back}><X size={20} /></IconButton>
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-extrabold uppercase tracking-[0.12em] text-brown-50">Cooking mode · serves {recipe.servings}</p>
          <p className="truncate font-display text-lg font-semibold text-brown">{recipe.title}</p>
        </div>
        <p className="font-display text-lg font-semibold tabular-nums text-brown">{i + 1}<span className="text-brown-50">/{total}</span></p>
      </header>
      <div className="mx-auto mt-3 flex w-full max-w-5xl gap-1.5" role="progressbar" aria-label="Cooking progress" aria-valuemin={1} aria-valuemax={total} aria-valuenow={i + 1}>
        {recipe.steps.map((_, j) => (
          <span key={j} className="h-2 flex-1 overflow-hidden rounded-full bg-cream">
            <motion.span className="block h-full rounded-full bg-red" initial={false} animate={{ width: j <= i ? '100%' : '0%' }} transition={{ duration: 0.4 }} />
          </span>
        ))}
      </div>

      <main className="mx-auto grid w-full max-w-5xl flex-1 items-center gap-6 py-6 lg:grid-cols-[1fr_300px] lg:gap-10">
        <div className="min-w-0">
          <AnimatePresence mode="wait" custom={dir}>
            <motion.section
              key={i}
              custom={dir}
              initial={reduce ? { opacity: 0 } : { opacity: 0, x: 60 * dir }}
              animate={{ opacity: 1, x: 0 }}
              exit={reduce ? { opacity: 0 } : { opacity: 0, x: -60 * dir }}
              transition={{ type: 'spring', stiffness: 260, damping: 28 }}
              aria-live="polite"
            >
              <div className="flex items-center gap-3">
                <span className="grid h-14 w-14 place-items-center rounded-3xl bg-red font-display text-2xl font-semibold text-white shadow-red">{i + 1}</span>
                <img src={STEP_ICONS[i % STEP_ICONS.length]} alt="" className="h-9 w-9 opacity-80" />
              </div>
              <p className="mt-5 max-w-2xl font-display text-[24px] font-medium leading-[1.3] text-brown sm:text-[30px]">{step}</p>
              {minutes && <div className="mt-5"><StepTimer minutes={minutes} /></div>}
              {uses.length > 0 && (
                <div className="mt-6">
                  <p className="mb-2 text-xs font-extrabold uppercase tracking-[0.12em] text-brown-50">You’ll need</p>
                  <ul className="flex flex-wrap gap-2">
                    {uses.map((u, k) => (
                      <li key={u.ing.name + k} className="inline-flex items-center gap-2 rounded-full bg-white py-1 pl-1 pr-4 shadow-soft">
                        <IngredientIcon name={u.name} size={34} className="!rounded-full" />
                        <span className="text-sm font-bold text-brown">{u.qty} <span className="font-semibold text-brown-70">{u.name.toLowerCase()}</span></span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </motion.section>
          </AnimatePresence>
        </div>
        <div className="order-first flex justify-center lg:order-none">
          <div className="relative w-[150px] sm:w-[230px]">
            <div aria-hidden className="absolute inset-[6%] rounded-full bg-sun-50" />
            <Mascot pose="cooking" size="100%" className="relative" />
          </div>
        </div>
      </main>

      <footer className="mx-auto flex w-full max-w-5xl gap-3">
        <Button size="lg" variant="secondary" onClick={prev} disabled={i === 0} icon={<ArrowLeft size={19} />} className="flex-1 sm:flex-none">Previous</Button>
        <Button size="lg" onClick={next} iconRight={<ArrowRight size={19} />} className={cx('flex-[2] sm:ml-auto sm:flex-none sm:min-w-[220px]')}>{i === total - 1 ? 'Finish' : 'Next step'}</Button>
      </footer>
    </div>
  )
}

const CONFETTI = ['#E5332A', '#FEB506', '#3E8E4E', '#F2E5D3', '#FF8A5B']

// Celebration screen after the last step, with an option to save the recipe.
export function Done() {
  const { go, isSaved, toggleSaved, notify } = useApp()
  const recipe = useCookRecipe()
  const reduce = useReducedMotion()
  const saved = recipe && isSaved(recipe)
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-paper p-6">
      {!reduce && Array.from({ length: 34 }).map((_, k) => (
        <motion.span
          key={k}
          aria-hidden
          className="absolute top-0 block rounded-[3px]"
          style={{ left: `${(k * 37) % 100}%`, width: 8 + (k % 3) * 4, height: 12 + (k % 4) * 3, background: CONFETTI[k % CONFETTI.length] }}
          initial={{ y: -40, rotate: 0, opacity: 1 }}
          animate={{ y: '105vh', rotate: 360 + k * 40, opacity: [1, 1, 0.7] }}
          transition={{ duration: 2.6 + (k % 5) * 0.4, delay: (k % 10) * 0.12, ease: 'easeIn', repeat: Infinity, repeatDelay: 1.5 }}
        />
      ))}
      <div className="relative z-[1] flex max-w-md flex-col items-center text-center">
        <div className="relative grid place-items-center">
          <motion.div aria-hidden className="absolute h-72 w-72 rounded-full bg-sun" initial={reduce ? false : { scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 120, damping: 12 }} />
          <motion.div initial={reduce ? false : { scale: 0.4, y: 40 }} animate={{ scale: 1, y: 0 }} transition={{ type: 'spring', stiffness: 200, damping: 12, delay: 0.1 }}>
            <Mascot pose="success" size={250} motionKind="bounce" />
          </motion.div>
        </div>
        <motion.h1 initial={reduce ? false : { opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }} className="mt-6 font-display text-[40px] font-semibold leading-tight text-brown">Chef’s kiss! You did it!</motion.h1>
        <p className="mt-2 text-[16px] text-brown-70">{recipe ? `${recipe.title} is ready. Time to eat and enjoy every bite.` : 'Time to eat!'}</p>
        <div className="mt-7 flex w-full flex-col gap-2.5 sm:flex-row sm:justify-center">
          <Button size="lg" onClick={() => go('home')} icon={<Home size={18} />}>Return home</Button>
          {recipe && <Button size="lg" variant={saved ? 'secondary' : 'sun'} icon={<Bookmark size={18} className={saved ? 'fill-current' : ''} />} onClick={() => { const now = toggleSaved(recipe); notify(now ? 'Saved to your recipes' : 'Removed from saved') }}>{saved ? 'Saved' : 'Save recipe'}</Button>}
        </div>
      </div>
    </div>
  )
}
