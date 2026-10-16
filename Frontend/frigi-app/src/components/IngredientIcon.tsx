import type { ReactNode } from 'react'
import { cx } from '../lib/format'

// Hand-drawn ingredient glyphs in Frigi's illustration style: flat fills with
// the same deep-brown outline the mascot uses.
const O = '#31170E'
const s = { stroke: O, strokeWidth: 1.8, strokeLinejoin: 'round' as const, strokeLinecap: 'round' as const }

const bottle = (body: string, cap: string, label = '#FFF9F2') => (
  <>
    <rect x="16" y="5" width="8" height="5" rx="1.5" fill={cap} {...s} />
    <path d="M15 10h10v4l3 4v15a3 3 0 0 1-3 3H15a3 3 0 0 1-3-3V18l3-4z" fill={body} {...s} />
    <rect x="14" y="21" width="12" height="8" rx="2" fill={label} {...s} strokeWidth={1.4} />
  </>
)
const jar = (fill: string, lid = '#E5332A') => (
  <>
    <rect x="11" y="9" width="18" height="6" rx="2" fill={lid} {...s} />
    <rect x="10" y="15" width="20" height="19" rx="5" fill={fill} {...s} />
    <path d="M14 22h12" {...s} strokeWidth={1.4} fill="none" />
  </>
)
const carton = (fill: string, band: string) => (
  <>
    <path d="M13 12l3-6h8l3 6v22H13z" fill={fill} {...s} />
    <path d="M13 12h14" {...s} fill="none" />
    <rect x="13" y="18" width="14" height="8" fill={band} {...s} strokeWidth={1.4} />
  </>
)

const G: Record<string, ReactNode> = {
  tomato: (<><circle cx="20" cy="23" r="12" fill="#E5332A" {...s} /><path d="M20 11l-4-3m4 3l4-3m-4 3l-6 1m6-1l6 1m-6-1v-4" stroke="#3E8E4E" strokeWidth="2.2" strokeLinecap="round" /><ellipse cx="15" cy="19" rx="2.5" ry="1.6" fill="#fff" opacity=".55" /></>),
  eggs: (<><ellipse cx="15" cy="23" rx="7.5" ry="9.5" fill="#FFF9F2" {...s} /><ellipse cx="25" cy="25" rx="7.5" ry="9.5" fill="#F2E5D3" {...s} /></>),
  milk: carton('#FFFFFF', '#FEB506'),
  oatmilk: carton('#F2E5D3', '#C99A5B'),
  cheddar: (<><path d="M6 28l22-14 6 4v12H6z" fill="#FEB506" {...s} /><path d="M6 28h28" {...s} fill="none" /><circle cx="22" cy="24" r="2" fill="#E9A300" /><circle cx="15" cy="27" r="1.4" fill="#E9A300" /><circle cx="29" cy="23" r="1.4" fill="#E9A300" /></>),
  mozzarella: (<><circle cx="20" cy="23" r="11" fill="#FFFFFF" {...s} /><path d="M14 19c2-2 5-3 8-2" stroke="#D9CCC3" strokeWidth="2" fill="none" strokeLinecap="round" /><path d="M28 12c2 2 3 4 2 6" stroke="#3E8E4E" strokeWidth="2.4" strokeLinecap="round" fill="none" /></>),
  bread: (<><path d="M8 20c0-7 5-10 12-10s12 3 12 10v12H8z" fill="#E7A65A" {...s} /><path d="M14 16l3 4m3-6l3 4m3-2l2 3" {...s} fill="none" strokeWidth={1.5} /></>),
  pasta: (<><path d="M8 14l9 6-9 6zM32 14l-9 6 9 6z" fill="#FEC94A" {...s} /><rect x="16" y="16" width="8" height="8" rx="3" fill="#F5B021" {...s} /></>),
  onion: (<><path d="M20 8c-2 4-11 9-11 17a11 11 0 0 0 22 0c0-8-9-13-11-17z" fill="#B65A8E" {...s} /><path d="M20 12c-3 5-5 9-5 14m5-14c3 5 5 9 5 14" {...s} fill="none" strokeWidth={1.3} /><path d="M17 36l1 2m3-2v2m3-2l-1 2" {...s} fill="none" strokeWidth={1.2} /></>),
  spinach: (<><path d="M20 35C8 30 6 18 14 9c6 3 14 10 6 26z" fill="#3E8E4E" {...s} /><path d="M20 35c0-8-2-15-6-24" {...s} fill="none" strokeWidth={1.3} /><path d="M21 34c4-8 10-11 13-9-1 6-6 10-13 9z" fill="#5BAA5E" {...s} /></>),
  basil: (<><path d="M12 32C6 24 9 14 18 12c2 9 0 16-6 20z" fill="#2F7A3F" {...s} /><path d="M20 30c-1-9 4-16 13-15 1 9-5 14-13 15z" fill="#3E8E4E" {...s} /></>),
  pepper: (<><path d="M20 12c-6-3-13 0-13 9 0 8 4 14 8 14 2 0 3-1 5-1s3 1 5 1c4 0 8-6 8-14 0-9-7-12-13-9z" fill="#3E8E4E" {...s} /><path d="M20 12c0-3 1-5 4-6" stroke="#2F6B3A" strokeWidth="2.4" strokeLinecap="round" fill="none" /><path d="M14 18c-1 4-1 8 1 11" stroke="#fff" strokeOpacity=".4" strokeWidth="2" fill="none" strokeLinecap="round" /></>),
  chicken: (<><path d="M26 7c6 2 8 10 4 15-3 4-9 4-12 1l-6 6 1 3-3 1-1-3-3-1 1-3 3 1 6-6c-3-3-2-9 2-12 2-2 5-3 8-2z" fill="#E7A65A" {...s} /><path d="M25 12c2 1 3 3 2 5" stroke="#fff" strokeOpacity=".5" strokeWidth="2" fill="none" strokeLinecap="round" /></>),
  yogurt: (<><path d="M10 14h20l-3 20H13z" fill="#FFFFFF" {...s} /><rect x="8" y="10" width="24" height="5" rx="2.5" fill="#E5332A" {...s} /><path d="M13 22h14" stroke="#FEB506" strokeWidth="3" /></>),
  lemon: (<><ellipse cx="20" cy="21" rx="12" ry="9" fill="#FEB506" {...s} transform="rotate(-20 20 21)" /><path d="M30 14l3-3M10 28l-2 2" {...s} /></>),
  garlic: (<><path d="M20 8c0 4-10 8-10 16a10 10 0 0 0 20 0c0-8-10-12-10-16z" fill="#FFF9F2" {...s} /><path d="M20 14c-2 4-3 8-3 16m3-16c2 4 3 8 3 16" {...s} fill="none" strokeWidth={1.3} /></>),
  butter: (<><path d="M5 30h30l-3 4H8z" fill="#F2E5D3" {...s} /><path d="M10 19l6-5h16v12H10z" fill="#FFD666" {...s} /><path d="M10 19h16v11M26 19l6-5" {...s} fill="none" /></>),
  oil: bottle('#C8B23A', '#3E8E4E'),
  soy: bottle('#5E3A22', '#E5332A'),
  tamari: bottle('#7A4A2A', '#3E8E4E'),
  maple: bottle('#C26A1B', '#31170E'),
  salt: (<><path d="M13 14h14l2 20H11z" fill="#FFFFFF" {...s} /><path d="M13 14c0-5 3-7 7-7s7 2 7 7z" fill="#D9CCC3" {...s} /><circle cx="18" cy="11" r=".9" fill={O} /><circle cx="22" cy="11" r=".9" fill={O} /></>),
  rice: (<><path d="M6 20h28a14 13 0 0 1-28 0z" fill="#E5332A" {...s} /><path d="M7 20c2-6 7-8 13-8s11 2 13 8" fill="#FFFFFF" {...s} /><path d="M14 16l1 1m5-2v1m5 0l-1 1" {...s} fill="none" strokeWidth={1.3} /></>),
  flour: (<><path d="M11 13c3-2 15-2 18 0l3 21H8z" fill="#F2E5D3" {...s} /><path d="M12 13l2-4h12l2 4" {...s} fill="#E8D5BC" /><path d="M16 23c2-2 6-2 8 0" {...s} fill="none" strokeWidth={1.4} /></>),
  sugar: (<><rect x="8" y="18" width="11" height="11" rx="2" fill="#FFFFFF" {...s} /><rect x="21" y="18" width="11" height="11" rx="2" fill="#FFFFFF" {...s} /><rect x="14" y="8" width="11" height="11" rx="2" fill="#FFF9F2" {...s} /></>),
  honey: (<><path d="M11 14h18v16a5 5 0 0 1-5 5h-8a5 5 0 0 1-5-5z" fill="#F5A70D" {...s} /><rect x="10" y="9" width="20" height="6" rx="2" fill="#E5332A" {...s} /><path d="M15 15v5a2 2 0 0 0 4 0v-5" fill="#F5A70D" {...s} /></>),
  ginger: (<><path d="M7 24c0-4 4-6 8-5 1-4 6-6 9-3 3-3 9-1 9 4s-5 6-8 5c-1 4-6 6-9 3-3 2-9 1-9-4z" fill="#E7C27A" {...s} /></>),
  spices: jar('#E5732A'),
  cumin: jar('#C24A1E', '#FEB506'),
  bakingpowder: jar('#FFFFFF', '#FEB506'),
  aquafaba: jar('#F2E5D3', '#3E8E4E'),
  coconut: (<><path d="M6 22a14 12 0 0 0 28 0z" fill="#7A4A2A" {...s} /><path d="M9 22a11 8 0 0 0 22 0z" fill="#FFFFFF" {...s} strokeWidth={1.3} /></>),
  chickpeas: (<><circle cx="14" cy="24" r="6" fill="#E8C27E" {...s} /><circle cx="26" cy="24" r="6" fill="#E8C27E" {...s} /><circle cx="20" cy="15" r="6" fill="#F0CF92" {...s} /></>),
  scallion: (<><path d="M14 34V12M20 34V8M26 34V13" stroke="#3E8E4E" strokeWidth="4" strokeLinecap="round" /><path d="M11 30h18v5H11z" fill="#FFFFFF" {...s} /></>),
  sesame: (<>{[[12, 16], [22, 13], [28, 22], [16, 26], [24, 30], [10, 30]].map(([x, y], i) => <ellipse key={i} cx={x} cy={y} rx="2.6" ry="4" fill="#F2E5D3" {...s} strokeWidth={1.3} transform={`rotate(${i * 35} ${x} ${y})`} />)}</>),
  chilli: (<><path d="M10 12c4 0 6 3 8 8 3 7 8 11 14 12-8 3-17 0-20-8-1-4-2-8-2-12z" fill="#E5332A" {...s} /><path d="M10 12c-1-2 0-5 2-6" stroke="#3E8E4E" strokeWidth="2.4" strokeLinecap="round" fill="none" /></>),
  mushroom: (<><path d="M5 20a15 11 0 0 1 30 0z" fill="#B97A4A" {...s} /><path d="M15 20h10l-1 12a4 4 0 0 1-8 0z" fill="#FFF9F2" {...s} /><circle cx="14" cy="15" r="1.6" fill="#F2E5D3" /><circle cx="24" cy="13" r="1.6" fill="#F2E5D3" /></>),
  carrot: (<><path d="M27 13L8 34l2-8 13-17z" fill="#F07B22" {...s} /><path d="M25 11l4-6m-2 8l7-3m-6 1l5-5" stroke="#3E8E4E" strokeWidth="2.2" strokeLinecap="round" /></>),
  broccoli: (<><path d="M17 24h6l1 11h-8z" fill="#7DBB6B" {...s} /><circle cx="13" cy="20" r="6" fill="#3E8E4E" {...s} /><circle cx="27" cy="20" r="6" fill="#3E8E4E" {...s} /><circle cx="20" cy="14" r="7" fill="#4C9F59" {...s} /></>),
  tofu: (<><path d="M8 16l10-5 14 4v14l-10 5-14-4z" fill="#FFFFFF" {...s} /><path d="M8 16l14 4 10-5M22 20v14" {...s} fill="none" /></>),
  salmon: (<><path d="M5 22c4-8 26-10 30-2-4 8-26 10-30 2z" fill="#F6875E" {...s} /><path d="M13 16l3 12m4-13l3 12m4-11l2 9" stroke="#FFFFFF" strokeOpacity=".8" strokeWidth="1.6" strokeLinecap="round" /></>),
  banana: (<><path d="M8 14c2 12 12 18 24 14-1 4-6 7-12 7-8 0-14-8-14-19z" fill="#FEC94A" {...s} /><path d="M8 14l-1-4" {...s} /></>),
}

export const CATEGORY_TINT: Record<string, string> = {
  produce: 'bg-leaf-50', dairy: 'bg-sun-50', protein: 'bg-peach', grain: 'bg-cream-50', pantry: 'bg-cream-50',
}

export function IngredientGlyph({ id, className }: { id: string; className?: string }) {
  return (
    <svg viewBox="0 0 40 40" className={className} aria-hidden>
      {G[id] ?? jar('#F2E5D3')}
    </svg>
  )
}

export function IngredientIcon({ id, category, size = 40, className }: { id: string; category?: string; size?: number; className?: string }) {
  return (
    <span
      className={cx('inline-grid shrink-0 place-items-center rounded-2xl', CATEGORY_TINT[category ?? 'pantry'] ?? 'bg-cream-50', className)}
      style={{ width: size, height: size }}
    >
      <IngredientGlyph id={id} className="h-[78%] w-[78%]" />
    </span>
  )
}
