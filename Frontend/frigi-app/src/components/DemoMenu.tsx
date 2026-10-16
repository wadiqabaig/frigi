import { Check, LayoutGrid, RotateCcw, Server } from 'lucide-react'
import { API_BASE_URL, USE_MOCK_API } from '../lib/api'
import { SCENARIOS } from '../lib/data/scenarios'
import { cx } from '../lib/format'
import { useApp } from '../state/AppState'
import { Button, Sheet } from './ui'

export function DemoMenu({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { scenario, setScenario, go, resetDemo, notify } = useApp()
  return (
    <Sheet open={open} onClose={onClose} labelledBy="demo-title">
      <h2 id="demo-title" className="pr-12 font-display text-2xl font-semibold text-brown">Demo menu</h2>
      <p className="mt-1 text-sm text-brown-70">For testing only. Pick a scenario, then run a scan to see how Frigi responds.</p>

      <div className="mt-4 flex items-center gap-3 rounded-2xl bg-white p-3 text-sm shadow-soft">
        <span className="grid h-9 w-9 place-items-center rounded-xl bg-sun-50 text-sun-700"><Server size={18} /></span>
        <div className="min-w-0">
          <p className="font-bold text-brown">API mode: {USE_MOCK_API ? 'Mock (offline demo)' : 'Live backend'}</p>
          <p className="truncate text-xs text-brown-50">Switch with <code className="rounded bg-cream-50 px-1">USE_MOCK_API</code> in src/lib/api.ts · {API_BASE_URL}</p>
        </div>
      </div>

      <fieldset className="mt-5">
        <legend className="mb-2 text-xs font-extrabold uppercase tracking-wider text-brown-50">Scenario</legend>
        <div className="grid gap-2">
          {SCENARIOS.map((s, i) => {
            const on = scenario === s.id
            return (
              <button
                key={s.id}
                role="radio"
                aria-checked={on}
                onClick={() => { setScenario(s.id); notify(`Scenario: ${s.label}`) }}
                className={cx('flex items-center gap-3 rounded-2xl p-3 text-left transition-colors', on ? 'bg-red-50 ring-2 ring-red' : 'bg-white shadow-soft hover:bg-cream-50')}
              >
                <span className={cx('grid h-7 w-7 shrink-0 place-items-center rounded-full text-xs font-extrabold', on ? 'bg-red text-white' : 'bg-cream-50 text-brown-70')}>{on ? <Check size={14} /> : i + 1}</span>
                <span className="min-w-0">
                  <span className="block text-sm font-bold text-brown">{s.label}</span>
                  <span className="block text-xs text-brown-70">{s.hint}</span>
                </span>
              </button>
            )
          })}
        </div>
      </fieldset>

      <div className="mt-5 flex flex-wrap gap-2">
        <Button size="sm" variant="secondary" icon={<LayoutGrid size={16} />} onClick={() => { onClose(); go('states') }}>Preview all states</Button>
        <Button size="sm" variant="outline" icon={<RotateCcw size={16} />} onClick={() => { resetDemo(); onClose(); notify('Demo reset') }}>Reset demo data</Button>
      </div>
    </Sheet>
  )
}
