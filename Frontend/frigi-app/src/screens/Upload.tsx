import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { ArrowLeft, Camera, ImagePlus, RefreshCw, ScanLine, Trash2, Upload as UploadIcon } from 'lucide-react'
import { useRef, useState } from 'react'
import { POSES } from '../assets'
import { JourneySteps } from '../components/Shell'
import { Button, IconButton, Mascot } from '../components/ui'
import { cx } from '../lib/format'
import { useApp, type Photo } from '../state/AppState'

// Limits from docs/api-contract.md, POST /detect.
const OK_EXT = ['jpg', 'jpeg', 'png', 'heic', 'heif']
const MAX = 3
const MAX_BYTES = 10 * 1024 * 1024
// File extension in lowercase.
const ext = (n: string) => n.split('.').pop()?.toLowerCase() ?? ''
// HEIC photos can't be previewed in most browsers but can still be scanned.
const isHeic = (f: File) => ['heic', 'heif'].includes(ext(f.name)) || /hei[cf]/i.test(f.type)
// True for JPG, PNG and HEIC files.
const isType = (f: File) => OK_EXT.includes(ext(f.name)) || ['image/jpeg', 'image/png', 'image/heic', 'image/heif'].includes(f.type)
// True for a supported photo within the size limit.
const isOk = (f: File) => isType(f) && f.size <= MAX_BYTES
// Explains why a file was rejected.
const whyNot = (f: File) => (isType(f) ? `${f.name} is larger than 10 MB` : `${f.name} isn’t a JPG, PNG or HEIC photo`)

type Notice = { kind: 'too-many' | 'bad-format'; text: string } | null

// Choose or take up to three fridge photos.
export function Upload() {
  const { photos, setPhotos, go, back } = useApp()
  const [notice, setNotice] = useState<Notice>(null)
  const [drag, setDrag] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const camRef = useRef<HTMLInputElement>(null)
  const replaceRef = useRef<HTMLInputElement>(null)
  const replaceIdx = useRef<number>(-1)
  const reduce = useReducedMotion()

  // Wraps a file with a preview URL (none for HEIC).
  const toPhoto = (f: File): Photo => ({ id: crypto.randomUUID?.() ?? String(Math.random()), name: f.name, file: f, heic: isHeic(f), url: isHeic(f) ? null : URL.createObjectURL(f) })

  // Adds valid photos up to the limit and explains anything that was skipped.
  const addFiles = (list: FileList | File[] | null) => {
    if (!list) return
    const files = [...list]
    const bad = files.filter((f) => !isOk(f))
    const good = files.filter(isOk)
    const room = MAX - photos.length
    let n: Notice = null
    if (bad.length) n = { kind: 'bad-format', text: `${bad.map(whyNot).join('; ')}. Frigi reads JPG, PNG and HEIC photos up to 10 MB.` }
    if (good.length > room) n = { kind: 'too-many', text: `Frigi can look at up to ${MAX} photos at once, so I kept the first ${Math.max(room, 0)}. Remove one to swap it out.` }
    setNotice(n)
    if (room > 0 && good.length) setPhotos([...photos, ...good.slice(0, room).map(toPhoto)])
  }

  // Removes a photo and frees its preview.
  const remove = (i: number) => {
    const p = photos[i]
    if (p.url) URL.revokeObjectURL(p.url)
    setPhotos(photos.filter((_, j) => j !== i)); setNotice(null)
  }
  // Swaps one photo for another file.
  const replace = (i: number, f: File | undefined) => {
    if (!f) return
    if (!isOk(f)) { setNotice({ kind: 'bad-format', text: `${whyNot(f)}. Try a JPG, PNG or HEIC photo up to 10 MB.` }); return }
    const old = photos[i]; if (old.url) URL.revokeObjectURL(old.url)
    setPhotos(photos.map((p, j) => (j === i ? toPhoto(f) : p))); setNotice(null)
  }

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3 pr-12 lg:pr-0">
        <div className="flex items-center gap-3">
          <IconButton label="Back" onClick={back}><ArrowLeft size={20} /></IconButton>
          <JourneySteps />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_340px] lg:gap-8">
        <div className="min-w-0">
          <h1 className="font-display text-[32px] font-semibold leading-tight text-brown sm:text-[40px]">Show Frigi your fridge</h1>
          <p className="mt-1 max-w-lg text-brown-70">Open the door wide, step back a little and snap. Add up to three photos for shelves, door and drawers.</p>

          {/* Drop zone */}
          <motion.div
            onDragOver={(e) => { e.preventDefault(); setDrag(true) }}
            onDragLeave={() => setDrag(false)}
            onDrop={(e) => { e.preventDefault(); setDrag(false); addFiles(e.dataTransfer.files) }}
            animate={{ scale: drag ? 1.015 : 1 }}
            className={cx('group relative mt-6 overflow-hidden rounded-5xl border-[3px] border-dashed p-6 text-center transition-colors sm:p-8', drag ? 'border-red bg-red-50' : 'border-cream-200 bg-white hover:border-sun hover:bg-sun-50/50')}
          >
            <motion.div className="mx-auto grid h-20 w-20 place-items-center rounded-[28px] bg-red text-white shadow-red" animate={reduce ? {} : { rotate: drag ? [0, -8, 8, 0] : 0, y: [0, -5, 0] }} transition={{ y: { duration: 2.4, repeat: Infinity, ease: 'easeInOut' }, rotate: { duration: 0.5 } }}>
              <Camera size={34} strokeWidth={2.2} />
            </motion.div>
            <p className="mt-4 font-display text-xl font-semibold text-brown">{drag ? 'Drop them in!' : 'Drag photos here, or choose from your device'}</p>
            <p className="mt-1 text-sm text-brown-70">JPG, PNG or HEIC · up to 10 MB each · {photos.length}/{MAX} added</p>
            <div className="mt-5 flex flex-col justify-center gap-2.5 sm:flex-row">
              <Button onClick={() => fileRef.current?.click()} icon={<UploadIcon size={18} />} disabled={photos.length >= MAX}>Choose photos</Button>
              <Button variant="secondary" onClick={() => camRef.current?.click()} icon={<Camera size={18} />} disabled={photos.length >= MAX}>Take a photo</Button>
            </div>
            <input ref={fileRef} id="up-files" type="file" multiple accept=".jpg,.jpeg,.png,.heic,.heif,image/jpeg,image/png,image/heic,image/heif" className="sr-only" onChange={(e) => { addFiles(e.target.files); e.target.value = '' }} aria-label="Choose fridge photos" />
            <input ref={camRef} id="up-cam" type="file" accept="image/*" capture="environment" className="sr-only" onChange={(e) => { addFiles(e.target.files); e.target.value = '' }} aria-label="Take a fridge photo" />
            <input ref={replaceRef} id="up-replace" type="file" accept=".jpg,.jpeg,.png,.heic,.heif,image/jpeg,image/png,image/heic" className="sr-only" onChange={(e) => { replace(replaceIdx.current, e.target.files?.[0]); e.target.value = '' }} aria-label="Replace photo" />
          </motion.div>

          {/* Notices */}
          <AnimatePresence>
            {notice && (
              <motion.div role="alert" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                <div className={cx('mt-4 flex items-center gap-3 rounded-3xl p-3 pr-4', notice.kind === 'bad-format' ? 'bg-red-50' : 'bg-sun-50')}>
                  <img src={notice.kind === 'bad-format' ? POSES.error : POSES.confirm} alt="" className="h-16 w-auto shrink-0" />
                  <div className="min-w-0">
                    <p className="font-bold text-brown">{notice.kind === 'bad-format' ? 'Frigi can’t open that file' : 'That’s more than 3 photos'}</p>
                    <p className="text-sm text-brown-70">{notice.text}</p>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Previews */}
          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
            <AnimatePresence>
              {photos.map((p, i) => (
                <motion.figure key={p.id} layout initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }} className="group relative aspect-[4/5] overflow-hidden rounded-4xl bg-cream-50 shadow-soft">
                  {p.url ? <img src={p.url} alt={`Fridge photo ${i + 1}`} className="h-full w-full object-cover" /> : (
                    <div className="grid h-full place-items-center p-4 text-center">
                      <div>
                        <ImagePlus className="mx-auto text-brown-50" size={32} />
                        <p className="mt-2 text-sm font-bold text-brown">HEIC photo</p>
                        <p className="mt-1 text-xs text-brown-70">This browser can’t preview HEIC, but Frigi can still scan it.</p>
                      </div>
                    </div>
                  )}
                  <figcaption className="absolute inset-x-2 bottom-2 flex items-center justify-between gap-1 rounded-2xl bg-white/90 p-1.5 pl-3 backdrop-blur">
                    <span className="truncate text-xs font-bold text-brown">Photo {i + 1}</span>
                    <span className="flex gap-1">
                      <button onClick={() => { replaceIdx.current = i; replaceRef.current?.click() }} aria-label={`Replace photo ${i + 1}`} className="grid h-8 w-8 place-items-center rounded-full bg-cream-50 text-brown hover:bg-cream"><RefreshCw size={14} /></button>
                      <button onClick={() => remove(i)} aria-label={`Remove photo ${i + 1}`} className="grid h-8 w-8 place-items-center rounded-full bg-red-50 text-red hover:bg-red-100"><Trash2 size={14} /></button>
                    </span>
                  </figcaption>
                </motion.figure>
              ))}
            </AnimatePresence>
          </div>

          <div className="sticky bottom-[96px] z-10 mt-6 lg:static">
            <Button size="lg" className="w-full sm:w-auto" disabled={!photos.length} onClick={() => go('scanning')} icon={<ScanLine size={19} />}>
              Scan Ingredients{photos.length ? ` (${photos.length})` : ''}
            </Button>
          </div>
        </div>

        {/* Frigi encouragement */}
        <aside className="relative hidden flex-col items-center rounded-5xl bg-sun p-6 text-center lg:flex">
          <div className="relative rounded-3xl bg-white p-4 text-left shadow-soft">
            <p className="font-display text-lg font-semibold text-brown">“Say cheese! Or milk, or eggs…”</p>
            <p className="mt-1 text-sm text-brown-70">Good light and a clear view of each shelf help me spot more.</p>
            <span className="absolute -bottom-2 left-1/2 h-4 w-4 -translate-x-1/2 rotate-45 bg-white" aria-hidden />
          </div>
          <Mascot pose="upload" size={230} className="mt-4" />
          <ul className="mt-4 w-full space-y-2 text-left text-sm">
            {['Door fully open', 'One shelf per photo is fine', 'Labels facing the camera'].map((t) => (
              <li key={t} className="flex items-center gap-2 rounded-2xl bg-white/70 px-3 py-2 font-semibold text-brown"><span className="h-2 w-2 rounded-full bg-red" />{t}</li>
            ))}
          </ul>
        </aside>
        <div className="flex items-center gap-3 rounded-4xl bg-sun-50 p-3 lg:hidden">
          <img src={POSES.upload} alt="" className="h-20 w-auto" />
          <p className="text-sm font-semibold text-brown">“Good light and a clear view of each shelf help me spot more!”</p>
        </div>
      </div>
    </div>
  )
}
