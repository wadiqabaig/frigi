# Frontend ↔ backend integration

Status of the web app against `docs/api-contract.md` (v1.0) and the code in `backend/app`.

## Configuration

| Variable | Default | Notes |
| --- | --- | --- |
| `VITE_API_BASE_URL` | `http://localhost:8000` | Set in `.env.local`. Deployed: `https://frigi-app.duckdns.org` |

No third-party keys are used by the frontend. Spoonacular and Gemini are reached only through the backend.

## Connected endpoints

| Screen / feature | Endpoint | Client function |
| --- | --- | --- |
| Sign up | `POST /auth/signup` | `api.signUp` |
| Log in | `POST /auth/login` | `api.logIn` |
| Load profile (start-up, after log-in) | `GET /profile` | `api.getProfile` |
| Edit preferences | `PUT /profile` (changed fields only) | `api.updateProfile` |
| Ingredient autocomplete, staples | `GET /ingredients` | `api.searchIngredients`, `api.staples` |
| Fridge scan | `POST /detect` (field `photos`, 1–3 files) | `api.detect` |
| Chef questions | `GET /chef/questions` | `api.chefQuestions` |
| Chef recommendations | `POST /chef/options` | `api.recipeOptions` |
| Recipe search (interim, see below) | `POST /chef/options` | `api.searchRecipes` |
| Full recipe, servings scaling | `POST /chef/recipe` | `api.recipe` |
| Ingredient swaps | `POST /chef/swap` | `api.swaps` |

Errors use the contract's `{ "error": { "code", "message" } }` shape. `message` is shown to the user as is.
A `401` on any request that sends a token ends the session and shows "Your session has expired".

## Missing backend dependencies

These features work in the UI but are limited until the backend adds an endpoint. Each needs a contract
change first (the contract says to update `docs/api-contract.md` in a pull request before changing code).

1. **Ingredient search beyond the 42 detector classes.** Autocomplete searches `GET /ingredients`
   (42 classes and the staples). Anything else, like "lamb", can be added by hand as `{"id": null, "name": "lamb"}`,
   which the contract already allows. *Proposed:* `GET /ingredients/search?q=&offset=&limit=` that proxies
   Spoonacular's ingredient autocomplete. Only the body of `api.searchIngredients` changes; the UI already
   supports pages and "Show more".
2. **Recipe search by dish, ingredient or cuisine.** There is no search endpoint, so `api.searchRecipes(term)`
   calls `POST /chef/options` with the term as the only ingredient (Spoonacular `includeIngredients`) and as
   the chef's `note`. Ingredient searches like "beef" return Spoonacular recipes; dish names like "biryani" usually
   fall back to Gemini-written recipes (marked "Written by Chef Frigi"). Results are capped at the chef's
   3 options, and all pass the safety filter. *Proposed:* `GET /recipes/search?q=&cuisine=&offset=&limit=`
   returning the `options` shape plus `removed_by_safety_filter`.
3. **Saved recipes.** No endpoint exists, so saved recipes are full snapshots stored on the device, per user
   (`frigi.v2.saved.<userId>`). A snapshot can't be rescaled after its option expires (2 hours on the backend).
   *Proposed:* `GET/POST/DELETE /saved`.
4. **Fridge inventory.** The contract keeps the confirmed list in the app and sends it with each chef request.
   It is stored per user on the device (`frigi.v2.inventory.<userId>`), so it does not follow the user to
   another device.
5. **Free-text chat with the chef.** There is no chat endpoint. Typed text that answers the current question
   is used as that answer; anything else becomes the `answers.note` sent to `/chef/options` (max 200 characters).
   The app never invents a chef reply.
6. **Log-out.** Tokens are stateless JWTs with no revoke endpoint, so log-out clears the token on the device.
7. **Halal verification.** The backend screens halal recipes by keyword (pork, alcohol, gelatine). It can't
   verify how meat was sourced or slaughtered, and the UI says so wherever halal applies.

## Browser storage

| Key | Storage | Contents | Cleared |
| --- | --- | --- | --- |
| `frigi.v2.auth` | local | Token and `{id, name, email}` | Log-out, `401`, expired token at start-up |
| `frigi.v2.inventory.<userId>` | local | Confirmed ingredient list | Never automatically |
| `frigi.v2.saved.<userId>` | local | Saved recipe snapshots | Never automatically |
| `frigi.v2.chef.<userId>` | session | Last chef answers and options (ignored after 2 hours) | Log-out, tab close |
| `frigi.v2.recipes.<userId>` | session | Recipes opened this session, for cooking mode | Log-out, tab close |

### Old demo data

The previous in-browser demo wrote `frigi.session`, `frigi.profile`, `frigi.inventory`, `frigi.prefs`,
`frigi.saved`, `frigi.subs` and `frigi.users` (local mock accounts with password hashes). `removeLegacyDemoData()`
in `src/lib/storage.ts` deletes exactly these keys on every start, so they can't come back after a refresh.
No other keys are touched.
