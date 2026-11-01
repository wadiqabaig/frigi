# Deploying the Frigi backend to AWS

One EC2 server in **US East (N. Virginia), `us-east-1`** runs the backend in Docker.

## Why this setup

| Choice | Reason |
|---|---|
| `us-east-1` | Among the cheapest AWS regions. Gemini and Spoonacular are US services, so recipe calls are quick from there; the extra delay to Perth (about 0.25 s per request) is small next to detection and LLM time. |
| `t3.medium` (2 vCPU, 4 GB) | RF-DETR needs about 2 GB of memory; the free-tier `t3.micro` (1 GB) cannot load it. About US$0.04 per hour while running. |
| Docker | The server runs exactly the same code and versions as a laptop. |
| SQLite in a Docker volume | Simple to start; can move to RDS later without code changes (`DATABASE_URL`). |

**Cost control:** stop the instance whenever nobody is using it. A stopped instance costs only its disk (about US$1.60 a month for 20 GB) and the Elastic IP (about US$3.60 a month).

---

## Step 1. Budget alert (do this first)

1. AWS console → search **Budgets** → **Create budget** → **Use a template** → **Monthly cost budget**.
2. Amount: **5** USD. Email: your own. **Create budget**.

## Step 2. Launch the server

1. Top-right region menu → **US East (N. Virginia) us-east-1**.
2. Search **EC2** → **Launch instance**.
3. Name: `frigi-backend`.
4. Image: **Ubuntu Server 24.04 LTS** (64-bit x86).
5. Instance type: **t3.medium**.
6. Key pair: **Create new key pair** → name `frigi-key`, type RSA, format `.pem` → it downloads. Keep it safe; never put it in GitHub.
7. Network settings → **Edit**:
   - Keep the SSH rule, but set **Source type: My IP**.
   - **Add security group rule**: Type **Custom TCP**, Port **8000**, Source **Anywhere (0.0.0.0/0)**, description `Frigi API`.
8. Storage: **20 GiB gp3**.
9. **Launch instance**.

## Step 3. Give it a fixed address

Without this, the address changes every time the server is stopped and started.

1. EC2 → **Elastic IPs** → **Allocate Elastic IP address** → **Allocate**.
2. Select it → **Actions → Associate Elastic IP address** → choose `frigi-backend` → **Associate**.
3. Write down the IP address. Below it is called `SERVER_IP`. 44.218.50.2

## Step 4. Connect from your Mac

```bash
mv ~/Downloads/frigi-key.pem ~/.ssh/ && chmod 400 ~/.ssh/frigi-key.pem
ssh -i ~/.ssh/frigi-key.pem ubuntu@44.218.50.2
```

Type `yes` the first time. The prompt changes to `ubuntu@ip-...`: you are now on the server.

## Step 5. Install Docker and get the code (on the server)

```bash
sudo apt update && sudo apt install -y docker.io docker-compose-v2 gh
sudo usermod -aG docker ubuntu
exit
```

Reconnect (Step 4) so the Docker permission applies, then:

```bash
gh auth login        # GitHub.com → HTTPS → Login with a web browser; open the link on your Mac
gh repo clone wadiqabaig/frigi
```

## Step 6. Copy the secrets and model weights (on your Mac)

Open a second Terminal on your Mac (not the server):

```bash
cd ~/Desktop/"ICT304 A1"/frigi/backend
ssh -i ~/.ssh/frigi-key.pem ubuntu@44.218.50.2 "mkdir -p frigi/backend/weights"
scp -i ~/.ssh/frigi-key.pem .env ubuntu@44.218.50.2:frigi/backend/.env
scp -i ~/.ssh/frigi-key.pem weights/checkpoint_best_total.pth ubuntu@44.218.50.2:frigi/backend/weights/
```

## Step 7. Production settings (on the server)

```bash
cd ~/frigi/backend
python3 -c "import secrets; print(secrets.token_hex(32))"
nano .env
```

In `.env`, set `SECRET_KEY=` to the long value just printed and check `DETECTOR=rfdetr`. Save with **Ctrl+O, Enter**, exit with **Ctrl+X**.

## Step 8. Start it (on the server)

```bash
cd ~/frigi
docker compose up -d --build
```

The first build downloads PyTorch and takes 5 to 10 minutes. Then check:

```bash
docker compose logs -f api     # Ctrl+C to stop watching
```

Open `http://44.218.50.2:8000/docs` in your browser. Send this address to the UI developer.

---

## Everyday commands

| Task | Where | Command |
|---|---|---|
| Deploy new code from `main` | server | `cd ~/frigi && git pull && docker compose up -d --build` |
| See logs | server | `docker compose logs -f api` |
| Restart | server | `docker compose restart api` |
| Stop the server to save money | AWS console | EC2 → Instances → select → **Instance state → Stop** |
| Start it again | AWS console | **Instance state → Start**; Docker starts the API by itself |

---

## Step 9. HTTPS with a free certificate

Apps and websites served over `https://` refuse to call a plain `http://` API, and iPhones block it by default. A free certificate needs a domain name, so we use a free DuckDNS name and Caddy, which gets and renews a Let's Encrypt certificate by itself.

1. **Free domain.** Go to <https://www.duckdns.org>, sign in (GitHub or Google), type a sub-domain such as `frigi-app` and click **add domain**. In the **current ip** box enter `44.218.50.2` and click **update ip**. Your domain is now `frigi-app.duckdns.org`.
2. **Open ports 80 and 443.** EC2 → Instances → `frigi-backend` → **Security** tab → click the security group → **Edit inbound rules** → **Add rule** twice: **HTTP** (80) from **Anywhere-IPv4**, and **HTTPS** (443) from **Anywhere-IPv4** → **Save rules**.
3. **On the server**, set the domain and start Caddy:

   ```bash
   cd ~/frigi && git pull
   echo "FRIGI_DOMAIN=frigi-app.duckdns.org" > .env
   docker compose --profile https up -d --build
   docker compose logs -f caddy     # wait for "certificate obtained successfully", then Ctrl+C
   ```

4. Open `https://frigi-app.duckdns.org/docs`. The padlock in the address bar means HTTPS works. Give this address to the UI developer instead of the `:8000` one.

From now on, start and update the server with `docker compose --profile https up -d --build` so Caddy runs too.

Once the app uses the HTTPS address, remove the port 8000 rule from the security group so all traffic is encrypted.

---

## Step 10. Move the database to RDS PostgreSQL

> **Current status:** RDS was connected and working on 14 Oct 2026, then deleted on 1 Nov 2026 because of cost. The API now uses SQLite in the `frigi-data` Docker volume on the EC2 server. These steps remain as the way back: adding the `DATABASE_URL` line to `~/frigi/.env` switches the API to RDS again. Never run `docker compose down -v`, because it deletes the SQLite accounts.

User accounts move from a SQLite file on the server to a managed PostgreSQL database. RDS keeps automatic backups, and the database survives even if the EC2 server is replaced. Test accounts in the old SQLite file are not copied; create them again afterwards.

### 10.1 Create the database (AWS console, region us-east-1)

1. Search **RDS** → **Create database**.
2. **Standard create**, engine **PostgreSQL** (latest version offered).
3. Template: **Free tier** (if not shown, choose **Dev/Test** and pick the smallest instance below).
4. Settings:
   - DB instance identifier: `frigi-db`
   - Master username: `frigi_admin`
   - Credentials management: **Self managed**. Type a password of **letters and numbers only** (at least 12 characters). Symbols would need escaping in the connection address. Save it in your password manager.
5. Instance configuration: **db.t4g.micro** (or db.t3.micro).
6. Storage: **20 GiB gp3**. Untick **Enable storage autoscaling**.
7. Connectivity:
   - **Compute resource: Connect to an EC2 compute resource** → choose `frigi-backend`. AWS then creates the network rules so only the Frigi server can reach the database.
   - Public access: **No**.
8. Additional configuration (expand it):
   - **Initial database name: `frigi`** (easy to miss; without it no database is created).
   - Backup retention: **7 days**.
   - Leave **encryption** turned on.
   - Untick **Performance Insights** and **Enhanced monitoring** (they can add cost).
9. **Create database**. It takes about 10 minutes until the status is **Available**.
10. Open `frigi-db` → **Connectivity & security** → copy the **Endpoint**, e.g. `frigi-db.abc123xyz.us-east-1.rds.amazonaws.com`.

### 10.2 Point the server at it (on the server)

```bash
cd ~/frigi && git pull
nano .env
```

`~/frigi/.env` already holds `FRIGI_DOMAIN`. Add one line, replacing `PASSWORD` and `ENDPOINT`:

```
DATABASE_URL=postgresql+psycopg://frigi_admin:PASSWORD@ENDPOINT:5432/frigi?sslmode=require
```

Save (**Ctrl+O, Enter**, **Ctrl+X**), then rebuild and check:

```bash
docker compose --profile https up -d --build
curl -s https://frigi-app.duckdns.org/health
```

The health check should show `"database": "postgresql"`. If it shows `"unreachable"`, run `docker compose logs api | tail -30` and check the password, endpoint and database name.

### Costs and stopping

- On the free tier, db.t4g.micro with 20 GB is free for 12 months; otherwise it is about US$0.016 per hour.
- RDS can be stopped (RDS → `frigi-db` → **Actions → Stop temporarily**) for up to 7 days, after which AWS starts it again by itself. Stop it together with the EC2 server when the team is not working.

---

## Step 11. Host the website with Amplify

Amplify Hosting publishes the web app in `Frontend/frigi-app` at an HTTPS address and rebuilds it whenever `main` changes. Only Hosting is used; the FastAPI server stays the backend. The build settings are in `amplify.yml` at the repository root.

1. AWS console (N. Virginia) → search **Amplify** → **Create new app**.
2. Choose **GitHub** → **Next**, and allow AWS Amplify to access the `wadiqabaig/frigi` repository.
3. Choose the repository and the `main` branch. Tick **My app is a monorepo** and enter `Frontend/frigi-app` as the path → **Next**.
4. On **App settings**, check that Amplify found `amplify.yml`, with `dist` as the output folder → **Next**.
5. **Save and deploy**, then wait until every stage shows a green tick.
6. Open the `https://main.xxxxx.amplifyapp.com` address it shows, and give that address to the team and the marker.

The EC2 server must be running for the site to work: while it is stopped, the site opens but cannot log in or find recipes.
