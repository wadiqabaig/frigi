import { motion } from 'framer-motion'
import { AlertTriangle, ArrowLeft, Check, Loader2, LogOut, Pencil } from 'lucide-react'
import { useState } from 'react'
import { POSES } from '../assets'
import { AllergyPicker, DietPicker, Field, Stepper, inputCls } from '../components/Pickers'
import { SavedRecipeCard } from '../components/RecipeCard'
import { Button, IconButton, Mascot, Pill } from '../components/ui'
import { api, errorMessage } from '../lib/api'
import type { Profile as P, SavedRecipe } from '../lib/types'
import { ALLERGEN_LABEL, DIET_LABEL } from '../lib/vocab'
import { useApp, useProfile } from '../state/AppState'

/** True when the profile now has rules the saved recipe was never checked against. */
function checkedAgainstOldRules(r: SavedRecipe, p: P) {
  return p.allergies.some((a) => !r.safety.allergies.includes(a)) || (p.diet !== 'none' && p.diet !== r.safety.diet)
}

// The user's saved recipes.
export function Saved() {
  const { saved, go, back } = useApp()
  const profile = useProfile()
  return (
    <div>
      <div className="mb-5 flex items-center gap-3 pr-12 lg:pr-0">
        <IconButton label="Back" onClick={back}><ArrowLeft size={20} /></IconButton>
        <div>
          <h1 className="font-display text-[30px] font-semibold leading-tight text-brown sm:text-[36px]">Saved recipes</h1>
          <p className="text-sm text-brown-70">{saved.length ? `${saved.length} recipe${saved.length > 1 ? 's' : ''} you loved · kept on this device` : 'Your favourites live here'}</p>
        </div>
      </div>
      {saved.length === 0 ? (
        <div className="flex flex-col items-center rounded-5xl bg-white px-6 py-10 text-center shadow-soft">
          <div className="relative grid place-items-center"><div className="absolute h-56 w-56 rounded-full bg-sun-50" aria-hidden /><Mascot pose="mealPlan" size={190} /></div>
          <h2 className="mt-4 font-display text-2xl font-semibold text-brown">No saved recipes yet</h2>
          <p className="mt-1 max-w-sm text-brown-70">Tap the heart on any recipe to keep it here for later.</p>
          <div className="mt-5 flex flex-col gap-2 sm:flex-row">
            <Button onClick={() => go('upload')}>Scan my fridge</Button>
            <Button variant="secondary" onClick={() => go('recipes')}>Find recipes</Button>
          </div>
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {saved.map((r, i) => (
            <div key={r.optionId} className="flex flex-col gap-2">
              {checkedAgainstOldRules(r, profile) && (
                <button onClick={() => go('profile')} className="flex items-center gap-2 rounded-2xl bg-red-50 px-3 py-2 text-left text-xs font-bold text-red-600">
                  <AlertTriangle size={14} className="shrink-0" /> Saved before your current allergies or diet. Check the ingredients before cooking.
                </button>
              )}
              <SavedRecipeCard recipe={r} index={i} />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// Shows and edits the user's profile and preferences.
export function Profile() {
  const { setProfile, signOut, go, notify } = useApp()
  const profile = useProfile()
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState<P>(profile)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [justSaved, setJustSaved] = useState(false)

  // Opens the edit form with the current values.
  const start = () => { setDraft(profile); setEditing(true); setJustSaved(false); setError('') }
  // Sends only the changed fields to PUT /profile.
  const save = async () => {
    if (!draft.name.trim()) return
    const changes: Partial<P> = {}
    if (draft.name.trim() !== profile.name) changes.name = draft.name.trim()
    if (draft.age !== profile.age && draft.age !== null) changes.age = draft.age
    if (draft.householdSize !== profile.householdSize) changes.householdSize = draft.householdSize
    if (draft.diet !== profile.diet) changes.diet = draft.diet
    if ([...draft.allergies].sort().join() !== [...profile.allergies].sort().join()) changes.allergies = draft.allergies
    if (!Object.keys(changes).length) { setEditing(false); return }
    setSaving(true); setError('')
    try {
      setProfile(await api.updateProfile(changes))
      setEditing(false); setJustSaved(true)
      notify('Preferences saved')
    } catch (e) {
      setError(errorMessage(e, 'Couldn’t save your preferences. Please try again.'))
    } finally { setSaving(false) }
  }

  return (
    <div className="space-y-6">
      <header className="relative overflow-hidden rounded-5xl bg-cream p-6 sm:p-8">
        <div aria-hidden className="absolute -right-16 -top-16 h-56 w-56 rounded-full bg-sun/30" />
        <div className="relative flex flex-wrap items-center gap-4 pr-10 lg:pr-0">
          <span className="grid h-20 w-20 place-items-center rounded-[28px] bg-red font-display text-4xl font-semibold text-white shadow-red">{profile.name.slice(0, 1).toUpperCase()}</span>
          <div className="min-w-0 flex-1">
            <h1 className="font-display text-[30px] font-semibold leading-tight text-brown">{profile.name}</h1>
            <p className="text-sm text-brown-70">{profile.email}{profile.age ? ` · ${profile.age} years` : ''}</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              <Pill tone="white">Household of {profile.householdSize}</Pill>
              <Pill tone="white">Diet: {DIET_LABEL[profile.diet]}</Pill>
            </div>
          </div>
          {!editing && <Button variant="outline" size="sm" icon={<Pencil size={15} />} onClick={start}>Edit profile</Button>}
        </div>
        <img src={POSES.leaning} alt="" className="absolute -bottom-3 right-6 hidden w-32 sm:block" />
      </header>

      {justSaved && !editing && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-3 rounded-4xl bg-sun-50 p-3 pr-5">
          <img src={POSES.success} alt="" className="h-16 w-auto" />
          <div><p className="font-bold text-brown">All saved!</p><p className="text-sm text-brown-70">Frigi checks every new recipe against these preferences.</p></div>
          <Button size="sm" className="ml-auto" onClick={() => go('chef')}>Ask the chef</Button>
        </motion.div>
      )}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
        <section aria-labelledby="pref-h" className="rounded-5xl bg-white p-5 shadow-soft sm:p-7">
          <h2 id="pref-h" className="font-display text-xl font-semibold text-brown">Food preferences</h2>
          {editing ? (
            <div className="mt-4 space-y-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field id="pf-name" label="Name" error={!draft.name.trim() ? 'Name can’t be empty.' : undefined}><input id="pf-name" className={inputCls} value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} /></Field>
                <Field id="pf-age" label="Age (optional)"><input id="pf-age" className={inputCls} inputMode="numeric" value={draft.age ?? ''} onChange={(e) => { const n = parseInt(e.target.value, 10); setDraft({ ...draft, age: Number.isNaN(n) ? null : Math.min(120, Math.max(1, n)) }) }} /></Field>
              </div>
              <div className="flex items-center justify-between gap-4"><p className="text-sm font-bold text-brown">Household size</p><Stepper value={draft.householdSize} onChange={(n) => setDraft({ ...draft, householdSize: n })} max={20} label="household size" /></div>
              <div><p id="pf-diet" className="mb-2 text-sm font-bold text-brown">Dietary preference</p><DietPicker labelId="pf-diet" value={draft.diet} onChange={(d) => setDraft({ ...draft, diet: d })} /></div>
              <div>
                <p id="pf-all" className="mb-2 text-sm font-bold text-brown">Allergies</p>
                <AllergyPicker labelId="pf-all" value={draft.allergies} onChange={(a) => setDraft({ ...draft, allergies: a })} />
                {draft.allergies.length > 0 && <button onClick={() => setDraft({ ...draft, allergies: [] })} className="mt-2 text-xs font-bold text-red hover:underline">Clear all allergies</button>}
                <p className="mt-2 text-xs text-brown-50">Frigi’s backend leaves out recipes and swaps that contain these. Automated screening is not a medical guarantee.</p>
              </div>
              {error && <p role="alert" className="rounded-2xl bg-red-50 p-3 text-sm font-bold text-red-600">{error}</p>}
              <div className="flex flex-col gap-2 sm:flex-row">
                <Button onClick={save} disabled={saving || !draft.name.trim()} icon={saving ? <Loader2 size={17} className="animate-spin" /> : <Check size={17} />}>{saving ? 'Saving…' : 'Save changes'}</Button>
                <Button variant="ghost" onClick={() => setEditing(false)} disabled={saving}>Cancel</Button>
              </div>
            </div>
          ) : (
            <dl className="mt-4 divide-y divide-cream">
              <div className="flex items-center justify-between gap-3 py-3"><dt className="text-sm font-bold text-brown-70">Household size</dt><dd className="font-bold text-brown">{profile.householdSize} {profile.householdSize > 1 ? 'people' : 'person'}</dd></div>
              <div className="flex items-center justify-between gap-3 py-3"><dt className="text-sm font-bold text-brown-70">Diet</dt><dd className="font-bold text-brown">{DIET_LABEL[profile.diet]}</dd></div>
              <div className="py-3">
                <dt className="text-sm font-bold text-brown-70">Allergies</dt>
                <dd className="mt-2 flex flex-wrap gap-1.5">
                  {profile.allergies.length === 0 ? <Pill tone="leaf">No allergies</Pill> : profile.allergies.map((a) => <Pill key={a} tone="red">{ALLERGEN_LABEL[a]}</Pill>)}
                </dd>
              </div>
            </dl>
          )}
        </section>

        <section aria-labelledby="acc-h" className="self-start rounded-5xl bg-white p-5 shadow-soft sm:p-6">
          <h2 id="acc-h" className="font-display text-xl font-semibold text-brown">Account</h2>
          <p className="mt-1 text-sm text-brown-70">Signed in as <span className="font-bold text-brown">{profile.email}</span>.</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button size="sm" variant="outline" icon={<LogOut size={15} />} onClick={() => { signOut(); notify('Signed out') }}>Sign out</Button>
          </div>
        </section>
      </div>
    </div>
  )
}
