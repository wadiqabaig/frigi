# Frigi — web app

AI fridge-to-recipe assistant. React + TypeScript + Tailwind CSS + Framer Motion (Vite).
It talks to the Frigi FastAPI backend in `backend/`; endpoints follow `docs/api-contract.md`.

```bash
cp .env.example .env.local   # set VITE_API_BASE_URL
npm install
npm run dev                  # local development
npm run build                # single self-contained dist/index.html
```

The backend must be running (see `backend/README.md`), for example at `http://localhost:8000`.
There is no offline or demo mode: every screen shows real data, or a loading, empty or
unavailable state.

## Backend integration

All network access goes through `src/lib/api/`:

| File | Purpose |
| --- | --- |
| `index.ts` | The `api` object every screen uses, plus mapping from wire shapes to UI types |
| `http.ts` | `fetch` wrapper: base URL, bearer token, timeouts, cancellation, `ApiError`, 401 handling |
| `dto.ts` | Request and response shapes copied from `docs/api-contract.md` |
| `ingredientSearch.ts` | Matching and ranking for ingredient autocomplete |

Spoonacular and Gemini keys never reach the browser; those services are only called by the backend.

See [`docs/INTEGRATION.md`](docs/INTEGRATION.md) for the endpoint map, what still needs a
backend endpoint, and what is stored in the browser.

## Structure
```
src/
  assets/        Frigi logo, mascot scenes (background removed), icons
  components/    ui primitives, Shell, IngredientIcon, IngredientSearch, RecipeCard, RecipeImage…
  hooks/         useDebouncedValue
  lib/           api/ (backend client), types, vocab, storage, format, text, ingredientVisual, config
  screens/       Welcome, Auth, Home, Upload, Scanning, Ingredients, Chef, Recipes, RecipeDetail, Cook, Saved/Profile, States
  state/         AppState.tsx (navigation, session, per-user state)
```
