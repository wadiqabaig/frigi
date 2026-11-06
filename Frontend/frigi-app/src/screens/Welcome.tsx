import { motion, useReducedMotion } from 'framer-motion'
import { ArrowRight, Sparkles } from 'lucide-react'
import { ICONS, POSES } from '../assets'
import { IngredientGlyph } from '../components/IngredientIcon'
import { Button, Logo, Mascot } from '../components/ui'
import type { GlyphKey } from '../lib/ingredientVisual'
import { useApp } from '../state/AppState'

const FLOATERS: { id: GlyphKey; x: string; y: string; s: number; d: number; r: number }[] = [
  { id: 'tomato', x: '6%', y: '14%', s: 64, d: 0, r: 8 },
  { id: 'cheese', x: '78%', y: '8%', s: 58, d: 0.6, r: -10 },
  { id: 'leafy', x: '84%', y: '56%', s: 62, d: 1.2, r: 12 },
  { id: 'eggs', x: '2%', y: '62%', s: 56, d: 1.8, r: -8 },
  { id: 'lemon', x: '68%', y: '84%', s: 46, d: 0.9, r: 14 },
  { id: 'greenchilli', x: '20%', y: '86%', s: 44, d: 1.5, r: -12 },
]

const HOW = [
  { pose: POSES.upload, title: 'Snap your fridge', body: 'Up to five photos. Frigi spots the food.' },
  { pose: POSES.confirm, title: 'Check the list', body: 'Tick, remove or add anything it missed.' },
  { pose: POSES.recommends, title: 'Cook something good', body: 'Recipes that use what you already have.' },
]

// Landing page for signed-out visitors.
export function Welcome() {
  const { go } = useApp()
  const reduce = useReducedMotion()
  return (
    <div className="relative min-h-full overflow-hidden">
      {/* warm ambient shapes */}
      <div aria-hidden className="pointer-events-none absolute -right-40 -top-40 h-[560px] w-[560px] rounded-full bg-sun-50" />
      <div aria-hidden className="pointer-events-none absolute -bottom-52 -left-40 h-[460px] w-[460px] rounded-full bg-peach/70" />

      <div className="relative mx-auto flex max-w-[1180px] flex-col pl-[max(16px,env(safe-area-inset-left,0px))] pr-[max(16px,env(safe-area-inset-right,0px))] pb-10 pt-5 sm:px-8 lg:px-10">
        <header className="flex items-center justify-between">
          <Logo className="h-10 origin-top-left scale-125 sm:h-11" />
        </header>

        <div className="mt-4 grid items-center gap-6 lg:mt-6 lg:grid-cols-[1.05fr_1fr] lg:gap-10">
          {/* Mascot stage */}
          <div className="relative order-1 mx-auto aspect-square w-full max-w-[420px] lg:order-2 lg:max-w-[520px]">
            <motion.div
              aria-hidden
              initial={reduce ? false : { scale: 0.6, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 120, damping: 16 }}
              className="absolute inset-[8%] rounded-full bg-sun"
            />
            <div aria-hidden className="absolute inset-[16%] rounded-full border-2 border-dashed border-white/60" />
            {FLOATERS.map((f, i) => (
              <motion.div
                key={'f' + f.id}
                aria-hidden
                className="absolute z-[2] grid place-items-center rounded-[22px] bg-white shadow-float"
                style={{ left: f.x, top: f.y, width: f.s + 14, height: f.s + 14 }}
                initial={reduce ? false : { scale: 0, rotate: -20 }}
                animate={reduce ? { scale: 1 } : { scale: 1, rotate: 0, y: [0, -12, 0] }}
                transition={{ scale: { delay: 0.3 + i * 0.08, type: 'spring' }, rotate: { delay: 0.3 + i * 0.08 }, y: { duration: 4 + i * 0.3, repeat: Infinity, ease: 'easeInOut', delay: f.d } }}
              >
                <IngredientGlyph glyph={f.id} className="h-[72%] w-[72%]" />
              </motion.div>
            ))}
            <div className="absolute inset-x-0 bottom-[2%] z-[1] flex justify-center">
              <Mascot pose="main" size="62%" />
            </div>
          </div>

          {/* Copy */}
          <div className="order-2 text-center lg:order-1 lg:text-left">
            <motion.p initial={reduce ? false : { opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-xs font-extrabold uppercase tracking-[0.12em] text-red shadow-soft">
              <Sparkles size={14} /> Your AI kitchen companion
            </motion.p>
            <motion.h1
              initial={reduce ? false : { opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.08 }}
              className="mx-auto mt-5 max-w-xl font-display text-[40px] font-semibold leading-[1.04] tracking-[-0.01em] text-brown [text-wrap:balance] sm:text-[56px] lg:mx-0 lg:text-[64px]"
            >
              Your fridge has ideas. <span className="text-red">Let Frigi find them!</span>
            </motion.h1>
            <motion.p initial={reduce ? false : { opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.16 }} className="mx-auto mt-5 max-w-md text-[17px] leading-relaxed text-brown-70 lg:mx-0">
              Snap a photo of your fridge. Frigi recognises your ingredients, asks what you’re craving, and suggests recipes you can cook right now.
            </motion.p>
            <motion.div initial={reduce ? false : { opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.24 }} className="mx-auto mt-8 flex max-w-sm flex-col items-center gap-3 lg:mx-0 lg:items-start">
              <Button size="lg" className="w-full sm:w-auto" onClick={() => go('signup')} iconRight={<ArrowRight size={18} />}>Create a free account</Button>
              <p className="text-sm text-brown-70">New here? It takes about a minute and keeps your allergies and diet safe.</p>
              <p className="text-sm text-brown-70">Already have an account? <button onClick={() => go('login')} className="font-bold text-red underline-offset-2 hover:underline">Log in</button></p>
            </motion.div>
          </div>
        </div>

        {/* How it works */}
        <section aria-labelledby="how" className="mt-12 lg:mt-14">
          <h2 id="how" className="sr-only">How Frigi works</h2>
          <ol className="grid gap-4 sm:grid-cols-3">
            {HOW.map((h, i) => (
              <motion.li
                key={h.title}
                initial={reduce ? false : { opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.35 + i * 0.1 }}
                className="flex items-center gap-4 rounded-4xl bg-white p-4 shadow-soft"
              >
                <div className="relative grid h-24 w-20 shrink-0 place-items-end rounded-3xl bg-cream-50">
                  <img src={h.pose} alt="" className="-mt-4 h-[118%] w-auto object-contain object-bottom" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-extrabold text-red">Step {i + 1}</p>
                  <p className="font-display text-lg font-semibold text-brown">{h.title}</p>
                  <p className="text-sm text-brown-70">{h.body}</p>
                </div>
              </motion.li>
            ))}
          </ol>
          <div className="mt-8 flex items-center justify-center gap-6 opacity-60" aria-hidden>
            {[ICONS.whisk, ICONS.broccoli, ICONS.hen, ICONS.onion, ICONS.knife, ICONS.cooking].map((src, i) => (
              <img key={i} src={src} alt="" className="h-7 w-7" />
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}
