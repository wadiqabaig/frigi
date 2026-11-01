import { motion, useReducedMotion } from 'framer-motion'
import { ImagePlus } from 'lucide-react'
import { useEffect } from 'react'
import { Button, Mascot } from '../components/ui'
import { ApiError, api } from '../lib/api'
import { useApp } from '../state/AppState'

// Sends the photos to the detector and moves on when it answers.
export function Scanning() {
  const { photos, setScan, replace, back } = useApp()
  const reduce = useReducedMotion()
  const first = photos[0]

  // One real detection request per visit; leaving the screen cancels it.
  useEffect(() => {
    if (!photos.length) { replace('upload'); return }
    const ctrl = new AbortController()
    api.detect(photos.map((p) => p.file), ctrl.signal)
      .then((r) => {
        setScan(r)
        replace(r.ingredients.length ? 'ingredients' : 'state', r.ingredients.length ? undefined : { kind: 'no-ingredients' })
      })
      .catch((e: ApiError) => {
        if (ctrl.signal.aborted || e.kind === 'aborted') return
        if (e.kind === 'unauthorized') return
        if (e.kind === 'validation') {
          const kind = e.code === 'TOO_MANY_PHOTOS' ? 'too-many' : 'bad-format'
          replace('state', { kind, message: e.message })
          return
        }
        replace('state', { kind: 'server', message: e.message })
      })
    return () => ctrl.abort()
  }, [photos, replace, setScan])

  return (
    <div className="mx-auto flex min-h-[78vh] max-w-4xl flex-col items-center justify-center py-6" aria-live="polite" aria-busy="true">
      <div className="relative grid w-full items-center gap-6 sm:grid-cols-[1fr_auto] sm:gap-0">
        {/* Photo with scanner */}
        <div className="relative mx-auto aspect-[4/5] w-full max-w-[340px] overflow-hidden rounded-5xl bg-white shadow-float">
          {first?.url ? <img src={first.url} alt="Your fridge photo being scanned" className="h-full w-full object-cover" /> : (
            <div className="grid h-full place-items-center bg-cream-50 p-6 text-center">
              <div><ImagePlus className="mx-auto text-brown-50" size={36} /><p className="mt-2 text-sm font-bold text-brown">{first?.name ?? 'Your photo'}</p></div>
            </div>
          )}
          <div className="absolute inset-0 bg-brown/10" />
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
        <p className="font-display text-2xl font-semibold text-brown">Frigi is looking for your ingredients…</p>
        {/* Indeterminate: the detector doesn't report progress, so we don't pretend to. */}
        <div className="relative mx-auto mt-5 h-3 w-full max-w-xs overflow-hidden rounded-full bg-cream" role="progressbar" aria-label="Scanning" aria-valuetext="Scanning">
          <motion.div className="absolute inset-y-0 w-1/3 rounded-full bg-red" initial={{ left: '-33%' }} animate={reduce ? { left: '33%' } : { left: ['-33%', '100%'] }} transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }} />
        </div>
        <p className="mt-4 text-xs font-bold text-brown-50">Detecting with RF-DETR Small · photos are not stored</p>
        <Button variant="ghost" size="sm" className="mt-3" onClick={back}>Cancel</Button>
      </div>
    </div>
  )
}
