# CI/CD Pipeline Setup

This project uses GitHub Actions for Continuous Integration and Continuous Deployment across multiple VPS nodes.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     GitHub Actions                           │
│                                                              │
│  CI (on push/PR)              CD (after CI passes on main)  │
│  ┌─────────────────┐          ┌─────────────────────────┐   │
│  │ • Lint backend  │          │  Deploy to 3 VPS nodes  │   │
│  │ • Lint frontend │  ──────> │  (in parallel)          │   │
│  │ • Build Docker  │          │                         │   │
│  └─────────────────┘          └─────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                                    │
            ┌───────────────────────┼───────────────────────┐
            ▼                       ▼                       ▼
   ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
   │  VPS 1 (Control)│    │ VPS 2 (Worker)  │    │ VPS 3 (ML)      │
   │                 │    │                 │    │                 │
   │ • Frontend      │    │ • Transcode     │    │ • WhisperX      │
   │ • API           │    │   Worker        │    │   Subtitles     │
   │ • PostgreSQL    │    │ • FFmpeg        │    │ • GPU/CPU       │
   │ • Redis         │    │                 │    │                 │
   │ • Traefik       │    │                 │    │                 │
   └─────────────────┘    └─────────────────┘    └─────────────────┘
```

## Workflows

### 1. CI - Lint, Test & Build (`.github/workflows/ci.yml`)

Runs on every push and pull request to `main` and `develop` branches.

**What it does:**
- **Backend CI:**
  - Lints Python code with flake8
  - Checks code formatting with black
  - Verifies the app can import successfully
- **Frontend CI:**
  - Installs Node.js dependencies
  - Runs ESLint
  - Builds the frontend
- **Docker Build:**
  - Builds all Docker images (API, Worker, ML Worker, Frontend) to verify they build correctly

### 2. CD - Deploy to Production (`.github/workflows/cd.yml`)

Runs automatically when CI passes on the `main` branch.

**Deploys to 3 VPS nodes in parallel:**
1. **Control Plane** (VPS 1): Frontend + API + PostgreSQL + Redis + Traefik
2. **Transcode Worker** (VPS 2): Celery worker for FFmpeg tasks
3. **ML Worker** (VPS 3): Celery worker for WhisperX subtitle generation

## Required GitHub Secrets

Go to: **Repository Settings → Secrets and variables → Actions → New repository secret**

### Control Plane (VPS 1)

| Secret Name | Description | Example |
|-------------|-------------|---------|
| `CONTROL_VPS_HOST` | VPS 1 IP address or domain | `100.64.0.1` |
| `CONTROL_VPS_USERNAME` | SSH username | `ubuntu` |
| `CONTROL_VPS_SSH_KEY` | Private SSH key (full content) | `-----BEGIN OPENSSH...` |
| `CONTROL_VPS_PORT` | SSH port (optional, default 22) | `22` |

### Transcode Worker (VPS 2)

| Secret Name | Description | Example |
|-------------|-------------|---------|
| `WORKER_VPS_HOST` | VPS 2 IP address or domain | `100.64.0.2` |
| `WORKER_VPS_USERNAME` | SSH username | `ubuntu` |
| `WORKER_VPS_SSH_KEY` | Private SSH key (full content) | `-----BEGIN OPENSSH...` |
| `WORKER_VPS_PORT` | SSH port (optional, default 22) | `22` |

### ML Worker (VPS 3)

| Secret Name | Description | Example |
|-------------|-------------|---------|
| `ML_VPS_HOST` | VPS 3 IP address or domain | `100.64.0.3` |
| `ML_VPS_USERNAME` | SSH username | `ubuntu` |
| `ML_VPS_SSH_KEY` | Private SSH key (full content) | `-----BEGIN OPENSSH...` |
| `ML_VPS_PORT` | SSH port (optional, default 22) | `22` |

## Setting Up SSH Keys

You can use the **same SSH key for all 3 VPS** or separate keys per VPS.

### Option 1: Single Key for All VPS (Simpler)

```bash
# Generate one SSH key
ssh-keygen -t ed25519 -C "github-actions" -f ~/.ssh/github_actions

# Copy to all 3 VPS
ssh-copy-id -i ~/.ssh/github_actions.pub ubuntu@vps1-ip
ssh-copy-id -i ~/.ssh/github_actions.pub ubuntu@vps2-ip
ssh-copy-id -i ~/.ssh/github_actions.pub ubuntu@vps3-ip

# Use the same private key for all 3 secrets in GitHub
cat ~/.ssh/github_actions
```

### Option 2: Separate Keys per VPS (More Secure)

```bash
# Generate separate keys
ssh-keygen -t ed25519 -C "github-control" -f ~/.ssh/gh_control
ssh-keygen -t ed25519 -C "github-worker" -f ~/.ssh/gh_worker
ssh-keygen -t ed25519 -C "github-ml" -f ~/.ssh/gh_ml

# Copy each key to its VPS
ssh-copy-id -i ~/.ssh/gh_control.pub ubuntu@vps1-ip
ssh-copy-id -i ~/.ssh/gh_worker.pub ubuntu@vps2-ip
ssh-copy-id -i ~/.ssh/gh_ml.pub ubuntu@vps3-ip
```

## Deployment Flow

```
Push to main
    ↓
CI Workflow runs (lint + test + build)
    ↓
CI passes ✅
    ↓
CD Workflow triggers 3 parallel jobs:
    ├── Control VPS: Pull → Build → Migrate → Health Check
    ├── Worker VPS:  Pull → Build
    └── ML VPS:      Pull → Build
    ↓
All deployments complete → Summary notification
```

## Manual Deployment

### Control Plane (VPS 1)
```bash
ssh ubuntu@vps1-ip
cd ~/transcoding-app
git pull origin main
cp .env backend/.env
sudo docker compose -f docker-compose.control.yml up -d --build
sudo docker compose -f docker-compose.control.yml exec api alembic upgrade head
```

### Transcode Worker (VPS 2)
```bash
ssh ubuntu@vps2-ip
cd ~/transcoding-app
git pull origin main
cp .env backend/.env
sudo docker compose -f docker-compose.worker.yml up -d --build
```

### ML Worker (VPS 3)
```bash
ssh ubuntu@vps3-ip
cd ~/transcoding-app
git pull origin main
cp .env backend/.env
sudo docker compose -f docker-compose.ml.yml up -d --build
```

## Troubleshooting

### CI fails on backend import
- Check that all dependencies are in `requirements-api.txt`
- Ensure environment variables are set correctly in the test

### CD fails on SSH connection
- Verify your SSH key is correct (starts with `-----BEGIN OPENSSH PRIVATE KEY-----`)
- Check that the public key is in `~/.ssh/authorized_keys` on your VPS
- Ensure the VPS hostname/IP is correct

### CD fails on health check (Control Plane only)
- Check Docker logs: `sudo docker compose -f docker-compose.control.yml logs`
- Verify the `.env` file exists and has correct values
- Ensure ports 80 and 443 are open on your VPS

### Worker deployment succeeds but jobs don't process
- Ensure `CONTROL_PLANE_IP` in `.env` points to the Control Plane's Tailscale IP
- Verify Redis is accessible from worker nodes (check Tailscale connectivity)
- Check worker logs: `sudo docker compose -f docker-compose.worker.yml logs -f`

## Adding More Workers

To add more transcode workers (horizontal scaling):

1. Set up a new VPS with Docker
2. Clone the repo and configure `.env`
3. Add new secrets in GitHub (`WORKER2_VPS_HOST`, etc.)
4. Add a new job in `cd.yml` (copy the `deploy-worker` job)

Each worker pulls from the same Redis queue, so they automatically share the workload.