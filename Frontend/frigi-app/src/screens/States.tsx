import { motion, useReducedMotion } from 'framer-motion'
import { ArrowLeft } from 'lucide-react'
import type { Pose } from '../assets'
import { Button, IconButton, Mascot } from '../components/ui'
import { useApp, type StateKind } from '../state/AppState'
import { cx } from '../lib/format'

export interface StateAction { label: string; run: () => void; variant?: 'primary' | 'secondary' | 'outline' }
interface StateDef { pose: Pose; eyebrow: string; title: string; body: string; tone: 'calm' | 'warn' | 'happy' }

const STATE_DEFS: Record<StateKind, StateDef> = {
  'no-ingredients': { pose: 'error', eyebrow: 'Hmm, an empty shelf?', title: 'Frigi couldn’t spot any ingredients', body: 'The photo might be too dark, blurry or taken from far away. Try another photo with the fridge door wide open, or add what you have by hand.', tone: 'calm' },
  'bad-format': { pose: 'error', eyebrow: 'That file won’t open', title: 'Frigi can only read photos', body: 'Please choose a JPG, PNG or HEIC image up to 10 MB.', tone: 'calm' },
  'too-many': { pose: 'confirm', eyebrow: 'Whoa, that’s a lot!', title: 'Up to 3 photos per scan', body: 'Pick the three photos that show the most food. Frigi combines everything it finds into one list.', tone: 'calm' },
  server: { pose: 'error', eyebrow: 'Kitchen’s a bit busy', title: 'Frigi’s AI is unavailable right now', body: 'The service didn’t respond. Your photos and ingredients are still here, so you can try again in a moment or add ingredients yourself.', tone: 'calm' },
  'no-recipes': { pose: 'mealPlan', eyebrow: 'Back to the drawing board', title: 'No recipes match just yet', body: 'Frigi couldn’t find a safe recipe with these ingredients and choices. Add a few more ingredients or loosen your preferences.', tone: 'calm' },
  expired: { pose: 'error', eyebrow: 'You’ve been away a while', title: 'Your session has expired', body: 'For your security, please log in again. Your saved recipes are still here.', tone: 'calm' },
  allergy: { pose: 'allergy', eyebrow: 'Heads up', title: 'This recipe isn’t safe for you', body: 'It contains something your allergies or diet rule out. Pick another recipe, or review your preferences.', tone: 'warn' },
  success: { pose: 'success', eyebrow: 'Yay!', title: 'All done, chef!', body: 'Your changes are saved and Frigi is ready for the next meal.', tone: 'happy' },
}

// Default buttons for each state screen.
function useStateActions(kind: StateKind): StateAction[] {
  const { go, back, user } = useApp()
  switch (kind) {
    case 'no-ingredients': return [{ label: 'Upload another photo', run: () => go('upload') }, { label: 'Add ingredients manually', run: () => go('ingredients', { manual: 1 }), variant: 'secondary' }]
    case 'bad-format': return [{ label: 'Choose another photo', run: () => go('upload') }, { label: 'Return home', run: () => go('home'), variant: 'secondary' }]
    case 'too-many': return [{ label: 'Pick up to 3 photos', run: () => go('upload') }]
    case 'server': return [{ label: 'Try again', run: () => go('scanning') }, { label: 'Add ingredients manually', run: () => go('ingredients', { manual: 1 }), variant: 'secondary' }]
    case 'no-recipes': return [{ label: 'Add more ingredients', run: () => go('ingredients') }, { label: 'Change preferences', run: () => go('chef'), variant: 'secondary' }]
    case 'expired': return user ? [{ label: 'Return home', run: () => go('home') }] : [{ label: 'Log in again', run: () => go('login') }]
    case 'allergy': return [{ label: 'Review my allergies', run: () => go('profile') }, { label: 'Go back', run: back, variant: 'secondary' }]
    case 'success': return [{ label: 'Return home', run: () => go('home') }]
  }
}

// An empty, error or success message with Frigi and action buttons.
export function StateView({ kind, compact, actions, title, body }: { kind: StateKind; compact?: boolean; actions?: StateAction[]; title?: string; body?: string }) {
  const def = STATE_DEFS[kind]
  const fallback = useStateActions(kind)
  const acts = actions ?? fallback
  const reduce = useReducedMotion()
  return (
    <motion.section
      initial={reduce ? false : { opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className={cx('relative flex flex-col items-center overflow-hidden rounded-5xl text-center', compact ? 'bg-white p-6 shadow-soft' : 'px-4 py-6 sm:py-10')}
      aria-live="polite"
    >
      <div className={cx('relative grid place-items-center', compact ? 'mb-2' : 'mb-4')}>
        <div className={cx('absolute rounded-full', def.tone === 'warn' ? 'bg-red-50' : def.tone === 'happy' ? 'bg-sun-100' : 'bg-sun-50', compact ? 'h-36 w-36' : 'h-56 w-56 sm:h-64 sm:w-64')} aria-hidden />
        <Mascot pose={def.pose} size={compact ? 130 : 200} motionKind={def.tone === 'warn' ? 'wiggle' : def.tone === 'happy' ? 'bounce' : 'float'} />
      </div>
      <p className={cx('text-xs font-extrabold uppercase tracking-[0.14em]', def.tone === 'warn' ? 'text-red' : 'text-sun-700')}>{def.eyebrow}</p>
      <h2 className={cx('mt-2 max-w-md font-display font-semibold text-brown [text-wrap:balance]', compact ? 'text-xl' : 'text-[26px] sm:text-3xl')}>{title ?? def.title}</h2>
      <p className="mt-2 max-w-md text-[15px] leading-relaxed text-brown-70">{body ?? def.body}</p>
      <div className="mt-6 flex w-full max-w-sm flex-col gap-2.5 sm:w-auto sm:max-w-none sm:flex-row">
        {acts.map((a, i) => (
          <Button key={a.label} variant={a.variant ?? (i === 0 ? 'primary' : 'secondary')} onClick={a.run}>{a.label}</Button>
        ))}
      </div>
    </motion.section>
  )
}

/** Full-screen state route. `message` carries the backend's own explanation when there is one. */
export function StateScreen({ kind }: { kind: StateKind }) {
  const { back, canGoBack, route } = useApp()
  const message = route.params?.message ? String(route.params.message) : undefined
  return (
    <div className="mx-auto flex min-h-[80vh] max-w-2xl flex-col justify-center">
      {canGoBack && kind !== 'expired' && <IconButton label="Back" onClick={back} className="mb-2"><ArrowLeft size={20} /></IconButton>}
      <StateView kind={kind} body={message} />
    </div>
  )
}
