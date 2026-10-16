import { AnimatePresence, motion } from 'framer-motion'
import { Bookmark, ChefHat, FlaskConical, Home, ScanLine, User } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { POSES } from '../assets'
import { cx } from '../lib/format'
import { useApp, type ScreenName } from '../state/AppState'
import { DemoMenu } from './DemoMenu'
import { Logo } from './ui'

const NAV: { key: string; label: string; icon: typeof Home; to: ScreenName; match: ScreenName[] }[] = [
  { key: 'home', label: 'Home', icon: Home, to: 'home', match: ['home'] },
  { key: 'scan', label: 'Scan', icon: ScanLine, to: 'upload', match: ['upload', 'scanning', 'ingredients'] },
  { key: 'chef', label: 'Chef', icon: ChefHat, to: 'chef', match: ['chef', 'recipes', 'recipe'] },
  { key: 'saved', label: 'Saved', icon: Bookmark, to: 'saved', match: ['saved'] },
  { key: 'profile', label: 'Profile', icon: User, to: 'profile', match: ['profile', 'states'] },
]

export function Shell({ children }: { children: ReactNode }) {
  const { route, go } = useApp()
  const [demoOpen, setDemoOpen] = useState(false)
  const active = NAV.find((n) => n.match.includes(route.name))?.key
  const goNav = (to: ScreenName) => go(to)

  return (
    <div className="min-h-full lg:flex">
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-screen w-[248px] shrink-0 flex-col border-r border-cream bg-white/70 px-5 py-7 backdrop-blur lg:flex">
        <button onClick={() => go('home')} className="mb-9 self-start rounded-xl" aria-label="Frigi home"><Logo className="h-10" /></button>
        <nav aria-label="Main" className="flex flex-col gap-1.5">
          {NAV.map((n) => {
            const on = active === n.key
            return (
              <button
                key={n.key}
                onClick={() => goNav(n.to)}
                aria-current={on ? 'page' : undefined}
                className={cx('relative flex h-12 items-center gap-3 rounded-2xl px-4 text-[15px] font-bold transition-colors', on ? 'text-white' : 'text-brown-70 hover:bg-cream-50 hover:text-brown')}
              >
                {on && <motion.span layoutId="side-pill" className="absolute inset-0 rounded-2xl bg-red shadow-red" transition={{ type: 'spring', stiffness: 400, damping: 32 }} />}
                <n.icon size={20} className="relative" strokeWidth={2.4} />
                <span className="relative">{n.label}</span>
              </button>
            )
          })}
        </nav>
        <div className="mt-auto">
          <div className="relative overflow-visible rounded-3xl bg-sun-50 p-4 pt-[72px]">
            <img src={POSES.leaning} alt="" className="absolute -top-10 left-1/2 w-24 -translate-x-1/2" />
            <p className="font-display text-[15px] font-semibold text-brown">Demo mode</p>
            <p className="mt-1 text-xs leading-relaxed text-brown-70">Everything runs on sample data. Try the test scenarios.</p>
            <button onClick={() => setDemoOpen(true)} className="mt-3 inline-flex h-9 items-center gap-2 rounded-full bg-white px-4 text-sm font-bold text-brown shadow-soft hover:bg-cream-50">
              <FlaskConical size={16} /> Demo menu
            </button>
          </div>
        </div>
      </aside>

      <main className="min-w-0 flex-1 pb-28 lg:pb-12">
        <div className="mx-auto w-full max-w-[1180px] pl-[max(16px,env(safe-area-inset-left,0px))] pr-[max(16px,env(safe-area-inset-right,0px))] pt-5 sm:px-8 lg:px-10 lg:pt-9">
          {children}
        </div>
      </main>

      {/* Mobile demo button */}
      <button
        onClick={() => setDemoOpen(true)}
        aria-label="Open demo menu"
        className="fixed right-[max(12px,env(safe-area-inset-right,0px))] top-[calc(env(safe-area-inset-top,0px)+12px)] z-30 grid h-10 w-10 place-items-center rounded-full bg-white/90 text-brown-70 shadow-soft backdrop-blur lg:hidden"
      >
        <FlaskConical size={18} />
      </button>

      {/* Mobile bottom nav */}
      <nav aria-label="Main" className="fixed inset-x-0 bottom-0 z-30 px-[max(12px,env(safe-area-inset-left,0px))] pb-[max(12px,env(safe-area-inset-bottom,0px))] lg:hidden">
        <div className="mx-auto flex max-w-md items-center justify-between rounded-[28px] bg-white/95 px-2 py-2 shadow-float backdrop-blur">
          {NAV.map((n) => {
            const on = active === n.key
            const center = n.key === 'scan'
            return (
              <button
                key={n.key}
                onClick={() => goNav(n.to)}
                aria-current={on ? 'page' : undefined}
                aria-label={n.label}
                className="relative flex flex-1 flex-col items-center gap-0.5 py-1"
              >
                {center ? (
                  <motion.span whileTap={{ scale: 0.9 }} className={cx('-mt-7 grid h-14 w-14 place-items-center rounded-full border-4 border-paper text-white shadow-red', on ? 'bg-red-600' : 'bg-red')}>
                    <n.icon size={24} strokeWidth={2.5} />
                  </motion.span>
                ) : (
                  <span className={cx('relative grid h-10 w-12 place-items-center rounded-2xl transition-colors', on ? 'text-red' : 'text-brown-50')}>
                    {on && <motion.span layoutId="bot-pill" className="absolute inset-0 rounded-2xl bg-red-50" transition={{ type: 'spring', stiffness: 400, damping: 32 }} />}
                    <n.icon size={21} strokeWidth={2.4} className="relative" />
                  </span>
                )}
                <span className={cx('text-[11px] font-bold', on ? 'text-red' : 'text-brown-50')}>{n.label}</span>
              </button>
            )
          })}
        </div>
      </nav>

      <DemoMenu open={demoOpen} onClose={() => setDemoOpen(false)} />
    </div>
  )
}

export function Toast() {
  const { toast } = useApp()
  return (
    <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-28 z-[60] flex justify-center px-4 lg:bottom-8">
      <AnimatePresence>
        {toast && (
          <motion.div initial={{ y: 20, opacity: 0, scale: 0.95 }} animate={{ y: 0, opacity: 1, scale: 1 }} exit={{ y: 10, opacity: 0 }} className="flex items-center gap-2 rounded-full bg-brown px-5 py-3 text-sm font-bold text-white shadow-float">
            <img src={POSES.success} alt="" className="h-7 w-7 object-contain" /> {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/** Progress through the core journey */
const STEPS: { key: ScreenName[]; label: string }[] = [
  { key: ['upload', 'scanning'], label: 'Scan' },
  { key: ['ingredients'], label: 'Confirm' },
  { key: ['chef'], label: 'Chat' },
  { key: ['recipes', 'recipe'], label: 'Cook' },
]
export function JourneySteps() {
  const { route } = useApp()
  const idx = STEPS.findIndex((s) => s.key.includes(route.name))
  return (
    <ol className="flex items-center gap-1.5" aria-label="Your progress">
      {STEPS.map((s, i) => (
        <li key={s.label} className="flex items-center gap-1.5" aria-current={i === idx ? 'step' : undefined}>
          <span className={cx('flex h-7 items-center gap-1.5 rounded-full px-2.5 text-xs font-bold transition-colors', i < idx ? 'bg-sun-50 text-sun-700' : i === idx ? 'bg-red text-white' : 'bg-cream-50 text-brown-50')}>
            <span className={cx('grid h-4 w-4 place-items-center rounded-full text-[10px]', i === idx ? 'bg-white/25' : 'bg-white')}>{i + 1}</span>
            <span className={cx(i === idx ? 'inline' : 'hidden sm:inline')}>{s.label}</span>
          </span>
          {i < STEPS.length - 1 && <span className={cx('h-0.5 w-3 rounded-full sm:w-5', i < idx ? 'bg-sun' : 'bg-cream')} aria-hidden />}
        </li>
      ))}
    </ol>
  )
}
