import { useId, type ReactNode } from 'react'
import type { DishArtKind, Recipe } from '../lib/types'
import { cx } from '../lib/format'

// Illustrated top-down dishes on a gingham placemat (inspired by the reference
// images' illustrated food). Pure SVG so it is crisp at any size.
const O = '#31170E'
const st = { stroke: O, strokeWidth: 2, strokeLinejoin: 'round' as const, strokeLinecap: 'round' as const }

function rng(seed: number) {
  let x = seed
  return () => { x = (x * 16807) % 2147483647; return (x - 1) / 2147483646 }
}
function scatter(n: number, r: number, seed: number, cx = 120, cy = 100) {
  const R = rng(seed)
  return Array.from({ length: n }, () => {
    const a = R() * Math.PI * 2, d = Math.sqrt(R()) * r
    return { x: cx + Math.cos(a) * d, y: cy + Math.sin(a) * d * 0.92, rot: R() * 360, k: R() }
  })
}

const MATS = {
  cream: ['#F2E5D3', '#E8D5BC'], sun: ['#FFE3A0', '#FED36B'], peach: ['#FFD9C7', '#FFC2A6'], leaf: ['#D6EBCF', '#B9DDB0'],
}

const leaf = (x: number, y: number, rot: number, c = '#3E8E4E', s = 1) => (
  <g transform={`translate(${x} ${y}) rotate(${rot}) scale(${s})`}>
    <path d="M0 -12C9 -8 10 6 0 12C-10 6 -9 -8 0 -12z" fill={c} {...st} strokeWidth={1.6} />
    <path d="M0 -10V10" stroke={O} strokeWidth="1.2" />
  </g>
)
const tomatoSlice = (x: number, y: number, r = 11) => (
  <g transform={`translate(${x} ${y})`}>
    <circle r={r} fill="#E5332A" {...st} strokeWidth={1.6} />
    <circle r={r * 0.68} fill="#F2564C" />
    {[0, 72, 144, 216, 288].map((a) => <ellipse key={a} cx={Math.cos(a * Math.PI / 180) * r * 0.4} cy={Math.sin(a * Math.PI / 180) * r * 0.4} rx="1.6" ry="2.4" fill="#FFE3A0" transform={`rotate(${a + 90} ${Math.cos(a * Math.PI / 180) * r * 0.4} ${Math.sin(a * Math.PI / 180) * r * 0.4})`} />)}
  </g>
)
const egg = (x: number, y: number, s = 1) => (
  <g transform={`translate(${x} ${y}) scale(${s})`}>
    <path d="M-16 -2C-18 -14 -4 -18 4 -15C14 -13 19 -4 16 6C13 15 -2 17 -10 12C-15 9 -15 4 -16 -2z" fill="#FFFFFF" {...st} strokeWidth={1.6} />
    <circle cx="1" cy="-1" r="7.5" fill="#FEB506" {...st} strokeWidth={1.5} />
    <circle cx="-1.5" cy="-3.5" r="2.2" fill="#FFF6DC" />
  </g>
)
const plate = (children: ReactNode, rim = '#F2E5D3') => (
  <>
    <ellipse cx="124" cy="110" rx="80" ry="74" fill={O} opacity=".12" />
    <circle cx="120" cy="100" r="78" fill="#FFFFFF" {...st} />
    <circle cx="120" cy="100" r="62" fill="#FFFFFF" stroke={rim} strokeWidth="3" />
    {children}
  </>
)
const bowl = (children: ReactNode, outer = '#E5332A', inner = '#FFF9F2') => (
  <>
    <ellipse cx="124" cy="110" rx="76" ry="70" fill={O} opacity=".12" />
    <circle cx="120" cy="100" r="74" fill={outer} {...st} />
    <path d="M70 60a66 66 0 0 1 40-24" stroke="#fff" strokeOpacity=".35" strokeWidth="6" strokeLinecap="round" fill="none" />
    <circle cx="120" cy="100" r="60" fill={inner} {...st} />
    {children}
  </>
)

const DISHES: Record<DishArtKind, () => ReactNode> = {
  omelette: () => plate(<>
    <path d="M60 104C62 66 104 48 140 54C172 60 186 86 180 106C150 124 92 126 60 104z" fill="#FFD255" {...st} />
    <path d="M60 104C92 126 150 124 180 106" stroke={O} strokeWidth="2" fill="none" />
    {scatter(7, 34, 3, 120, 82).map((p, i) => <circle key={i} cx={p.x} cy={p.y} r={3 + p.k * 3} fill="#F1B33A" opacity=".7" />)}
    {leaf(78, 112, -60, '#3E8E4E', 0.9)}{leaf(100, 120, -80, '#4C9F59', 0.85)}{leaf(150, 119, 80, '#3E8E4E', 0.9)}
    <path d="M124 116c4 10 10 12 14 8M110 118c2 8 0 12-4 12" stroke="#FEB506" strokeWidth="6" strokeLinecap="round" fill="none" />
    {scatter(8, 26, 9, 126, 80).map((p, i) => <rect key={i} x={p.x} y={p.y} width="5" height="5" rx="1.5" fill="#3E8E4E" transform={`rotate(${p.rot} ${p.x} ${p.y})`} />)}
  </>),
  pasta: () => plate(<>
    <path d="M72 96c0-28 26-46 50-44s46 18 46 44-20 44-48 44-48-16-48-44z" fill="#F07A4A" {...st} />
    {scatter(18, 40, 5).map((p, i) => (
      <g key={i} transform={`translate(${p.x} ${p.y}) rotate(${p.rot})`}>
        <rect x="-11" y="-5" width="22" height="10" rx="4" fill="#FFC75A" {...st} strokeWidth={1.4} />
        <path d="M-6 -5l-3 10M0 -5l-3 10M6 -5l-3 10" stroke="#E9A300" strokeWidth="1.2" />
      </g>
    ))}
    {leaf(96, 86, 30, '#3E8E4E', 0.8)}{leaf(142, 118, -40, '#4C9F59', 0.8)}{leaf(150, 76, 70, '#2F7A3F', 0.7)}
    {scatter(10, 38, 21).map((p, i) => <path key={i} d={`M${p.x} ${p.y}l6 -3`} stroke="#FFF6DC" strokeWidth="3" strokeLinecap="round" />)}
  </>),
  shakshuka: () => (<>
    <rect x="186" y="88" width="50" height="18" rx="9" fill="#31170E" />
    <ellipse cx="124" cy="110" rx="80" ry="74" fill={O} opacity=".12" />
    <circle cx="120" cy="100" r="76" fill="#3A2A24" {...st} />
    <circle cx="120" cy="100" r="64" fill="#D8352B" stroke={O} strokeWidth="2" />
    {scatter(12, 52, 7).map((p, i) => <path key={i} d={`M${p.x} ${p.y}q6 -6 12 0`} stroke={i % 2 ? '#3E8E4E' : '#FEB506'} strokeWidth="4" strokeLinecap="round" fill="none" transform={`rotate(${p.rot} ${p.x} ${p.y})`} />)}
    {egg(92, 76)}{egg(150, 80, 0.95)}{egg(96, 130, 0.95)}{egg(148, 128)}
    {scatter(16, 58, 13).map((p, i) => <circle key={i} cx={p.x} cy={p.y} r="1.6" fill="#2F7A3F" />)}
  </>),
  friedrice: () => bowl(<>
    {scatter(90, 52, 11).map((p, i) => <ellipse key={i} cx={p.x} cy={p.y} rx="4.2" ry="2.2" fill={i % 9 === 0 ? '#F5E6C8' : '#FFFFFF'} stroke="#E8D5BC" strokeWidth=".8" transform={`rotate(${p.rot} ${p.x} ${p.y})`} />)}
    {scatter(10, 44, 4).map((p, i) => <path key={i} d={`M${p.x - 6} ${p.y}c2-6 10-6 12 0-3 4-9 4-12 0z`} fill="#FFD255" {...st} strokeWidth={1.2} />)}
    {scatter(12, 46, 8).map((p, i) => <rect key={i} x={p.x} y={p.y} width="6" height="6" rx="1.5" fill={i % 2 ? '#3E8E4E' : '#E5332A'} {...st} strokeWidth={1} />)}
    {scatter(10, 40, 17).map((p, i) => <circle key={i} cx={p.x} cy={p.y} r="3.2" fill="none" stroke="#5BAA5E" strokeWidth="2.2" />)}
  </>, '#E5332A'),
  'curry-green': () => bowl(<>
    <circle cx="120" cy="100" r="56" fill="#4F8F3B" />
    {scatter(9, 38, 2).map((p, i) => <rect key={i} x={p.x - 9} y={p.y - 7} width="18" height="14" rx="6" fill="#E7B074" {...st} strokeWidth={1.5} transform={`rotate(${p.rot} ${p.x} ${p.y})`} />)}
    <path d="M96 96c10-14 30-14 40 0s-14 20-22 12" stroke="#FFF9F2" strokeWidth="6" strokeLinecap="round" fill="none" />
    {scatter(18, 48, 19).map((p, i) => <circle key={i} cx={p.x} cy={p.y} r="1.6" fill="#C24A1E" />)}
  </>, '#F2E5D3', '#FFF9F2'),
  'curry-orange': () => bowl(<>
    <circle cx="120" cy="100" r="56" fill="#E8792F" />
    {scatter(18, 40, 6).map((p, i) => <circle key={i} cx={p.x} cy={p.y} r="6" fill="#F0CF92" {...st} strokeWidth={1.4} />)}
    {leaf(98, 120, -30, '#3E8E4E', 0.9)}{leaf(144, 80, 50, '#3E8E4E', 0.9)}{leaf(150, 120, 120, '#2F7A3F', 0.8)}
    <path d="M100 86c12-10 30-6 34 4" stroke="#FFF9F2" strokeWidth="6" strokeLinecap="round" fill="none" />
  </>, '#3E8E4E'),
  toast: () => (<>
    <ellipse cx="124" cy="112" rx="96" ry="64" fill={O} opacity=".12" />
    <rect x="22" y="44" width="196" height="120" rx="26" fill="#C9874B" {...st} />
    <path d="M40 70h150M40 110h160M40 140h120" stroke="#B57339" strokeWidth="3" strokeLinecap="round" />
    {[[78, 100, -8], [160, 104, 10]].map(([x, y, r], i) => (
      <g key={i} transform={`translate(${x} ${y}) rotate(${r})`}>
        <path d="M-40 -30c0-14 16-18 22-14 6-6 30-6 36 0 8-4 22 2 22 14v52c0 6-4 10-10 10h-60c-6 0-10-4-10-10z" fill="#E7A65A" {...st} />
        <path d="M-32 -22c0-6 10-10 16-6 6-4 24-4 30 0 6-2 14 2 14 8v38h-60z" fill="#FFD255" stroke="#F1B33A" strokeWidth="2" />
        {scatter(8, 20, 30 + i, 0, 2).map((p, j) => <rect key={j} x={p.x - 5} y={p.y - 4} width="10" height="9" rx="2.5" fill="#E5332A" {...st} strokeWidth={1.2} />)}
        {leaf(-12, -6, 40, '#2F7A3F', 0.65)}
      </g>
    ))}
  </>),
  stirfry: () => bowl(<>
    {scatter(70, 54, 31).map((p, i) => <ellipse key={i} cx={p.x} cy={p.y} rx="4" ry="2" fill="#FFFFFF" stroke="#E8D5BC" strokeWidth=".8" transform={`rotate(${p.rot} ${p.x} ${p.y})`} />)}
    <path d="M78 86c10-26 64-34 84-6 10 18-4 44-40 46-30 1-52-16-44-40z" fill="#9A4A1E" opacity=".9" />
    {scatter(10, 30, 12, 122, 96).map((p, i) => <rect key={i} x={p.x - 10} y={p.y - 6} width="20" height="12" rx="5" fill="#B5612A" {...st} strokeWidth={1.5} transform={`rotate(${p.rot} ${p.x} ${p.y})`} />)}
    {scatter(9, 34, 14, 122, 96).map((p, i) => <path key={i} d={`M${p.x - 8} ${p.y}q8 -8 16 0`} stroke={i % 2 ? '#3E8E4E' : '#E5332A'} strokeWidth="5" strokeLinecap="round" fill="none" transform={`rotate(${p.rot} ${p.x} ${p.y})`} />)}
    {scatter(24, 36, 18, 122, 96).map((p, i) => <ellipse key={i} cx={p.x} cy={p.y} rx="1.6" ry="2.4" fill="#FFF6DC" />)}
  </>, '#31170E', '#FFF9F2'),
  bowl: () => bowl(<>
    <path d="M120 100L120 40A60 60 0 0 1 172 130z" fill="#3E8E4E" />
    {scatter(7, 22, 41, 140, 80).map((p, i) => <g key={i}>{leaf(p.x, p.y, p.rot, i % 2 ? '#4C9F59' : '#2F7A3F', 0.9)}</g>)}
    {[0, 1, 2, 3].map((i) => <rect key={i} x={70 + i * 10} y={66 + i * 6} width="34" height="12" rx="6" fill="#E7B074" {...st} strokeWidth={1.4} transform={`rotate(${-30 + i * 6} 90 80)`} />)}
    {tomatoSlice(92, 132, 11)}{tomatoSlice(118, 142, 10)}{tomatoSlice(146, 146, 9)}
    {[[76, 112], [68, 98]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r="8" fill="none" stroke="#B65A8E" strokeWidth="3" />)}
    <circle cx="120" cy="102" r="14" fill="#FFFFFF" {...st} strokeWidth={1.6} />
    <path d="M114 100c4-4 10-2 10 2" stroke="#FEB506" strokeWidth="2.5" fill="none" strokeLinecap="round" />
  </>, '#F2E5D3'),
  pancakes: () => plate(<>
    {[0, 1, 2].map((i) => <circle key={i} cx={120 + i * 3} cy={104 - i * 6} r={52 - i * 2} fill={i === 2 ? '#F2B55A' : '#D9913E'} {...st} />)}
    <circle cx="126" cy="92" r="34" fill="#F5C26B" opacity=".6" />
    <path d="M96 78c14-10 40-8 52 6 6 10-2 18-10 14-6-3-6 10-14 10s-6-12-14-10-20-10-14-20z" fill="#F5A70D" opacity=".9" stroke="#C26A1B" strokeWidth="1.5" />
    <rect x="114" y="76" width="22" height="16" rx="4" fill="#FFE07A" {...st} strokeWidth={1.6} transform="rotate(-12 125 84)" />
    <circle cx="160" cy="134" r="7" fill="#E5332A" {...st} strokeWidth={1.4} /><circle cx="148" cy="144" r="6" fill="#C9261E" {...st} strokeWidth={1.4} />
    {leaf(172, 124, 40, '#3E8E4E', 0.6)}
  </>),
  soup: () => (<>
    <ellipse cx="104" cy="110" rx="70" ry="66" fill={O} opacity=".12" />
    <circle cx="100" cy="100" r="66" fill="#FFF9F2" {...st} />
    <circle cx="100" cy="100" r="52" fill="#E54A2A" {...st} />
    <path d="M76 92c12-14 34-14 44 0s-12 22-22 12" stroke="#FFF9F2" strokeWidth="5" strokeLinecap="round" fill="none" />
    {leaf(118, 116, 30, '#3E8E4E', 0.8)}
    {scatter(14, 40, 51, 100, 100).map((p, i) => <circle key={i} cx={p.x} cy={p.y} r="1.5" fill={O} opacity=".6" />)}
    <g transform="translate(186 120) rotate(14)">
      <path d="M-30 30L0 -34 30 30z" fill="#E7A65A" {...st} />
      <path d="M-22 22L0 -24 22 22z" fill="#FFD255" />
      <path d="M-30 30L0 -34 30 30" fill="none" {...st} />
    </g>
  </>),
  spaghetti: () => plate(<>
    {scatter(26, 34, 61).map((p, i) => <path key={i} d={`M${p.x - 24} ${p.y}c10 ${-14 + p.k * 8} 30 ${12 - p.k * 10} 46 ${-4}`} stroke={i % 3 ? '#FFC75A' : '#F5B021'} strokeWidth="4.5" strokeLinecap="round" fill="none" />)}
    {scatter(22, 34, 63).map((p, i) => <path key={i} d={`M${p.x - 20} ${p.y}c10 ${10 - p.k * 8} 26 ${-12 + p.k * 10} 40 ${2}`} stroke="#E9A300" strokeWidth="1.4" fill="none" opacity=".5" />)}
    {scatter(10, 36, 65).map((p, i) => <path key={i} d={`M${p.x - 7} ${p.y}a7 7 0 0 1 14 0z`} fill="#E5332A" {...st} strokeWidth={1.4} transform={`rotate(${p.rot} ${p.x} ${p.y})`} />)}
    {leaf(104, 90, 20, '#2F7A3F', 0.9)}{leaf(118, 96, -30, '#3E8E4E', 0.9)}
    {scatter(14, 40, 67).map((p, i) => <ellipse key={i} cx={p.x} cy={p.y} rx="3" ry="2" fill="#FFF6DC" stroke="#E8D5BC" strokeWidth=".8" />)}
  </>),
}

export function DishArt({ recipe, className, mat = true }: { recipe: Pick<Recipe, 'art' | 'mat' | 'title'>; className?: string; mat?: boolean }) {
  const id = useId().replace(/:/g, '')
  const [a, b] = MATS[recipe.mat]
  return (
    <svg viewBox="0 0 240 200" className={cx('block', className)} role="img" aria-label={`Illustration of ${recipe.title}`}>
      <defs>
        <pattern id={`g${id}`} width="24" height="24" patternUnits="userSpaceOnUse" patternTransform="rotate(-8)">
          <rect width="24" height="24" fill={a} />
          <rect width="12" height="24" fill={b} opacity=".55" />
          <rect width="24" height="12" fill={b} opacity=".55" />
        </pattern>
      </defs>
      {mat && <rect x="14" y="18" width="212" height="166" rx="28" fill={`url(#g${id})`} transform="rotate(-8 120 100)" />}
      {DISHES[recipe.art]()}
    </svg>
  )
}
