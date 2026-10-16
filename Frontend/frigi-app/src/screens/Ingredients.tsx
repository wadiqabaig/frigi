import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { ArrowLeft, ArrowRight, Check, Info, Plus, Search, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import { FridgeSample } from '../components/FridgeSample'
import { IngredientIcon } from '../components/IngredientIcon'
import { JourneySteps } from '../components/Shell'
import { Button, IconButton, Mascot, Pill } from '../components/ui'
import { api } from '../lib/api'
import { ING, INGREDIENTS, STAPLES } from '../lib/data/ingredients'
import { cx } from '../lib/format'
import { useApp } from '../state/AppState'
import { StateView } from './States'

export function Ingredients() {
  const { scan, photos, inventory, setInventory, go, back, route, notify } = useApp()
  const manual = !!route.params?.manual || !scan
  const detected = useMemo(() => {
    if (!scan || route.params?.manual) return []
    const best = new Map<string, number>()
    scan.detections.forEach((d) => best.set(d.ingredientId, Math.max(best.get(d.ingredientId) ?? 0, d.confidence)))
    return [...best.entries()].sort((a, b) => b[1] - a[1]).map(([id, c]) => ({ id, c }))
  }, [scan, route.params])

  const initial = detected.length ? detected.map((d) => d.id) : inventory
  const [items, setItems] = useState<string[]>(() => [...new Set(initial)])
  const [checked, setChecked] = useState<Set<string>>(() => new Set(initial))
  const [query, setQuery] = useState('')
  const [hover, setHover] = useState<string | null>(null)
  const [img, setImg] = useState(0)
  const reduce = useReducedMotion()

  const add = (id: string) => {
    if (!items.includes(id)) setItems((x) => [...x, id])
    setChecked((s) => new Set(s).add(id))
  }
  const toggle = (id: string) => setChecked((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n })
  const removeItem = (id: string) => { setItems((x) => x.filter((i) => i !== id)); setChecked((s) => { const n = new Set(s); n.delete(id); return n }) }
  const results = query.trim() ? INGREDIENTS.filter((i) => i.name.toLowerCase().includes(query.trim().toLowerCase()) && !items.includes(i.id)).slice(0, 8) : []
  const conf = (id: string) => detected.find((d) => d.id === id)?.c
  const count = items.filter((i) => checked.has(i)).length

  const confirm = async () => {
    const ids = items.filter((i) => checked.has(i))
    await api.confirmIngredients(ids)
    setInventory(ids)
    notify(`${ids.length} ingredients saved`)
    go('chef')
  }

  if (!manual && detected.length === 0) {
    return <StateView kind="no-ingredients" />
  }

  const boxes = scan?.detections.filter((d) => d.imageIndex === img) ?? []
  const photo = photos[img]

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
              <div className="relative mx-auto aspect-[4/5] w-full max-w-[460px] overflow-hidden rounded-5xl bg-white shadow-float">
                {photo?.url ? <img src={photo.url} alt="Your fridge" className="h-full w-full object-cover" /> : photo && !photo.sample ? (
                  <div className="grid h-full place-items-center bg-cream-50 p-6 text-center text-sm text-brown-70">HEIC preview isn’t supported in this browser. Detections are listed on the right.</div>
                ) : <FridgeSample className="h-full w-full" />}
                {boxes.map((d, i) => {
                  const [x, y, w, h] = d.box
                  const on = checked.has(d.ingredientId)
                  const hi = hover === d.ingredientId
                  return (
                    <motion.div
                      key={d.ingredientId + i}
                      initial={reduce ? false : { opacity: 0, scale: 0.6 }}
                      animate={{ opacity: on ? 1 : 0.35, scale: 1 }}
                      transition={{ delay: 0.15 + i * 0.06, type: 'spring', stiffness: 300, damping: 20 }}
                      className={cx('absolute rounded-xl border-[3px] transition-colors', hi ? 'border-red bg-red/15' : on ? 'border-sun bg-sun/10' : 'border-dashed border-white')}
                      style={{ left: `${x * 100}%`, top: `${y * 100}%`, width: `${w * 100}%`, height: `${h * 100}%` }}
                    >
                      <span className={cx('absolute -top-3 left-1 whitespace-nowrap rounded-full px-2 py-0.5 text-[10px] font-extrabold shadow-soft', hi ? 'bg-red text-white' : 'bg-sun text-brown')}>
                        {ING[d.ingredientId]?.name} {Math.round(d.confidence * 100)}%
                      </span>
                    </motion.div>
                  )
                })}
                {scan?.source === 'mock' && (
                  <span className="absolute bottom-3 left-3 inline-flex items-center gap-1 rounded-full bg-brown/85 px-3 py-1.5 text-[11px] font-bold text-white backdrop-blur"><Info size={12} /> Simulated detections · not real computer vision</span>
                )}
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
              <h1 className="font-display text-[30px] font-semibold leading-tight text-brown sm:text-[36px]">{manual ? 'What do you have?' : `Frigi found ${detected.length} ingredients`}</h1>
              <p className="mt-1 text-brown-70">{manual ? 'Add the ingredients in your fridge and pantry.' : `Combined from ${photos.length || 1} photo${photos.length > 1 ? 's' : ''}, with duplicates merged. Untick anything that’s wrong.`}</p>
            </div>
            {!manual && <Mascot pose="confirm" size={92} className="hidden shrink-0 sm:inline-flex" shadow={false} />}
          </div>

          <ul className="mt-5 grid grid-cols-1 gap-2.5 sm:grid-cols-2" aria-label="Ingredients">
            <AnimatePresence initial={false}>
              {items.map((id) => {
                const on = checked.has(id)
                const c = conf(id)
                return (
                  <motion.li key={id} layout initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.85, transition: { duration: 0.15 } }} onMouseEnter={() => setHover(id)} onMouseLeave={() => setHover(null)}>
                    <div className={cx('flex items-center gap-2 rounded-3xl p-2 pr-2 transition-colors', on ? 'bg-white shadow-soft ring-2 ring-sun' : 'bg-cream-50 opacity-70')}>
                      <button onClick={() => toggle(id)} onFocus={() => setHover(id)} onBlur={() => setHover(null)} role="checkbox" aria-checked={on} className="flex min-w-0 flex-1 items-center gap-3 rounded-2xl text-left">
                        <IngredientIcon id={id} category={ING[id]?.category} size={44} />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-bold text-brown">{ING[id]?.name}</span>
                          <span className="block text-xs text-brown-50">{c ? `${Math.round(c * 100)}% sure` : 'Added by you'}</span>
                        </span>
                        <motion.span animate={{ scale: on ? 1 : 0.85 }} className={cx('grid h-7 w-7 shrink-0 place-items-center rounded-full', on ? 'bg-red text-white' : 'bg-white text-transparent ring-2 ring-inset ring-brown-20')}>
                          <Check size={15} strokeWidth={3.2} />
                        </motion.span>
                      </button>
                      <button onClick={() => removeItem(id)} aria-label={`Remove ${ING[id]?.name}`} className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-brown-50 hover:bg-red-50 hover:text-red"><X size={16} /></button>
                    </div>
                  </motion.li>
                )
              })}
            </AnimatePresence>
          </ul>
          {items.length === 0 && <p className="mt-4 rounded-3xl bg-cream-50 p-4 text-sm text-brown-70">Your list is empty. Search for an ingredient or tap a staple below.</p>}

          {/* Search picker */}
          <div className="relative mt-6">
            <label htmlFor="ing-search" className="mb-2 block font-display text-lg font-semibold text-brown">Add an ingredient</label>
            <div className="relative">
              <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-brown-50" />
              <input id="ing-search" value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && results[0]) { add(results[0].id); setQuery('') } }} placeholder="Search, e.g. garlic, rice, lemon" autoComplete="off" role="combobox" aria-expanded={results.length > 0} aria-controls="ing-results" className="h-12 w-full rounded-full bg-white pl-11 pr-4 text-[15px] text-brown shadow-soft ring-1 ring-inset ring-cream placeholder:text-brown-50 focus:outline-none focus:ring-2 focus:ring-red" />
            </div>
            <AnimatePresence>
              {results.length > 0 && (
                <motion.ul id="ing-results" role="listbox" initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="absolute inset-x-0 z-20 mt-2 max-h-72 overflow-auto rounded-3xl bg-white p-2 shadow-float">
                  {results.map((r) => (
                    <li key={r.id} role="option" aria-selected={false}>
                      <button onClick={() => { add(r.id); setQuery('') }} className="flex w-full items-center gap-3 rounded-2xl p-2 text-left hover:bg-cream-50 focus:bg-cream-50">
                        <IngredientIcon id={r.id} category={r.category} size={36} />
                        <span className="flex-1 font-bold text-brown">{r.name}</span>
                        <Plus size={18} className="text-red" />
                      </button>
                    </li>
                  ))}
                </motion.ul>
              )}
              {query.trim() && results.length === 0 && <p className="mt-2 text-sm text-brown-50">No match for “{query}”. Try a simpler name.</p>}
            </AnimatePresence>
          </div>

          {/* Staples */}
          <section aria-labelledby="miss" className="mt-6 rounded-4xl bg-sun-50 p-5">
            <h2 id="miss" className="font-display text-lg font-semibold text-brown">Did Frigi miss something?</h2>
            <p className="text-sm text-brown-70">Common staples are often hidden in cupboards. Tap to add.</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {STAPLES.map((id) => {
                const on = items.includes(id) && checked.has(id)
                return (
                  <motion.button key={id} whileTap={{ scale: 0.9 }} onClick={() => (on ? toggle(id) : add(id))} aria-pressed={on} className={cx('inline-flex h-10 items-center gap-2 rounded-full py-1 pl-1 pr-4 text-sm font-bold transition-colors', on ? 'bg-red text-white shadow-red' : 'bg-white text-brown shadow-soft hover:bg-cream-50')}>
                    <span className="grid h-8 w-8 place-items-center rounded-full bg-white"><IngredientIcon id={id} size={28} className="!bg-transparent" /></span>
                    {ING[id].name}
                    {on ? <Check size={15} strokeWidth={3} /> : <Plus size={15} strokeWidth={3} />}
                  </motion.button>
                )
              })}
            </div>
          </section>

          <div className="sticky bottom-[96px] z-10 mt-6 flex flex-col gap-3 rounded-4xl bg-paper/90 py-2 backdrop-blur sm:flex-row sm:items-center sm:justify-between lg:static lg:bg-transparent">
            <Pill tone="cream" className="self-start text-sm">{count} selected</Pill>
            <Button size="lg" disabled={count === 0} onClick={confirm} iconRight={<ArrowRight size={19} />}>Continue to Chef</Button>
          </div>
        </div>
      </div>
    </div>
  )
}
