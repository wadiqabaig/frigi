import { motion, useReducedMotion } from 'framer-motion'
import { ArrowUpRight, Clock, Heart, Sparkles } from 'lucide-react'
import { cx } from '../lib/format'
import { splitIngredients } from '../lib/recipes'
import type { Recipe, RecipeOption, RecipeOrigin, RecipeSource } from '../lib/types'
import { useApp } from '../state/AppState'
import { RecipeImage } from './RecipeImage'
import { Pill } from './ui'

export const SOURCE_LABEL: Record<RecipeSource, string> = { spoonacular: 'Spoonacular', llm: 'Written by Chef Frigi' }

// Heart button that saves or unsaves a full recipe.
export function SaveHeart({ recipe, className }: { recipe: Recipe; className?: string }) {
  const { isSaved, toggleSaved, notify } = useApp()
  const on = isSaved(recipe)
  const reduce = useReducedMotion()
  return (
    <motion.button
      whileTap={{ scale: 0.85 }}
      onClick={(e) => { e.stopPropagation(); const now = toggleSaved(recipe); notify(now ? 'Saved to your recipes' : 'Removed from saved') }}
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

// Card for one recipe option, showing what the user has and what is missing.
export function RecipeCard({ option, origin, index = 0, compact }: { option: RecipeOption; origin: RecipeOrigin; index?: number; compact?: boolean }) {
  const { go, inventory } = useApp()
  const reduce = useReducedMotion()
  const open = () => go('recipe', { optionId: option.optionId })
  const { have, missing } = splitIngredients(option, origin, inventory)
  return (
    <motion.article
      initial={reduce ? false : { opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08, type: 'spring', stiffness: 220, damping: 24 }}
      whileHover={reduce ? undefined : { y: -6 }}
      className="group relative flex cursor-pointer flex-col rounded-4xl bg-white p-4 shadow-soft transition-shadow hover:shadow-float"
      onClick={open}
    >
      <div className={cx('relative overflow-hidden rounded-3xl', compact ? 'aspect-[4/3]' : 'aspect-[6/5]')}>
        <motion.div className="h-full w-full" whileHover={reduce ? undefined : { scale: 1.05 }} transition={{ type: 'spring', stiffness: 200, damping: 18 }}>
          <RecipeImage src={option.imageUrl} title={option.title} className="h-full w-full" />
        </motion.div>
        <div className="absolute left-3 top-3 flex gap-1.5">
          <Pill tone="white">{option.source === 'llm' && <Sparkles size={11} />}{SOURCE_LABEL[option.source]}</Pill>
        </div>
      </div>
      <div className="flex flex-1 flex-col px-1 pt-4">
        <div className="flex items-center gap-3 text-xs font-bold text-brown-70">
          <span className="inline-flex items-center gap-1"><Clock size={14} className="text-red" /> {option.minutes ? `${option.minutes} min` : 'Time not listed'}</span>
        </div>
        <h3 className="mt-2 font-display text-[19px] font-semibold leading-snug text-brown [text-wrap:balance]">
          <button onClick={(e) => { e.stopPropagation(); open() }} className="text-left focus-visible:underline">{option.title}</button>
        </h3>
        {!compact && option.summary && <p className="mt-1 line-clamp-3 text-sm leading-relaxed text-brown-70">{option.summary}</p>}
        <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
          <div className="rounded-2xl bg-leaf-50 p-3">
            <p className="font-extrabold text-leaf">You have {have.length}</p>
            <p className="mt-0.5 line-clamp-2 text-brown-70">{have.join(', ') || 'None listed'}</p>
          </div>
          <div className={cx('rounded-2xl p-3', missing.length ? 'bg-red-50' : 'bg-sun-50')}>
            <p className={cx('font-extrabold', missing.length ? 'text-red-600' : 'text-sun-700')}>{missing.length ? `You’re missing ${missing.length}` : 'Nothing missing!'}</p>
            <p className="mt-0.5 line-clamp-2 text-brown-70">{missing.join(', ') || 'Ready to cook'}</p>
          </div>
        </div>
        <div className="mt-auto flex items-center justify-end pt-4">
          <span className="inline-flex items-center gap-1 rounded-full bg-brown px-3.5 py-2 text-xs font-bold text-white transition-colors group-hover:bg-red">
            View recipe <ArrowUpRight size={14} />
          </span>
        </div>
      </div>
    </motion.article>
  )
}

/** A recipe the user saved earlier: a snapshot that stays viewable after the chef's options expire. */
export function SavedRecipeCard({ recipe, index = 0 }: { recipe: Recipe; index?: number }) {
  const { go } = useApp()
  const reduce = useReducedMotion()
  const open = () => go('recipe', { savedId: recipe.optionId })
  return (
    <motion.article
      initial={reduce ? false : { opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08, type: 'spring', stiffness: 220, damping: 24 }}
      whileHover={reduce ? undefined : { y: -6 }}
      className="group relative flex cursor-pointer flex-col rounded-4xl bg-white p-4 shadow-soft transition-shadow hover:shadow-float"
      onClick={open}
    >
      <div className="relative aspect-[4/3] overflow-hidden rounded-3xl">
        <RecipeImage src={recipe.imageUrl} title={recipe.title} className="h-full w-full" />
        <SaveHeart recipe={recipe} className="absolute right-3 top-3" />
      </div>
      <div className="flex flex-1 flex-col px-1 pt-4">
        <div className="flex items-center gap-3 text-xs font-bold text-brown-70">
          <span className="inline-flex items-center gap-1"><Clock size={14} className="text-red" /> {recipe.minutes ? `${recipe.minutes} min` : 'Time not listed'}</span>
          <span>Serves {recipe.servings}</span>
        </div>
        <h3 className="mt-2 font-display text-[19px] font-semibold leading-snug text-brown [text-wrap:balance]">
          <button onClick={(e) => { e.stopPropagation(); open() }} className="text-left focus-visible:underline">{recipe.title}</button>
        </h3>
        <div className="mt-auto flex items-center justify-between pt-4">
          <span className="text-xs font-bold text-brown-50">{recipe.ingredients.length} ingredients · {recipe.steps.length} steps</span>
          <span className="inline-flex items-center gap-1 rounded-full bg-brown px-3.5 py-2 text-xs font-bold text-white transition-colors group-hover:bg-red">
            View <ArrowUpRight size={14} />
          </span>
        </div>
      </div>
    </motion.article>
  )
}
