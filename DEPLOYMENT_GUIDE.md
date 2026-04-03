# Video Transcoding API - Complete Production Guide

Everything you need to deploy, maintain, and operate this project in production.

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Prerequisites](#prerequisites)
3. [Initial Server Setup](#initial-server-setup)
4. [Environment Configuration](#environment-configuration)
5. [First-Time Deployment](#first-time-deployment)
6. [CI/CD Pipeline Setup](#cicd-pipeline-setup)
7. [Day-to-Day Operations](#day-to-day-operations)
8. [Monitoring & Logs](#monitoring--logs)
9. [Troubleshooting](#troubleshooting)
10. [Backup & Recovery](#backup--recovery)
11. [Security Checklist](#security-checklist)
12. [Scaling](#scaling)

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                              INTERNET                                   │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                         VPS 1: CONTROL PLANE                            │
│  ┌──────────┐  ┌──────────┐  ┌───────────┐  ┌─────────┐  ┌─────────┐  │
│  │ Traefik  │→ │ Frontend │  │ FastAPI   │  │Postgres │  │  Redis  │  │
│  │ :80/:443 │  │ (React)  │  │ Backend   │  │   :5432 │  │  :6379  │  │
│  └──────────┘  └──────────┘  └───────────┘  └─────────┘  └─────────┘  │
│       ↓              ↓              ↓              ↓           ↓       │
│  docker-compose.control.yml                                            │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                    ┌───────────────┴───────────────┐
                    │     Tailscale VPN Network     │
                    │       (100.x.x.x range)       │
                    └───────────────┬───────────────┘
                                    │
              ┌─────────────────────┴─────────────────────┐
              ▼                                           ▼
┌─────────────────────────────────┐     ┌─────────────────────────────────┐
│      VPS 2: TRANSCODE WORKER    │     │         VPS 3: ML WORKER        │
│  ┌───────────────────────────┐  │     │  ┌───────────────────────────┐  │
│  │  Celery Worker (FFmpeg)   │  │     │  │ Celery Worker (WhisperX)  │  │
│  └───────────────────────────┘  │     │  └───────────────────────────┘  │
│  docker-compose.worker.yml      │     │  docker-compose.ml.yml          │
└─────────────────────────────────┘     └─────────────────────────────────┘
```

**How it works:**
- Users hit your domain → Traefik routes to Frontend or API
- API creates jobs → Pushes to Redis queue
- Workers pull jobs from Redis → Process videos → Upload to R2/S3
- Workers update job status in PostgreSQL
- All internal traffic goes through Tailscale VPN (secure, no exposed ports)

---

## Prerequisites

### VPS Requirements

| Node | Min Specs | Recommended | Purpose |
|------|-----------|-------------|---------|
| VPS 1 (Control) | 2GB RAM, 1 vCPU | 4GB RAM, 2 vCPU | API, Frontend, DB, Redis |
| VPS 2 (Worker) | 2GB RAM, 2 vCPU | 4GB RAM, 4 dedicated vCPU | FFmpeg transcoding |
| VPS 3 (ML) | 4GB RAM, 2 vCPU | 8GB RAM, GPU (T4/V100) | WhisperX subtitles |

**OS:** Ubuntu 22.04 or 24.04 LTS recommended.

### Accounts & Keys Needed

- [ ] GitHub account with this repo cloned
- [ ] Cloudflare R2 or AWS S3 bucket + credentials
- [ ] Domain name (optional but recommended for SSL)
- [ ] Tailscale account (free tier works)

---

## Initial Server Setup

Do this ONCE on each VPS.

### Step 1: Install Docker (All VPS)

```bash
# Remove old Docker versions
sudo apt-get remove docker docker-engine docker.io containerd runc -y

# Add Docker's official GPG key
sudo apt-get update
sudo apt-get install -y ca-certificates curl
sudo install -m 0755 -d /etc/apt/keyrings
sudo curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
sudo chmod a+r /etc/apt/keyrings/docker.asc

# Add Docker repository
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Install Docker
sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin git

# Add your user to docker group (avoid using sudo)
sudo usermod -aG docker $USER
newgrp docker
```

### Step 2: Install Tailscale (All VPS)

```bash
# Install Tailscale
curl -fsSL https://tailscale.com/install.sh | sh

# Connect to your Tailscale network
sudo tailscale up

# Note your Tailscale IP (you'll need this for .env)
tailscale ip -4
```

Write down the Tailscale IPs:
- VPS 1 (Control): `100.x.x.x`  ← This is your `CONTROL_PLANE_IP`
- VPS 2 (Worker): `100.x.x.x`
- VPS 3 (ML): `100.x.x.x`

### Step 3: Clone the Repo (All VPS)

```bash
git clone https://github.com/hossamhasanin/video_transcoding_api.git ~/transcoding-app
cd ~/transcoding-app
```

### Step 4: Configure Firewall (All VPS)

```bash
# Install UFW
sudo apt install ufw -y

# Allow SSH
sudo ufw allow 22/tcp

# On VPS 1 only: Allow HTTP/HTTPS for Traefik
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Enable firewall
sudo ufw enable
sudo ufw status
```

---

## Environment Configuration

### Step 1: Create .env File (On VPS 1 only, then copy to others)

```bash
cd ~/transcoding-app
cp .env.example .env
nano .env
```

### Step 2: Fill in ALL values

```bash
# ==========================================
# CONTROL PLANE SETTINGS
# ==========================================
BIND_IP=127.0.0.1

# Your domain or VPS IP for Traefik routing
DOMAIN=api.yourdomain.com

# Email for Let's Encrypt SSL (when you have a domain)
SSL_EMAIL=you@yourdomain.com

# ==========================================
# DATABASE CREDENTIALS (use strong passwords!)
# ==========================================
POSTGRES_USER=admin
POSTGRES_PASSWORD=GENERATE_A_STRONG_PASSWORD_HERE

# ==========================================
# REDIS CREDENTIALS
# ==========================================
REDIS_PASSWORD=GENERATE_A_STRONG_PASSWORD_HERE

# ==========================================
# JWT AUTHENTICATION
# ==========================================
# Generate with: python3 -c "import secrets; print(secrets.token_urlsafe(64))"
JWT_SECRET_KEY=PASTE_GENERATED_KEY_HERE
ACCESS_TOKEN_EXPIRE_MINUTES=30
REFRESH_TOKEN_EXPIRE_DAYS=7
PASSWORD_RESET_TOKEN_EXPIRE_MINUTES=15
EMAIL_VERIFICATION_TOKEN_EXPIRE_HOURS=24

# Frontend URL (for email links)
FRONTEND_URL=https://yourdomain.com

# ==========================================
# CORS (comma-separated origins)
# ==========================================
CORS_ORIGINS=https://yourdomain.com,https://api.yourdomain.com

# ==========================================
# JOB LIMITS
# ==========================================
MAX_CONCURRENT_JOBS=10
MAX_UPLOAD_SIZE_MB=500

# ==========================================
# WORKER NODE SETTINGS
# ==========================================
# Tailscale IP of VPS 1 (Control Plane)
CONTROL_PLANE_IP=100.x.x.x

# ==========================================
# STORAGE (Cloudflare R2 / AWS S3)
# ==========================================
R2_ACCOUNT_ID=your_cloudflare_account_id
R2_ACCESS_KEY_ID=your_access_key
R2_SECRET_ACCESS_KEY=your_secret_key
R2_BUCKET_NAME=video-transcoding
S3_ENDPOINT_URL=https://your_account_id.r2.cloudflarestorage.com

# ==========================================
# WEBHOOK
# ==========================================
WEBHOOK_SECRET_KEY=GENERATE_ANOTHER_SECRET
```

### Step 3: Generate Secrets

Run this to generate all the secrets you need:

```bash
python3 -c "
import secrets
print('JWT_SECRET_KEY=' + secrets.token_urlsafe(64))
print('POSTGRES_PASSWORD=' + secrets.token_urlsafe(32))
print('REDIS_PASSWORD=' + secrets.token_urlsafe(32))
print('WEBHOOK_SECRET_KEY=' + secrets.token_urlsafe(32))
"
```

### Step 4: Copy .env to backend directory

```bash
cp .env backend/.env
```

### Step 5: Copy .env to other VPS

```bash
# From VPS 1, copy to VPS 2 and VPS 3 via Tailscale
scp .env backend/.env user@100.x.x.x:~/transcoding-app/
scp .env backend/.env user@100.x.x.x:~/transcoding-app/backend/
```

Or manually create the same `.env` on each VPS.

---

## First-Time Deployment

### Deploy VPS 1: Control Plane

```bash
ssh user@vps1
cd ~/transcoding-app

# Start all services
sudo docker compose -f docker-compose.control.yml up -d --build

# Wait for services to start
sleep 10

# Run database migrations
sudo docker compose -f docker-compose.control.yml exec api alembic upgrade head

# Check everything is running
sudo docker compose -f docker-compose.control.yml ps

# View logs
sudo docker compose -f docker-compose.control.yml logs -f
```

Verify: Open `http://YOUR_VPS_IP` in a browser. You should see the frontend.

### Deploy VPS 2: Transcode Worker

```bash
ssh user@vps2
cd ~/transcoding-app

# Start worker
sudo docker compose -f docker-compose.worker.yml up -d --build

# Check it's running
sudo docker compose -f docker-compose.worker.yml ps

# View logs
sudo docker compose -f docker-compose.worker.yml logs -f
```

### Deploy VPS 3: ML Worker

```bash
ssh user@vps3
cd ~/transcoding-app

# Start ML worker
sudo docker compose -f docker-compose.ml.yml up -d --build

# If you have a GPU, uncomment the deploy section in docker-compose.ml.yml first!

# Check it's running
sudo docker compose -f docker-compose.ml.yml ps

# View logs
sudo docker compose -f docker-compose.ml.yml logs -f
```

### Enable SSL (When You Have a Domain)

1. Point your domain's DNS to VPS 1's public IP
2. Edit `docker-compose.control.yml`:
   - Uncomment the `certificatesresolvers` lines under traefik command
   - Uncomment `certresolver` lines under api and frontend labels
   - Change `entrypoints=web` to `entrypoints=websecure`
3. Update `.env`:
   ```
   DOMAIN=api.yourdomain.com
   SSL_EMAIL=you@yourdomain.com
   ```
4. Rebuild:
   ```bash
   sudo docker compose -f docker-compose.control.yml up -d --build
   ```

Traefik will automatically get Let's Encrypt certificates!

---

## CI/CD Pipeline Setup

The project includes GitHub Actions workflows for automated deployment.

### Step 1: Generate SSH Keys

```bash
# On your local machine, generate a deploy key
ssh-keygen -t ed25519 -C "github-deploy" -f ~/.ssh/github_deploy

# Copy public key to ALL 3 VPS
ssh-copy-id -i ~/.ssh/github_deploy.pub user@vps1-ip
ssh-copy-id -i ~/.ssh/github_deploy.pub user@vps2-ip
ssh-copy-id -i ~/.ssh/github_deploy.pub user@vps3-ip

# Show private key (you'll paste this into GitHub Secrets)
cat ~/.ssh/github_deploy
```

### Step 2: Add GitHub Secrets

Go to: **Your Repo → Settings → Secrets and variables → Actions**

Add these secrets:

| Secret Name | Value |
|-------------|-------|
| `CONTROL_VPS_HOST` | VPS 1 public IP |
| `CONTROL_VPS_USERNAME` | `ubuntu` (or your user) |
| `CONTROL_VPS_SSH_KEY` | Contents of `~/.ssh/github_deploy` |
| `CONTROL_VPS_PORT` | `22` |
| `WORKER_VPS_HOST` | VPS 2 public IP |
| `WORKER_VPS_USERNAME` | `ubuntu` |
| `WORKER_VPS_SSH_KEY` | Contents of `~/.ssh/github_deploy` |
| `WORKER_VPS_PORT` | `22` |
| `ML_VPS_HOST` | VPS 3 public IP |
| `ML_VPS_USERNAME` | `ubuntu` |
| `ML_VPS_SSH_KEY` | Contents of `~/.ssh/github_deploy` |
| `ML_VPS_PORT` | `22` |

### Step 3: Enable Workflows

The workflows are currently disabled. To enable them:

1. Go to **Actions** tab in your GitHub repo
2. Click on each workflow and enable it
3. Or push a commit to trigger them

### How CI/CD Works

```
You push code to main
        ↓
CI runs: Lint + Test + Build Docker images
        ↓ (if CI passes)
CD runs: Deploy to all 3 VPS in parallel
        ↓
Done! 🚀
```

---

## Day-to-Day Operations

### Deploying Code Changes

**With CI/CD (after setup):**
```bash
git add .
git commit -m "your changes"
git push origin main
# GitHub Actions handles the rest!
```

**Manual deployment:**
```bash
# On each VPS
cd ~/transcoding-app
git pull origin main
cp .env backend/.env

# VPS 1
sudo docker compose -f docker-compose.control.yml up -d --build
sudo docker compose -f docker-compose.control.yml exec api alembic upgrade head

# VPS 2
sudo docker compose -f docker-compose.worker.yml up -d --build

# VPS 3
sudo docker compose -f docker-compose.ml.yml up -d --build
```

### Restarting Services

```bash
# Restart everything on a VPS
sudo docker compose -f docker-compose.control.yml restart

# Restart just the API
sudo docker compose -f docker-compose.control.yml restart api

# Restart just the workers
sudo docker compose -f docker-compose.worker.yml restart
sudo docker compose -f docker-compose.ml.yml restart
```

### Stopping Services

```bash
# Stop all
sudo docker compose -f docker-compose.control.yml down

# Stop and remove volumes (CAREFUL: deletes DB data!)
sudo docker compose -f docker-compose.control.yml down -v
```

### Viewing Logs

```bash
# All services
sudo docker compose -f docker-compose.control.yml logs -f

# Specific service
sudo docker compose -f docker-compose.control.yml logs -f api
sudo docker compose -f docker-compose.control.yml logs -f db
sudo docker compose -f docker-compose.control.yml logs -f redis

# Worker logs
sudo docker compose -f docker-compose.worker.yml logs -f
sudo docker compose -f docker-compose.ml.yml logs -f

# Last 100 lines
sudo docker compose -f docker-compose.control.yml logs --tail=100 api
```

### Database Migrations

After code changes that modify the database schema:

```bash
# On VPS 1 only
cd ~/transcoding-app
sudo docker compose -f docker-compose.control.yml exec api alembic upgrade head

# To see migration history
sudo docker compose -f docker-compose.control.yml exec api alembic history

# To rollback one migration
sudo docker compose -f docker-compose.control.yml exec api alembic downgrade -1
```

### Creating a New API User

```bash
# On VPS 1
cd ~/transcoding-app
sudo docker compose -f docker-compose.control.yml exec api python scripts/create_test_user.py
```

Or use the API endpoint (if registration is enabled):
```bash
curl -X POST http://localhost:8000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com", "password": "strongpassword"}'
```

---

## Monitoring & Logs

### Check Service Health

```bash
# API health check
curl http://localhost:8000/health

# Check all containers are running
sudo docker compose -f docker-compose.control.yml ps
sudo docker compose -f docker-compose.worker.yml ps
sudo docker compose -f docker-compose.ml.yml ps
```

### Check Resource Usage

```bash
# Docker stats (live)
sudo docker stats

# Disk usage
df -h
sudo docker system df

# Clean up unused images/containers
sudo docker system prune -a
```

### Check Database

```bash
# Connect to PostgreSQL
sudo docker compose -f docker-compose.control.yml exec db psql -U admin -d transcoding_db

# Inside psql:
\dt          # List tables
\q           # Quit

# Quick queries from command line
sudo docker compose -f docker-compose.control.yml exec db psql -U admin -d transcoding_db -c "SELECT COUNT(*) FROM jobs;"
```

### Check Redis

```bash
# Connect to Redis
sudo docker compose -f docker-compose.control.yml exec redis redis-cli -a YOUR_REDIS_PASSWORD

# Inside redis-cli:
INFO           # Server info
LLEN transcode_queue   # Queue length
LLEN ml_queue          # ML queue length
KEYS *         # All keys (careful in production)
EXIT           # Quit
```

---

## Troubleshooting

### API returns 500 errors

```bash
# Check API logs
sudo docker compose -f docker-compose.control.yml logs --tail=50 api

# Common causes:
# 1. Database connection failed → Check DATABASE_URL in .env
# 2. Redis connection failed → Check REDIS_PASSWORD in .env
# 3. Missing environment variables → Ensure .env exists in backend/
```

### Workers not processing jobs

```bash
# Check worker logs
sudo docker compose -f docker-compose.worker.yml logs --tail=50

# Common causes:
# 1. CONTROL_PLANE_IP is wrong in .env
# 2. Tailscale is not connected → Run: sudo tailscale up
# 3. Redis is not accessible → Check firewall rules
```

### Container won't start

```bash
# Check what's wrong
sudo docker compose -f docker-compose.control.yml logs api

# Rebuild from scratch
sudo docker compose -f docker-compose.control.yml down
sudo docker compose -f docker-compose.control.yml build --no-cache
sudo docker compose -f docker-compose.control.yml up -d
```

### Out of disk space

```bash
# Check disk usage
df -h
sudo docker system df

# Clean up
sudo docker system prune -a          # Remove unused images
sudo docker volume prune              # Remove unused volumes (CAREFUL!)
sudo docker compose logs --tail=0     # Truncate logs
```

### Can't connect to database

```bash
# Check if PostgreSQL is running
sudo docker compose -f docker-compose.control.yml ps db

# Check logs
sudo docker compose -f docker-compose.control.yml logs db

# Restart it
sudo docker compose -f docker-compose.control.yml restart db
```

### SSL certificate issues

```bash
# Check Traefik logs
sudo docker compose -f docker-compose.control.yml logs traefik

# Common issues:
# 1. DNS not pointing to your server
# 2. Port 443 blocked by firewall
# 3. Rate limited by Let's Encrypt (wait 1 hour)
```

---

## Backup & Recovery

### Backup Database

```bash
# On VPS 1, create a backup
sudo docker compose -f docker-compose.control.yml exec -T db pg_dump -U admin transcoding_db > backup_$(date +%Y%m%d).sql

# Download to local machine
scp user@vps1:~/backup_*.sql ./
```

### Restore Database

```bash
# On VPS 1
cat backup_20260403.sql | sudo docker compose -f docker-compose.control.yml exec -T db psql -U admin -d transcoding_db
```

### Backup Redis (if you enable persistence)

```bash
# Copy Redis dump
sudo docker compose -f docker-compose.control.yml exec redis redis-cli -a PASSWORD BGSAVE
sudo docker cp transcoding-redis:/data/dump.rdb ./redis_backup.rdb
```

### Automate Backups (Cron)

```bash
# Edit crontab
crontab -e

# Add daily backup at 3 AM
0 3 * * * cd ~/transcoding-app && sudo docker compose -f docker-compose.control.yml exec -T db pg_dump -U admin transcoding_db > ~/backups/db_$(date +\%Y\%m\%d).sql 2>&1
```

---

## Security Checklist

### Initial Setup
- [ ] Strong passwords for PostgreSQL and Redis
- [ ] Strong JWT_SECRET_KEY (64+ random characters)
- [ ] Redis requires password authentication
- [ ] PostgreSQL and Redis bound to 127.0.0.1 (not 0.0.0.0)
- [ ] Tailscale installed and connected on all VPS
- [ ] Firewall enabled (UFW)
- [ ] Only ports 22, 80, 443 open on VPS 1

### Ongoing
- [ ] Keep Docker and system packages updated
- [ ] Rotate secrets periodically
- [ ] Monitor logs for suspicious activity
- [ ] Keep SSL certificates valid (auto-renews with Traefik)

### Update System Packages

```bash
# On each VPS, monthly
sudo apt update && sudo apt upgrade -y
sudo docker compose pull    # Pull latest base images
```

### Update Docker Images

```bash
# Rebuild with latest base images
sudo docker compose -f docker-compose.control.yml build --pull
sudo docker compose -f docker-compose.control.yml up -d
```

---

## Scaling

### Add More Transcode Workers

1. Set up a new VPS (same as VPS 2 setup)
2. Clone the repo, configure `.env` with same `CONTROL_PLANE_IP`
3. Start the worker: `sudo docker compose -f docker-compose.worker.yml up -d`
4. Add GitHub secrets for the new VPS
5. Add a new deploy job in `.github/workflows/cd.yml`

Workers automatically share the workload via Redis queues!

### Scale Up a VPS

Most VPS providers let you upgrade CPU/RAM:
1. Stop services: `sudo docker compose -f docker-compose.*.yml down`
2. Resize VPS in provider dashboard
3. Start services: `sudo docker compose -f docker-compose.*.yml up -d`

### Database Scaling

For high-traffic scenarios:
- Consider managed PostgreSQL (AWS RDS, Cloudflare D1, etc.)
- Add connection pooling (PgBouncer)
- Add read replicas for heavy queries

---

## Quick Reference

| Task | Command |
|------|---------|
| Start Control Plane | `sudo docker compose -f docker-compose.control.yml up -d --build` |
| Start Worker | `sudo docker compose -f docker-compose.worker.yml up -d --build` |
| Start ML Worker | `sudo docker compose -f docker-compose.ml.yml up -d --build` |
| View logs | `sudo docker compose -f docker-compose.control.yml logs -f` |
| Restart API | `sudo docker compose -f docker-compose.control.yml restart api` |
| Run migrations | `sudo docker compose -f docker-compose.control.yml exec api alembic upgrade head` |
| Database shell | `sudo docker compose -f docker-compose.control.yml exec db psql -U admin -d transcoding_db` |
| Redis shell | `sudo docker compose -f docker-compose.control.yml exec redis redis-cli -a PASSWORD` |
| Check health | `curl http://localhost:8000/health` |
| Stop everything | `sudo docker compose -f docker-compose.control.yml down` |
| Clean Docker | `sudo docker system prune -a` |
| Backup DB | `sudo docker compose -f docker-compose.control.yml exec -T db pg_dump -U admin transcoding_db > backup.sql` |

---

## Need Help?

- Check logs first: `sudo docker compose -f docker-compose.*.yml logs --tail=50`
- Verify `.env` file exists and has correct values
- Ensure Tailscale is connected: `tailscale status`
- Check firewall: `sudo ufw status`
- Verify Docker is running: `sudo systemctl status docker`