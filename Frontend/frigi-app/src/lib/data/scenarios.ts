import type { Detection, ScenarioId } from '../types'

// Mock RF-DETR Small detections. Boxes match the illustrated sample fridge
// (components/FridgeSample.tsx) so the overlay lines up on the demo photo.
// On a user's own photo the same boxes are drawn and clearly labelled "simulated".
export const SAMPLE_DETECTIONS: Omit<Detection, 'imageIndex'>[] = [
  { ingredientId: 'milk', confidence: 0.97, box: [0.08, 0.07, 0.17, 0.25] },
  { ingredientId: 'yogurt', confidence: 0.83, box: [0.3, 0.17, 0.17, 0.15] },
  { ingredientId: 'cheddar', confidence: 0.91, box: [0.52, 0.2, 0.2, 0.12] },
  { ingredientId: 'eggs', confidence: 0.96, box: [0.08, 0.385, 0.42, 0.11] },
  { ingredientId: 'chicken', confidence: 0.88, box: [0.55, 0.38, 0.36, 0.12] },
  { ingredientId: 'tomato', confidence: 0.94, box: [0.07, 0.58, 0.3, 0.13] },
  { ingredientId: 'pepper', confidence: 0.86, box: [0.4, 0.57, 0.15, 0.14] },
  { ingredientId: 'onion', confidence: 0.79, box: [0.6, 0.6, 0.3, 0.11] },
  { ingredientId: 'spinach', confidence: 0.9, box: [0.07, 0.78, 0.38, 0.14] },
  { ingredientId: 'bread', confidence: 0.84, box: [0.5, 0.78, 0.25, 0.14] },
  { ingredientId: 'pasta', confidence: 0.72, box: [0.78, 0.76, 0.14, 0.16] },
]

/** Spread detections across 1–3 photos, with deliberate overlap to show de-duplication. */
export function mockDetections(scenario: ScenarioId, photoCount: number): Detection[] {
  if (scenario === 'empty') return []
  const n = Math.max(1, Math.min(3, photoCount))
  const out: Detection[] = []
  SAMPLE_DETECTIONS.forEach((d, i) => {
    out.push({ ...d, imageIndex: n === 1 ? 0 : i % n })
    // overlap: eggs, tomato and milk also seen in the second photo
    if (n > 1 && ['eggs', 'tomato', 'milk'].includes(d.ingredientId) && i % n !== 1)
      out.push({ ...d, confidence: d.confidence - 0.06, imageIndex: 1 })
  })
  return out
}

export const SCENARIOS: { id: ScenarioId; label: string; hint: string }[] = [
  { id: 'success', label: 'Successful fridge scan', hint: 'The happy path, with 11 ingredients found.' },
  { id: 'empty', label: 'No ingredients detected', hint: 'The scan returns nothing.' },
  { id: 'allergy', label: 'Allergy restriction', hint: 'Adds a dairy allergy so conflicting recipes are hidden.' },
  { id: 'nomatch', label: 'No matching recipes', hint: 'Recommendations come back empty.' },
  { id: 'server', label: 'Server unavailable', hint: 'Scanning fails as if the AI service is busy.' },
  { id: 'expired', label: 'Session expired', hint: 'The next protected screen asks you to sign in again.' },
]
