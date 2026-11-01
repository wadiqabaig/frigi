const FRACTIONS: [number, string][] = [[0.25, '¼'], [0.33, '⅓'], [0.5, '½'], [0.67, '⅔'], [0.75, '¾']]

/** Pretty-print a quantity, e.g. 1.5 -> "1½", 0.25 -> "¼", 312.5 g -> "315 g". A zero quantity means "to taste". */
export function formatQty(qty: number, unit: string): string {
  if (!qty) return unit ? unit : 'To taste'
  const u = unit.trim()
  if (/^(g|grams?|ml|milliliters?)$/i.test(u)) {
    const v = qty >= 100 ? Math.round(qty / 5) * 5 : Math.round(qty)
    return `${v} ${u}`
  }
  const whole = Math.floor(qty + 0.001)
  const frac = qty - whole
  let fracStr = ''
  if (frac > 0.12) {
    if (frac > 0.87) return withUnit(String(whole + 1), u)
    fracStr = FRACTIONS.reduce((a, b) => (Math.abs(b[0] - frac) < Math.abs(a[0] - frac) ? b : a))[1]
  }
  return withUnit((whole > 0 ? String(whole) : '') + fracStr || '1', u)
}

// Adds the unit after a quantity when there is one.
const withUnit = (s: string, unit: string) => (unit ? `${s} ${unit}` : s)

// Joins the truthy class names into one className string.
export const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(' ')
