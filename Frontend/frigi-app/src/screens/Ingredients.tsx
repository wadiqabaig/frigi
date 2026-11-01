import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { ArrowLeft, ArrowRight, Check, Plus, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { IngredientIcon } from '../components/IngredientIcon'
import { IngredientSearch } from '../components/IngredientSearch'
import { JourneySteps } from '../components/Shell'
import { Button, IconButton, Mascot, Pill } from '../components/ui'
import { api, isAborted } from '../lib/api'
import { cx } from '../lib/format'
import { ingredientKey } from '../lib/text'
import type { IngredientRef, InventoryItem } from '../lib/types'
import { useApp } from '../state/AppState'
import { StateView } from './States'

// Identity used for the list: the detector id, or the normalised name for custom items.
const keyOf = (i: IngredientRef) => i.id ?? 'name:' + ingredientKey(i.name)
// True when two references describe the same ingredient.
const same = (a: IngredientRef, b: IngredientRef) => (!!a.id && a.id === b.id) || ingredientKey(a.name) === ingredientKey(b.name)

// Confirm the scanned ingredients, or build the list by hand.
export function Ingredients() {
  const { scan, photos, inventory, setInventory, go, back, route, notify } = useApp()
  const manual = !!route.params?.manual || !scan
  const detected = useMemo<InventoryItem[]>(() => {
    if (manual || !scan) return []
    return [...scan.ingredients].sort((a, b) => b.confidence - a.confidence)
      .map((i) => ({ id: i.id, name: i.name, confidence: i.confidence, source: 'detected' as const }))
  }, [scan, manual])

  const [items, setItems] = useState<InventoryItem[]>(() => (detected.length ? detected : inventory))
  const [checked, setChecked] = useState<Set<string>>(() => new Set((detected.length ? detected : inventory).map(keyOf)))
  const [hover, setHover] = useState<string | null>(null)
  const [img, setImg] = useState(0)
  const [staples, setStaples] = useState<IngredientRef[] | null>(scan && !manual ? scan.askAboutStaples : null)
  const [staplesError, setStaplesError] = useState(false)
  const reduce = useReducedMotion()

  // Without a scan, the staples come from the backend's catalogue (GET /ingredients).
  useEffect(() => {
    if (staples) return
    const ctrl = new AbortController()
    api.staples(ctrl.signal).then(setStaples).catch((e) => { if (!isAborted(e)) setStaplesError(true) })
    return () => ctrl.abort()
  }, [staples])

  const isAdded = (ref: IngredientRef) => items.some((i) => same(i, ref))
  // Adds an ingredient (or re-ticks it if it is already listed).
  const add = (ref: IngredientRef, source: InventoryItem['source']) => {
    const existing = items.find((i) => same(i, ref))
    if (existing) { setChecked((s) => new Set(s).add(keyOf(existing))); return }
    setItems((x) => [...x, { id: ref.id, name: ref.name, source }])
    setChecked((s) => new Set(s).add(keyOf(ref)))
  }
  // Ticks or unticks an ingredient.
  const toggle = (k: string) => setChecked((s) => { const n = new Set(s); if (n.has(k)) n.delete(k); else n.add(k); return n })
  // Removes an ingredient from the list.
  const removeItem = (k: string) => { setItems((x) => x.filter((i) => keyOf(i) !== k)); setChecked((s) => { const n = new Set(s); n.delete(k); return n }) }
  const selected = items.filter((i) => checked.has(keyOf(i)))

  // Saves the ticked ingredients as the fridge inventory and moves on to the chef.
  const confirm = () => {
    setInventory(selected)
    notify(`${selected.length} ingredient${selected.length === 1 ? '' : 's'} saved`)
    go('chef')
  }

  if (!manual && detected.length === 0) return <StateView kind="no-ingredients" />

  const scanPhoto = scan?.photos.find((p) => p.index === img)
  const photo = photos[img]
  const boxes = photo?.url ? scanPhoto?.detections ?? [] : []

  return (
    <div>
      <div className="mb-5 flex items-center gap-3 pr-12 lg:pr-0">
        <IconButton label="Back" onClick={back}><ArrowLeft size={20} /></IconButton>
        <JourneySteps />
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-8">
        {/* Photo + boxes, or Frigi with the checklist */}
        <div className="min-w-0 lg:sticky lg:top-8 lg:self-start">
          {!manual ? (
            <div>
              <div
                className="relative mx-auto w-full max-w-[460px] overflow-hidden rounded-5xl bg-white shadow-float"
                style={{ aspectRatio: scanPhoto && photo?.url ? `${scanPhoto.width} / ${scanPhoto.height}` : '4 / 5', maxHeight: '70vh' }}
              >
                {photo?.url ? <img src={photo.url} alt="Your fridge" className="h-full w-full object-fill" /> : (
                  <div className="grid h-full place-items-center bg-cream-50 p-6 text-center text-sm text-brown-70">This browser can’t preview HEIC photos. Detections are listed on the right.</div>
                )}
                {boxes.map((d, i) => {
                  const [x, y, w, h] = d.box
                  const k = keyOf(d)
                  const on = checked.has(k)
                  const hi = hover === k
                  return (
                    <motion.div
                      key={d.id + i}
                      initial={reduce ? false : { opacity: 0, scale: 0.6 }}
                      animate={{ opacity: on ? 1 : 0.35, scale: 1 }}
                      transition={{ delay: 0.15 + i * 0.06, type: 'spring', stiffness: 300, damping: 20 }}
                      className={cx('absolute rounded-xl border-[3px] transition-colors', hi ? 'border-red bg-red/15' : on ? 'border-sun bg-sun/10' : 'border-dashed border-white')}
                      style={{ left: `${x * 100}%`, top: `${y * 100}%`, width: `${w * 100}%`, height: `${h * 100}%` }}
                    >
                      <span className={cx('absolute -top-3 left-1 whitespace-nowrap rounded-full px-2 py-0.5 text-[10px] font-extrabold shadow-soft', hi ? 'bg-red text-white' : 'bg-sun text-brown')}>
                        {d.name} {Math.round(d.confidence * 100)}%
                      </span>
                    </motion.div>
                  )
                })}
              </div>
              {photos.length > 1 && (
                <div className="mt-3 flex justify-center gap-2" role="tablist" aria-label="Photos">
                  {photos.map((p, i) => (
                    <button key={p.id} role="tab" aria-selected={img === i} onClick={() => setImg(i)} className={cx('h-9 rounded-full px-4 text-sm font-bold', img === i ? 'bg-brown text-white' : 'bg-white text-brown shadow-soft')}>Photo {i + 1}</button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="relative flex flex-col items-center rounded-5xl bg-sun-50 p-6">
              <Mascot pose="confirm" size={220} />
              <p className="mt-2 text-center font-display text-xl font-semibold text-brown">Let’s build your list together</p>
              <p className="text-center text-sm text-brown-70">Search below, or tap the staples you always keep around.</p>
            </div>
          )}
        </div>

        {/* List */}
        <div className="min-w-0">
          <div className="flex items-start gap-3">
            <div className="flex-1">
              <h1 className="font-display text-[30px] font-semibold leading-tight text-brown sm:text-[36px]">{manual ? 'What do you have?' : `Frigi found ${detected.length} ingredient${detected.length === 1 ? '' : 's'}`}</h1>
              <p className="mt-1 text-brown-70">{manual ? 'Add the ingredients in your fridge and pantry.' : `Combined from ${photos.length || 1} photo${photos.length > 1 ? 's' : ''}, with duplicates merged. Untick anything that’s wrong.`}</p>
            </div>
            {!manual && <Mascot pose="confirm" size={92} className="hidden shrink-0 sm:inline-flex" shadow={false} />}
          </div>

          <ul className="mt-5 grid grid-cols-1 gap-2.5 sm:grid-cols-2" aria-label="Ingredients">
            <AnimatePresence initial={false}>
              {items.map((item) => {
                const k = keyOf(item)
                const on = checked.has(k)
                return (
                  <motion.li key={k} layout initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.85, transition: { duration: 0.15 } }} onMouseEnter={() => setHover(k)} onMouseLeave={() => setHover(null)}>
                    <div className={cx('flex items-center gap-2 rounded-3xl p-2 pr-2 transition-colors', on ? 'bg-white shadow-soft ring-2 ring-sun' : 'bg-cream-50 opacity-70')}>
                      <button onClick={() => toggle(k)} onFocus={() => setHover(k)} onBlur={() => setHover(null)} role="checkbox" aria-checked={on} className="flex min-w-0 flex-1 items-center gap-3 rounded-2xl text-left">
                        <IngredientIcon name={item.name} id={item.id} size={44} />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-bold text-brown">{item.name}</span>
                          <span className="block text-xs text-brown-50">{item.confidence ? `${Math.round(item.confidence * 100)}% sure` : item.source === 'manual' ? 'Your own ingredient' : 'Added by you'}</span>
                        </span>
                        <motion.span animate={{ scale: on ? 1 : 0.85 }} className={cx('grid h-7 w-7 shrink-0 place-items-center rounded-full', on ? 'bg-red text-white' : 'bg-white text-transparent ring-2 ring-inset ring-brown-20')}>
                          <Check size={15} strokeWidth={3.2} />
                        </motion.span>
                      </button>
                      <button onClick={() => removeItem(k)} aria-label={`Remove ${item.name}`} className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-brown-50 hover:bg-red-50 hover:text-red"><X size={16} /></button>
                    </div>
                  </motion.li>
                )
              })}
            </AnimatePresence>
          </ul>
          {items.length === 0 && <p className="mt-4 rounded-3xl bg-cream-50 p-4 text-sm text-brown-70">Your list is empty. Search for an ingredient or tap a staple below.</p>}

          {/* Search picker */}
          <div className="mt-6">
            <label htmlFor="ing-search" className="mb-2 block font-display text-lg font-semibold text-brown">Add an ingredient</label>
            <IngredientSearch isAdded={isAdded} onAdd={(ref) => add(ref, ref.id ? 'catalogue' : 'manual')} />
          </div>

          {/* Staples (FR5) */}
          {(staples?.length || staplesError) ? (
            <section aria-labelledby="miss" className="mt-6 rounded-4xl bg-sun-50 p-5">
              <h2 id="miss" className="font-display text-lg font-semibold text-brown">Did Frigi miss something?</h2>
              <p className="text-sm text-brown-70">{staplesError ? 'Staples couldn’t be loaded. You can still search for them above.' : 'Common staples are often hidden in cupboards. Tap to add.'}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {staples?.map((st) => {
                  const existing = items.find((i) => same(i, st))
                  const on = !!existing && checked.has(keyOf(existing))
                  return (
                    <motion.button key={keyOf(st)} whileTap={{ scale: 0.9 }} onClick={() => (on ? toggle(keyOf(existing)) : add(st, 'staple'))} aria-pressed={on} className={cx('inline-flex h-10 items-center gap-2 rounded-full py-1 pl-1 pr-4 text-sm font-bold transition-colors', on ? 'bg-red text-white shadow-red' : 'bg-white text-brown shadow-soft hover:bg-cream-50')}>
                      <span className="grid h-8 w-8 place-items-center rounded-full bg-white"><IngredientIcon name={st.name} id={st.id} size={28} className="!bg-transparent" /></span>
                      {st.name}
                      {on ? <Check size={15} strokeWidth={3} /> : <Plus size={15} strokeWidth={3} />}
                    </motion.button>
                  )
                })}
              </div>
            </section>
          ) : null}

          <div className="sticky bottom-[96px] z-10 mt-6 flex flex-col gap-3 rounded-4xl bg-paper/90 py-2 backdrop-blur sm:flex-row sm:items-center sm:justify-between lg:static lg:bg-transparent">
            <Pill tone="cream" className="self-start text-sm">{selected.length} selected</Pill>
            <Button size="lg" disabled={selected.length === 0} onClick={confirm} iconRight={<ArrowRight size={19} />}>Continue to Chef</Button>
          </div>
        </div>
      </div>
    </div>
  )
}
