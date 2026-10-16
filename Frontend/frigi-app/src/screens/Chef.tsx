import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { ArrowLeft, ArrowRight, Pencil, RotateCcw, Send, Undo2 } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import type { Pose } from '../assets'
import { DishArt } from '../components/DishArt'
import { Stepper } from '../components/Pickers'
import { JourneySteps } from '../components/Shell'
import { Button, Chip, IconButton, Mascot, PoseThumb } from '../components/ui'
import { api, USE_MOCK_API } from '../lib/api'
import { recommend } from '../lib/recommend'
import { cx, totalTime } from '../lib/format'
import type { ChefPrefs, CuisinePick, Mood } from '../lib/types'
import { useApp } from '../state/AppState'

type StepKey = 'cuisine' | 'mood' | 'time' | 'servings'
interface Msg { id: number; from: 'frigi' | 'user'; text: string; step?: StepKey; kind?: 'results' }
interface Opt<T> { label: string; value: T }

const Q: Record<StepKey, { ask: string; pose: Pose; options: Opt<string | number>[] }> = {
  cuisine: { ask: 'What cuisine are you craving?', pose: 'appLogo', options: [
    { label: 'Italian', value: 'italian' }, { label: 'Asian', value: 'asian' }, { label: 'Indian', value: 'indian' },
    { label: 'Mediterranean', value: 'mediterranean' }, { label: 'Anything!', value: 'any' }] },
  mood: { ask: 'What kind of mood are you in?', pose: 'confirm', options: [
    { label: 'Quick & Easy', value: 'quick' }, { label: 'Comfort Food', value: 'comfort' }, { label: 'Healthy', value: 'healthy' }, { label: 'Something New', value: 'new' }] },
  time: { ask: 'How much time do we have?', pose: 'mealPlan', options: [
    { label: '15 min', value: 15 }, { label: '30 min', value: 30 }, { label: '60 min', value: 60 }, { label: 'No Rush', value: 0 }] },
  servings: { ask: 'How many hungry people are we feeding?', pose: 'leaning', options: [
    { label: '1', value: 1 }, { label: '2', value: 2 }, { label: '3', value: 3 }, { label: '4', value: 4 }, { label: 'Custom', value: -1 }] },
}
const ORDER: StepKey[] = ['cuisine', 'mood', 'time', 'servings']

const REACT: Record<StepKey, (v: string | number) => { text: string; pose: Pose }> = {
  cuisine: (v) => ({
    italian: { text: 'Mamma mia, Italian it is! My pasta pot is already dancing.', pose: 'success' as Pose },
    asian: { text: 'Ooh, sizzling woks and big flavour. Love it!', pose: 'success' as Pose },
    indian: { text: 'Warm spices coming right up. My shelves smell amazing already.', pose: 'success' as Pose },
    mediterranean: { text: 'Sunshine on a plate! Fresh, bright and delicious.', pose: 'success' as Pose },
    any: { text: 'An open mind and an open fridge, my favourite combo!', pose: 'success' as Pose },
  } as Record<string, { text: string; pose: Pose }>)[String(v)],
  mood: (v) => ({
    quick: { text: 'Fast and fuss-free. Fewer dishes, more eating!', pose: 'confirm' as Pose },
    comfort: { text: 'Cosy food it is. Like a warm hug in a bowl.', pose: 'confirm' as Pose },
    healthy: { text: 'Lots of greens and goodness. Your body says thank you!', pose: 'confirm' as Pose },
    new: { text: 'Adventure time! Let’s try something you haven’t cooked before.', pose: 'confirm' as Pose },
  } as Record<string, { text: string; pose: Pose }>)[String(v)],
  time: (v) => ({ text: v === 0 ? 'No rush? Then we can let things simmer slowly.' : Number(v) <= 15 ? `${v} minutes, tight but totally doable. I’ll keep it snappy!` : `${v} minutes is plenty for something tasty.`, pose: 'mealPlan' }),
  servings: (v) => ({ text: Number(v) === 1 ? 'A meal just for you. Treat yourself!' : `Cooking for ${v}! I’ll scale every ingredient for you.`, pose: 'leaning' }),
}

function parse(step: StepKey, raw: string): string | number | null {
  const t = raw.toLowerCase()
  if (step === 'cuisine') {
    if (/ital|pasta|pizza|risotto/.test(t)) return 'italian'
    if (/asia|chin|japan|thai|korea|wok|stir/.test(t)) return 'asian'
    if (/india|curry|masala|dal/.test(t)) return 'indian'
    if (/medit|greek|middle|leban|turk/.test(t)) return 'mediterranean'
    if (/any|whatever|surprise|don.?t mind|anything/.test(t)) return 'any'
  }
  if (step === 'mood') {
    if (/quick|easy|fast|lazy|simple/.test(t)) return 'quick'
    if (/comfort|cos|cozy|warm|hug/.test(t)) return 'comfort'
    if (/health|light|fresh|green/.test(t)) return 'healthy'
    if (/new|differ|advent|exciting|surprise/.test(t)) return 'new'
  }
  if (step === 'time') {
    if (/no rush|any|whenever|all day/.test(t)) return 0
    const n = parseInt(t.match(/\d+/)?.[0] ?? '', 10)
    if (n) { const m = /hour|hr/.test(t) ? n * 60 : n; return m <= 20 ? 15 : m <= 40 ? 30 : m <= 75 ? 60 : 0 }
  }
  if (step === 'servings') {
    const words: Record<string, number> = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, me: 1, myself: 1 }
    const n = parseInt(t.match(/\d+/)?.[0] ?? '', 10) || Object.entries(words).find(([w]) => new RegExp(`\\b${w}\\b`).test(t))?.[1]
    if (n && n > 0 && n <= 12) return n
  }
  return null
}

const labelFor = (step: StepKey, v: string | number) => Q[step].options.find((o) => o.value === v)?.label ?? (step === 'servings' ? `${v} people` : String(v))

export function Chef() {
  const { inventory, profile, setPrefs, go, back } = useApp()
  const reduce = useReducedMotion()
  const [msgs, setMsgs] = useState<Msg[]>([])
  const [answers, setAnswers] = useState<Partial<Record<StepKey, string | number>>>({})
  const [step, setStep] = useState<StepKey | 'done' | null>(null)
  const [typing, setTyping] = useState(false)
  const [pose, setPose] = useState<Pose>('appLogo')
  const [custom, setCustom] = useState(false)
  const [customN, setCustomN] = useState(profile.householdSize)
  const [text, setText] = useState('')
  const run = useRef(0)
  const nextId = useRef(1)
  const logRef = useRef<HTMLDivElement>(null)

  const result = useMemo(() => {
    if (step !== 'done') return null
    const p: ChefPrefs = { cuisine: answers.cuisine as CuisinePick, mood: answers.mood as Mood, time: Number(answers.time), servings: Number(answers.servings) }
    return recommend(inventory, p, profile)
  }, [step, answers, inventory, profile])

  const push = (m: Omit<Msg, 'id'>) => setMsgs((x) => [...x, { ...m, id: nextId.current++ }])
  const wait = (ms: number) => new Promise((r) => setTimeout(r, reduce ? Math.min(ms, 150) : ms))

  /** Frigi "types" then says each line in order. Cancels if the user edits. */
  const say = useCallback(async (lines: { text: string; pose?: Pose; kind?: Msg['kind'] }[], then?: () => void) => {
    const my = ++run.current
    for (const l of lines) {
      setTyping(true)
      await wait(Math.min(1100, 450 + l.text.length * 12))
      if (run.current !== my) return
      setTyping(false)
      if (l.pose) setPose(l.pose)
      push({ from: 'frigi', text: l.text, kind: l.kind })
      await wait(250)
    }
    if (run.current === my) then?.()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reduce])

  const ask = useCallback((s: StepKey) => {
    say([{ text: Q[s].ask, pose: Q[s].pose }], () => setStep(s))
  }, [say])

  // Intro
  useEffect(() => {
    const n = inventory.length
    const intro = n
      ? `Yay! I found ${n} delicious ingredients. What are we cooking today?`
      : 'Hi! I’m Chef Frigi. Scan your fridge for perfect matches, or let’s just chat and I’ll suggest popular recipes.'
    say([{ text: intro, pose: 'success' }], () => ask('cuisine'))
    return () => { run.current++ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const el = logRef.current
    if (!el) return
    const t = setTimeout(() => {
      el.scrollTo({ top: el.scrollHeight, behavior: reduce ? 'auto' : 'smooth' })
      // on phones the log grows the page instead, so keep the newest message in view
      if (el.scrollHeight <= el.clientHeight + 4) el.lastElementChild?.scrollIntoView({ block: 'end', behavior: reduce ? 'auto' : 'smooth' })
    }, 60)
    return () => clearTimeout(t)
  }, [msgs, typing, step, reduce])

  const answer = (s: StepKey, v: string | number) => {
    if (s === 'servings' && v === -1) { setCustom(true); return }
    setCustom(false)
    const next = { ...answers, [s]: v }
    setAnswers(next)
    push({ from: 'user', text: labelFor(s, v), step: s })
    setStep(null)
    const r = REACT[s](v)
    const idx = ORDER.indexOf(s)
    if (idx < ORDER.length - 1) {
      say([{ text: r.text, pose: r.pose }], () => ask(ORDER[idx + 1]))
    } else {
      const p: ChefPrefs = { cuisine: next.cuisine as CuisinePick, mood: next.mood as Mood, time: Number(next.time), servings: Number(v) }
      setPrefs(p)
      say([
        { text: r.text, pose: r.pose },
        { text: 'Let me check what we can make with your ingredients…', pose: 'scanning' },
      ], async () => {
        const res = await api.recommendations(inventory, p, profile)
        setPose(res.items.length ? 'recommends' : 'error')
        const lines: { text: string; pose?: Pose; kind?: Msg['kind'] }[] = []
        if (res.items.length) lines.push({ text: `Ta-da! I picked ${Math.min(res.items.length, 3)} recipe${res.items.length === 1 ? '' : 's'} just for you.`, pose: 'recommends', kind: 'results' })
        else lines.push({ text: 'Hmm, nothing fits just right. Want to tweak your answers or add a few staples?', pose: 'error' })
        if (res.hidden.length) lines.push({ text: `I hid ${res.hidden.length} recipe${res.hidden.length > 1 ? 's' : ''} because ${res.hidden.length > 1 ? 'they conflict' : 'it conflicts'} with your food preferences.` })
        say(lines, () => setStep('done'))
      })
    }
  }

  /** Rewind to a previous question */
  const edit = (s: StepKey) => {
    run.current++
    setTyping(false); setCustom(false)
    const idx = ORDER.indexOf(s)
    setMsgs((m) => {
      const cut = m.findIndex((x) => x.from === 'user' && x.step === s)
      return cut >= 0 ? m.slice(0, cut) : m
    })
    setAnswers((a) => Object.fromEntries(Object.entries(a).filter(([k]) => ORDER.indexOf(k as StepKey) < idx)))
    setPose(Q[s].pose)
    setStep(s)
  }
  const undo = () => {
    const answered = ORDER.filter((k) => answers[k] !== undefined)
    const last = answered[answered.length - 1]
    if (last) edit(last)
  }
  const restart = () => { run.current++; setMsgs([]); setAnswers({}); setStep(null); setTyping(false); setPose('appLogo'); say([{ text: 'Fresh start! Let’s do this.', pose: 'success' }], () => ask('cuisine')) }

  const submitText = async (e: FormEvent) => {
    e.preventDefault()
    const t = text.trim()
    if (!t) return
    setText('')
    const target = step && step !== 'done' ? step : step === 'done' ? null : ORDER.find((k) => answers[k] === undefined) ?? null
    if (target) {
      const v = parse(target, t)
      run.current++; setTyping(false)
      if (v !== null) {
        if (step !== target) push({ from: 'frigi', text: Q[target].ask })
        answer(target, v); return
      }
      push({ from: 'user', text: t })
      setStep(null)
      say([{ text: 'Hmm, I didn’t quite catch that. Could you pick one of these?', pose: 'error' }, { text: Q[target].ask, pose: Q[target].pose }], () => setStep(target))
      return
    }
    push({ from: 'user', text: t })
    const live = await api.chefReply([...msgs.map((m) => ({ role: m.from, text: m.text })), { role: 'user', text: t }])
    say([{ text: live ?? 'Great question! In demo mode I stick to my recipe questions. Tap a recipe below or start over to change your answers.', pose: 'appLogo' }])
  }

  const qIndex = step && step !== 'done' ? ORDER.indexOf(step) + 1 : Object.keys(answers).length
  const top = result?.items.slice(0, 3) ?? []

  return (
    <div className="flex min-h-[calc(100vh-160px)] flex-col lg:min-h-[calc(100vh-72px)]">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 pr-12 lg:pr-0">
        <div className="flex items-center gap-3">
          <IconButton label="Back" onClick={back}><ArrowLeft size={20} /></IconButton>
          <JourneySteps />
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" icon={<Undo2 size={15} />} onClick={undo} disabled={!Object.keys(answers).length}>Undo</Button>
          <Button size="sm" variant="ghost" icon={<RotateCcw size={15} />} onClick={restart}>Start over</Button>
        </div>
      </div>

      <div className="grid flex-1 gap-6 lg:grid-cols-[340px_minmax(0,1fr)] lg:gap-8">
        {/* Frigi stage (desktop) */}
        <aside className="relative hidden flex-col items-center overflow-hidden rounded-5xl bg-sun p-6 lg:flex">
          <div aria-hidden className="absolute -top-20 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-white/25" />
          <p className="relative text-xs font-extrabold uppercase tracking-[0.14em] text-brown/70">Chef Frigi</p>
          <p className="relative mt-1 font-display text-2xl font-semibold text-brown">{step === 'done' ? 'Dinner is sorted!' : `Question ${Math.max(1, qIndex)} of 4`}</p>
          <div className="relative mt-3 flex gap-1.5" aria-hidden>
            {ORDER.map((k, i) => <span key={k} className={cx('h-2 rounded-full transition-all', answers[k] !== undefined ? 'w-6 bg-red' : i + 1 === qIndex ? 'w-6 bg-white' : 'w-2 bg-white/60')} />)}
          </div>
          <div className="relative mt-auto pt-6">
            <Mascot pose={pose} size={250} motionKind={pose === 'success' ? 'bounce' : pose === 'scanning' ? 'tilt' : 'float'} />
          </div>
          {Object.keys(answers).length > 0 && (
            <ul className="relative mt-4 flex w-full flex-wrap justify-center gap-1.5">
              {ORDER.filter((k) => answers[k] !== undefined).map((k) => (
                <li key={k}><button onClick={() => edit(k)} className="inline-flex items-center gap-1 rounded-full bg-white/80 px-3 py-1.5 text-xs font-bold text-brown hover:bg-white">{labelFor(k, answers[k]!)} <Pencil size={11} /></button></li>
              ))}
            </ul>
          )}
        </aside>

        {/* Conversation */}
        <section aria-label="Conversation with Chef Frigi" className="flex min-h-[60vh] min-w-0 flex-col rounded-5xl bg-white/70 shadow-soft lg:h-[calc(100vh-150px)] lg:min-h-[560px]">
          {/* mobile header */}
          <div className="flex items-center gap-3 border-b border-cream p-3 lg:hidden">
            <motion.div key={pose} initial={reduce ? false : { scale: 0.7, rotate: -8 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: 'spring', stiffness: 400, damping: 15 }}>
              <PoseThumb pose={pose} className="h-14 w-14 rounded-2xl bg-sun" zoom={1.15} />
            </motion.div>
            <div>
              <p className="font-display text-lg font-semibold leading-tight text-brown">Chef Frigi</p>
              <p className="text-xs font-bold text-leaf">{typing ? 'typing…' : step === 'done' ? 'Recipes ready' : `Question ${Math.max(1, qIndex)} of 4`}</p>
            </div>
          </div>

          <div ref={logRef} className="flex-1 space-y-3 overflow-y-auto p-4 sm:p-6" role="log" aria-live="polite">
            <AnimatePresence initial={false}>
              {msgs.map((m) => m.from === 'frigi' ? (
                <motion.div key={m.id} initial={reduce ? false : { opacity: 0, x: -24, scale: 0.95 }} animate={{ opacity: 1, x: 0, scale: 1 }} transition={{ type: 'spring', stiffness: 300, damping: 24 }} className="flex items-end gap-2.5">
                  <PoseThumb pose="main" className="h-9 w-9 rounded-full bg-sun" zoom={1.5} />
                  <div className="max-w-[min(520px,85%)]">
                    <p className="rounded-3xl rounded-bl-md bg-white px-4 py-3 text-[15px] leading-relaxed text-brown shadow-soft">{m.text}</p>
                    {m.kind === 'results' && step === 'done' && top.length > 0 && (
                      <div className="mt-2 grid gap-2 sm:grid-cols-3">
                        {top.map((r, i) => (
                          <motion.button key={r.recipe.id} initial={reduce ? false : { opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 + i * 0.1 }} onClick={() => go('recipe', { id: r.recipe.id })} className="group flex items-center gap-2 rounded-3xl bg-white p-2 text-left shadow-soft hover:shadow-float sm:flex-col sm:items-stretch">
                            <span className="block h-16 w-16 shrink-0 overflow-hidden rounded-2xl bg-cream-50 sm:h-auto sm:w-full"><DishArt recipe={r.recipe} className="h-full w-full transition-transform group-hover:scale-105" /></span>
                            <span className="min-w-0 px-1">
                              <span className="block text-sm font-bold leading-tight text-brown">{r.recipe.title}</span>
                              <span className="block text-xs text-brown-50">{totalTime(r.recipe)} min · {r.missing.length ? `${r.missing.length} missing` : 'All in fridge'}</span>
                            </span>
                          </motion.button>
                        ))}
                      </div>
                    )}
                  </div>
                </motion.div>
              ) : (
                <motion.div key={m.id} initial={reduce ? false : { opacity: 0, x: 24, scale: 0.95 }} animate={{ opacity: 1, x: 0, scale: 1 }} transition={{ type: 'spring', stiffness: 300, damping: 24 }} className="flex flex-col items-end">
                  <p className="max-w-[80%] rounded-3xl rounded-br-md bg-red px-4 py-3 text-[15px] font-semibold text-white shadow-red">{m.text}</p>
                  {m.step && <button onClick={() => edit(m.step!)} className="mt-1 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-bold text-brown-50 hover:text-red"><Pencil size={11} /> Change</button>}
                </motion.div>
              ))}
            </AnimatePresence>

            {typing && (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="flex items-end gap-2.5" aria-label="Frigi is typing">
                <PoseThumb pose="main" className="h-9 w-9 rounded-full bg-sun" zoom={1.5} />
                <span className="flex gap-1.5 rounded-3xl rounded-bl-md bg-white px-4 py-4 shadow-soft">
                  {[0, 1, 2].map((i) => <motion.span key={i} className="h-2 w-2 rounded-full bg-brown-50" animate={reduce ? {} : { y: [0, -5, 0], opacity: [0.5, 1, 0.5] }} transition={{ duration: 0.9, repeat: Infinity, delay: i * 0.15 }} />)}
                </span>
              </motion.div>
            )}

            {/* Answer chips */}
            <AnimatePresence mode="wait">
              {step && step !== 'done' && !typing && (
                <motion.div key={step + String(custom)} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} className="flex flex-wrap justify-end gap-2 pl-10 pt-1" role="group" aria-label={Q[step].ask}>
                  {custom ? (
                    <div className="flex flex-wrap items-center justify-end gap-2">
                      <Stepper value={customN} onChange={setCustomN} max={12} label="people" />
                      <Button size="sm" onClick={() => answer('servings', customN)}>Feed {customN}</Button>
                    </div>
                  ) : Q[step].options.map((o, i) => (
                    <motion.div key={String(o.value)} initial={reduce ? false : { opacity: 0, scale: 0.6 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.05, type: 'spring', stiffness: 400, damping: 18 }}>
                      <Chip onClick={() => answer(step, o.value)} selected={false} className={cx(step === 'servings' && o.value === profile.householdSize && 'ring-2 ring-sun')}>
                        {o.label}{step === 'servings' && o.value === profile.householdSize ? <span className="text-xs font-bold text-sun-700">· usual</span> : null}
                      </Chip>
                    </motion.div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>

            {step === 'done' && (
              <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="flex flex-wrap justify-end gap-2 pt-2">
                {top.length ? <Button onClick={() => go('recipes')} iconRight={<ArrowRight size={18} />}>See all recipes</Button> : <Button onClick={() => go('ingredients')}>Add ingredients</Button>}
                <Button variant="outline" onClick={() => edit('cuisine')}>Change answers</Button>
              </motion.div>
            )}
            <div aria-hidden className="h-1" />
          </div>

          <form onSubmit={submitText} className="flex items-center gap-2 border-t border-cream p-3">
            <label htmlFor="chef-input" className="sr-only">Message Chef Frigi</label>
            <input id="chef-input" value={text} onChange={(e) => setText(e.target.value)} placeholder={step && step !== 'done' ? 'Or type your answer…' : 'Ask Chef Frigi…'} className="h-12 min-w-0 flex-1 rounded-full bg-cream-50 px-5 text-[15px] text-brown placeholder:text-brown-50 focus:outline-none focus:ring-2 focus:ring-red" />
            <motion.button whileTap={{ scale: 0.9 }} type="submit" aria-label="Send" disabled={!text.trim()} className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-red text-white shadow-red disabled:opacity-40"><Send size={18} /></motion.button>
          </form>
          <p className="px-4 pb-3 text-center text-[11px] font-semibold text-brown-50">{USE_MOCK_API ? 'Demo mode: Chef Frigi’s replies are scripted. Gemini will power live chat.' : 'Powered by Gemini'}</p>
        </section>
      </div>
    </div>
  )
}
