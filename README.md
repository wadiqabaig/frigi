<p align="center">
  <a href="docs/demo-video/frigi-demo-video.mp4">
    <img src="docs/demo-video/frigi-demo-poster.png" alt="Frigi: Your fridge has ideas. Let Frigi find them!" width="820">
  </a>
</p>

<p align="center">
  <b><a href="https://main.dfm6me47px9cd.amplifyapp.com">Open the live website</a></b> &nbsp;·&nbsp;
  <a href="docs/demo-video/frigi-demo-video.mp4">Watch the demo video</a> &nbsp;·&nbsp;
  <a href="https://frigi-app.duckdns.org/docs">API docs</a>
</p>

# Frigi

Frigi turns photos of a fridge into recipes the user can cook. An object detector finds the ingredients, the user confirms the list, and an AI chef suggests recipes that respect the user's allergies, diet and serving size. A rule-based safety filter checks every recipe before it is shown.

ICT304 AI System Design, Murdoch University, 2026. Team: Wadiqa Baig, Parth Kotak, Syeda Masooma Zehra Naqvi.

## How it works

| Step | What happens | Built with |
|---|---|---|
| 1. Scan | The user takes or uploads 1 to 5 fridge photos. The browser resizes them, and the server fixes rotation and warns about blurry photos. | React, FastAPI |
| 2. Detect | A retrained **RF-DETR Small** detector finds 42 kinds of food and draws boxes on the photos. Items seen in several photos are merged into one list. | RF-DETR, PyTorch |
| 3. Confirm | The user removes wrong items, adds missed ones and ticks the staples they have. | React |
| 4. Chef | The chef asks a few questions, finds real recipes with **Spoonacular**, and **Gemini** picks and explains the best three. | Spoonacular API, Gemini API |
| 5. Safety | Every recipe and swap is checked against the user's allergies and diet before it is shown. | Rule-based filter |
| 6. Cook | Servings rescale the amounts, missing items get swaps, and cook mode shows one step at a time. Saved recipes sync across devices. | React, SQLite |

## Results

| Measure | Result | Target |
|---|---|---|
| Detector mAP50 (97 held-out test images) | **93.44%** | 85% |
| Ingredient-list F1 | **97.94%** | 90% |
| Detection on the live server (3 photos) | 5.9 s median | under 10 s |
| Backend tests | **59 passed** | all pass |
| Application tests on the live website | **36 of 36 passed** | all pass |

## Run it yourself

**Backend** (Python 3.12 or 3.13)

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate            # Windows: .venv\Scripts\activate
python -m pip install -r requirements.txt
python -m pip install -r requirements-detector.txt   # only for the real model
cp .env.example .env                 # add your own API keys here
python -m uvicorn app.main:app --reload
```

Open http://localhost:8000/docs to try the endpoints. `DETECTOR=mock` in `.env` runs without the model; set `DETECTOR=rfdetr` and put the weights in `backend/weights/` to use the trained detector.

**Website** (Node.js 20 or newer)

```bash
cd Frontend/frigi-app
cp .env.example .env.local           # VITE_API_BASE_URL=http://localhost:8000
npm install
npm run dev                          # opens http://localhost:5173
```

**Tests**

```bash
cd backend
python -m pytest -q                  # expected: 59 passed
```

The tests use fake Spoonacular and Gemini responses, so they need no API keys or internet.

**Deployment:** the backend runs in Docker on AWS EC2 with HTTPS from Caddy, the website is hosted on AWS Amplify, and log-in uses Amazon Cognito. Every step is in [`docs/deploy-aws.md`](docs/deploy-aws.md).

## Repository layout

| Folder | Contents |
|---|---|
| `backend/` | FastAPI server: detection, recipe chef, safety filter, database and tests |
| `Frontend/frigi-app/` | Web app (React, TypeScript and Vite), hosted with AWS Amplify |
| `detection/` | Colab notebooks for training and testing the detector, dataset metadata and retraining results (`instructions.txt` explains how to run them) |
| `deploy/` | Caddy configuration for HTTPS on the server (used with `docker-compose.yml`) |
| `docs/` | Project overview, API contract, AWS deployment guide and the demo video (`docs/demo-video/`) |
| `design/illustrations/` | Illustrations used on the website, report and slides |

Model weights and the full dataset are not stored here because of their size; they are in the team Google Drive folder and the unit submission.

## Working together

1. Never commit directly to `main`.
2. Create a branch for your work: `git checkout -b yourname/feature`.
3. Commit small changes with clear messages, then `git push -u origin yourname/feature`.
4. Open a Pull Request on GitHub; a teammate reviews and merges it.
5. Put API keys only in `.env` (copy `.env.example`). Never commit keys.

## Credits

Datasets: AIcook, Fridge Food Images and Smart Fridge from Roboflow Universe. Detector: RF-DETR by Roboflow. Recipes: Spoonacular API. Recipe explanations: Google Gemini API.
