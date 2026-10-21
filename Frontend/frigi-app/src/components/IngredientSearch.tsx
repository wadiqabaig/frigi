import { AnimatePresence, motion } from 'framer-motion'
import { AlertCircle, Check, Loader2, PencilLine, Plus, RotateCcw, Search, X } from 'lucide-react'
import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react'
import { useDebouncedValue } from '../hooks/useDebouncedValue'
import { api, errorMessage, isAborted } from '../lib/api'
import { cx } from '../lib/format'
import { ingredientKey } from '../lib/text'
import type { IngredientRef } from '../lib/types'
import { IngredientIcon } from './IngredientIcon'

const PAGE = 8

interface Props {
  /** True for an ingredient already on the list, so it can't be added twice. */
  isAdded: (item: IngredientRef) => boolean
  onAdd: (item: IngredientRef) => void
}

type Status = 'idle' | 'loading' | 'ready' | 'error'

/**
 * Ingredient autocomplete for the fridge list. Results come from the backend's
 * ingredient catalogue through api.searchIngredients; anything not found can be
 * added by hand as a custom ingredient.
 */
export function IngredientSearch({ isAdded, onAdd }: Props) {
  const listId = useId()
  const [query, setQuery] = useState('')
  const debounced = useDebouncedValue(query.trim(), 250)
  const [items, setItems] = useState<IngredientRef[]>([])
  const [hasMore, setHasMore] = useState(false)
  const [status, setStatus] = useState<Status>('idle')
  const [error, setError] = useState('')
  const [active, setActive] = useState(-1)
  const [attempt, setAttempt] = useState(0)
  const [moreLoading, setMoreLoading] = useState(false)
  const ctrl = useRef<AbortController | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    ctrl.current?.abort()
    setActive(-1)
    if (!debounced) { setItems([]); setHasMore(false); setStatus('idle'); return }
    const c = new AbortController()
    ctrl.current = c
    setStatus('loading')
    api.searchIngredients(debounced, { limit: PAGE, signal: c.signal })
      .then((page) => { setItems(page.items); setHasMore(page.hasMore); setStatus('ready') })
      .catch((e) => {
        if (isAborted(e)) return
        setItems([]); setHasMore(false); setStatus('error')
        setError(errorMessage(e, 'Ingredient search is unavailable right now.'))
      })
    return () => c.abort()
  }, [debounced, attempt])

  // Fetches the next page of matches and appends it.
  const loadMore = async () => {
    setMoreLoading(true)
    try {
      const page = await api.searchIngredients(debounced, { offset: items.length, limit: PAGE })
      setItems((x) => [...x, ...page.items]); setHasMore(page.hasMore)
    } catch (e) {
      setStatus('error'); setError(errorMessage(e, 'Couldn’t load more results.'))
    } finally { setMoreLoading(false) }
  }

  const typed = query.trim()
  const exact = items.find((i) => ingredientKey(i.name) === ingredientKey(typed))
  const custom: IngredientRef | null = typed && !exact ? { id: null, name: typed.charAt(0).toUpperCase() + typed.slice(1) } : null
  const rows: { item: IngredientRef; custom?: boolean }[] = [
    ...items.map((item) => ({ item })),
    ...(custom && status !== 'loading' ? [{ item: custom, custom: true }] : []),
  ]
  const open = !!typed && (status !== 'idle' || debounced !== typed)

  // Adds the chosen ingredient and clears the search box.
  const pick = (item: IngredientRef) => {
    if (isAdded(item)) return
    onAdd(item)
    setQuery(''); setItems([]); setStatus('idle')
    inputRef.current?.focus()
  }

  // Keyboard support: arrows move through results, Enter adds, Escape clears.
  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive((a) => Math.min(rows.length - 1, a + 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => Math.max(-1, a - 1)) }
    else if (e.key === 'Escape') { setQuery('') }
    else if (e.key === 'Enter') {
      e.preventDefault()
      const row = rows[active] ?? (exact ? { item: exact } : custom ? { item: custom } : undefined)
      if (row) pick(row.item)
    }
  }

  return (
    <div className="relative">
      <div className="relative">
        <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-brown-50" />
        <input
          ref={inputRef}
          id="ing-search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={onKey}
          placeholder="Search, e.g. beef, rice, strawberries"
          autoComplete="off"
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={active >= 0 ? `${listId}-${active}` : undefined}
          className="h-12 w-full rounded-full bg-white pl-11 pr-11 text-[15px] text-brown shadow-soft ring-1 ring-inset ring-cream placeholder:text-brown-50 focus:outline-none focus:ring-2 focus:ring-red"
        />
        {query && (
          <button type="button" onClick={() => { setQuery(''); inputRef.current?.focus() }} aria-label="Clear search" className="absolute right-2 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-full text-brown-50 hover:bg-cream-50"><X size={16} /></button>
        )}
      </div>

      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="absolute inset-x-0 z-20 mt-2 max-h-80 overflow-auto rounded-3xl bg-white p-2 shadow-float">
            {(status === 'loading' || debounced !== typed) && (
              <p className="flex items-center gap-2 p-3 text-sm font-semibold text-brown-70" role="status"><Loader2 size={16} className="animate-spin" /> Searching ingredients…</p>
            )}
            {status === 'error' && debounced === typed && (
              <div className="flex items-start gap-2 rounded-2xl bg-red-50 p-3 text-sm" role="alert">
                <AlertCircle size={16} className="mt-0.5 shrink-0 text-red" />
                <p className="min-w-0 flex-1 text-brown">{error}</p>
                <button type="button" onClick={() => setAttempt((n) => n + 1)} className="inline-flex shrink-0 items-center gap-1 font-bold text-red hover:underline"><RotateCcw size={13} /> Retry</button>
              </div>
            )}
            {status === 'ready' && debounced === typed && items.length === 0 && (
              <p className="px-3 pb-1 pt-2 text-sm text-brown-70">No catalogue match for “{typed}”.</p>
            )}
            {status !== 'loading' && debounced === typed && (
              <ul id={listId} role="listbox" aria-label="Ingredient suggestions">
                {rows.map(({ item, custom: isCustom }, i) => {
                  const added = isAdded(item)
                  return (
                    <li key={(item.id ?? 'custom') + item.name} id={`${listId}-${i}`} role="option" aria-selected={active === i} aria-disabled={added}>
                      <button
                        type="button"
                        disabled={added}
                        onMouseEnter={() => setActive(i)}
                        onClick={() => pick(item)}
                        className={cx('flex w-full items-center gap-3 rounded-2xl p-2 text-left', active === i && !added && 'bg-cream-50', added ? 'cursor-default opacity-60' : 'hover:bg-cream-50')}
                      >
                        {isCustom ? (
                          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-2xl bg-sun-50 text-sun-700"><PencilLine size={17} /></span>
                        ) : <IngredientIcon name={item.name} id={item.id} size={36} />}
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-bold text-brown">{isCustom ? `Add “${item.name}”` : item.name}</span>
                          {isCustom && <span className="block text-xs text-brown-50">Add it as your own ingredient</span>}
                        </span>
                        {added ? <span className="inline-flex items-center gap-1 text-xs font-bold text-leaf"><Check size={14} /> Added</span> : <Plus size={18} className="text-red" />}
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}
            {hasMore && status === 'ready' && debounced === typed && (
              <button type="button" onClick={loadMore} disabled={moreLoading} className="mt-1 flex w-full items-center justify-center gap-2 rounded-2xl p-2.5 text-sm font-bold text-red hover:bg-cream-50">
                {moreLoading && <Loader2 size={14} className="animate-spin" />} Show more results
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
