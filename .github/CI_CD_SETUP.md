# CI/CD Pipeline Setup

This project uses GitHub Actions for Continuous Integration and Continuous Deployment.

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

**What it does:**
- SSHs into your VPS
- Pulls the latest code
- Rebuilds and restarts all Docker containers
- Runs database migrations
- Performs health checks on the API and Frontend

## Required GitHub Secrets

For the CD pipeline to work, you need to set up these secrets in your GitHub repository:

Go to: **Repository Settings → Secrets and variables → Actions → New repository secret**

| Secret Name | Description | Example |
|-------------|-------------|---------|
| `VPS_HOST` | Your VPS IP address or domain | `123.456.789.0` |
| `VPS_USERNAME` | SSH username on your VPS | `ubuntu` |
| `VPS_SSH_KEY` | Your private SSH key (entire content) | `-----BEGIN OPENSSH PRIVATE KEY-----...` |
| `VPS_PORT` | SSH port (optional, defaults to 22) | `22` |

## How to Get Your SSH Key

If you don't have an SSH key yet:

```bash
# Generate a new SSH key
ssh-keygen -t ed25519 -C "github-actions" -f ~/.ssh/github_actions

# Copy the public key to your VPS
ssh-copy-id -i ~/.ssh/github_actions.pub user@your-vps-ip

# Copy the private key content (this goes into GitHub Secrets)
cat ~/.ssh/github_actions
```

## Deployment Flow

```
Push to main
    ↓
CI Workflow runs (lint + test + build)
    ↓
CI passes ✅
    ↓
CD Workflow triggers
    ↓
SSH into VPS → Pull → Build → Migrate → Health Check
    ↓
Deployment complete! 🚀
```

## Manual Deployment

If you need to deploy manually:

```bash
ssh user@your-vps-ip
cd ~/transcoding-app
git pull origin main
cp .env backend/.env
sudo docker compose -f docker-compose.control.yml up -d --build
sudo docker compose -f docker-compose.control.yml exec api alembic upgrade head
```

## Troubleshooting

### CI fails on backend import
- Check that all dependencies are in `requirements-api.txt`
- Ensure environment variables are set correctly in the test

### CD fails on SSH connection
- Verify your SSH key is correct (starts with `-----BEGIN OPENSSH PRIVATE KEY-----`)
- Check that the public key is in `~/.ssh/authorized_keys` on your VPS
- Ensure the VPS hostname/IP is correct

### CD fails on health check
- Check Docker logs: `sudo docker compose -f docker-compose.control.yml logs`
- Verify the `.env` file exists and has correct values
- Ensure ports 80 and 443 are open on your VPS