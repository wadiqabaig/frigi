import { motion } from 'framer-motion'
import { ArrowLeft, Eye, EyeOff, Loader2 } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { AllergyPicker, DietPicker, Field, Stepper, inputCls } from '../components/Pickers'
import { Button, IconButton, Logo, Mascot } from '../components/ui'
import { ApiError, api, errorMessage } from '../lib/api'
import { PASSWORD_HINT, authMessage, confirmCode, finishPasswordReset, logIn, passwordOk, resendCode, startPasswordReset, startSignUp } from '../lib/auth'
import { USE_COGNITO } from '../lib/config'
import { load, remove, save } from '../lib/storage'
import type { Allergen, Diet } from '../lib/types'
import { useApp } from '../state/AppState'
import type { Pose } from '../assets'

// Shared layout for the sign-up and log-in pages.
function AuthLayout({ pose, title, sub, children }: { pose: Pose; title: string; sub: string; children: React.ReactNode }) {
  const { back } = useApp()
  return (
    <div className="mx-auto grid min-h-full max-w-[1180px] gap-8 pl-[max(16px,env(safe-area-inset-left,0px))] pr-[max(16px,env(safe-area-inset-right,0px))] pb-12 pt-5 sm:px-8 lg:grid-cols-[0.9fr_1.1fr] lg:gap-12 lg:px-10 lg:pt-8">
      <div className="lg:sticky lg:top-8 lg:self-start">
        <div className="flex items-center justify-between">
          <IconButton label="Back" onClick={back}><ArrowLeft size={20} /></IconButton>
          <Logo className="h-9 lg:hidden" />
          <span className="w-11 lg:hidden" />
        </div>
        <div className="relative mt-6 hidden overflow-hidden rounded-5xl bg-sun p-8 pb-0 lg:block">
          <Logo className="h-11" />
          <p className="mt-5 max-w-xs font-display text-[28px] font-semibold leading-tight text-brown">Cook more of what you already bought.</p>
          <div className="mt-4 flex justify-center"><Mascot pose={pose} size={250} shadow={false} /></div>
        </div>
        <h1 className="mt-6 font-display text-[32px] font-semibold leading-tight text-brown lg:hidden">{title}</h1>
        <p className="mt-1 text-brown-70 lg:hidden">{sub}</p>
      </div>
      <div className="min-w-0">
        <h1 className="hidden font-display text-[38px] font-semibold text-brown lg:block">{title}</h1>
        <p className="mb-6 hidden text-brown-70 lg:block">{sub}</p>
        {children}
      </div>
    </div>
  )
}

// Message to show when sign-up, log-in or a code step fails.
const messageFor = (e: unknown) => (USE_COGNITO && !(e instanceof ApiError) ? authMessage(e) : errorMessage(e, 'Something went wrong. Please try again.'))
// Cognito says this when the code was already used, e.g. after a retry. Logging in then works.
const alreadyConfirmed = (e: unknown) => /already confirmed|current status is confirmed/i.test((e as Error)?.message ?? '')

type Prefs = { name: string; age: number | null; allergies: Allergen[]; diet: Diet; householdSize: number }
// Sign-up preferences wait here until the emailed code is confirmed and the first log-in happens.
const pendingKey = (email: string) => 'pending-profile.' + email.trim().toLowerCase()

// Email fields: no auto-capital, autocorrect or spellcheck, which phones otherwise add.
const emailInput = { type: 'email', autoCapitalize: 'none', autoCorrect: 'off', spellCheck: false, inputMode: 'email' } as const

// Password field with a show/hide button that is always visible.
function PasswordInput({ id, value, onChange, autoComplete, describedBy }: { id: string; value: string; onChange: (v: string) => void; autoComplete: string; describedBy?: Record<string, unknown> }) {
  const [show, setShow] = useState(false)
  return (
    <div className="relative">
      <input id={id} type={show ? 'text' : 'password'} className={inputCls + ' pr-12'} value={value} onChange={(e) => onChange(e.target.value)} autoComplete={autoComplete} autoCapitalize="none" autoCorrect="off" spellCheck={false} {...describedBy} />
      <button type="button" onClick={() => setShow(!show)} aria-label={show ? 'Hide password' : 'Show password'} aria-pressed={show} className="absolute right-2 top-1/2 z-10 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full text-brown-70 hover:bg-cream-50">{show ? <EyeOff size={18} /> : <Eye size={18} />}</button>
    </div>
  )
}

// Enter the 6-digit code that Cognito emailed, with a way to send a new one.
function CodeStep({ email, busy, error, onSubmit, onBack }: { email: string; busy: boolean; error: string; onSubmit: (code: string) => void; onBack: () => void }) {
  const [code, setCode] = useState('')
  const [sent, setSent] = useState('')
  const resend = async () => {
    setSent('')
    try { await resendCode(email); setSent('A new code is on its way.') } catch (e) { setSent(messageFor(e)) }
  }
  return (
    <form onSubmit={(e) => { e.preventDefault(); onSubmit(code) }} noValidate className="space-y-5 rounded-5xl bg-white/60 p-5 shadow-soft sm:p-7">
      <p className="text-brown">We emailed a 6-digit code to <b>{email}</b>. Enter it to confirm your account.</p>
      <Field id="code" label="Verification code" hint="Check your spam folder if it hasn’t arrived.">
        <input id="code" className={inputCls + ' tracking-[0.4em]'} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))} inputMode="numeric" autoComplete="one-time-code" placeholder="123456" />
      </Field>
      {error && <p role="alert" className="rounded-2xl bg-red-50 p-3 text-sm font-bold text-red-600">{error}</p>}
      {sent && <p role="status" className="rounded-2xl bg-sun-50 p-3 text-sm font-bold text-brown">{sent}</p>}
      <Button type="submit" size="lg" className="w-full" disabled={busy || code.length !== 6} icon={busy ? <Loader2 size={18} className="animate-spin" /> : undefined}>{busy ? 'Checking…' : 'Confirm and continue'}</Button>
      <div className="flex justify-between text-sm">
        <button type="button" onClick={onBack} className="font-bold text-brown-70 hover:underline">Back</button>
        <button type="button" onClick={resend} className="font-bold text-red hover:underline">Send a new code</button>
      </div>
    </form>
  )
}

// Sign-up form: account details plus allergies, diet and household size.
export function SignUp() {
  const { go, startSession } = useApp()
  const [f, setF] = useState({ name: '', email: '', password: '', age: '' })
  const [allergies, setAllergies] = useState<Allergen[]>([])
  const [diet, setDiet] = useState<Diet>('none')
  const [household, setHousehold] = useState(2)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState(false)
  const [formErr, setFormErr] = useState('')
  const [step, setStep] = useState<'form' | 'code'>('form')

  const prefs = (): Prefs => ({ name: f.name.trim(), age: f.age ? Number(f.age) : null, allergies, diet, householdSize: household })

  // Validates the form, then creates the account (Cognito emails a code) or signs straight in.
  const submit = async (e: FormEvent) => {
    e.preventDefault()
    const er: Record<string, string> = {}
    if (!f.name.trim()) er.name = 'Tell Frigi what to call you.'
    if (!/^\S+@\S+\.\S+$/.test(f.email.trim())) er.email = 'Enter a valid email, like sara@example.com.'
    if (USE_COGNITO ? !passwordOk(f.password) : f.password.length < 8) er.password = USE_COGNITO ? PASSWORD_HINT : 'Use at least 8 characters.'
    const age = Number(f.age)
    if (f.age && (!Number.isInteger(age) || age < 13 || age > 120)) er.age = 'Enter an age between 13 and 120.'
    setErrors(er)
    if (Object.keys(er).length) return
    setBusy(true); setFormErr('')
    try {
      if (USE_COGNITO) {
        await startSignUp(f.email.trim(), f.password, f.name.trim())
        save(pendingKey(f.email), prefs(), 'local')
        setStep('code')
      } else {
        const s = await api.signUp({ name: f.name.trim(), email: f.email.trim(), password: f.password, age: f.age ? age : undefined, householdSize: household, diet, allergies })
        await startSession(s)
      }
    } catch (err) {
      setFormErr(messageFor(err))
    } finally { setBusy(false) }
  }

  // Confirms the emailed code, logs in and saves the sign-up preferences.
  const confirm = async (code: string) => {
    setBusy(true); setFormErr('')
    try {
      try { await confirmCode(f.email.trim(), code) } catch (err) { if (!alreadyConfirmed(err)) throw err }
      await logIn(f.email.trim(), f.password)
      await startSession(undefined, prefs())
      remove(pendingKey(f.email), 'local')
    } catch (err) {
      setFormErr(messageFor(err))
    } finally { setBusy(false) }
  }
  // Change handler for one text field.
  const setField = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value })
  // Accessibility attributes linking a field to its error message.
  const ariaFor = (k: string) => ({ 'aria-invalid': !!errors[k] || undefined, 'aria-describedby': errors[k] ? k + '-err' : undefined })

  if (step === 'code') {
    return (
      <AuthLayout pose="success" title="Check your email" sub="One quick step to keep your account safe.">
        <CodeStep email={f.email.trim()} busy={busy} error={formErr} onSubmit={confirm} onBack={() => { setStep('form'); setFormErr('') }} />
      </AuthLayout>
    )
  }

  return (
    <AuthLayout pose="upload" title="Create your account" sub="A few details so Frigi can suggest food that suits you.">
      <form onSubmit={submit} noValidate className="space-y-5 rounded-5xl bg-white/60 p-5 shadow-soft sm:p-7">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="su-name" label="Name" error={errors.name}><input id="su-name" className={inputCls} value={f.name} onChange={setField('name')} autoComplete="name" placeholder="Sara" {...ariaFor('name')} /></Field>
          <Field id="su-age" label="Age (optional)" error={errors.age}><input id="su-age" className={inputCls} value={f.age} onChange={setField('age')} inputMode="numeric" placeholder="21" {...ariaFor('age')} /></Field>
        </div>
        <Field id="su-email" label="Email" error={errors.email}><input id="su-email" {...emailInput} className={inputCls} value={f.email} onChange={setField('email')} autoComplete="email" placeholder="sara@example.com" {...ariaFor('email')} /></Field>
        <Field id="su-pass" label="Password" error={errors.password} hint={USE_COGNITO ? PASSWORD_HINT : 'At least 8 characters.'}>
          <PasswordInput id="su-pass" value={f.password} onChange={(v) => setF({ ...f, password: v })} autoComplete="new-password" describedBy={ariaFor('password')} />
        </Field>
        <div>
          <p id="su-allergy" className="mb-2 text-sm font-bold text-brown">Allergies <span className="font-semibold text-brown-50">· select any that apply</span></p>
          <AllergyPicker value={allergies} onChange={setAllergies} labelId="su-allergy" />
        </div>
        <div>
          <p id="su-diet" className="mb-2 text-sm font-bold text-brown">Dietary preference</p>
          <DietPicker value={diet} onChange={setDiet} labelId="su-diet" />
        </div>
        <div className="flex items-center justify-between gap-4">
          <p className="text-sm font-bold text-brown">Household size</p>
          <Stepper value={household} onChange={setHousehold} max={20} label="household size" />
        </div>
        {formErr && <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} role="alert" className="rounded-2xl bg-red-50 p-3 text-sm font-bold text-red-600">{formErr}</motion.p>}
        <Button type="submit" size="lg" className="w-full" disabled={busy} icon={busy ? <Loader2 size={18} className="animate-spin" /> : undefined}>{busy ? 'Creating account…' : USE_COGNITO ? 'Create account and email my code' : 'Create account'}</Button>
        <p className="text-center text-sm text-brown-70">Already cooking with Frigi? <button type="button" onClick={() => go('login')} className="font-bold text-red hover:underline">Log in</button></p>
      </form>
    </AuthLayout>
  )
}

// Log-in form, with the code step for unconfirmed accounts and a link to reset the password.
export function Login() {
  const { go, startSession } = useApp()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const [step, setStep] = useState<'form' | 'code'>('form')

  // Starts the session, applying preferences saved at sign-up if this is the first log-in.
  const finish = async () => {
    const pending = load<Prefs | null>(pendingKey(email), null, 'local')
    await startSession(undefined, pending ?? undefined)
    remove(pendingKey(email), 'local')
  }

  // Logs in and starts the session, or shows the error.
  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!email.trim() || !password) { setErr('Enter your email and password.'); return }
    setBusy(true); setErr('')
    try {
      if (USE_COGNITO) {
        if ((await logIn(email.trim(), password)) === 'confirm') { setStep('code'); return }
        await finish()
      } else {
        await startSession(await api.logIn(email.trim(), password))
      }
    } catch (e2) { setErr(messageFor(e2)) } finally { setBusy(false) }
  }

  // Confirms an account that was created but never verified, then logs in.
  const confirm = async (code: string) => {
    setBusy(true); setErr('')
    try {
      try { await confirmCode(email.trim(), code) } catch (err) { if (!alreadyConfirmed(err)) throw err }
      await logIn(email.trim(), password)
      await finish()
    } catch (e2) { setErr(messageFor(e2)) } finally { setBusy(false) }
  }

  if (step === 'code') {
    return (
      <AuthLayout pose="success" title="Confirm your email" sub="Your account needs its emailed code before you can log in.">
        <CodeStep email={email.trim()} busy={busy} error={err} onSubmit={confirm} onBack={() => { setStep('form'); setErr('') }} />
      </AuthLayout>
    )
  }

  return (
    <AuthLayout pose="appLogo" title="Welcome back" sub="Log in to pick up where you left off.">
      <form onSubmit={submit} noValidate className="space-y-5 rounded-5xl bg-white/60 p-5 shadow-soft sm:p-7">
        <Field id="li-email" label="Email"><input id="li-email" {...emailInput} className={inputCls} value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="username" /></Field>
        <Field id="li-pass" label="Password"><PasswordInput id="li-pass" value={password} onChange={setPassword} autoComplete="current-password" /></Field>
        {USE_COGNITO && <p className="-mt-2 text-right text-sm"><button type="button" onClick={() => go('forgot')} className="font-bold text-red hover:underline">Forgot password?</button></p>}
        {err && <p role="alert" className="rounded-2xl bg-red-50 p-3 text-sm font-bold text-red-600">{err}</p>}
        <Button type="submit" size="lg" className="w-full" disabled={busy} icon={busy ? <Loader2 size={18} className="animate-spin" /> : undefined}>{busy ? 'Logging in…' : 'Log in'}</Button>
        <p className="text-center text-sm text-brown-70">New here? <button type="button" onClick={() => go('signup')} className="font-bold text-red hover:underline">Create an account</button></p>
      </form>
    </AuthLayout>
  )
}

// Password reset: Cognito emails a code, then the user sets a new password.
export function ForgotPassword() {
  const { replace } = useApp()
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [password, setPassword] = useState('')
  const [step, setStep] = useState<'email' | 'reset' | 'done'>('email')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)

  const send = async (e: FormEvent) => {
    e.preventDefault()
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) { setErr('Enter the email you signed up with.'); return }
    setBusy(true); setErr('')
    try { await startPasswordReset(email.trim()); setStep('reset') } catch (e2) { setErr(messageFor(e2)) } finally { setBusy(false) }
  }
  const reset = async (e: FormEvent) => {
    e.preventDefault()
    if (code.length !== 6) { setErr('Enter the 6-digit code from the email.'); return }
    if (!passwordOk(password)) { setErr(PASSWORD_HINT); return }
    setBusy(true); setErr('')
    try { await finishPasswordReset(email.trim(), code, password); setStep('done') } catch (e2) { setErr(messageFor(e2)) } finally { setBusy(false) }
  }

  return (
    <AuthLayout pose="confirm" title="Reset your password" sub="We’ll email you a code to set a new one.">
      {step === 'email' && (
        <form onSubmit={send} noValidate className="space-y-5 rounded-5xl bg-white/60 p-5 shadow-soft sm:p-7">
          <Field id="fp-email" label="Email"><input id="fp-email" {...emailInput} className={inputCls} value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="username" /></Field>
          {err && <p role="alert" className="rounded-2xl bg-red-50 p-3 text-sm font-bold text-red-600">{err}</p>}
          <Button type="submit" size="lg" className="w-full" disabled={busy} icon={busy ? <Loader2 size={18} className="animate-spin" /> : undefined}>{busy ? 'Sending…' : 'Email me a code'}</Button>
        </form>
      )}
      {step === 'reset' && (
        <form onSubmit={reset} noValidate className="space-y-5 rounded-5xl bg-white/60 p-5 shadow-soft sm:p-7">
          <p className="text-brown">If <b>{email.trim()}</b> has an account, a code is on its way.</p>
          <Field id="fp-code" label="Code"><input id="fp-code" className={inputCls + ' tracking-[0.4em]'} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))} inputMode="numeric" autoComplete="one-time-code" placeholder="123456" /></Field>
          <Field id="fp-pass" label="New password" hint={PASSWORD_HINT}><PasswordInput id="fp-pass" value={password} onChange={setPassword} autoComplete="new-password" /></Field>
          {err && <p role="alert" className="rounded-2xl bg-red-50 p-3 text-sm font-bold text-red-600">{err}</p>}
          <Button type="submit" size="lg" className="w-full" disabled={busy} icon={busy ? <Loader2 size={18} className="animate-spin" /> : undefined}>{busy ? 'Saving…' : 'Set new password'}</Button>
          <button type="button" onClick={() => { setStep('email'); setErr('') }} className="text-sm font-bold text-red hover:underline">Use a different email</button>
        </form>
      )}
      {step === 'done' && (
        <div className="space-y-5 rounded-5xl bg-white/60 p-5 shadow-soft sm:p-7">
          <p role="status" className="font-bold text-brown">Your password has been changed.</p>
          <Button size="lg" className="w-full" onClick={() => replace('login')}>Log in</Button>
        </div>
      )}
    </AuthLayout>
  )
}
