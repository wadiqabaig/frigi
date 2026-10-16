import { motion, useReducedMotion } from 'framer-motion'
import { ArrowUpRight, Clock, Heart, Users } from 'lucide-react'
import { ING } from '../lib/data/ingredients'
import { cx, totalTime } from '../lib/format'
import type { Recipe, Recommendation } from '../lib/types'
import { useApp } from '../state/AppState'
import { DishArt } from './DishArt'
import { Pill } from './ui'

export const CUISINE_LABEL: Record<string, string> = {
  italian: 'Italian', asian: 'Asian', indian: 'Indian', mediterranean: 'Mediterranean', other: 'Comfort classic',
}

/** Diet badges derived from the recipe's required ingredients. */
export function dietBadges(recipe: Recipe): string[] {
  const req = recipe.ingredients.filter((i) => !i.optional).map((i) => ING[i.id])
  const tags = req.flatMap((i) => i?.tags ?? [])
  const all = req.flatMap((i) => i?.allergens ?? [])
  const out: string[] = []
  if (!tags.some((t) => ['meat', 'poultry', 'pork', 'fish', 'shellfish', 'animal'].includes(t))) out.push('Vegan')
  else if (!tags.some((t) => ['meat', 'poultry', 'pork', 'fish', 'shellfish'].includes(t))) out.push('Vegetarian')
  if (!all.includes('gluten')) out.push('Gluten-free')
  if (!all.includes('dairy')) out.push('Dairy-free')
  return out.slice(0, 2)
}

export function SaveHeart({ id, className }: { id: string; className?: string }) {
  const { saved, toggleSaved, notify } = useApp()
  const on = saved.includes(id)
  const reduce = useReducedMotion()
  return (
    <motion.button
      whileTap={{ scale: 0.85 }}
      onClick={(e) => { e.stopPropagation(); const now = toggleSaved(id); notify(now ? 'Saved to your recipes' : 'Removed from saved') }}
      aria-pressed={on}
      aria-label={on ? 'Remove from saved' : 'Save recipe'}
      className={cx('grid h-11 w-11 place-items-center rounded-full bg-white shadow-soft', className)}
    >
      <motion.span key={String(on)} initial={reduce ? false : { scale: 0.4 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 500, damping: 14 }}>
        <Heart size={20} className={on ? 'fill-red text-red' : 'text-brown-70'} strokeWidth={2.4} />
      </motion.span>
    </motion.button>
  )
}

export function RecipeCard({ rec, recipe: r0, index = 0, servings, compact }: { rec?: Recommendation; recipe?: Recipe; index?: number; servings?: number; compact?: boolean }) {
  const { go } = useApp()
  const recipe = rec?.recipe ?? r0!
  const reduce = useReducedMotion()
  const open = () => go('recipe', { id: recipe.id })
  return (
    <motion.article
      initial={reduce ? false : { opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08, type: 'spring', stiffness: 220, damping: 24 }}
      whileHover={reduce ? undefined : { y: -6 }}
      className="group relative flex cursor-pointer flex-col rounded-4xl bg-white p-4 shadow-soft transition-shadow hover:shadow-float"
      onClick={open}
    >
      <div className={cx('relative overflow-hidden rounded-3xl bg-cream-50', compact ? 'aspect-[4/3]' : 'aspect-[6/5]')}>
        <motion.div className="h-full w-full" whileHover={reduce ? undefined : { scale: 1.06, rotate: -2 }} transition={{ type: 'spring', stiffness: 200, damping: 18 }}>
          <DishArt recipe={recipe} className="h-full w-full" />
        </motion.div>
        <div className="absolute left-3 top-3 flex gap-1.5">
          <Pill tone="white">{CUISINE_LABEL[recipe.cuisine]}</Pill>
        </div>
        <SaveHeart id={recipe.id} className="absolute right-3 top-3" />
      </div>
      <div className="flex flex-1 flex-col px-1 pt-4">
        <div className="flex items-center gap-3 text-xs font-bold text-brown-70">
          <span className="inline-flex items-center gap-1"><Clock size={14} className="text-red" /> {totalTime(recipe)} min</span>
          <span className="inline-flex items-center gap-1"><Users size={14} className="text-red" /> Serves {servings ?? recipe.baseServings}</span>
          <span className="inline-flex items-center gap-1 text-sun-700">★ {recipe.rating}</span>
        </div>
        <h3 className="mt-2 font-display text-[19px] font-semibold leading-snug text-brown [text-wrap:balance]">
          <button onClick={(e) => { e.stopPropagation(); open() }} className="text-left focus-visible:underline">{recipe.title}</button>
        </h3>
        {!compact && <p className="mt-1 text-sm leading-relaxed text-brown-70">{recipe.blurb}</p>}
        <div className="mt-3 flex flex-wrap gap-1.5">
          {dietBadges(recipe).map((b) => <Pill key={b} tone="leaf">{b}</Pill>)}
          {rec && !rec.fitsTime && <Pill tone="sun">A bit longer</Pill>}
        </div>
        {rec && (
          <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
            <div className="rounded-2xl bg-leaf-50 p-3">
              <p className="font-extrabold text-leaf">You have {rec.have.length}</p>
              <p className="mt-0.5 line-clamp-2 text-brown-70">{rec.have.map((i) => ING[i.id]?.name).join(', ') || '—'}</p>
            </div>
            <div className={cx('rounded-2xl p-3', rec.missing.length ? 'bg-red-50' : 'bg-sun-50')}>
              <p className={cx('font-extrabold', rec.missing.length ? 'text-red-600' : 'text-sun-700')}>{rec.missing.length ? `You're missing ${rec.missing.length}` : 'Nothing missing!'}</p>
              <p className="mt-0.5 line-clamp-2 text-brown-70">{rec.missing.map((i) => ING[i.id]?.name).join(', ') || 'Ready to cook'}</p>
            </div>
          </div>
        )}
        <div className="mt-auto flex items-center justify-between pt-4">
          {rec ? <span className="text-xs font-bold text-brown-50">Uses {rec.have.length} from your fridge</span> : <span className="text-xs font-bold text-brown-50">{recipe.difficulty}</span>}
          <span className="inline-flex items-center gap-1 rounded-full bg-brown px-3.5 py-2 text-xs font-bold text-white transition-colors group-hover:bg-red">
            View recipe <ArrowUpRight size={14} />
          </span>
        </div>
      </div>
    </motion.article>
  )
}
