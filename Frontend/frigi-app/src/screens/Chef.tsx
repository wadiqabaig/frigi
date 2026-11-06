import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { ArrowLeft, ArrowRight, Camera, Info, PencilLine, Pencil, RotateCcw, Send, ShieldCheck, Undo2 } from 'lucide-react'
import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react'
import { AVATAR, type Pose } from '../assets'
import { Stepper } from '../components/Pickers'
import { RecipeImage } from '../components/RecipeImage'
import { JourneySteps } from '../components/Shell'
import { Button, Chip, IconButton, Mascot } from '../components/ui'
import { ApiError, api, errorMessage, isAborted } from '../lib/api'
import { answerLabel, parseAnswer, toChefAnswers } from '../lib/chef'
import { cx } from '../lib/format'
import type { ChefQuestion, RecipeOptions } from '../lib/types'
import { useApp, useProfile } from '../state/AppState'

interface Msg { id: number; from: 'frigi' | 'user' | 'system'; text: string; step?: string; kind?: 'results' | 'error' }

const POSES: Pose[] = ['appLogo', 'confirm', 'mealPlan', 'leaning']
const CUSTOM = '__custom__'
// Chat with Chef Frigi: answer the backend's questions, then see recipe options.
export function Chef() {
  const { inventory, chef, setChef, go, back } = useApp()
  const profile = useProfile()
  const reduce = useReducedMotion()
  const [questions, setQuestions] = useState<ChefQuestion[] | null>(null)
  const [qError, setQError] = useState('')
  const [msgs, setMsgs] = useState<Msg[]>([])
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [note, setNote] = useState(chef?.answers.note ?? '')
  const [step, setStep] = useState<string | 'done' | null>(null)
  const [result, setResult] = useState<RecipeOptions | null>(null)
  const [busy, setBusy] = useState(false)
  const [typing, setTyping] = useState(false)
  const [pose, setPose] = useState<Pose>('appLogo')
  const [custom, setCustom] = useState(false)
  const [customN, setCustomN] = useState(profile.householdSize)
  const [text, setText] = useState('')
  const [loadTry, setLoadTry] = useState(0)
  const run = useRef(0)
  const nextId = useRef(1)
  const logRef = useRef<HTMLDivElement>(null)
  const request = useRef<AbortController | null>(null)

  // Appends a message to the conversation.
  const push = (m: Omit<Msg, 'id'>) => setMsgs((x) => [...x, { ...m, id: nextId.current++ }])
  // Short typing delay, skipped when the user prefers reduced motion.
  const pause = (ms: number) => new Promise((r) => setTimeout(r, reduce ? 0 : ms))

  /** Frigi "types" a line, then shows it. Cancelled if the user edits meanwhile. */
  const say = useCallback(async (text: string, opts: { pose?: Pose; kind?: Msg['kind'] } = {}, then?: () => void) => {
    const my = ++run.current
    setTyping(true)
    await pause(350)
    if (run.current !== my) return
    setTyping(false)
    if (opts.pose) setPose(opts.pose)
    push({ from: 'frigi', text, kind: opts.kind })
    if (then) then()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reduce])

  // Asks the question with this key, then shows its answer chips.
  const ask = useCallback((qs: ChefQuestion[], key: string) => {
    const i = qs.findIndex((q) => q.key === key)
    say(qs[i].text, { pose: POSES[i % POSES.length] }, () => setStep(key))
  }, [say])

  // Load the chef's questions (GET /chef/questions), or show the last results.
  useEffect(() => {
    const ctrl = new AbortController()
    setQError('')
    api.chefQuestions(ctrl.signal).then((qs) => {
      setQuestions(qs)
      if (!inventory.length) {
        say('Hi! I’m Chef Frigi. Tell me what’s in your fridge first, then I’ll find recipes that use it.', { pose: 'upload' })
        return
      }
      if (chef && chef.result.options.length) {
        setResult(chef.result)
        say('Here are the recipes I found for you earlier. Start over to ask again.', { pose: 'recommends', kind: 'results' }, () => setStep('done'))
        return
      }
      say(`You have ${inventory.length} ingredient${inventory.length === 1 ? '' : 's'} ready. Let’s pick something to cook!`, { pose: 'success' }, () => ask(qs, qs[0].key))
    }).catch((e) => { if (!isAborted(e)) setQError(errorMessage(e, 'The chef is unavailable right now.')) })
    return () => { ctrl.abort(); run.current++; request.current?.abort() }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadTry])

  useEffect(() => {
    const el = logRef.current
    if (!el) return
    const t = setTimeout(() => {
      el.scrollTo({ top: el.scrollHeight, behavior: reduce ? 'auto' : 'smooth' })
      if (el.scrollHeight <= el.clientHeight + 4) el.lastElementChild?.scrollIntoView({ block: 'end', behavior: reduce ? 'auto' : 'smooth' })
    }, 60)
    return () => clearTimeout(t)
  }, [msgs, typing, step, reduce])

  /** POST /chef/options with the confirmed ingredients and answers. */
  const findRecipes = async (raw: Record<string, string>, withNote: string) => {
    request.current?.abort()
    const ctrl = new AbortController()
    request.current = ctrl
    const chefAnswers = toChefAnswers(raw, withNote)
    const ingredients = inventory.map(({ id, name }) => ({ id, name }))
    setBusy(true); setTyping(true); setPose('scanning'); setStep(null)
    try {
      const res = await api.recipeOptions(ingredients, chefAnswers, ctrl.signal)
      setTyping(false)
      setResult(res)
      setChef({ answers: chefAnswers, ingredients, result: res, createdAt: Date.now() })
      setPose('recommends')
      push({ from: 'frigi', text: `I found ${res.options.length} recipe${res.options.length === 1 ? '' : 's'} for you.`, kind: 'results' })
      setStep('done')
    } catch (e) {
      if (isAborted(e) || (e instanceof ApiError && e.kind === 'unauthorized')) return
      setTyping(false); setPose('error')
      push({ from: 'frigi', text: errorMessage(e, 'Something went wrong while finding recipes.'), kind: 'error' })
      setStep('done')
    } finally { setBusy(false) }
  }

  // Records an answer, then asks the next question or fetches recipes after the last one.
  const answer = (key: string, value: string) => {
    if (!questions) return
    if (key === 'servings' && value === CUSTOM) { setCustom(true); return }
    setCustom(false)
    const next = { ...answers, [key]: value }
    setAnswers(next)
    push({ from: 'user', text: answerLabel(key, value), step: key })
    setStep(null)
    const idx = questions.findIndex((q) => q.key === key)
    if (idx < questions.length - 1) ask(questions, questions[idx + 1].key)
    else askExtra()
  }

  // After the last question: anything else for the chef? Yes lets the user type it; No finds recipes.
  const askExtra = () => say('Anything else the chef should keep in mind?', { pose: 'leaning' }, () => setStep('extra'))
  const extraAnswer = (yes: boolean) => {
    push({ from: 'user', text: yes ? 'Yes' : 'No' })
    if (yes) say('Go ahead and type it below, like “no chilli” or “something the kids will like”.', {}, () => { setStep('extra-text'); setTimeout(() => document.getElementById('chef-input')?.focus(), 50) })
    else findRecipes(answers, note)
  }

  /** Rewind to a previous question. */
  const edit = (key: string) => {
    if (!questions) return
    run.current++; request.current?.abort()
    setTyping(false); setCustom(false); setBusy(false)
    const idx = questions.findIndex((q) => q.key === key)
    setMsgs((m) => {
      const cut = m.findIndex((x) => x.from === 'user' && x.step === key)
      return cut >= 0 ? m.slice(0, cut) : m
    })
    setAnswers((a) => Object.fromEntries(Object.entries(a).filter(([k]) => questions.findIndex((q) => q.key === k) < idx)))
    setPose(POSES[idx % POSES.length])
    setStep(key)
  }
  // Goes back to the most recently answered question.
  const undo = () => {
    const answered = questions?.filter((q) => answers[q.key] !== undefined) ?? []
    const last = answered[answered.length - 1]
    if (last) edit(last.key)
  }
  // Clears the conversation and the saved chef results, then starts again.
  const restart = () => {
    if (!questions) return
    run.current++; request.current?.abort()
    setMsgs([]); setAnswers({}); setStep(null); setTyping(false); setBusy(false); setResult(null); setNote('')
    setChef(null); setPose('appLogo')
    if (inventory.length) ask(questions, questions[0].key)
    else say('Add some ingredients first, then we can cook!', { pose: 'upload' })
  }

  // Adds free text to the note sent with the chef request (max 200 characters).
  const addNote = (t: string) => {
    const next = (note ? `${note}; ${t}` : t).slice(0, 200)
    setNote(next)
    push({ from: 'system', text: `Noted for the chef: “${t}”` })
    return next
  }

  // Typed text answers the current question (any words are accepted, numbers for time and people),
  // answers the "anything else?" step, or becomes a note when the chat is finished.
  const submitText = (e: FormEvent) => {
    e.preventDefault()
    const t = text.trim()
    if (!t || !questions) return
    setText('')
    if (step === 'extra' && /^(y|yes|yeah|yep|sure)\b/i.test(t)) { extraAnswer(true); return }
    if (step === 'extra' && /^(n|no|nope|nothing|no thanks)\b/i.test(t)) { extraAnswer(false); return }
    if (step === 'extra' || step === 'extra-text') {
      push({ from: 'user', text: t })
      findRecipes(answers, addNote(t))
      return
    }
    const q = step && step !== 'done' ? questions.find((x) => x.key === step) : undefined
    if (q) {
      const v = parseAnswer(q, t)
      if (v !== null) { answer(q.key, v); return }
      push({ from: 'user', text: t })
      say(q.key === 'servings' ? 'Please type a number of people between 1 and 20, like “4”.' : 'Please type a time between 5 minutes and 4 hours, like “30 minutes”.')
      return
    }
    push({ from: 'user', text: t })
    const next = addNote(t)
    // After the recipes are shown, a typed request asks the chef again straight away.
    if (step === 'done' && questions.every((x) => answers[x.key] !== undefined)) findRecipes(answers, next)
  }

  const lastStep = step === 'extra' || step === 'extra-text'
  const qIndex = step && step !== 'done' && !lastStep && questions ? questions.findIndex((q) => q.key === step) + 1 : Object.keys(answers).length
  const total = questions?.length ?? 4
  const current = questions?.find((q) => q.key === step)
  const top = result?.options ?? []
  const lastResultsId = [...msgs].reverse().find((m) => m.kind === 'results')?.id

  return (
    <div className="flex min-h-[calc(100vh-160px)] flex-col lg:min-h-[calc(100vh-72px)]">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 pr-12 lg:pr-0">
        <div className="flex min-w-0 flex-1 basis-[280px] items-center gap-3">
          <IconButton label="Back" onClick={back}><ArrowLeft size={20} /></IconButton>
          <JourneySteps />
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" icon={<Undo2 size={15} />} onClick={undo} disabled={!Object.keys(answers).length || busy}>Undo</Button>
          <Button size="sm" variant="ghost" icon={<RotateCcw size={15} />} onClick={restart} disabled={!questions}>Start over</Button>
        </div>
      </div>

      <div className="grid flex-1 gap-6 lg:grid-cols-[340px_minmax(0,1fr)] lg:gap-8">
        {/* Frigi stage (desktop) */}
        <aside className="relative hidden flex-col items-center overflow-hidden rounded-5xl bg-sun p-6 lg:flex">
          <div aria-hidden className="absolute -top-20 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-white/25" />
          <p className="relative text-xs font-extrabold uppercase tracking-[0.14em] text-brown/70">Chef Frigi</p>
          <p className="relative mt-1 font-display text-2xl font-semibold text-brown">{step === 'done' && top.length ? 'Dinner is sorted!' : busy ? 'Finding recipes…' : lastStep ? 'Last question' : `Question ${Math.max(1, qIndex)} of ${total}`}</p>
          <div className="relative mt-3 flex gap-1.5" aria-hidden>
            {(questions ?? []).map((q, i) => <span key={q.key} className={cx('h-2 rounded-full transition-all', answers[q.key] !== undefined ? 'w-6 bg-red' : i + 1 === qIndex ? 'w-6 bg-white' : 'w-2 bg-white/60')} />)}
          </div>
          <div className="relative mt-auto pt-6">
            <Mascot pose={pose} size={250} motionKind={pose === 'success' ? 'bounce' : pose === 'scanning' ? 'tilt' : 'float'} />
          </div>
          {Object.keys(answers).length > 0 && (
            <ul className="relative mt-4 flex w-full flex-wrap justify-center gap-1.5">
              {(questions ?? []).filter((q) => answers[q.key] !== undefined).map((q) => (
                <li key={q.key}><button onClick={() => edit(q.key)} className="inline-flex items-center gap-1 rounded-full bg-white/80 px-3 py-1.5 text-xs font-bold text-brown hover:bg-white">{answerLabel(q.key, answers[q.key])} <Pencil size={11} /></button></li>
              ))}
            </ul>
          )}
          {note && <p className="relative mt-3 line-clamp-3 rounded-2xl bg-white/70 px-3 py-2 text-xs font-semibold text-brown"><span className="font-extrabold">Note:</span> {note}</p>}
        </aside>

        {/* Conversation */}
        <section aria-label="Conversation with Chef Frigi" className="flex h-[calc(100dvh-250px)] min-h-[440px] min-w-0 flex-col rounded-5xl bg-white/70 shadow-soft lg:h-[calc(100vh-150px)] lg:min-h-[560px]">
          <div className="flex items-center gap-3 border-b border-cream p-3 lg:hidden">
            <motion.div key={pose} initial={reduce ? false : { scale: 0.7, rotate: -8 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: 'spring', stiffness: 400, damping: 15 }}>
              <img src={AVATAR} alt="" className="h-12 w-12 rounded-2xl object-cover" />
            </motion.div>
            <div>
              <p className="font-display text-lg font-semibold leading-tight text-brown">Chef Frigi</p>
              <p className="text-xs font-bold text-leaf">{busy ? 'finding recipes…' : typing ? 'typing…' : step === 'done' ? (top.length ? 'Recipes ready' : 'Ready') : lastStep ? 'Last question' : `Question ${Math.max(1, qIndex)} of ${total}`}</p>
            </div>
          </div>

          <div ref={logRef} className="flex-1 space-y-3 overflow-y-auto p-4 sm:p-6" role="log" aria-live="polite">
            {qError && (
              <div className="flex flex-col items-center gap-3 py-8 text-center">
                <Mascot pose="error" size={140} />
                <p className="max-w-sm font-bold text-brown">{qError}</p>
                <Button onClick={() => setLoadTry((n) => n + 1)}>Try again</Button>
              </div>
            )}
            {!questions && !qError && <p className="py-8 text-center text-sm font-semibold text-brown-70">Getting the chef ready…</p>}

            <AnimatePresence initial={false}>
              {msgs.map((m) => m.from === 'system' ? (
                <motion.p key={m.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mx-auto flex max-w-md items-center justify-center gap-1.5 text-center text-xs font-semibold text-brown-50">
                  <PencilLine size={12} className="shrink-0" /> {m.text}
                </motion.p>
              ) : m.from === 'frigi' ? (
                <motion.div key={m.id} initial={reduce ? false : { opacity: 0, x: -24, scale: 0.95 }} animate={{ opacity: 1, x: 0, scale: 1 }} transition={{ type: 'spring', stiffness: 300, damping: 24 }} className="flex items-end gap-2.5">
                  <img src={AVATAR} alt="" className="h-9 w-9 shrink-0 rounded-full object-cover shadow-soft" />
                  <div className="max-w-[min(560px,85%)]">
                    <p className={cx('rounded-3xl rounded-bl-md px-4 py-3 text-[15px] leading-relaxed shadow-soft', m.kind === 'error' ? 'bg-red-50 text-red-600' : 'bg-white text-brown')}>{m.text}</p>
                    {m.kind === 'results' && m.id === lastResultsId && result && (
                      <>
                        {(result.removedBySafetyFilter > 0 || result.removedByYourNotes > 0 || result.notice) && (
                          <p className="mt-2 flex items-start gap-1.5 rounded-2xl bg-sun-50 px-3 py-2 text-xs font-semibold text-brown">
                            <ShieldCheck size={14} className="mt-0.5 shrink-0 text-sun-700" />
                            <span>
                              {result.removedBySafetyFilter > 0 && `I left out ${result.removedBySafetyFilter} recipe${result.removedBySafetyFilter > 1 ? 's' : ''} that didn’t fit your allergies or diet. `}
                              {result.removedByYourNotes > 0 && `I skipped ${result.removedByYourNotes} because of your saved notes. `}
                              {result.notice}
                            </span>
                          </p>
                        )}
                        <div className="mt-2 grid gap-2 sm:grid-cols-3">
                          {top.map((o, i) => (
                            <motion.button key={o.optionId} initial={reduce ? false : { opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 + i * 0.1 }} onClick={() => go('recipe', { optionId: o.optionId })} className="group flex items-center gap-2 rounded-3xl bg-white p-2 text-left shadow-soft hover:shadow-float sm:flex-col sm:items-stretch">
                              <RecipeImage src={o.imageUrl} title={o.title} className="h-16 w-16 shrink-0 rounded-2xl sm:aspect-[4/3] sm:h-auto sm:w-full" />
                              <span className="min-w-0 px-1">
                                <span className="block text-sm font-bold leading-tight text-brown">{o.title}</span>
                                <span className="block text-xs text-brown-50">{o.minutes ? `${o.minutes} min · ` : ''}{o.missing.length ? `${o.missing.length} missing` : 'All in your fridge'}</span>
                              </span>
                            </motion.button>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                </motion.div>
              ) : (
                <motion.div key={m.id} initial={reduce ? false : { opacity: 0, x: 24, scale: 0.95 }} animate={{ opacity: 1, x: 0, scale: 1 }} transition={{ type: 'spring', stiffness: 300, damping: 24 }} className="flex flex-col items-end">
                  <p className="max-w-[80%] rounded-3xl rounded-br-md bg-red px-4 py-3 text-[15px] font-semibold text-white shadow-red">{m.text}</p>
                  {m.step && !busy && <button onClick={() => edit(m.step!)} className="mt-1 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-bold text-brown-50 hover:text-red"><Pencil size={11} /> Change</button>}
                </motion.div>
              ))}
            </AnimatePresence>

            {typing && (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="flex items-end gap-2.5" aria-label={busy ? 'Frigi is finding recipes' : 'Frigi is typing'}>
                <img src={AVATAR} alt="" className="h-9 w-9 shrink-0 rounded-full object-cover shadow-soft" />
                <span className="flex items-center gap-1.5 rounded-3xl rounded-bl-md bg-white px-4 py-4 shadow-soft">
                  {[0, 1, 2].map((i) => <motion.span key={i} className="h-2 w-2 rounded-full bg-brown-50" animate={reduce ? {} : { y: [0, -5, 0], opacity: [0.5, 1, 0.5] }} transition={{ duration: 0.9, repeat: Infinity, delay: i * 0.15 }} />)}
                  {busy && <span className="ml-1 text-xs font-semibold text-brown-50">Finding recipes</span>}
                </span>
              </motion.div>
            )}

            {/* No ingredients yet */}
            {questions && !inventory.length && !typing && (
              <div className="flex flex-wrap justify-end gap-2 pl-10 pt-1">
                <Button size="sm" icon={<Camera size={15} />} onClick={() => go('upload')}>Scan my fridge</Button>
                <Button size="sm" variant="secondary" icon={<PencilLine size={15} />} onClick={() => go('ingredients', { manual: 1 })}>Add by hand</Button>
              </div>
            )}

            {/* Answer chips */}
            <AnimatePresence mode="wait">
              {current && !typing && (
                <motion.div key={current.key + String(custom)} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} className="flex flex-wrap justify-end gap-2 pl-10 pt-1" role="group" aria-label={current.text}>
                  {custom ? (
                    <div className="flex flex-wrap items-center justify-end gap-2">
                      <Stepper value={customN} onChange={setCustomN} max={20} label="people" />
                      <Button size="sm" onClick={() => answer('servings', String(customN))}>Feed {customN}</Button>
                    </div>
                  ) : [...current.options, ...(current.key === 'servings' ? [CUSTOM] : [])].map((o, i) => {
                    const usual = current.key === 'servings' && o === String(profile.householdSize)
                    return (
                      <motion.div key={o} initial={reduce ? false : { opacity: 0, scale: 0.6 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.05, type: 'spring', stiffness: 400, damping: 18 }}>
                        <Chip onClick={() => answer(current.key, o)} selected={false} className={cx(usual && 'ring-2 ring-sun')}>
                          {o === CUSTOM ? 'Custom' : answerLabel(current.key, o)}{usual ? <span className="text-xs font-bold text-sun-700">· usual</span> : null}
                        </Chip>
                      </motion.div>
                    )
                  })}
                </motion.div>
              )}
            </AnimatePresence>

            {step === 'extra' && !typing && (
              <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="flex flex-wrap justify-end gap-2 pl-10 pt-1" role="group" aria-label="Anything else the chef should keep in mind?">
                <Chip onClick={() => extraAnswer(true)} selected={false}>Yes</Chip>
                <Chip onClick={() => extraAnswer(false)} selected={false}>No, show me recipes</Chip>
              </motion.div>
            )}

            {step === 'done' && !busy && (
              <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="flex flex-wrap justify-end gap-2 pt-2">
                {top.length ? <Button onClick={() => go('recipes')} iconRight={<ArrowRight size={18} />}>See all recipes</Button> : null}
                {note && Object.keys(answers).length === (questions?.length ?? 0) && <Button variant={top.length ? 'secondary' : 'primary'} onClick={() => findRecipes(answers, note)}>Ask again with my note</Button>}
                {!top.length && Object.keys(answers).length === (questions?.length ?? 0) && !note && <Button onClick={() => findRecipes(answers, note)}>Try again</Button>}
                {questions && <Button variant="outline" onClick={() => edit(questions[0].key)}>Change answers</Button>}
              </motion.div>
            )}
            <div aria-hidden className="h-1" />
          </div>

          <form onSubmit={submitText} className="flex items-center gap-2 border-t border-cream p-3">
            <label htmlFor="chef-input" className="sr-only">Message Chef Frigi</label>
            <input id="chef-input" value={text} onChange={(e) => setText(e.target.value)} disabled={!questions || busy} placeholder={step === 'extra-text' ? 'e.g. “something with rice” or “no chilli”' : step === 'extra' ? 'Type yes or no…' : current ? (current.key === 'max_minutes' || current.key === 'servings' ? 'Type a number, or tap an option' : 'Type your answer to this question, or tap one') : 'Ask for changes, e.g. “something with rice”'} maxLength={200} className="h-12 min-w-0 flex-1 rounded-full bg-cream-50 px-5 text-[15px] text-brown placeholder:text-brown-50 focus:outline-none focus:ring-2 focus:ring-red disabled:opacity-60" />
            <motion.button whileTap={{ scale: 0.9 }} type="submit" aria-label="Send" disabled={!text.trim() || busy} className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-red text-white shadow-red disabled:opacity-40"><Send size={18} /></motion.button>
          </form>
          <p className="flex items-center justify-center gap-1 px-4 pb-3 text-center text-[11px] font-semibold text-brown-50"><Info size={11} /> Recipes from Spoonacular, picked with Gemini, and checked against your allergies and diet.</p>
        </section>
      </div>
    </div>
  )
}
