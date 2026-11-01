import { motion, useReducedMotion } from 'framer-motion'
import { ArrowLeft, ArrowRight, Check, ChefHat, Clock, ExternalLink, ListChecks, Loader2, Repeat2, ShieldCheck, Users, UtensilsCrossed } from 'lucide-react'
import { useEffect, useState } from 'react'
import { IngredientIcon } from '../components/IngredientIcon'
import { Stepper } from '../components/Pickers'
import { SOURCE_LABEL, SaveHeart } from '../components/RecipeCard'
import { RecipeImage } from '../components/RecipeImage'
import { SwapSheet } from '../components/SwapSheet'
import { Button, IconButton, Mascot, Pill } from '../components/ui'
import { useDebouncedValue } from '../hooks/useDebouncedValue'
import { useRecipeRows } from '../hooks/useRecipeRows'
import { api, isAborted, toApiError, type ApiError } from '../lib/api'
import { cx } from '../lib/format'
import { onList } from '../lib/recipes'
import type { Recipe, RecipeIngredient } from '../lib/types'
import { ALLERGEN_LABEL, DIET_LABEL } from '../lib/vocab'
import { useApp, useProfile } from '../state/AppState'
import { StateView } from './States'

// Loads the recipe for the current route: live from the chef, or a saved snapshot.
function useRecipe() {
  const { route, findOption, saved, chef, inventory, rememberRecipe } = useApp()
  const profile = useProfile()
  const savedId = route.params?.savedId ? String(route.params.savedId) : null
  const optionId = route.params?.optionId ? String(route.params.optionId) : null
  const found = optionId ? findOption(optionId) : null
  const snapshot = saved.find((s) => s.optionId === (savedId ?? optionId)) ?? null
  // A saved recipe whose option has expired is still viewable as the saved snapshot.
  const fromSnapshot = !!savedId || (!found && !!snapshot)

  const [servings, setServings] = useState(() => snapshot?.servings ?? chef?.answers.servings ?? profile.householdSize)
  const wanted = useDebouncedValue(servings, 400)
  const [recipe, setRecipe] = useState<Recipe | null>(fromSnapshot ? snapshot : null)
  const [error, setError] = useState<ApiError | null>(null)
  const [loading, setLoading] = useState(!fromSnapshot && !!found)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    if (fromSnapshot || !found) return
    const ctrl = new AbortController()
    setLoading(true); setError(null)
    api.recipe(found.option, wanted, ctrl.signal)
      .then((r) => {
        // Search results were asked for with the search term as the only "ingredient",
        // so work out what the user actually has from their own list.
        const fixed = found.origin === 'search' ? { ...r, ingredients: r.ingredients.map((i) => ({ ...i, have: onList(i.name, inventory) })) } : r
        setRecipe(fixed); rememberRecipe(fixed); setLoading(false)
      })
      .catch((e) => { if (!isAborted(e)) { setError(toApiError(e, 'Couldn’t load this recipe.')); setLoading(false) } })
    return () => ctrl.abort()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fromSnapshot, found?.option.optionId, wanted, attempt])

  return {
    recipe, servings, setServings, loading, error, retry: () => setAttempt((n) => n + 1),
    fixedServings: fromSnapshot, expired: !fromSnapshot && !found,
  }
}

// Full recipe page: safety check, scalable ingredients, swaps and method.
export function RecipeDetail() {
  const { back, go, subs, setSub, notify } = useApp()
  const profile = useProfile()
  const { recipe, servings, setServings, loading, error, retry, fixedServings, expired } = useRecipe()
  const [tab, setTab] = useState<'ingredients' | 'steps'>('ingredients')
  const [swapFor, setSwapFor] = useState<RecipeIngredient | null>(null)
  const rows = useRecipeRows(recipe ?? undefined)
  const reduce = useReducedMotion()

  const header = <div className="mb-4"><IconButton label="Back" onClick={back}><ArrowLeft size={20} /></IconButton></div>

  if (expired) return (
    <div>{header}<StateView kind="no-recipes" title="This recipe has expired" body="Chef Frigi keeps recipe options for 2 hours. Ask the chef again for fresh ideas." actions={[{ label: 'Ask Chef Frigi', run: () => go('chef') }, { label: 'Saved recipes', run: () => go('saved'), variant: 'secondary' }]} /></div>
  )
  if (error && !recipe) {
    if (error.kind === 'unsafe') return <div>{header}<StateView kind="allergy" body={error.message} /></div>
    if (error.kind === 'not-found') return <div>{header}<StateView kind="no-recipes" title="This recipe has expired" body={error.message} actions={[{ label: 'Ask Chef Frigi', run: () => go('chef') }]} /></div>
    return <div>{header}<StateView kind="server" title="Couldn’t load this recipe" body={error.message} actions={[{ label: 'Try again', run: retry }, { label: 'Go back', run: back, variant: 'secondary' }]} /></div>
  }
  if (!recipe) return (
    <div className="grid min-h-[60vh] place-items-center" role="status" aria-live="polite">
      <div className="flex flex-col items-center"><Mascot pose="cooking" size={170} motionKind="tilt" /><p className="mt-3 font-display text-xl font-semibold text-brown">Fetching the full recipe…</p></div>
    </div>
  )

  const counts = { have: rows.filter((r) => r.status === 'have').length, missing: rows.filter((r) => r.status === 'missing').length }
  const safety = recipe.safety

  const ingredientsList = (
    <section aria-labelledby="ing-h" className={cx('min-w-0', tab !== 'ingredients' && 'hidden lg:block')}>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <h2 id="ing-h" className="font-display text-2xl font-semibold text-brown">Ingredients</h2>
        <div className="flex items-center gap-2 text-xs font-bold">
          <Pill tone="leaf">{counts.have} in fridge</Pill>
          {counts.missing > 0 && <Pill tone="red">{counts.missing} missing</Pill>}
        </div>
      </div>
      <ul className={cx('space-y-2 transition-opacity', loading && 'opacity-60')}>
        {rows.map(({ ing, name, swap, status, qty }, i) => {
          const tappable = status !== 'have'
          const Row = (
            <>
              <IngredientIcon name={name} size={46} />
              <span className="min-w-0 flex-1">
                <span className="block font-bold capitalize text-brown">{name}</span>
                <span className="block text-xs font-semibold text-brown-50">
                  {swap ? `Swapped for ${ing.name}` : status === 'have' ? 'In your fridge' : 'Missing · tap for a swap'}
                </span>
              </span>
              <span className="text-right font-display text-base font-semibold tabular-nums text-brown">{qty}</span>
              <span className={cx('grid h-8 w-8 shrink-0 place-items-center rounded-full', status === 'have' && 'bg-leaf-50 text-leaf', status === 'missing' && 'bg-red-50 text-red', status === 'swapped' && 'bg-sun-50 text-sun-700')}>
                {status === 'have' ? <Check size={16} strokeWidth={3} /> : <Repeat2 size={16} />}
              </span>
            </>
          )
          return (
            <motion.li key={ing.name + i} layout>
              {tappable ? (
                <button onClick={() => setSwapFor(ing)} className={cx('flex w-full items-center gap-3 rounded-3xl p-2.5 pr-3 text-left transition-colors', status === 'missing' ? 'bg-white shadow-soft ring-1 ring-inset ring-red-100 hover:ring-red' : 'bg-sun-50 hover:bg-sun-100')}>{Row}</button>
              ) : (
                <div className="flex items-center gap-3 rounded-3xl bg-white p-2.5 pr-3 shadow-soft">{Row}</div>
              )}
            </motion.li>
          )
        })}
      </ul>
    </section>
  )

  const stepsList = (
    <section aria-labelledby="steps-h" className={cx('min-w-0', tab !== 'steps' && 'hidden lg:block')}>
      <h2 id="steps-h" className="mb-3 font-display text-2xl font-semibold text-brown">Method</h2>
      {recipe.steps.length ? (
        <ol className="space-y-3">
          {recipe.steps.map((s, i) => (
            <li key={i} className="flex gap-3 rounded-3xl bg-white p-4 shadow-soft">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-2xl bg-red font-display text-base font-semibold text-white">{i + 1}</span>
              <p className="min-w-0 text-[15px] leading-relaxed text-brown">{s}</p>
            </li>
          ))}
        </ol>
      ) : <p className="rounded-3xl bg-cream-50 p-4 text-sm text-brown-70">This recipe didn’t come with written steps.</p>}
    </section>
  )

  const attribution = recipe.source === 'spoonacular' ? (
    <>Recipe data <a href="https://spoonacular.com/food-api" target="_blank" rel="noreferrer" className="inline-flex items-center gap-0.5 font-bold text-brown-70 underline-offset-2 hover:text-red hover:underline">Powered by Spoonacular <ExternalLink size={11} /></a></>
  ) : <>Recipe written by Chef Frigi with Gemini</>

  return (
    <div>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-10">
        {/* Hero */}
        <div className="relative min-w-0 lg:sticky lg:top-8 lg:self-start">
          <div className="relative overflow-hidden rounded-5xl bg-sun-50 p-4 pt-16 sm:p-6 sm:pt-16">
            <div aria-hidden className="absolute -right-16 -top-16 h-64 w-64 rounded-full bg-sun/40" />
            <div aria-hidden className="absolute -bottom-24 -left-12 h-64 w-64 rounded-full bg-peach" />
            <div className="absolute inset-x-4 top-4 z-[2] flex justify-between">
              <IconButton label="Back" onClick={back}><ArrowLeft size={20} /></IconButton>
              <SaveHeart recipe={recipe} />
            </div>
            <motion.div initial={reduce ? false : { scale: 0.92, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', stiffness: 160, damping: 18 }} className="relative">
              <RecipeImage src={recipe.imageUrl} title={recipe.title} className="mx-auto aspect-[4/3] w-full max-w-[460px] rounded-4xl shadow-float" />
            </motion.div>
            <div className="relative mt-4 flex flex-wrap justify-center gap-1.5">
              <Pill tone="white">{SOURCE_LABEL[recipe.source]}</Pill>
              {safety.checked && <Pill tone="leaf"><ShieldCheck size={12} /> Safety checked</Pill>}
            </div>
          </div>
          <p className="mt-3 hidden text-center text-xs font-semibold text-brown-50 lg:block">{attribution}</p>
        </div>

        {/* Content */}
        <div className="min-w-0">
          <h1 className="font-display text-[32px] font-semibold leading-tight text-brown [text-wrap:balance] sm:text-[42px]">{recipe.title}</h1>
          {recipe.summary && <p className="mt-2 text-[16px] leading-relaxed text-brown-70">{recipe.summary}</p>}

          {/* What the backend checked */}
          <div className="mt-4 rounded-4xl bg-white p-4 shadow-soft">
            <p className="flex items-center gap-2 font-bold text-brown"><ShieldCheck size={18} className="text-leaf" /> {safety.checked ? 'Checked against your profile' : 'Not checked against your profile'}</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {safety.allergies.length ? safety.allergies.map((a) => <Pill key={a} tone="red">No {ALLERGEN_LABEL[a].toLowerCase()}</Pill>) : <Pill>No allergies set</Pill>}
              <Pill tone={safety.diet === 'none' ? 'cream' : 'leaf'}>Diet: {DIET_LABEL[safety.diet]}</Pill>
            </div>
            {safety.diet === 'halal' && <p className="mt-2 text-xs text-brown-70">Screened for pork, alcohol and gelatine. Frigi can’t verify how meat was sourced or slaughtered, so look for halal certification.</p>}
            <p className="mt-2 text-xs text-brown-50">Automated screening, not a medical guarantee. Always check labels yourself.</p>
          </div>

          {/* Meta tiles */}
          <div className="mt-5 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
            <div className="rounded-3xl bg-peach p-3.5"><Clock size={18} className="text-red" /><p className="mt-2 text-xs font-bold text-brown-70">Time</p><p className="font-display text-xl font-semibold text-brown">{recipe.minutes ? `${recipe.minutes} min` : '—'}</p></div>
            <div className="rounded-3xl bg-cream p-3.5"><Users size={18} className="text-brown-70" /><p className="mt-2 text-xs font-bold text-brown-70">Serves</p><p className="font-display text-xl font-semibold tabular-nums text-brown">{recipe.servings}</p></div>
            <div className="rounded-3xl bg-sun-50 p-3.5"><UtensilsCrossed size={18} className="text-sun-700" /><p className="mt-2 text-xs font-bold text-brown-70">Ingredients</p><p className="font-display text-xl font-semibold text-brown">{recipe.ingredients.length}</p></div>
            <div className="rounded-3xl bg-leaf-50 p-3.5"><ListChecks size={18} className="text-leaf" /><p className="mt-2 text-xs font-bold text-brown-70">Steps</p><p className="font-display text-xl font-semibold text-brown">{recipe.steps.length}</p></div>
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-3xl bg-white p-3 pl-4 shadow-soft">
            <div>
              <p className="flex items-center gap-2 font-bold text-brown">Servings {loading && <Loader2 size={14} className="animate-spin text-brown-50" aria-label="Updating quantities" />}</p>
              <p className="text-xs text-brown-50">{fixedServings ? `Saved for ${recipe.servings}. Ask the chef again to rescale.` : error ? error.message : 'Quantities update as you change this'}</p>
            </div>
            {!fixedServings && <Stepper value={servings} onChange={setServings} max={20} label="servings" />}
          </div>

          {/* Mobile tabs */}
          <div className="mt-6 flex gap-1 rounded-full bg-cream-50 p-1 lg:hidden" role="tablist">
            {(['ingredients', 'steps'] as const).map((t) => (
              <button key={t} role="tab" aria-selected={tab === t} onClick={() => setTab(t)} className="relative h-11 flex-1 rounded-full text-sm font-bold">
                {tab === t && <motion.span layoutId="rtab" className="absolute inset-0 rounded-full bg-white shadow-soft" />}
                <span className={cx('relative', tab === t ? 'text-brown' : 'text-brown-50')}>{t === 'ingredients' ? `Ingredients (${recipe.ingredients.length})` : `Steps (${recipe.steps.length})`}</span>
              </button>
            ))}
          </div>

          <div className="mt-5 space-y-8">
            {ingredientsList}
            {stepsList}
          </div>

          <p className="mt-6 text-center text-xs font-semibold text-brown-50 lg:hidden">{attribution}</p>

          <div className="sticky bottom-[96px] z-10 mt-6 flex gap-2 lg:bottom-6">
            <Button size="lg" className="flex-1" disabled={!recipe.steps.length || loading} icon={<ChefHat size={19} />} iconRight={<ArrowRight size={18} />} onClick={() => go('cook', fixedServings ? { savedId: recipe.optionId } : { recipeId: recipe.recipeId })}>Start cooking</Button>
          </div>
        </div>
      </div>

      <SwapSheet
        recipe={recipe}
        item={swapFor}
        current={swapFor ? subs[recipe.optionId]?.[swapFor.name] : undefined}
        onClose={() => setSwapFor(null)}
        onAccept={(swap) => { if (!swapFor) return; setSub(recipe.optionId, swapFor.name, swap?.name ?? null); notify(swap ? `Swapped in ${swap.name.toLowerCase()}` : 'Swap removed'); setSwapFor(null) }}
        profileHasRules={profile.allergies.length > 0 || profile.diet !== 'none'}
      />
    </div>
  )
}
