const FRACTIONS: [number, string][] = [[0.25, '¼'], [0.33, '⅓'], [0.5, '½'], [0.67, '⅔'], [0.75, '¾']]

/** Scale and pretty-print a quantity, e.g. 1.5 -> "1½", 0.25 -> "¼", 312.5 g -> "315 g". */
export function formatQty(qty: number, unit: string): string {
  if (unit === 'pinch') return qty <= 1 ? 'A pinch' : `${Math.round(qty)} pinches`
  if (unit === 'g' || unit === 'ml') {
    const v = qty >= 100 ? Math.round(qty / 5) * 5 : Math.round(qty)
    return `${v} ${unit}`
  }
  const whole = Math.floor(qty + 0.001)
  const frac = qty - whole
  let fracStr = ''
  if (frac > 0.12) {
    const best = FRACTIONS.reduce((a, b) => (Math.abs(b[0] - frac) < Math.abs(a[0] - frac) ? b : a))
    if (frac > 0.87) return withUnit(String(whole + 1), unit, whole + 1)
    fracStr = best[1]
  }
  const s = (whole > 0 ? String(whole) : '') + fracStr || '1'
  return withUnit(s, unit, qty)
}

const SINGULAR: Record<string, string> = { cloves: 'clove', slices: 'slice', leaves: 'leaf' }
const PLURAL: Record<string, string> = { clove: 'cloves', slice: 'slices', leaf: 'leaves' }
function withUnit(s: string, unit: string, n: number) {
  if (!unit) return s
  const u = n > 1.01 ? PLURAL[unit] ?? unit : SINGULAR[unit] ?? unit
  return `${s} ${u}`
}

export const totalTime = (r: { prepMin: number; cookMin: number }) => r.prepMin + r.cookMin
export const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(' ')
