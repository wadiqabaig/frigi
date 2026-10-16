# Frigi — web app (demo)

AI fridge-to-recipe assistant. React + TypeScript + Tailwind CSS + Framer Motion (Vite).

```bash
npm install
npm run dev        # local development
npm run build      # single self-contained dist/index.html
```

## Demo mode
Everything runs in the browser with mock data. On the welcome screen press **Explore Demo**
to enter as guest "Alex". The flask button (top-right on phones, sidebar on desktop) opens the
**Demo menu**: scenario selector (successful scan, no ingredients, allergy restriction, no matching
recipes, server unavailable, session expired), a gallery of every error/empty state, and a reset.

## Backend integration
All network access lives in `src/lib/api.ts`:

```ts
export const USE_MOCK_API = true   // flip to false for the real backend
export const API_BASE_URL = 'http://localhost:8000'
```

`docs/api-contract.md` was not available while building, so the real-mode functions are
**adapter placeholders** (marked in comments). Replace each one's path/payload with the documented
shape; the UI only consumes the typed results in `src/lib/types.ts`, so no screen needs rewriting.

| UI need | Function | Backend |
| --- | --- | --- |
| Sign up / log in | `api.signUp`, `api.logIn` | existing auth |
| Save profile | `api.saveProfile` | existing |
| Ingredient detection | `api.scanFridge` | existing, RF-DETR Small |
| Confirm inventory | `api.confirmIngredients` | TBD |
| Recommendations | `api.recommendations` | planned, Spoonacular |
| Recipe details | `api.recipe` | planned, Spoonacular |
| Substitutions | `api.substitutes` | TBD |
| Chef chat | `api.chefReply` | planned, Gemini |

Mock auth stores only a salted PBKDF2-SHA-256 hash in localStorage, never the password.
Allergy/diet screening in the demo is illustrative and not a medical guarantee.

## Structure
```
src/
  assets/        supplied Frigi logo, mascot scenes (background removed), icons
  components/    ui primitives, Shell (sidebar/bottom nav), DishArt, IngredientIcon, RecipeCard…
  lib/           api.ts (mock/real switch), types, recommend.ts, auth.ts, data/ (recipes, ingredients, swaps, scenarios)
  screens/       Welcome, Auth, Home, Upload, Scanning, Ingredients, Chef, Recipes, RecipeDetail, Cook, Saved/Profile, States
  state/         AppState.tsx (navigation + app state, persisted where useful)
```
