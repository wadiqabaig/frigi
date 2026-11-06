# Frigi: project overview

Frigi turns photos of a fridge into recipes the user can cook now. An object detector finds the ingredients, the user confirms the list, an AI chef suggests recipes, and a rule-based safety filter checks every recipe against the user's allergies and diet before it is shown.

| | |
|---|---|
| **Unit** | ICT304 AI System Design, Murdoch University |
| **Assessment** | Final Project, 30% of the unit (due 7 November 2026, before midnight) |
| **Team** | Wadiqa Baig, Parth Kotak, Syeda Masooma Zehra Naqvi |
| **Website** | <https://main.dfm6me47px9cd.amplifyapp.com/> |
| **API** | <https://frigi-app.duckdns.org> (interactive docs at `/docs`) |
| **Repository** | <https://github.com/wadiqabaig/frigi> (private) |

The website and API work only while the EC2 server is running.

_Status as of 4 November 2026._

## How a user uses Frigi

1. Sign up with allergies, diet and household size.
2. Upload 1 to 3 photos of the open fridge.
3. Check the detected list: remove wrong items, add missing ones, and answer the common staples question.
4. Answer the chef's questions: cuisine, mood, time and number of people.
5. Choose a recipe from the safe options.
6. Cook from the recipe, scaled to the number of people, and ask for swaps for anything missing.

## System design

```text
Website (React, on AWS Amplify)
        |  HTTPS
        v
Caddy (HTTPS certificate) -> FastAPI backend (Docker, on AWS EC2)
                               |-- RF-DETR Small: finds ingredients in photos
                               |-- Merge step: combines results from all photos
                               |-- Spoonacular: real recipes and food data
                               |-- Gemini: picks, explains and suggests swaps
                               |-- Safety filter: allergy and diet rules
                               `-- SQLite: user accounts and profiles
```

| Sub-system | Type | Technology | Job |
|---|---|---|---|
| User interface | Non-AI | React, TypeScript, Vite, Tailwind CSS | All screens the user sees |
| Backend API | Non-AI | FastAPI, Docker | Connects every part; keeps API keys off the user's device |
| Accounts and profile | Non-AI | SQLite, SQLAlchemy, bcrypt, JWT | Sign-up, log-in, allergies, diet, household size |
| Image input | Non-AI | Pillow, pillow-heif | Accepts JPG, PNG and HEIC; corrects phone rotation; 10 MB limit per photo |
| Ingredient detection | AI | Fine-tuned RF-DETR Small | Finds the 42 ingredient classes |
| Merge and confirm | Non-AI | Python rules, user check | Produces one list with no duplicates, then the user confirms it |
| Recipe search | Non-AI | Spoonacular API, disk cache | Finds real recipes; repeated searches use no points |
| Recipe chef | AI | Gemini 3.8 Flash; Gemini 3.5 Flash-Lite as backup | Picks the best options, writes recipes if Spoonacular is unavailable, suggests swaps |
| Safety filter | Non-AI | Python rule lists | Removes recipes and swaps that break allergy or diet rules |

Photos are processed in memory and not stored.

## Detector results (assignment)

Three methods were fine-tuned or combined on one merged dataset and scored on the same 97 held-out test images. Settings were chosen on validation images and frozen before testing.

| Method | mAP50 | mAP50-95 | Box precision | Box recall | Ingredient F1 | Time per image |
|---|---|---|---|---|---|---|
| YOLO11s | 91.55% | 61.33% | 83.72% | 91.55% | 96.16% | 4.8 ms |
| **RF-DETR Small (chosen)** | **94.02%** | **62.18%** | **89.43%** | 93.21% | **96.98%** | 15.4 ms |
| YOLO11s + RF-DETR (WBF) | 93.37% | 62.14% | 79.20% | 94.88% | 96.05% | 28.0 ms |

Times are from an NVIDIA RTX PRO 6000 GPU. One photo checked on the CPU-only AWS server took about 0.7 s of model time.

**Dataset:** `Fridge_Combined_YOLO` has 4,243 images and 44,348 labelled boxes across 42 classes, merged from AIcook, Fridge Food Images and Smart Fridge. The split is 3,972 train, 174 validation and 97 test images.

## Current status

### Done

| Item | Evidence |
|---|---|
| Detection trained, compared and running on the live server | Assignment results; `/health` reports `rfdetr-small` |
| Accounts, profile and log-in | Automated tests pass |
| Chef: options, scaled recipes, swaps and backup paths | Automated tests pass; run once with real keys on a laptop |
| Safety filter | 31 test cases in `backend/tests/test_safety.py` |
| AWS deployment with HTTPS | `/health` responds on `frigi-app.duckdns.org` |
| Website merged and hosted on Amplify | Site loads; points at the live API |
| Backend automated tests | 46 passed on 4 November 2026 |

### Still needed before submission

| Item | Why it matters |
|---|---|
| Full website walkthrough on desktop and phone | The code and demo must work (a 50% deduction applies if they do not) |
| Real-world test on the team's own labelled fridge photos | The brief requires ground-truth data, and no results are in the repository yet |
| Recipe comparison: Spoonacular + Gemini vs Gemini only | Justifies the second AI sub-system |
| Results for every sub-system in the test plan | Incomplete testing loses 15% |
| Speed tests on the live server | Supports the updated speed requirement |
| User test with 3 to 5 people outside the team | Tests the "recipe in under 3 minutes" target |
| Final report and user guide | Main marked documents |
| Demo video | Missing video loses 20% |
| Presentation slides and 10-minute presentation | Worth 3%; a live demo is expected in the last teaching week |
| Signed Group Declaration Sheet | The project is not marked without it |

## What to submit

| Item | Must include |
|---|---|
| **Final report** | Title, abstract, introduction, background, systems engineering life cycle, system and sub-system design, test plan, AI technique, evaluation, discussion, acknowledgements, references, and an appendix with all generative AI prompts |
| **User guide** | How to use Frigi; how a developer can rebuild it, with screenshots, versions and dataset splits |
| **Code, model and dataset** | Enough for the lecturer to repeat the steps |
| **Demo video** | The whole flow working |
| **Slides** | For the 10-minute presentation |
| **Group Declaration Sheet** | Signed by the team |
| **Tool evidence** | Project management, version control, collaboration and communication |

### Marking criteria

| Criterion | Weight |
|---|---|
| AI system requirements and focus of the report | 20% |
| AI system design | 35% |
| Evaluation and results discussion | 20% |
| User guide and code or model | 15% |
| Content and format | 10% |

## Known limitations

- **Detector scope:** it recognises only the 42 trained classes, and does not judge quantity, freshness or expiry. The user confirms the list for this reason.
- **Weak classes:** leafy greens, beef, chicken breast, fizzy drinks and ginger score lowest. Rare classes have few test images.
- **Halal rules:** the filter blocks pork and alcohol terms but cannot verify how meat was sourced.
- **Database:** RDS PostgreSQL was connected and working on 14 October, then deleted on 1 November because of cost. Accounts are now in SQLite on the server, with no managed backups.
- **Free-tier limits:** Spoonacular allows 50 points a day, and each website recipe search uses `/chef/options`. Gemini's free tier has usage limits and may use inputs to improve Google's products, so only ingredients, chat answers and allergy or diet tags are sent.
- **Saved recipes and fridge list:** these stay in the user's browser and do not follow them to another device.
- **Availability:** the site cannot detect or log in while the EC2 server is stopped.

## Run the project locally

**Backend** (Python 3.12 or 3.13):

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
uvicorn app.main:app --reload
```

Then open <http://localhost:8000/docs>. `DETECTOR=mock` runs without the model. `backend/README.md` explains how to use the real model, which also needs `requirements-detector.txt` and the trained weights.

**Website** (Node.js 20 or newer):

```bash
cd Frontend/frigi-app
cp .env.example .env.local
npm install
npm run dev
```

**Tests:**

```bash
cd backend
python -m pytest
```

## Repository guide

| Path | Contents |
|---|---|
| `Frontend/frigi-app/` | The website |
| `backend/` | FastAPI server, services and automated tests |
| `detection/` | Assignment notebooks and dataset metadata |
| `docs/api-contract.md` | Every endpoint, with request and response examples |
| `docs/deploy-aws.md` | AWS deployment steps, including HTTPS and Amplify |
| `amplify.yml` | Website build settings |
| `docker-compose.yml`, `deploy/` | Server containers and HTTPS setup |
| `design/illustrations/` | Illustrations for the website, report and slides |

Model weights, the full dataset, API keys and `.env` files are not stored in the repository.

## Running costs

Stop the EC2 instance when nobody is using it. The instance is about US$0.04 per hour, and its disk and fixed IP address still cost a few dollars a month while it is stopped. Keep the AWS budget alert on.
