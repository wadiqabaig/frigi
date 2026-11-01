import { AnimatePresence, motion } from 'framer-motion'
import { Check, Loader2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { ApiError, api, isAborted, toApiError } from '../lib/api'
import { cx, formatQty } from '../lib/format'
import { onList } from '../lib/recipes'
import type { Recipe, RecipeIngredient, Swap } from '../lib/types'
import { useApp } from '../state/AppState'
import { IngredientIcon } from './IngredientIcon'
import { Button, Mascot, Pill, Sheet } from './ui'

/** POST /chef/swap for one missing ingredient. Suggestions are already safety-filtered by the backend. */
export function SwapSheet({ recipe, item, current, onClose, onAccept, profileHasRules }: { recipe: Recipe; item: RecipeIngredient | null; current?: string; onClose: () => void; onAccept: (s: Swap | null) => void; profileHasRules: boolean }) {
  const { inventory } = useApp()
  const [swaps, setSwaps] = useState<Swap[] | null>(null)
  const [error, setError] = useState<ApiError | null>(null)
  const [pick, setPick] = useState<string | null>(null)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    if (!item) return
    const ctrl = new AbortController()
    setSwaps(null); setError(null); setPick(current ?? null)
    api.swaps(recipe.recipeId, item.name, ctrl.signal)
      .then((s) => { setSwaps(s); setPick((p) => p ?? s[0]?.name ?? null) })
      .catch((e) => { if (!isAborted(e)) setError(toApiError(e, 'Couldn’t load swaps.')) })
    return () => ctrl.abort()
  }, [item, recipe.recipeId, current, attempt])

  const chosen = swaps?.find((s) => s.name === pick)
  return (
    <Sheet open={!!item} onClose={onClose} labelledBy="sub-title">
      {item && (
        <div>
          <div className="flex items-end gap-3 pr-10">
            <Mascot pose={error || (swaps && swaps.length === 0) ? 'error' : 'leaning'} size={96} shadow={false} motionKind="none" />
            <div className="pb-2">
              <h2 id="sub-title" className="font-display text-2xl font-semibold leading-tight text-brown">Missing {item.name.toLowerCase()}?</h2>
              <p className="text-sm text-brown-70">Let’s see what you could use instead.</p>
            </div>
          </div>
          <div className="mt-4 flex items-center gap-3 rounded-3xl bg-cream-50 p-3">
            <IngredientIcon name={item.name} size={44} />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-brown-50">Recipe calls for</p>
              <p className="font-bold text-brown">{formatQty(item.quantity, item.unit)} {item.name.toLowerCase()} <span className="font-semibold text-brown-50">in {recipe.title}</span></p>
            </div>
          </div>

          <div className="mt-4" aria-live="polite">
            {error ? (
              <div className="rounded-3xl bg-white p-4 shadow-soft" role="alert">
                <p className="font-bold text-brown">{error.kind === 'not-found' ? 'Swaps for this recipe have expired' : 'Couldn’t get swaps right now'}</p>
                <p className="mt-1 text-sm text-brown-70">{error.kind === 'not-found' ? 'Swaps are available for 2 hours after a recipe is opened. Ask Chef Frigi again to get fresh suggestions.' : error.message}</p>
                {error.kind !== 'not-found' && <Button size="sm" className="mt-3" onClick={() => setAttempt((n) => n + 1)}>Try again</Button>}
              </div>
            ) : !swaps ? (
              <p className="flex items-center gap-2 py-6 text-sm font-semibold text-brown-70"><Loader2 size={16} className="animate-spin" /> Frigi is thinking…</p>
            ) : swaps.length === 0 ? (
              <div className="rounded-3xl bg-white p-4 shadow-soft">
                <p className="font-bold text-brown">No safe swap for {item.name.toLowerCase()}</p>
                <p className="mt-1 text-sm text-brown-70">Rather than guess, Frigi suggests picking some up.{profileHasRules ? ' Swaps that clash with your allergies or diet are never shown.' : ''}</p>
              </div>
            ) : (
              <div role="radiogroup" aria-label="Suggested alternatives" className="space-y-2">
                <AnimatePresence>
                  {swaps.map((s, i) => {
                    const on = pick === s.name
                    return (
                      <motion.button key={s.name} role="radio" aria-checked={on} onClick={() => setPick(s.name)} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }} className={cx('flex w-full items-start gap-3 rounded-3xl p-3 text-left transition-colors', on ? 'bg-white shadow-soft ring-2 ring-red' : 'bg-white/60 ring-1 ring-cream hover:bg-white')}>
                        <IngredientIcon name={s.name} size={44} />
                        <span className="min-w-0 flex-1">
                          <span className="flex flex-wrap items-center gap-2"><span className="font-bold capitalize text-brown">{s.name}</span>{onList(s.name, inventory) && <Pill tone="leaf">In your fridge</Pill>}</span>
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
            {swaps && swaps.length > 0 && <Button className="sm:flex-1" disabled={!chosen} onClick={() => onAccept(chosen ?? null)}>Use {chosen?.name.toLowerCase() ?? 'this swap'}</Button>}
            {current && <Button variant="secondary" onClick={() => onAccept(null)}>Undo swap</Button>}
            <Button variant="ghost" onClick={onClose}>{swaps?.length ? 'Keep original' : 'Got it'}</Button>
          </div>
        </div>
      )}
    </Sheet>
  )
}
