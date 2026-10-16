import { SAMPLE_DETECTIONS } from '../lib/data/scenarios'
import { IngredientGlyph } from './IngredientIcon'

// An illustrated "fridge photo" for demo mode. Item positions are the mock
// detection boxes, so the overlay lines up exactly.
const W = 400, H = 500
const COPIES: Record<string, number> = { eggs: 4, tomato: 3, onion: 2, spinach: 3, chicken: 2 }

export function FridgeSample({ className }: { className?: string }) {
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className={className} role="img" aria-label="Sample fridge photo with milk, cheese, eggs, vegetables and more">
      <defs>
        <linearGradient id="fr-bg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#FFFDF8" />
          <stop offset="1" stopColor="#F3EADF" />
        </linearGradient>
        <radialGradient id="fr-light" cx=".5" cy="0" r=".9">
          <stop offset="0" stopColor="#FFF6DC" />
          <stop offset="1" stopColor="#FFF6DC" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width={W} height={H} fill="url(#fr-bg)" />
      <rect width={W} height={H} fill="url(#fr-light)" />
      {[0.345, 0.535, 0.745].map((y) => (
        <g key={y}>
          <rect x="0" y={y * H} width={W} height="9" fill="#E3EEF2" />
          <rect x="0" y={y * H + 9} width={W} height="4" fill="#C9D8DE" opacity=".6" />
        </g>
      ))}
      <rect x="0" y={0.745 * H + 13} width={W} height={H} fill="#EDE3D6" opacity=".55" />
      {SAMPLE_DETECTIONS.map((d) => {
        const [x, y, w, h] = d.box
        const n = COPIES[d.ingredientId] ?? 1
        const size = Math.min((w * W) / n * 1.15, h * H * 1.05)
        return (
          <g key={d.ingredientId}>
            {Array.from({ length: n }, (_, i) => (
              <svg key={i} x={x * W + (w * W - size * n / 1.15) / 2 + i * (size / 1.15)} y={y * H + h * H - size} width={size} height={size} viewBox="0 0 40 40">
                <IngredientGlyph id={d.ingredientId} />
              </svg>
            ))}
          </g>
        )
      })}
      <rect x="4" y="4" width={W - 8} height={H - 8} rx="18" fill="none" stroke="#E3D6C6" strokeWidth="8" />
    </svg>
  )
}
