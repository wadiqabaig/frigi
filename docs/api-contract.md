# Frigi API contract

Version 1.0 — 13 Oct 2026. This is the agreement between the website (`Frontend/frigi-app/`) and the backend (`backend/`). If either side needs a change, update this file in a Pull Request first, then change the code.

## Basics

| Item | Value |
|---|---|
| Base URL (local) | `http://localhost:8000` |
| Base URL (AWS) | Added here once deployed |
| Format | JSON, except `/detect`, which takes image uploads (`multipart/form-data`) |
| Auth | After log-in, send `Authorization: Bearer <token>` on every request marked **(login required)** |
| Interactive docs | FastAPI generates them at `/docs` once the server runs |

### Errors

Every error uses the same shape, so the app can show one error screen:

```json
{ "error": { "code": "TOO_MANY_PHOTOS", "message": "Please upload between 1 and 3 photos." } }
```

| HTTP status | When |
|---|---|
| 400 | Bad input (wrong file type, missing field, too many photos) |
| 401 | Missing or expired token |
| 404 | Unknown recipe or option id |
| 409 | Email already registered |
| 422 | `UNSAFE_RECIPE`: the full recipe failed the safety filter; ask the user to pick another option |
| 502 | `CHEF_UNAVAILABLE` (Gemini or Spoonacular failed) or `NO_SAFE_RECIPES` (nothing safe found); the app should offer "Try again" |

`message` is always safe to show to the user.

### Fixed vocabularies

Both sides use these exact values.

- **Allergies:** `peanut`, `tree_nut`, `dairy`, `egg`, `gluten`, `soy`, `fish`, `shellfish`, `sesame`
- **Diet:** `none`, `vegetarian`, `vegan`, `pescatarian`, `halal`
- **Ingredient ids:** the detector's 42 class names (`eggs`, `milk`, `butter_or_spread`, …). `GET /ingredients` returns them with display names. Ingredients the user adds by hand that are not in the 42 classes use `"id": null` and only a `name`.

---

### Changes in version 1.1 (6 Nov 2026)

- **Log-in:** Amazon Cognito handles sign-up with an emailed code, log-in, forgot password and account deletion. Send Cognito's **ID token** as the bearer token. With Cognito switched on, `/auth/signup` and `/auth/login` answer `410 USE_COGNITO`. The first request with a new Cognito account creates its profile; an existing profile with the same verified email is linked.
- **Photos:** up to 5 photos of 15 MB each; every photo reports `sharpness` and `blurry`.
- **Chef:** a new `meal_type` question; every question also accepts typed answers.
- **Notes:** the profile has `chef_notes`, with new endpoints to add and delete them. Options report `removed_by_your_notes`.
- **Recipes:** salt without an amount gets a suggested amount and a `note`.
- **Profile:** `DELETE /profile` deletes the account's data.

## 1. Health

### `GET /health`
Checks the server is running and the detector is loaded.

```json
{ "status": "ok", "detector": "rfdetr-small", "version": "1.0" }
```

## 2. Accounts and profile (FR1)

### `POST /auth/signup`
```json
{
  "name": "Sara",
  "email": "sara@example.com",
  "password": "at-least-8-chars",
  "age": 24,
  "allergies": ["peanut", "dairy"],
  "diet": "halal",
  "household_size": 3
}
```
Response `201`:
```json
{ "token": "eyJhbGciOi...", "user": { "id": 17, "name": "Sara", "email": "sara@example.com" } }
```

### `POST /auth/login`
```json
{ "email": "sara@example.com", "password": "at-least-8-chars" }
```
Response `200`: same shape as sign-up. Wrong details give `401` with code `INVALID_LOGIN`.

### `GET /profile` (login required)
```json
{
  "id": 17,
  "name": "Sara",
  "email": "sara@example.com",
  "age": 24,
  "allergies": ["peanut", "dairy"],
  "diet": "halal",
  "household_size": 3
}
```

### `PUT /profile` (login required)
Send only the fields that change. Returns the full updated profile.
```json
{ "allergies": ["peanut"], "household_size": 2 }
```

### `DELETE /profile` (login required)
Deletes the profile, including allergies, diet and notes. Response `204`. The app also deletes the Cognito account.

### `POST /profile/notes` (login required)
Saves something to change next time, which the chef reads on later requests. Notes such as "no mushrooms" also remove matching recipes; "less spicy" is passed to Gemini only.
```json
{ "text": "No mushrooms next time" }
```
Response `201`: `{ "id": "a1b2c3d4", "text": "No mushrooms next time", "created_at": "2026-11-06T10:00:00+00:00" }`. Up to 30 notes; more give `400 TOO_MANY_NOTES`.

### `DELETE /profile/notes/{id}` (login required)
Response `204`, or `404` if the note doesn't exist.

## 3. Ingredients

### `GET /ingredients`
Used for the "add an item" picker and the staples question.
```json
{
  "detectable": [
    { "id": "eggs", "name": "Eggs" },
    { "id": "butter_or_spread", "name": "Butter or spread" }
  ],
  "staples": [
    { "id": "milk", "name": "Milk" },
    { "id": "eggs", "name": "Eggs" },
    { "id": "butter_or_spread", "name": "Butter" },
    { "id": null, "name": "Salt" },
    { "id": null, "name": "Cooking oil" }
  ]
}
```

## 4. Detection (FR2–FR4)

### `POST /detect` 
`multipart/form-data` with field `photos`, repeated 1 to 5 times. Accepts JPG, PNG and HEIC, up to 15 MB each. The website shrinks photos to 2048 px JPEG before upload when the browser can read them. Photos are processed in memory and never stored (NFR6).

Response `200`:
```json
{
  "photos": [
    {
      "index": 0,
      "width": 3024,
      "height": 4032,
      "detections": [
        { "id": "eggs", "name": "Eggs", "confidence": 0.91, "box": [412, 1180, 655, 1390] },
        { "id": "milk", "name": "Milk", "confidence": 0.84, "box": [1500, 300, 1820, 1010] }
      ]
    }
  ],
  "ingredients": [
    { "id": "eggs", "name": "Eggs", "confidence": 0.91, "count": 6, "photos": [0] },
    { "id": "milk", "name": "Milk", "confidence": 0.84, "count": 1, "photos": [0] }
  ],
  "ask_about_staples": [
    { "id": "butter_or_spread", "name": "Butter" },
    { "id": null, "name": "Salt" }
  ],
  "model": "rfdetr-small",
  "elapsed_ms": 412
}
```

- `box` is `[x1, y1, x2, y2]` in pixels of the original photo, so the app can draw boxes.
- `ingredients` is the merged list across all photos with no duplicates (FR4). `confidence` is the highest seen and `count` is the number of boxes.
- `ask_about_staples` lists staples that were not detected (FR5).
- A photo with no ingredients returns `"detections": []`; this is not an error.
- Each photo also has `sharpness` (edge sharpness) and `blurry` (true below 25). The app then suggests retaking that photo.

## 5. Recipe chef (FR6–FR10)

The app keeps the confirmed ingredient list and sends it with each chef request. The server keeps recipe options for 2 hours so they can be referred to by id.

### `GET /chef/questions`
The chef's tap-to-answer questions (FR6). The app shows them one at a time. Any typed answer is accepted, e.g. "Pakistani"; time and people need a number. Cuisines the recipe search doesn't know are mapped to the closest one (Pakistani → Indian) or left for Gemini. After the last question the app asks "Anything else the chef should keep in mind?" (Yes opens a text box; No shows recipes) and sends the text as `answers.note`.
```json
{
  "questions": [
    { "key": "cuisine", "text": "What kind of food are you in the mood for?",
      "options": ["Any", "Italian", "Indian", "Pakistani", "Asian", "Middle Eastern", "Mexican"] },
    { "key": "meal_type", "text": "What are you making?",
      "options": ["Main course", "Dessert", "Breakfast", "Snack", "Side dish", "Any"] },
    { "key": "mood", "text": "How are you feeling?",
      "options": ["Something quick", "Comfort food", "Something healthy", "Something new"] },
    { "key": "max_minutes", "text": "How much time do you have?",
      "options": ["15", "30", "60"] },
    { "key": "servings", "text": "How many people are eating?",
      "options": ["1", "2", "3", "4", "6"] }
  ]
}
```

### `POST /chef/options` (login required)
```json
{
  "ingredients": [
    { "id": "eggs", "name": "Eggs" },
    { "id": "tomato", "name": "Tomato" },
    { "id": null, "name": "Salt" }
  ],
  "answers": {
    "cuisine": "Any",
    "meal_type": "Main course",
    "mood": "Something quick",
    "max_minutes": 30,
    "servings": 3,
    "note": "nothing too spicy"
  }
}
```
Allergies and diet come from the user's saved profile; the app does not send them.

Response `200` with at least 3 options (FR7), no quantities yet:
```json
{
  "options": [
    {
      "option_id": "opt_8f2c1a",
      "title": "Shakshuka",
      "summary": "Eggs poached in a spiced tomato sauce.",
      "minutes": 25,
      "uses": ["Eggs", "Tomato", "Salt"],
      "missing": ["Onion"],
      "image_url": "https://...",
      "source": "spoonacular"
    }
  ],
  "removed_by_safety_filter": 1,
  "removed_by_your_notes": 0,
  "notice": null
}
```

- `uses` are confirmed ingredients the recipe needs; `missing` are extra items the user would need.
- `source` is `"spoonacular"` or `"llm"`, so we can compare the two approaches in testing.
- `removed_by_safety_filter` counts recipes the rule-based filter blocked (FR10). If fewer than 3 safe options remain, `notice` explains why, e.g. `"Only 2 safe recipes found for these ingredients."`

### `POST /chef/recipe` (login required)
```json
{ "option_id": "opt_8f2c1a", "servings": 4 }
```
Response `200`, scaled to `servings` (FR8):
```json
{
  "recipe_id": "rec_51b9d0",
  "title": "Shakshuka",
  "servings": 4,
  "minutes": 25,
  "ingredients": [
    { "name": "Eggs", "quantity": 8, "unit": "", "have": true },
    { "name": "Tomato", "quantity": 5, "unit": "", "have": true },
    { "name": "Onion", "quantity": 1, "unit": "", "have": false },
    { "name": "salt", "quantity": 1, "unit": "tsp", "have": true, "note": "Suggested amount for 4 servings; adjust to taste." }
  ],
  "steps": [
    "Dice the onion and tomatoes.",
    "Cook the onion for 5 minutes, add tomatoes and simmer for 10 minutes.",
    "Make 8 wells, crack in the eggs, cover and cook for 6 minutes."
  ],
  "safety": { "checked": true, "allergies": ["peanut", "dairy"], "diet": "halal" },
  "image_url": "https://..."
}
```

Changing servings on the recipe screen calls this endpoint again with the same `option_id`.

### `POST /chef/swap` (login required)
Suggests a replacement for a missing ingredient (FR9). The replacement also passes the safety filter.
```json
{ "recipe_id": "rec_51b9d0", "missing": "Onion" }
```
Response `200`:
```json
{
  "missing": "Onion",
  "swaps": [
    { "name": "Spring onion", "note": "Use 3 stalks; add at the end." },
    { "name": "Garlic", "note": "1 clove gives a similar savoury base." }
  ]
}
```

## 6. Requirement coverage

| Requirement | Endpoint |
|---|---|
| FR1 sign-up and profile | `/auth/signup`, `/auth/login`, `/profile` |
| FR2 accept 1–3 photos | `/detect` |
| FR3 detect ingredients | `/detect` |
| FR4 merge with no duplicates | `/detect` → `ingredients` |
| FR5 confirm list and staples | `/detect` → `ask_about_staples`, `/ingredients` (editing happens in the app) |
| FR6 chef questions | `/chef/questions` |
| FR7 at least 3 options | `/chef/options` |
| FR8 scaled full recipe | `/chef/recipe` |
| FR9 swaps | `/chef/swap` |
| FR10 safety filter | applied inside `/chef/options`, `/chef/recipe` and `/chef/swap` |

## 7. Building the app before the backend is ready

Use the example responses in this file as fake data. Keep every API call in one file (the website uses `Frontend/frigi-app/src/lib/api.ts`) with a `USE_MOCK` switch, so changing to the real server later is a one-line change.
