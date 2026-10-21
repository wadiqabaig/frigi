import { motion } from 'framer-motion'
import { ArrowLeft, Eye, EyeOff, Loader2 } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { AllergyPicker, DietPicker, Field, Stepper, inputCls } from '../components/Pickers'
import { Button, IconButton, Logo, Mascot } from '../components/ui'
import { api, errorMessage } from '../lib/api'
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

// Message to show when sign-up or log-in fails.
const messageFor = (e: unknown) => errorMessage(e, 'Something went wrong. Please try again.')

// Sign-up form: account details plus allergies, diet and household size.
export function SignUp() {
  const { go, startSession } = useApp()
  const [f, setF] = useState({ name: '', email: '', password: '', age: '' })
  const [allergies, setAllergies] = useState<Allergen[]>([])
  const [diet, setDiet] = useState<Diet>('none')
  const [household, setHousehold] = useState(2)
  const [show, setShow] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState(false)
  const [formErr, setFormErr] = useState('')

  // Validates the form, creates the account and starts the session.
  const submit = async (e: FormEvent) => {
    e.preventDefault()
    const er: Record<string, string> = {}
    if (!f.name.trim()) er.name = 'Tell Frigi what to call you.'
    if (!/^\S+@\S+\.\S+$/.test(f.email.trim())) er.email = 'Enter a valid email, like sara@example.com.'
    if (f.password.length < 8) er.password = 'Use at least 8 characters.'
    const age = Number(f.age)
    if (f.age && (!Number.isInteger(age) || age < 13 || age > 120)) er.age = 'Enter an age between 13 and 120.'
    setErrors(er)
    if (Object.keys(er).length) return
    setBusy(true); setFormErr('')
    try {
      const s = await api.signUp({ name: f.name.trim(), email: f.email.trim(), password: f.password, age: f.age ? age : undefined, householdSize: household, diet, allergies })
      await startSession(s)
    } catch (err) {
      setFormErr(messageFor(err))
    } finally { setBusy(false) }
  }
  // Change handler for one text field.
  const setField = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value })
  // Accessibility attributes linking a field to its error message.
  const ariaFor = (k: string) => ({ 'aria-invalid': !!errors[k] || undefined, 'aria-describedby': errors[k] ? k + '-err' : undefined })

  return (
    <AuthLayout pose="upload" title="Create your account" sub="A few details so Frigi can suggest food that suits you.">
      <form onSubmit={submit} noValidate className="space-y-5 rounded-5xl bg-white/60 p-5 shadow-soft sm:p-7">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="su-name" label="Name" error={errors.name}><input id="su-name" className={inputCls} value={f.name} onChange={setField('name')} autoComplete="name" placeholder="Sara" {...ariaFor('name')} /></Field>
          <Field id="su-age" label="Age (optional)" error={errors.age}><input id="su-age" className={inputCls} value={f.age} onChange={setField('age')} inputMode="numeric" placeholder="21" {...ariaFor('age')} /></Field>
        </div>
        <Field id="su-email" label="Email" error={errors.email}><input id="su-email" type="email" className={inputCls} value={f.email} onChange={setField('email')} autoComplete="email" placeholder="sara@example.com" {...ariaFor('email')} /></Field>
        <Field id="su-pass" label="Password" error={errors.password} hint="At least 8 characters.">
          <div className="relative">
            <input id="su-pass" type={show ? 'text' : 'password'} className={inputCls + ' pr-12'} value={f.password} onChange={setField('password')} autoComplete="new-password" {...ariaFor('password')} />
            <button type="button" onClick={() => setShow(!show)} aria-label={show ? 'Hide password' : 'Show password'} className="absolute right-2 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full text-brown-70 hover:bg-cream-50">{show ? <EyeOff size={18} /> : <Eye size={18} />}</button>
          </div>
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
        <Button type="submit" size="lg" className="w-full" disabled={busy} icon={busy ? <Loader2 size={18} className="animate-spin" /> : undefined}>{busy ? 'Creating account…' : 'Create account'}</Button>
        <p className="text-center text-sm text-brown-70">Already cooking with Frigi? <button type="button" onClick={() => go('login')} className="font-bold text-red hover:underline">Log in</button></p>
      </form>
    </AuthLayout>
  )
}

// Log-in form.
export function Login() {
  const { go, startSession } = useApp()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  // Logs in and starts the session, or shows the backend's error.
  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!email.trim() || !password) { setErr('Enter your email and password.'); return }
    setBusy(true); setErr('')
    try {
      await startSession(await api.logIn(email.trim(), password))
    } catch (e2) { setErr(messageFor(e2)) } finally { setBusy(false) }
  }
  return (
    <AuthLayout pose="appLogo" title="Welcome back" sub="Log in to pick up where you left off.">
      <form onSubmit={submit} noValidate className="space-y-5 rounded-5xl bg-white/60 p-5 shadow-soft sm:p-7">
        <Field id="li-email" label="Email"><input id="li-email" type="email" className={inputCls} value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" /></Field>
        <Field id="li-pass" label="Password"><input id="li-pass" type="password" className={inputCls} value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" /></Field>
        {err && <p role="alert" className="rounded-2xl bg-red-50 p-3 text-sm font-bold text-red-600">{err}</p>}
        <Button type="submit" size="lg" className="w-full" disabled={busy} icon={busy ? <Loader2 size={18} className="animate-spin" /> : undefined}>{busy ? 'Logging in…' : 'Log in'}</Button>
        <p className="text-center text-sm text-brown-70">New here? <button type="button" onClick={() => go('signup')} className="font-bold text-red hover:underline">Create an account</button></p>
      </form>
    </AuthLayout>
  )
}
