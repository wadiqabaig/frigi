# Frigi backend

FastAPI server for the app. Endpoints and JSON shapes are in [`docs/api-contract.md`](../docs/api-contract.md).

## Run it locally

Needs Python 3.12 or 3.13.

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env          # then set SECRET_KEY
uvicorn app.main:app --reload
```

Open http://localhost:8000/docs to try every endpoint in the browser.

## Detector modes

- `DETECTOR=mock` (default): `/detect` returns sample eggs, milk and tomato boxes, so the app can be built without the model.
- `DETECTOR=rfdetr`: loads the trained RF-DETR Small checkpoint.
  1. `pip install -r requirements-detector.txt`
  2. Copy `checkpoint_best_total.pth` from the team Drive (`Code/FridgeChef_RFDETR/training_runs/rfdetr/20261002T212750Z_1bb5fe/native/`) into `backend/weights/`.
  3. Set `DETECTOR=rfdetr` in `.env`.

## Tests

```bash
python -m pytest
```

## Layout

| File | Purpose |
|---|---|
| `app/main.py` | Creates the app and registers the routers |
| `app/config.py` | Settings read from `.env` |
| `app/database.py`, `app/models.py` | Database connection and the `users` table |
| `app/security.py` | Password hashing and log-in tokens |
| `app/errors.py` | The shared `{"error": {...}}` response format |
| `app/vocab.py` | Allergies, diets, the 42 detector classes and staples |
| `app/routers/` | One file per group of endpoints |
| `app/services/detector.py` | Photo checks, model inference and merging across photos |
