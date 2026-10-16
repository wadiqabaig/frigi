import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'
import { FridgeSample } from '../components/FridgeSample'
import { Mascot } from '../components/ui'
import { ApiError, api, USE_MOCK_API } from '../lib/api'
import { useApp } from '../state/AppState'

const STAGES = ['Frigi is taking a closer look…', 'Spotting your ingredients…', 'Putting everything together…']

export function Scanning() {
  const { photos, setScan, replace } = useApp()
  const [stage, setStage] = useState(0)
  const started = useRef(false)
  const reduce = useReducedMotion()
  const first = photos[0]

  useEffect(() => {
    const t = setInterval(() => setStage((s) => Math.min(s + 1, STAGES.length - 1)), 800)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    if (started.current) return
    started.current = true
    const files = photos.flatMap((p) => (p.file ? [p.file] : []))
    api.scanFridge(files, Math.max(1, photos.length))
      .then((r) => {
        setScan(r)
        if (r.detections.length === 0) replace('state', { kind: 'no-ingredients' })
        else replace('ingredients')
      })
      .catch((e: ApiError) => replace('state', { kind: e.kind === 'expired' ? 'expired' : 'server' }))
  }, [photos, replace, setScan])

  return (
    <div className="mx-auto flex min-h-[78vh] max-w-4xl flex-col items-center justify-center py-6" aria-live="polite" aria-busy="true">
      <div className="relative grid w-full items-center gap-6 sm:grid-cols-[1fr_auto] sm:gap-0">
        {/* Photo with scanner */}
        <div className="relative mx-auto aspect-[4/5] w-full max-w-[340px] overflow-hidden rounded-5xl bg-white shadow-float">
          {first?.url ? <img src={first.url} alt="Your fridge photo being scanned" className="h-full w-full object-cover" /> : <FridgeSample className="h-full w-full" />}
          <div className="absolute inset-0 bg-brown/10" />
          {/* corner brackets */}
          {['left-4 top-4 border-l-4 border-t-4 rounded-tl-2xl', 'right-4 top-4 border-r-4 border-t-4 rounded-tr-2xl', 'left-4 bottom-4 border-l-4 border-b-4 rounded-bl-2xl', 'right-4 bottom-4 border-r-4 border-b-4 rounded-br-2xl'].map((c) => (
            <span key={c} className={`absolute h-10 w-10 border-sun ${c}`} aria-hidden />
          ))}
          {!reduce && (
            <motion.div
              aria-hidden
              className="absolute inset-x-0 h-24"
              style={{ background: 'linear-gradient(180deg, rgba(254,181,6,0) 0%, rgba(254,181,6,.35) 80%, rgba(254,181,6,.9) 100%)' }}
              initial={{ top: '-25%' }}
              animate={{ top: ['-20%', '100%'] }}
              transition={{ duration: 1.3, repeat: Infinity, ease: 'easeInOut', repeatType: 'reverse' }}
            />
          )}
          {photos.length > 1 && <span className="absolute left-4 top-16 rounded-full bg-white/90 px-3 py-1 text-xs font-bold text-brown">+{photos.length - 1} more photo{photos.length > 2 ? 's' : ''}</span>}
        </div>
        {/* Frigi inspecting */}
        <div className="pointer-events-none absolute -bottom-6 -right-2 w-[150px] sm:static sm:-ml-16 sm:w-[260px]">
          <Mascot pose="scanning" size="100%" motionKind="tilt" />
        </div>
      </div>

      <div className="mt-10 w-full max-w-md text-center">
        <AnimatePresence mode="wait">
          <motion.p key={stage} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="font-display text-2xl font-semibold text-brown">
            {STAGES[stage]}
          </motion.p>
        </AnimatePresence>
        <div className="mx-auto mt-5 h-3 w-full max-w-xs overflow-hidden rounded-full bg-cream" role="progressbar" aria-label="Scanning progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(((stage + 1) / STAGES.length) * 100)}>
          <motion.div className="h-full rounded-full bg-red" initial={{ width: '6%' }} animate={{ width: `${((stage + 1) / STAGES.length) * 100}%` }} transition={{ duration: 0.8, ease: 'easeOut' }} />
        </div>
        <p className="mt-4 text-xs font-bold text-brown-50">
          {USE_MOCK_API ? 'Demo mode · RF-DETR Small detection is simulated' : 'Detecting with RF-DETR Small'}
        </p>
      </div>
    </div>
  )
}
