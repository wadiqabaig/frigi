import { Check, Minus, Plus } from 'lucide-react'
import { ALLERGEN_LABEL, DIET_LABEL } from '../lib/data/ingredients'
import type { Allergen, Diet } from '../lib/types'
import { Chip } from './ui'

export const ALLERGENS: Allergen[] = ['peanut', 'treenut', 'dairy', 'egg', 'gluten', 'soy', 'fish', 'shellfish', 'sesame']
export const DIETS: Diet[] = ['none', 'vegetarian', 'vegan', 'pescatarian', 'halal']

export function AllergyPicker({ value, onChange, labelId }: { value: Allergen[]; onChange: (v: Allergen[]) => void; labelId?: string }) {
  return (
    <div role="group" aria-labelledby={labelId} className="flex flex-wrap gap-2">
      {ALLERGENS.map((a) => {
        const on = value.includes(a)
        return (
          <Chip key={a} size="sm" selected={on} onClick={() => onChange(on ? value.filter((x) => x !== a) : [...value, a])} icon={on ? <Check size={14} strokeWidth={3} /> : undefined}>
            {ALLERGEN_LABEL[a]}
          </Chip>
        )
      })}
    </div>
  )
}

export function DietPicker({ value, onChange, labelId }: { value: Diet; onChange: (d: Diet) => void; labelId?: string }) {
  return (
    <div role="radiogroup" aria-labelledby={labelId} className="flex flex-wrap gap-2">
      {DIETS.map((d) => (
        <Chip key={d} size="sm" role="radio" aria-checked={value === d} selected={value === d} onClick={() => onChange(d)}>{DIET_LABEL[d]}</Chip>
      ))}
    </div>
  )
}

export function Stepper({ value, onChange, min = 1, max = 12, label }: { value: number; onChange: (n: number) => void; min?: number; max?: number; label: string }) {
  return (
    <div className="inline-flex items-center gap-1 rounded-full bg-white p-1 shadow-soft" role="group" aria-label={label}>
      <button type="button" onClick={() => onChange(Math.max(min, value - 1))} disabled={value <= min} aria-label={`Decrease ${label}`} className="grid h-9 w-9 place-items-center rounded-full bg-cream-50 text-brown hover:bg-cream disabled:opacity-40"><Minus size={16} strokeWidth={3} /></button>
      <span className="min-w-[2.5rem] text-center font-display text-lg font-semibold tabular-nums text-brown" aria-live="polite">{value}</span>
      <button type="button" onClick={() => onChange(Math.min(max, value + 1))} disabled={value >= max} aria-label={`Increase ${label}`} className="grid h-9 w-9 place-items-center rounded-full bg-red text-white hover:bg-red-600 disabled:opacity-40"><Plus size={16} strokeWidth={3} /></button>
    </div>
  )
}

export function Field({ id, label, error, hint, children }: { id: string; label: string; error?: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-bold text-brown">{label}</label>
      {children}
      {error ? <p id={id + '-err'} className="mt-1.5 text-xs font-bold text-red-600">{error}</p> : hint ? <p className="mt-1.5 text-xs text-brown-50">{hint}</p> : null}
    </div>
  )
}

export const inputCls = 'h-12 w-full rounded-2xl border-0 bg-white px-4 text-[15px] text-brown shadow-soft ring-1 ring-inset ring-cream placeholder:text-brown-50 focus:outline-none focus:ring-2 focus:ring-red'
