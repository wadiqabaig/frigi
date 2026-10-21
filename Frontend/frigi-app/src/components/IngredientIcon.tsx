import type { ReactNode } from 'react'
import { cx } from '../lib/format'
import { ingredientVisual, type FoodCategory, type GlyphKey } from '../lib/ingredientVisual'

// Hand-drawn ingredient glyphs in Frigi's illustration style: flat fills with
// the same deep-brown outline the mascot uses. Which glyph an ingredient gets
// is decided by lib/ingredientVisual.ts from its name.
const O = '#31170E'
const s = { stroke: O, strokeWidth: 1.8, strokeLinejoin: 'round' as const, strokeLinecap: 'round' as const }

// Glyph building blocks shared by several ingredients.
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
const citrus = (fill: string, leaf = '#3E8E4E') => (
  <><ellipse cx="20" cy="22" rx="12" ry="10" fill={fill} {...s} /><path d="M20 12c1-3 4-5 7-5-1 3-4 5-7 5z" fill={leaf} {...s} strokeWidth={1.4} /><circle cx="15" cy="19" r="1.6" fill="#fff" opacity=".5" /></>
)
const chilliShape = (fill: string) => (
  <><path d="M10 12c4 0 6 3 8 8 3 7 8 11 14 12-8 3-17 0-20-8-1-4-2-8-2-12z" fill={fill} {...s} /><path d="M10 12c-1-2 0-5 2-6" stroke="#2F6B3A" strokeWidth="2.4" strokeLinecap="round" fill="none" /></>
)
const tuber = (fill: string, spot: string) => (
  <><path d="M7 22c0-7 6-12 14-12s12 5 12 11-5 11-13 11S7 29 7 22z" fill={fill} {...s} /><circle cx="15" cy="19" r="1.2" fill={spot} /><circle cx="24" cy="17" r="1.2" fill={spot} /><circle cx="21" cy="26" r="1.2" fill={spot} /></>
)
const fishShape = (body: string) => (
  <><path d="M6 20c5-7 18-9 25 0-7 9-20 7-25 0z" fill={body} {...s} /><path d="M31 20l5-5v10z" fill={body} {...s} /><circle cx="12" cy="19" r="1.4" fill={O} /></>
)

const G: Record<GlyphKey, ReactNode> = {
  // meat, poultry, seafood
  steak: (<><path d="M8 18c0-6 7-10 15-9 7 1 11 6 10 12-1 7-8 11-15 10-6 0-10-6-10-13z" fill="#C2413A" {...s} /><path d="M14 16c4-2 9-2 13 1" stroke="#F4D6C8" strokeWidth="2.4" strokeLinecap="round" fill="none" /><circle cx="24" cy="23" r="3.4" fill="#F4D6C8" {...s} strokeWidth={1.4} /></>),
  mince: (<><path d="M6 26a14 9 0 0 1 28 0z" fill="#C2413A" {...s} />{[[12, 22], [17, 19], [22, 21], [27, 23], [19, 24]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r="2.2" fill="#E07A6E" />)}<path d="M5 26h30v3a3 3 0 0 1-3 3H8a3 3 0 0 1-3-3z" fill="#F2E5D3" {...s} /></>),
  ham: (<><path d="M9 14c6-6 18-6 23 2 3 6 0 14-8 16-8 2-17-2-18-9 0-3 1-6 3-9z" fill="#F4A3A0" {...s} /><path d="M12 20c5-3 12-3 17 1" stroke="#FFF9F2" strokeWidth="2" fill="none" strokeLinecap="round" /><circle cx="27" cy="16" r="2.6" fill="#FFF9F2" {...s} strokeWidth={1.3} /></>),
  sausage: (<><path d="M9 26c-3-3-1-8 3-8l15-6c5-2 9 4 5 8l-15 9c-3 1-6 0-8-3z" fill="#B5612A" {...s} /><path d="M14 21l12-5" stroke="#E7A65A" strokeWidth="1.8" strokeLinecap="round" /></>),
  chicken: (<><path d="M26 7c6 2 8 10 4 15-3 4-9 4-12 1l-6 6 1 3-3 1-1-3-3-1 1-3 3 1 6-6c-3-3-2-9 2-12 2-2 5-3 8-2z" fill="#E7A65A" {...s} /><path d="M25 12c2 1 3 3 2 5" stroke="#fff" strokeOpacity=".5" strokeWidth="2" fill="none" strokeLinecap="round" /></>),
  fish: fishShape('#7FB3C8'),
  salmon: (<><path d="M5 22c4-8 26-10 30-2-4 8-26 10-30 2z" fill="#F6875E" {...s} /><path d="M13 16l3 12m4-13l3 12m4-11l2 9" stroke="#FFFFFF" strokeOpacity=".8" strokeWidth="1.6" strokeLinecap="round" /></>),
  shrimp: (<><path d="M28 10c-9-2-18 3-18 12 0 6 5 10 11 10 3 0 5-2 5-4s-2-3-4-3c-3 0-5-2-5-5 0-4 5-6 10-5z" fill="#F7966A" {...s} /><path d="M15 17l4 2m-6 3l5 1m-4 4l4-1" stroke="#FFF9F2" strokeWidth="1.4" strokeLinecap="round" /><path d="M28 10l5-3m-5 3l6 1" {...s} fill="none" strokeWidth={1.3} /></>),
  // dairy and eggs
  milk: carton('#FFFFFF', '#FEB506'),
  plantmilk: carton('#F2E5D3', '#C99A5B'),
  cream: carton('#FFF9F2', '#E5332A'),
  cheese: (<><path d="M6 28l22-14 6 4v12H6z" fill="#FEB506" {...s} /><path d="M6 28h28" {...s} fill="none" /><circle cx="22" cy="24" r="2" fill="#E9A300" /><circle cx="15" cy="27" r="1.4" fill="#E9A300" /><circle cx="29" cy="23" r="1.4" fill="#E9A300" /></>),
  softcheese: (<><circle cx="20" cy="23" r="11" fill="#FFFFFF" {...s} /><path d="M14 19c2-2 5-3 8-2" stroke="#D9CCC3" strokeWidth="2" fill="none" strokeLinecap="round" /></>),
  butter: (<><path d="M5 30h30l-3 4H8z" fill="#F2E5D3" {...s} /><path d="M10 19l6-5h16v12H10z" fill="#FFD666" {...s} /><path d="M10 19h16v11M26 19l6-5" {...s} fill="none" /></>),
  yogurt: (<><path d="M10 14h20l-3 20H13z" fill="#FFFFFF" {...s} /><rect x="8" y="10" width="24" height="5" rx="2.5" fill="#E5332A" {...s} /><path d="M13 22h14" stroke="#FEB506" strokeWidth="3" /></>),
  eggs: (<><ellipse cx="15" cy="23" rx="7.5" ry="9.5" fill="#FFF9F2" {...s} /><ellipse cx="25" cy="25" rx="7.5" ry="9.5" fill="#F2E5D3" {...s} /></>),
  // vegetables
  tomato: (<><circle cx="20" cy="23" r="12" fill="#E5332A" {...s} /><path d="M20 11l-4-3m4 3l4-3m-4 3l-6 1m6-1l6 1m-6-1v-4" stroke="#3E8E4E" strokeWidth="2.2" strokeLinecap="round" /><ellipse cx="15" cy="19" rx="2.5" ry="1.6" fill="#fff" opacity=".55" /></>),
  onion: (<><path d="M20 8c-2 4-11 9-11 17a11 11 0 0 0 22 0c0-8-9-13-11-17z" fill="#B65A8E" {...s} /><path d="M20 12c-3 5-5 9-5 14m5-14c3 5 5 9 5 14" {...s} fill="none" strokeWidth={1.3} /></>),
  garlic: (<><path d="M20 8c0 4-10 8-10 16a10 10 0 0 0 20 0c0-8-10-12-10-16z" fill="#FFF9F2" {...s} /><path d="M20 14c-2 4-3 8-3 16m3-16c2 4 3 8 3 16" {...s} fill="none" strokeWidth={1.3} /></>),
  carrot: (<><path d="M27 13L8 34l2-8 13-17z" fill="#F07B22" {...s} /><path d="M25 11l4-6m-2 8l7-3m-6 1l5-5" stroke="#3E8E4E" strokeWidth="2.2" strokeLinecap="round" /></>),
  potato: tuber('#D9A35B', '#9A6A2E'),
  sweetpotato: tuber('#D9663B', '#8E3A1E'),
  pepper: (<><path d="M20 12c-6-3-13 0-13 9 0 8 4 14 8 14 2 0 3-1 5-1s3 1 5 1c4 0 8-6 8-14 0-9-7-12-13-9z" fill="#E5332A" {...s} /><path d="M20 12c0-3 1-5 4-6" stroke="#2F6B3A" strokeWidth="2.4" strokeLinecap="round" fill="none" /><path d="M14 18c-1 4-1 8 1 11" stroke="#fff" strokeOpacity=".4" strokeWidth="2" fill="none" strokeLinecap="round" /></>),
  chilli: chilliShape('#E5332A'),
  greenchilli: chilliShape('#4C9F59'),
  broccoli: (<><path d="M17 24h6l1 11h-8z" fill="#7DBB6B" {...s} /><circle cx="13" cy="20" r="6" fill="#3E8E4E" {...s} /><circle cx="27" cy="20" r="6" fill="#3E8E4E" {...s} /><circle cx="20" cy="14" r="7" fill="#4C9F59" {...s} /></>),
  leafy: (<><path d="M20 35C8 30 6 18 14 9c6 3 14 10 6 26z" fill="#3E8E4E" {...s} /><path d="M20 35c0-8-2-15-6-24" {...s} fill="none" strokeWidth={1.3} /><path d="M21 34c4-8 10-11 13-9-1 6-6 10-13 9z" fill="#5BAA5E" {...s} /></>),
  cabbage: (<><circle cx="20" cy="21" r="13" fill="#9CCB86" {...s} /><path d="M20 8c-5 5-5 21 0 26M20 8c5 5 5 21 0 26M8 18c6 2 18 2 24 0" {...s} fill="none" strokeWidth={1.3} /></>),
  cucumber: (<><rect x="6" y="14" width="28" height="12" rx="6" fill="#4C9F59" {...s} transform="rotate(-25 20 20)" /><path d="M12 22l2-1m5-2l2-1m5-2l2-1" stroke="#CFE8C6" strokeWidth="1.6" strokeLinecap="round" /></>),
  eggplant: (<><path d="M14 13c6-3 13 0 16 7 4 9-2 15-9 14-6-1-8-6-9-11-1-4-2-7 2-10z" fill="#6B3E7A" {...s} /><path d="M12 13c-2-3-1-6 2-7 1 3 3 4 6 4-2 2-5 3-8 3z" fill="#3E8E4E" {...s} /></>),
  mushroom: (<><path d="M5 20a15 11 0 0 1 30 0z" fill="#B97A4A" {...s} /><path d="M15 20h10l-1 12a4 4 0 0 1-8 0z" fill="#FFF9F2" {...s} /><circle cx="14" cy="15" r="1.6" fill="#F2E5D3" /><circle cx="24" cy="13" r="1.6" fill="#F2E5D3" /></>),
  corn: (<><path d="M20 6c6 0 8 8 8 15s-3 13-8 13-8-6-8-13 2-15 8-15z" fill="#FEC94A" {...s} /><path d="M16 14h8m-9 5h10m-10 5h10m-9 5h8" stroke="#E9A300" strokeWidth="1.4" /><path d="M12 22c-4 4-4 10 2 13M28 22c4 4 4 10-2 13" fill="#5BAA5E" {...s} strokeWidth={1.4} /></>),
  greenbeans: (<><path d="M8 30c8-2 14-10 18-22" stroke={O} strokeWidth="6" strokeLinecap="round" fill="none" /><path d="M8 30c8-2 14-10 18-22" stroke="#5BAA5E" strokeWidth="3.6" strokeLinecap="round" fill="none" /><path d="M15 34c8-2 14-10 18-22" stroke={O} strokeWidth="6" strokeLinecap="round" fill="none" /><path d="M15 34c8-2 14-10 18-22" stroke="#3E8E4E" strokeWidth="3.6" strokeLinecap="round" fill="none" /></>),
  scallion: (<><path d="M14 34V12M20 34V8M26 34V13" stroke="#3E8E4E" strokeWidth="4" strokeLinecap="round" /><path d="M11 30h18v5H11z" fill="#FFFFFF" {...s} /></>),
  ginger: (<path d="M7 24c0-4 4-6 8-5 1-4 6-6 9-3 3-3 9-1 9 4s-5 6-8 5c-1 4-6 6-9 3-3 2-9 1-9-4z" fill="#E7C27A" {...s} />),
  // fruit
  apple: (<><path d="M20 13c-4-3-12-2-12 7 0 8 5 14 9 14 1 0 2-1 3-1s2 1 3 1c4 0 9-6 9-14 0-9-8-10-12-7z" fill="#E5332A" {...s} /><path d="M20 13c0-3 1-5 3-6" {...s} fill="none" /><path d="M22 10c2-2 5-2 6 0-2 2-4 2-6 0z" fill="#3E8E4E" {...s} strokeWidth={1.3} /></>),
  banana: (<><path d="M8 14c2 12 12 18 24 14-1 4-6 7-12 7-8 0-14-8-14-19z" fill="#FEC94A" {...s} /><path d="M8 14l-1-4" {...s} /></>),
  lemon: (<><ellipse cx="20" cy="21" rx="12" ry="9" fill="#FEB506" {...s} transform="rotate(-20 20 21)" /><path d="M30 14l3-3M10 28l-2 2" {...s} /></>),
  lime: citrus('#7DBB4B'),
  orange: citrus('#F5A70D'),
  strawberry: (<><path d="M20 34c-8-4-13-12-11-18 2-4 8-4 11-3 3-1 9-1 11 3 2 6-3 14-11 18z" fill="#E5332A" {...s} /><path d="M12 13l4-4 4 3 4-3 4 4" fill="#3E8E4E" {...s} strokeWidth={1.4} />{[[15, 19], [20, 22], [25, 19], [18, 27], [23, 27]].map(([x, y], i) => <ellipse key={i} cx={x} cy={y} rx=".9" ry="1.3" fill="#FFE3A0" />)}</>),
  berries: (<>{[[14, 22], [24, 20], [19, 29], [27, 29]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r="5.5" fill="#4D5FA8" {...s} />)}<path d="M23 14l1-4" {...s} /></>),
  coconut: (<><path d="M6 22a14 12 0 0 0 28 0z" fill="#7A4A2A" {...s} /><path d="M9 22a11 8 0 0 0 22 0z" fill="#FFFFFF" {...s} strokeWidth={1.3} /></>),
  // grains, legumes, nuts
  bread: (<><path d="M8 20c0-7 5-10 12-10s12 3 12 10v12H8z" fill="#E7A65A" {...s} /><path d="M14 16l3 4m3-6l3 4m3-2l2 3" {...s} fill="none" strokeWidth={1.5} /></>),
  pasta: (<><path d="M8 14l9 6-9 6zM32 14l-9 6 9 6z" fill="#FEC94A" {...s} /><rect x="16" y="16" width="8" height="8" rx="3" fill="#F5B021" {...s} /></>),
  rice: (<><path d="M6 20h28a14 13 0 0 1-28 0z" fill="#E5332A" {...s} /><path d="M7 20c2-6 7-8 13-8s11 2 13 8" fill="#FFFFFF" {...s} /><path d="M14 16l1 1m5-2v1m5 0l-1 1" {...s} fill="none" strokeWidth={1.3} /></>),
  flour: (<><path d="M11 13c3-2 15-2 18 0l3 21H8z" fill="#F2E5D3" {...s} /><path d="M12 13l2-4h12l2 4" {...s} fill="#E8D5BC" /><path d="M16 23c2-2 6-2 8 0" {...s} fill="none" strokeWidth={1.4} /></>),
  beans: (<><circle cx="14" cy="24" r="6" fill="#E8C27E" {...s} /><circle cx="26" cy="24" r="6" fill="#E8C27E" {...s} /><circle cx="20" cy="15" r="6" fill="#F0CF92" {...s} /></>),
  tofu: (<><path d="M8 16l10-5 14 4v14l-10 5-14-4z" fill="#FFFFFF" {...s} /><path d="M8 16l14 4 10-5M22 20v14" {...s} fill="none" /></>),
  nut: (<><path d="M20 7c6 0 10 6 10 13s-4 13-10 13-10-6-10-13S14 7 20 7z" fill="#C9874B" {...s} /><path d="M20 10v20M15 14c2 2 2 10 0 13M25 14c-2 2-2 10 0 13" {...s} fill="none" strokeWidth={1.2} /></>),
  sesame: (<>{[[12, 16], [22, 13], [28, 22], [16, 26], [24, 30], [10, 30]].map(([x, y], i) => <ellipse key={i} cx={x} cy={y} rx="2.6" ry="4" fill="#F2E5D3" {...s} strokeWidth={1.3} transform={`rotate(${i * 35} ${x} ${y})`} />)}</>),
  // herbs, spices, pantry
  herb: (<><path d="M12 32C6 24 9 14 18 12c2 9 0 16-6 20z" fill="#2F7A3F" {...s} /><path d="M20 30c-1-9 4-16 13-15 1 9-5 14-13 15z" fill="#3E8E4E" {...s} /></>),
  spice: jar('#E5732A'),
  salt: (<><path d="M13 14h14l2 20H11z" fill="#FFFFFF" {...s} /><path d="M13 14c0-5 3-7 7-7s7 2 7 7z" fill="#D9CCC3" {...s} /><circle cx="18" cy="11" r=".9" fill={O} /><circle cx="22" cy="11" r=".9" fill={O} /></>),
  oil: bottle('#C8B23A', '#3E8E4E'),
  sauce: bottle('#B5332A', '#31170E'),
  stock: jar('#E7B074', '#3E8E4E'),
  sugar: (<><rect x="8" y="18" width="11" height="11" rx="2" fill="#FFFFFF" {...s} /><rect x="21" y="18" width="11" height="11" rx="2" fill="#FFFFFF" {...s} /><rect x="14" y="8" width="11" height="11" rx="2" fill="#FFF9F2" {...s} /></>),
  honey: (<><path d="M11 14h18v16a5 5 0 0 1-5 5h-8a5 5 0 0 1-5-5z" fill="#F5A70D" {...s} /><rect x="10" y="9" width="20" height="6" rx="2" fill="#E5332A" {...s} /><path d="M15 15v5a2 2 0 0 0 4 0v-5" fill="#F5A70D" {...s} /></>),
  chocolate: (<><rect x="9" y="8" width="22" height="26" rx="3" fill="#6B3A22" {...s} /><path d="M9 17h22M9 25h22M20 8v26" stroke="#8E5636" strokeWidth="1.6" /><path d="M9 26l10 8H9z" fill="#E5332A" {...s} strokeWidth={1.4} /></>),
  // drinks
  juice: carton('#FFB547', '#E5732A'),
  can: (<><rect x="12" y="7" width="16" height="27" rx="4" fill="#E5332A" {...s} /><path d="M12 12h16M12 29h16" {...s} fill="none" strokeWidth={1.4} /><path d="M16 18c2 2 6 2 8 0" stroke="#FFF9F2" strokeWidth="2" fill="none" strokeLinecap="round" /></>),
  water: bottle('#BFE0EE', '#3E7FA6', '#FFFFFF'),
  // neutral fallback: an empty plate with cutlery, never an unrelated food
  plate: (<><circle cx="20" cy="21" r="12" fill="#FFFFFF" {...s} /><circle cx="20" cy="21" r="7.5" fill="none" stroke="#E8D5BC" strokeWidth="1.6" /><path d="M5 12v6a2 2 0 0 0 2 2v12M35 12c-2 2-3 5-2 9h2v11" {...s} fill="none" strokeWidth={1.5} /></>),
}

const CATEGORY_TINT: Record<FoodCategory, string> = {
  meat: 'bg-peach', poultry: 'bg-peach', seafood: 'bg-peach', dairy: 'bg-sun-50', egg: 'bg-sun-50',
  vegetable: 'bg-leaf-50', fruit: 'bg-leaf-50', herb: 'bg-leaf-50', legume: 'bg-leaf-50',
  grain: 'bg-cream-50', nut: 'bg-cream-50', spice: 'bg-cream-50', sauce: 'bg-cream-50', sweet: 'bg-cream-50',
  drink: 'bg-cream-50', other: 'bg-cream-50',
}

// Draws one glyph on its own, without the tinted tile.
export function IngredientGlyph({ glyph, className }: { glyph: GlyphKey; className?: string }) {
  return <svg viewBox="0 0 40 40" className={className} aria-hidden>{G[glyph]}</svg>
}

/** Icon for any ingredient. `id` is the detector class when known (e.g. "ground_beef"). */
export function IngredientIcon({ name, id, size = 40, className }: { name: string; id?: string | null; size?: number; className?: string }) {
  const v = ingredientVisual(name, id)
  return (
    <span className={cx('inline-grid shrink-0 place-items-center rounded-2xl', CATEGORY_TINT[v.category], className)} style={{ width: size, height: size }}>
      <IngredientGlyph glyph={v.glyph} className="h-[78%] w-[78%]" />
    </span>
  )
}
