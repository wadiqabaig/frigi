# Frigi app

Expo (React Native) app for iPhone, Android and the web. This is a working skeleton: every screen calls the real API, and the styling is deliberately plain so it can be redesigned.

## Run it

Needs Node.js 20 or newer.

```bash
cd app
npm install
cp .env.example .env
npx expo start
```

- Press **w** to open it in a web browser.
- On an iPhone, install **Expo Go** from the App Store and scan the QR code.

To work on screens without the server, set `EXPO_PUBLIC_USE_MOCK=true` in `app/.env`; the app then uses fake data from `src/api/mock.ts`. Restart `npx expo start` after changing `.env`.

## Screens (`src/app/`)

| File | Screen | Requirement |
|---|---|---|
| `index.tsx` | Welcome; sends logged-in users to Home | |
| `signup.tsx`, `login.tsx` | Create account (allergies, diet, household as tick-boxes), log in | FR1 |
| `profile.tsx` | Edit allergies, diet, household; log out | FR1 |
| `home.tsx` | Take or choose 1 to 3 fridge photos, then detect | FR2, FR3 |
| `confirm.tsx` | Untick wrong items, answer "Do you also have…", add missed items | FR4, FR5 |
| `chef.tsx` | Chef questions one at a time with tap-to-answer buttons | FR6 |
| `options.tsx` | 3 recipe ideas, and how many the safety filter hid | FR7, FR10 |
| `recipe.tsx` | Full recipe, servings − / +, tap a 🛒 item for swaps | FR8, FR9 |

## Where things live

| Path | Purpose |
|---|---|
| `src/api/client.ts` | The only place that talks to the backend; reads `EXPO_PUBLIC_API_URL` and `EXPO_PUBLIC_USE_MOCK` |
| `src/api/types.ts` | Request and response types from `docs/api-contract.md` |
| `src/api/mock.ts` | Fake data for mock mode |
| `src/state/session.tsx` | Logged-in user, saved token, and the current photo → recipe journey |
| `src/components/ui.tsx` | Colours and basic components (Button, Chip, Card, Field). Restyle here first |
| `assets/illustrations/` | Frigi illustrations used on the screens |

## Before committing

```bash
npx tsc --noEmit
```
