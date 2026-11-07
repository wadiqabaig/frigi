# Frigi

Frigi turns photos of a fridge into recipes the user can cook. An object detector finds the ingredients, the user confirms the list, and an AI chef suggests recipes that respect the user's allergies, diet and serving size. A rule-based safety filter checks every recipe before it is shown.

ICT304 AI System Design, Murdoch University, 2026. Team: Wadiqa Baig, Parth Kotak, Syeda Masooma Zehra Naqvi.

## Repository layout

| Folder | Contents |
|---|---|
| `detection/` | Assignment work: dataset metadata and the YOLO11s, RF-DETR Small and ensemble Colab notebooks (`instructions.txt` explains how to run them) |
| `backend/` | FastAPI server: detection, recipe chef, safety filter and database |
| `Frontend/frigi-app/` | Web app (React and Vite), hosted with AWS Amplify |
| `deploy/` | Caddy configuration for HTTPS on the server (used with `docker-compose.yml`) |
| `docs/` | Project overview, API contract, AWS deployment guide and the demo video (`docs/demo-video/`) |
| `design/illustrations/` | Illustrations for the website, report and slides |

Model weights and the full dataset are not stored here because of their size; they are in the team Google Drive folder.

## Working together

1. Never commit directly to `main`.
2. Create a branch for your work: `git checkout -b yourname/feature`.
3. Commit small changes with clear messages, then `git push -u origin yourname/feature`.
4. Open a Pull Request on GitHub; a teammate reviews and merges it.
5. Put API keys only in `.env` (copy `.env.example`). Never commit keys.
