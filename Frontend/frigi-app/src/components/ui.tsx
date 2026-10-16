import { AnimatePresence, motion, useReducedMotion, type HTMLMotionProps } from 'framer-motion'
import { X } from 'lucide-react'
import { useEffect, useRef, type ReactNode } from 'react'
import { LOGO, POSES, POSE_ALT, type Pose } from '../assets'
import { cx } from '../lib/format'

/* ------------------------------------------------------------------ Button */
type BtnVariant = 'primary' | 'secondary' | 'ghost' | 'sun' | 'outline'
const BTN: Record<BtnVariant, string> = {
  primary: 'bg-red text-white shadow-red hover:bg-red-600',
  secondary: 'bg-cream text-brown hover:bg-cream-200',
  ghost: 'bg-transparent text-brown hover:bg-cream-50',
  sun: 'bg-sun text-brown hover:brightness-95 shadow-[0_12px_24px_-12px_rgba(254,181,6,.8)]',
  outline: 'bg-white text-brown ring-1 ring-inset ring-brown-20 hover:ring-brown-50',
}
export function Button({
  variant = 'primary', size = 'md', className, children, icon, iconRight, ...rest
}: HTMLMotionProps<'button'> & { variant?: BtnVariant; size?: 'sm' | 'md' | 'lg'; icon?: ReactNode; iconRight?: ReactNode }) {
  const reduce = useReducedMotion()
  return (
    <motion.button
      whileHover={reduce || rest.disabled ? undefined : { y: -2 }}
      whileTap={reduce || rest.disabled ? undefined : { scale: 0.96 }}
      transition={{ type: 'spring', stiffness: 500, damping: 25 }}
      className={cx(
        'inline-flex items-center justify-center gap-2 rounded-full font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none select-none',
        size === 'sm' && 'h-9 px-4 text-sm',
        size === 'md' && 'h-12 px-6 text-[15px]',
        size === 'lg' && 'h-14 px-8 text-base',
        BTN[variant], className,
      )}
      {...rest}
    >
      {icon}
      {children as ReactNode}
      {iconRight}
    </motion.button>
  )
}

export function IconButton({ label, className, children, ...rest }: HTMLMotionProps<'button'> & { label: string }) {
  return (
    <motion.button
      whileTap={{ scale: 0.9 }}
      aria-label={label}
      title={label}
      className={cx('grid h-11 w-11 shrink-0 place-items-center rounded-full bg-white text-brown shadow-soft hover:bg-cream-50', className)}
      {...rest}
    >
      {children as ReactNode}
    </motion.button>
  )
}

/* ------------------------------------------------------------------ Chip */
export function Chip({
  selected, children, onClick, className, icon, size = 'md', ...rest
}: { selected?: boolean; children: ReactNode; onClick?: () => void; className?: string; icon?: ReactNode; size?: 'sm' | 'md' } & Omit<HTMLMotionProps<'button'>, 'children'>) {
  return (
    <motion.button
      type="button"
      layout
      whileTap={{ scale: 0.93 }}
      onClick={onClick}
      aria-pressed={selected}
      className={cx(
        'inline-flex items-center gap-2 rounded-full font-semibold transition-colors',
        size === 'md' ? 'h-11 px-5 text-[15px]' : 'h-9 px-3.5 text-sm',
        selected ? 'bg-red text-white shadow-red' : 'bg-white text-brown shadow-soft hover:bg-cream-50',
        className,
      )}
      {...rest}
    >
      {icon}
      {children}
    </motion.button>
  )
}

/* ------------------------------------------------------------------ Mascot */
type MascotMotion = 'float' | 'bounce' | 'tilt' | 'wiggle' | 'none'
const LOOPS = {
  float: { animate: { y: [0, -10, 0] }, transition: { duration: 3.6, repeat: Infinity, ease: 'easeInOut' } },
  bounce: { animate: { y: [0, -18, 0, -6, 0] }, transition: { duration: 1.3, repeat: Infinity, repeatDelay: 1.2, ease: 'easeOut' } },
  tilt: { animate: { rotate: [-3, 3, -3] }, transition: { duration: 3.2, repeat: Infinity, ease: 'easeInOut' } },
  wiggle: { animate: { rotate: [0, -5, 5, -3, 0] }, transition: { duration: 0.9, repeat: Infinity, repeatDelay: 2.2 } },
  none: { animate: {}, transition: {} },
} as const

/** Frigi, using the supplied illustrations. Swapping `pose` cross-fades with a little pop. */
export function Mascot({
  pose, size = 200, motionKind = 'float', className, shadow = true, alt,
}: { pose: Pose; size?: number | string; motionKind?: MascotMotion; className?: string; shadow?: boolean; alt?: string }) {
  const reduce = useReducedMotion()
  const loop = reduce ? LOOPS.none : LOOPS[motionKind]
  return (
    <div className={cx('relative inline-flex flex-col items-center', className)} style={{ width: size }}>
      <motion.div className="relative w-full" style={{ transformOrigin: '50% 90%' }} animate={loop.animate} transition={loop.transition as never}>
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.img
            key={pose}
            src={POSES[pose]}
            alt={alt ?? POSE_ALT[pose]}
            draggable={false}
            initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.8, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.9 }}
            transition={{ type: 'spring', stiffness: 280, damping: 20 }}
            className="block w-full select-none"
          />
        </AnimatePresence>
      </motion.div>
      {shadow && (
        <motion.div
          aria-hidden
          className="-mt-1 h-[6%] max-h-4 min-h-[6px] w-3/5 rounded-[50%] bg-brown/15 blur-[3px]"
          animate={reduce || motionKind !== 'float' ? {} : { scaleX: [1, 0.82, 1], opacity: [0.9, 0.55, 0.9] }}
          transition={{ duration: 3.6, repeat: Infinity, ease: 'easeInOut' }}
        />
      )}
    </div>
  )
}

/** Floating wrapper for decorative elements */
export function Floating({ children, className, delay = 0, distance = 10, duration = 3.6, rotate = 0 }: { children: ReactNode; className?: string; delay?: number; distance?: number; duration?: number; rotate?: number }) {
  const reduce = useReducedMotion()
  return (
    <motion.div
      className={className}
      animate={reduce ? {} : { y: [0, -distance, 0], rotate: [0, rotate, 0] }}
      transition={{ duration, repeat: Infinity, ease: 'easeInOut', delay }}
    >
      {children}
    </motion.div>
  )
}

/** Small circular/rounded avatar crop of a pose */
export function PoseThumb({ pose, className, zoom = 1.25 }: { pose: Pose; className?: string; zoom?: number }) {
  return (
    <span className={cx('relative block shrink-0 overflow-hidden', className)} aria-hidden>
      <img src={POSES[pose]} alt="" className="absolute left-1/2 top-[6%] max-w-none -translate-x-1/2" style={{ width: `${zoom * 100}%` }} draggable={false} />
    </span>
  )
}

/* ------------------------------------------------------------------ Logo */
export function Logo({ className }: { className?: string }) {
  return <img src={LOGO} alt="Frigi" className={cx('h-9 w-auto select-none', className)} draggable={false} />
}

/* ------------------------------------------------------------------ Sheet / modal */
export function Sheet({ open, onClose, title, children, labelledBy }: { open: boolean; onClose: () => void; title?: string; children: ReactNode; labelledBy?: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const reduce = useReducedMotion()
  useEffect(() => {
    if (!open) return
    const prev = document.activeElement as HTMLElement | null
    const t = setTimeout(() => ref.current?.querySelector<HTMLElement>('button, [href], input, select, textarea')?.focus(), 60)
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => { clearTimeout(t); window.removeEventListener('keydown', onKey); prev?.focus?.() }
  }, [open, onClose])
  return (
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <div className="absolute inset-0 bg-brown/40 backdrop-blur-[2px]" onClick={onClose} aria-hidden />
          <motion.div
            ref={ref}
            role="dialog"
            aria-modal="true"
            aria-labelledby={labelledBy}
            aria-label={labelledBy ? undefined : title}
            initial={reduce ? { opacity: 0 } : { y: 60, opacity: 0, scale: 0.98 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={reduce ? { opacity: 0 } : { y: 60, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 320, damping: 30 }}
            className="relative max-h-[90vh] w-full overflow-y-auto rounded-t-4xl bg-paper px-5 pb-[max(24px,env(safe-area-inset-bottom))] pt-3 shadow-float sm:max-w-lg sm:rounded-4xl sm:p-7"
          >
            <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-brown-20 sm:hidden" aria-hidden />
            <button onClick={onClose} aria-label="Close" className="absolute right-4 top-4 grid h-10 w-10 place-items-center rounded-full bg-white text-brown shadow-soft hover:bg-cream-50">
              <X size={18} />
            </button>
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

/* ------------------------------------------------------------------ Misc */
export function SectionTitle({ children, action, id }: { children: ReactNode; action?: ReactNode; id?: string }) {
  return (
    <div className="mb-3 flex items-end justify-between gap-3">
      <h2 id={id} className="font-display text-xl font-semibold text-brown">{children}</h2>
      {action}
    </div>
  )
}

export function Pill({ children, tone = 'cream', className }: { children: ReactNode; tone?: 'cream' | 'sun' | 'red' | 'leaf' | 'white'; className?: string }) {
  const t = {
    cream: 'bg-cream-50 text-brown-70', sun: 'bg-sun-50 text-sun-700', red: 'bg-red-50 text-red-600',
    leaf: 'bg-leaf-50 text-leaf', white: 'bg-white text-brown-70',
  }[tone]
  return <span className={cx('inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold', t, className)}>{children}</span>
}

export function Card({ children, className, ...rest }: HTMLMotionProps<'div'>) {
  return <motion.div className={cx('rounded-4xl bg-white shadow-soft', className)} {...rest}>{children}</motion.div>
}
