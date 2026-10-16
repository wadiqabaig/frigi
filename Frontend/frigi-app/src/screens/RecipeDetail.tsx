import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { ArrowLeft, ArrowRight, Check, ChefHat, Clock, ExternalLink, Flame, Gauge, Loader2, Repeat2, Users } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { POSES } from '../assets'
import { DishArt } from '../components/DishArt'
import { IngredientIcon } from '../components/IngredientIcon'
import { Stepper } from '../components/Pickers'
import { CUISINE_LABEL, SaveHeart, dietBadges } from '../components/RecipeCard'
import { Button, IconButton, Mascot, Pill, Sheet } from '../components/ui'
import { api } from '../lib/api'
import { ING, ingName } from '../lib/data/ingredients'
import { RECIPE_BY_ID } from '../lib/data/recipes'
import { cx, formatQty } from '../lib/format'
import { ingredientConflict, recipeConflict } from '../lib/recommend'
import type { Recipe, RecipeIngredient, Substitute } from '../lib/types'
import { useApp } from '../state/AppState'
import { StateView } from './States'

type Status = 'have' | 'missing' | 'optional' | 'swapped'

export function useRecipeRows(recipe: Recipe | undefined, servings: number) {
  const { inventory, subs } = useApp()
  return useMemo(() => {
    if (!recipe) return []
    const inv = new Set(inventory)
    const s = subs[recipe.id] ?? {}
    return recipe.ingredients.map((ri) => {
      const subId = s[ri.id]
      const effId = subId ?? ri.id
      const status: Status = subId ? 'swapped' : inv.has(ri.id) ? 'have' : ri.optional ? 'optional' : 'missing'
      return { ri, effId, subId, status, inFridge: inv.has(effId), qty: formatQty((ri.qty * servings) / recipe.baseServings, ri.unit) }
    })
  }, [recipe, servings, inventory, subs])
}

export function RecipeDetail() {
  const { route, back, go, prefs, profile, subs, setSub, notify } = useApp()
  const recipe = RECIPE_BY_ID[String(route.params?.id)]
  const [servings, setServings] = useState(() => prefs?.servings ?? profile.householdSize ?? recipe?.baseServings ?? 2)
  const [tab, setTab] = useState<'ingredients' | 'steps'>('ingredients')
  const [swapFor, setSwapFor] = useState<RecipeIngredient | null>(null)
  const rows = useRecipeRows(recipe, servings)
  const reduce = useReducedMotion()

  if (!recipe) return <StateView kind="no-recipes" />
  const conflict = recipeConflict(recipe, profile, subs[recipe.id])
  const counts = { have: rows.filter((r) => r.status === 'have' || (r.status === 'swapped' && r.inFridge)).length, missing: rows.filter((r) => r.status === 'missing' || (r.status === 'swapped' && !r.inFridge)).length }

  const ingredientsList = (
    <section aria-labelledby="ing-h" className={cx('min-w-0', tab !== 'ingredients' && 'hidden lg:block')}>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <h2 id="ing-h" className="font-display text-2xl font-semibold text-brown">Ingredients</h2>
        <div className="flex items-center gap-2 text-xs font-bold">
          <Pill tone="leaf">{counts.have} in fridge</Pill>
          {counts.missing > 0 && <Pill tone="red">{counts.missing} missing</Pill>}
        </div>
      </div>
      <ul className="space-y-2">
        {rows.map(({ ri, effId, subId, status, inFridge, qty }) => {
          const tappable = status === 'missing' || status === 'swapped'
          const optConflict = ri.optional && ingredientConflict(ri.id, profile)
          const Row = (
            <>
              <IngredientIcon id={effId} category={ING[effId]?.category} size={46} />
              <span className="min-w-0 flex-1">
                <span className="block font-bold text-brown">{ingName(effId)}{ri.note && <span className="font-semibold text-brown-50">, {ri.note}</span>}</span>
                <span className="block text-xs font-semibold text-brown-50">
                  {subId ? `Swapped for ${ingName(ri.id).toLowerCase()} · ${inFridge ? 'in your fridge' : 'need to buy'}` : optConflict ? `Skip it: ${optConflict}` : status === 'have' ? 'In your fridge' : status === 'optional' ? 'Optional' : 'Missing · tap for a swap'}
                </span>
              </span>
              <span className="font-display text-base font-semibold tabular-nums text-brown">{qty}</span>
              <span className={cx('grid h-8 w-8 shrink-0 place-items-center rounded-full',
                status === 'have' && 'bg-leaf-50 text-leaf', status === 'missing' && 'bg-red-50 text-red', status === 'optional' && 'bg-cream-50 text-brown-50', status === 'swapped' && 'bg-sun-50 text-sun-700')}>
                {status === 'have' ? <Check size={16} strokeWidth={3} /> : status === 'missing' ? <Repeat2 size={16} /> : status === 'swapped' ? <Repeat2 size={16} /> : <span className="text-[10px] font-extrabold">OPT</span>}
              </span>
            </>
          )
          return (
            <motion.li key={ri.id} layout>
              {tappable ? (
                <button onClick={() => setSwapFor(ri)} className={cx('flex w-full items-center gap-3 rounded-3xl p-2.5 pr-3 text-left transition-colors', status === 'missing' ? 'bg-white shadow-soft ring-1 ring-inset ring-red-100 hover:ring-red' : 'bg-sun-50 hover:bg-sun-100')}>{Row}</button>
              ) : (
                <div className={cx('flex items-center gap-3 rounded-3xl p-2.5 pr-3', status === 'have' ? 'bg-white shadow-soft' : 'bg-cream-50/70')}>{Row}</div>
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
      <ol className="space-y-3">
        {recipe.steps.map((s, i) => (
          <li key={i} className="flex gap-3 rounded-3xl bg-white p-4 shadow-soft">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-2xl bg-red font-display text-base font-semibold text-white">{i + 1}</span>
            <div className="min-w-0">
              <p className="text-[15px] leading-relaxed text-brown">{s.text}</p>
              {s.timerMin && <p className="mt-1.5 inline-flex items-center gap-1 text-xs font-bold text-sun-700"><Clock size={12} /> {s.timerMin} min</p>}
            </div>
          </li>
        ))}
      </ol>
    </section>
  )

  return (
    <div>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-10">
        {/* Hero */}
        <div className="relative min-w-0 lg:sticky lg:top-8 lg:self-start">
          <div className="relative overflow-hidden rounded-5xl bg-sun-50 px-4 pb-8 pt-16 sm:px-8">
            <div aria-hidden className="absolute -right-16 -top-16 h-64 w-64 rounded-full bg-sun/40" />
            <div aria-hidden className="absolute -bottom-24 -left-12 h-64 w-64 rounded-full bg-peach" />
            <div className="absolute inset-x-4 top-4 z-[2] flex justify-between">
              <IconButton label="Back" onClick={back}><ArrowLeft size={20} /></IconButton>
              <SaveHeart id={recipe.id} />
            </div>
            <motion.div initial={reduce ? false : { scale: 0.85, rotate: -6, opacity: 0 }} animate={{ scale: 1, rotate: 0, opacity: 1 }} transition={{ type: 'spring', stiffness: 160, damping: 18 }} className="relative">
              <motion.div animate={reduce ? {} : { y: [0, -10, 0], rotate: [0, 2, 0] }} transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}>
                <DishArt recipe={recipe} mat={false} className="mx-auto w-full max-w-[420px] drop-shadow-[0_24px_24px_rgba(49,23,14,0.22)]" />
              </motion.div>
            </motion.div>
            <div className="relative mt-2 flex flex-wrap justify-center gap-1.5">
              <Pill tone="white">{CUISINE_LABEL[recipe.cuisine]}</Pill>
              {dietBadges(recipe).map((b) => <Pill key={b} tone="leaf">{b}</Pill>)}
              <Pill tone="white">★ {recipe.rating}</Pill>
            </div>
          </div>
          <p className="mt-3 hidden text-center text-xs font-semibold text-brown-50 lg:block">
            Recipe data <a href="https://spoonacular.com/" target="_blank" rel="noreferrer" className="inline-flex items-center gap-0.5 font-bold text-brown-70 underline-offset-2 hover:text-red hover:underline">Powered by Spoonacular <ExternalLink size={11} /></a>
          </p>
        </div>

        {/* Content */}
        <div className="min-w-0">
          <h1 className="font-display text-[32px] font-semibold leading-tight text-brown [text-wrap:balance] sm:text-[42px]">{recipe.title}</h1>
          <p className="mt-2 text-[16px] leading-relaxed text-brown-70">{recipe.description}</p>

          {conflict && (
            <div role="alert" className="mt-4 flex items-center gap-3 rounded-4xl bg-red-50 p-3 pr-4">
              <img src={POSES.allergy} alt="" className="h-20 w-auto shrink-0" />
              <div className="min-w-0">
                <p className="font-bold text-red-600">Allergy warning</p>
                <p className="text-sm text-brown">{conflict.reason}. That conflicts with your profile. Swap it below if a safe alternative exists, or pick another recipe.</p>
                <p className="mt-1 text-xs text-brown-50">Demo screening only. Always check labels yourself.</p>
              </div>
            </div>
          )}

          {/* Meta tiles */}
          <div className="mt-5 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
            <div className="rounded-3xl bg-peach p-3.5"><Clock size={18} className="text-red" /><p className="mt-2 text-xs font-bold text-brown-70">Prep</p><p className="font-display text-xl font-semibold text-brown">{recipe.prepMin} min</p></div>
            <div className="rounded-3xl bg-sun-50 p-3.5"><Flame size={18} className="text-sun-700" /><p className="mt-2 text-xs font-bold text-brown-70">Cook</p><p className="font-display text-xl font-semibold text-brown">{recipe.cookMin} min</p></div>
            <div className="rounded-3xl bg-leaf-50 p-3.5"><Gauge size={18} className="text-leaf" /><p className="mt-2 text-xs font-bold text-brown-70">Level</p><p className="font-display text-xl font-semibold text-brown">{recipe.difficulty}</p></div>
            <div className="rounded-3xl bg-cream p-3.5"><Users size={18} className="text-brown-70" /><p className="mt-2 text-xs font-bold text-brown-70">Serves</p><p className="font-display text-xl font-semibold tabular-nums text-brown">{servings}</p></div>
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-3xl bg-white p-3 pl-4 shadow-soft">
            <div>
              <p className="font-bold text-brown">Servings</p>
              <p className="text-xs text-brown-50">Quantities update as you change this</p>
            </div>
            <Stepper value={servings} onChange={setServings} max={12} label="servings" />
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

          <p className="mt-6 text-center text-xs font-semibold text-brown-50 lg:hidden">
            Recipe data <a href="https://spoonacular.com/" target="_blank" rel="noreferrer" className="inline-flex items-center gap-0.5 font-bold text-brown-70 underline-offset-2 hover:underline">Powered by Spoonacular <ExternalLink size={11} /></a>
          </p>

          <div className="sticky bottom-[96px] z-10 mt-6 flex gap-2 lg:bottom-6">
            <Button size="lg" className="flex-1" icon={<ChefHat size={19} />} iconRight={<ArrowRight size={18} />} onClick={() => go('cook', { id: recipe.id, servings })}>Start cooking</Button>
          </div>
        </div>
      </div>

      <SubstitutionSheet
        recipe={recipe}
        item={swapFor}
        onClose={() => setSwapFor(null)}
        current={swapFor ? subs[recipe.id]?.[swapFor.id] : undefined}
        onAccept={(sub) => { if (!swapFor) return; setSub(recipe.id, swapFor.id, sub?.id ?? null); notify(sub ? `Swapped in ${sub.name.toLowerCase()}` : 'Swap removed'); setSwapFor(null) }}
      />
    </div>
  )
}

function SubstitutionSheet({ recipe, item, onClose, onAccept, current }: { recipe: Recipe; item: RecipeIngredient | null; onClose: () => void; onAccept: (s: Substitute | null) => void; current?: string }) {
  const { profile, inventory } = useApp()
  const [subs, setSubs] = useState<Substitute[] | null>(null)
  const [pick, setPick] = useState<string | null>(null)
  useEffect(() => {
    if (!item) return
    setSubs(null); setPick(current ?? null)
    let on = true
    api.substitutes(item.id, profile).then((s) => { if (on) { setSubs(s); setPick((p) => p ?? s[0]?.id ?? null) } })
    return () => { on = false }
  }, [item, profile, current])
  const name = item ? ingName(item.id) : ''
  const chosen = subs?.find((s) => s.id === pick)
  return (
    <Sheet open={!!item} onClose={onClose} labelledBy="sub-title">
      {item && (
        <div>
          <div className="flex items-end gap-3 pr-10">
            <Mascot pose={subs && subs.length === 0 ? 'error' : 'leaning'} size={96} shadow={false} motionKind="none" />
            <div className="pb-2">
              <h2 id="sub-title" className="font-display text-2xl font-semibold leading-tight text-brown">Missing {name.toLowerCase()}?</h2>
              <p className="text-sm text-brown-70">No worries! Let’s see what we can use instead.</p>
            </div>
          </div>
          <div className="mt-4 flex items-center gap-3 rounded-3xl bg-cream-50 p-3">
            <IngredientIcon id={item.id} category={ING[item.id]?.category} size={44} />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-brown-50">Recipe calls for</p>
              <p className="font-bold text-brown">{formatQty(item.qty, item.unit)} {name.toLowerCase()} <span className="font-semibold text-brown-50">in {recipe.title}</span></p>
            </div>
          </div>

          <div className="mt-4" aria-live="polite">
            {!subs ? (
              <p className="flex items-center gap-2 py-6 text-sm font-semibold text-brown-70"><Loader2 size={16} className="animate-spin" /> Frigi is thinking…</p>
            ) : subs.length === 0 ? (
              <div className="rounded-3xl bg-white p-4 shadow-soft">
                <p className="font-bold text-brown">I don’t know a safe swap for {name.toLowerCase()}</p>
                <p className="mt-1 text-sm text-brown-70">Rather than guess, I’d suggest picking some up{item.optional ? ' or simply leaving it out' : ''}. Swaps also skip anything that clashes with your allergies or diet.</p>
              </div>
            ) : (
              <div role="radiogroup" aria-label="Suggested alternatives" className="space-y-2">
                <AnimatePresence>
                  {subs.map((s, i) => {
                    const on = pick === s.id
                    return (
                      <motion.button key={s.id} role="radio" aria-checked={on} onClick={() => setPick(s.id)} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }} className={cx('flex w-full items-start gap-3 rounded-3xl p-3 text-left transition-colors', on ? 'bg-white shadow-soft ring-2 ring-red' : 'bg-white/60 ring-1 ring-cream hover:bg-white')}>
                        <IngredientIcon id={s.id} category={ING[s.id]?.category} size={44} />
                        <span className="min-w-0 flex-1">
                          <span className="flex flex-wrap items-center gap-2"><span className="font-bold text-brown">{s.name}</span>{inventory.includes(s.id) && <Pill tone="leaf">In your fridge</Pill>}</span>
                          <span className="mt-0.5 block text-xs font-bold text-sun-700">{s.ratio}</span>
                          <span className="mt-1 block text-sm text-brown-70">{s.note}</span>
                        </span>
                        <span className={cx('mt-1 grid h-6 w-6 shrink-0 place-items-center rounded-full', on ? 'bg-red text-white' : 'ring-2 ring-inset ring-brown-20')}>{on && <Check size={13} strokeWidth={3} />}</span>
                      </motion.button>
                    )
                  })}
                </AnimatePresence>
              </div>
            )}
          </div>

          <div className="mt-5 flex flex-col gap-2 sm:flex-row">
            {subs && subs.length > 0 && <Button className="sm:flex-1" disabled={!chosen} onClick={() => onAccept(chosen ?? null)}>Use {chosen?.name.toLowerCase() ?? 'this swap'}</Button>}
            {current && <Button variant="secondary" onClick={() => onAccept(null)}>Undo swap</Button>}
            <Button variant="ghost" onClick={onClose}>{subs?.length ? 'Keep original' : 'Got it'}</Button>
          </div>
        </div>
      )}
    </Sheet>
  )
}
