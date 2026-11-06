// Notes for one recipe, e.g. "cook 5 minutes longer" or "add more salt". They appear whenever
// that recipe is opened again. A note such as "no eggs" is also kept for every recipe.
import { NotebookPen, X } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { api, errorMessage } from '../lib/api'
import { cx } from '../lib/format'
import { recipeKey } from '../lib/types'
import { useApp } from '../state/AppState'
import { Button } from './ui'

export function RecipeNotes({ recipeTitle, step, compact = false, className }: { recipeTitle: string; step?: number; compact?: boolean; className?: string }) {
  const { profile, setProfile, notify } = useApp()
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const key = recipeKey(recipeTitle)
  const notes = (profile?.recipeNotes ?? []).filter((n) => n.recipeKey === key)

  // Saves the note for this recipe (and as a general note when it says "no …").
  const add = async (e: FormEvent) => {
    e.preventDefault()
    const t = text.trim()
    if (!t || !profile) return
    setBusy(true); setError('')
    try {
      const r = await api.addRecipeNote(recipeTitle, step ? `Step ${step}: ${t}` : t)
      setProfile({
        ...profile,
        recipeNotes: [...profile.recipeNotes, r.note],
        chefNotes: r.generalNote ? [...profile.chefNotes, r.generalNote] : profile.chefNotes,
      })
      setText('')
      notify(r.generalNote ? 'Saved, and Frigi will apply it to every recipe' : 'Note saved for this recipe')
    } catch (err) {
      setError(errorMessage(err, 'Couldn’t save your note. Please try again.'))
    } finally { setBusy(false) }
  }

  // Deletes one note for this recipe.
  const remove = async (id: string) => {
    if (!profile) return
    try {
      await api.deleteRecipeNote(id)
      setProfile({ ...profile, recipeNotes: profile.recipeNotes.filter((n) => n.id !== id) })
    } catch (err) {
      notify(errorMessage(err, 'Couldn’t delete that note.'))
    }
  }

  return (
    <section aria-label="Your notes for this recipe" className={cx('rounded-4xl bg-sun-50 p-4', className)}>
      {!compact && (
        <>
          <h3 className="flex items-center gap-2 font-display text-lg font-semibold text-brown"><NotebookPen size={18} /> Your notes</h3>
          <p className="text-xs text-brown-70">Shown every time you open this recipe. Notes like “no eggs” also apply to all recipes.</p>
        </>
      )}
      {notes.length > 0 && (
        <ul className="mt-2 space-y-1.5">
          {notes.map((n) => (
            <li key={n.id} className="flex items-center gap-2 rounded-2xl bg-white px-3 py-2">
              <span className="min-w-0 flex-1 text-sm font-semibold text-brown">{n.text}</span>
              <button onClick={() => remove(n.id)} aria-label={`Delete note: ${n.text}`} className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-brown-50 hover:bg-red-50 hover:text-red"><X size={14} /></button>
            </li>
          ))}
        </ul>
      )}
      <form onSubmit={add} className="mt-2 flex gap-2">
        <label htmlFor={`note-${key}-${step ?? 'all'}`} className="sr-only">Add a note for this recipe</label>
        <input id={`note-${key}-${step ?? 'all'}`} value={text} onChange={(e) => setText(e.target.value)} maxLength={200}
          placeholder={step ? `Note for step ${step}, e.g. “5 more minutes”` : 'e.g. “add more salt”'}
          className="h-11 min-w-0 flex-1 rounded-full bg-white px-4 text-[15px] text-brown placeholder:text-brown-50 focus:outline-none focus:ring-2 focus:ring-red" />
        <Button type="submit" size="sm" disabled={!text.trim() || busy}>{busy ? 'Saving…' : 'Save'}</Button>
      </form>
      {error && <p role="alert" className="mt-2 text-sm font-bold text-red-600">{error}</p>}
    </section>
  )
}
