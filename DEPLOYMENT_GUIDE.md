# Video Transcoding API - Production Deployment Guide

This guide walks you through deploying the distributed Video Transcoding and ML architecture across multiple Virtual Private Servers (VPS) using Docker, Celery, and Tailscale for secure networking.

## Architecture Overview

*   **VPS 1 (Control Plane):** Hosts the React Frontend, FastAPI Backend, PostgreSQL (Database), and Redis (Celery Broker).
*   **VPS 2 (Transcode Worker):** Dedicated CPU-optimized node for running `ffmpeg` tasks.
*   **VPS 3 (ML Worker):** GPU-optimized (or high CPU) node for running WhisperX subtitle generation tasks.
*   **Storage:** Cloudflare R2 or AWS S3 for storing video files and subtitles.
*   **Networking:** Tailscale VPN mesh to secure Postgres and Redis communication.

---

## Prerequisites

1.  **3 VPS Instances** (Ubuntu 22.04/24.04 recommended).
    *   *VPS 1:* 2GB+ RAM, standard CPU.
    *   *VPS 2:* Compute-optimized (e.g., dedicated vCPUs).
    *   *VPS 3:* GPU-instance (e.g., NVIDIA T4) or high-tier compute.
2.  **Cloudflare R2 or AWS S3 Credentials** (Access Key, Secret Key, Bucket Name).
3.  **A Domain Name** (optional, but recommended for the frontend/API).

---

## Step 1: Secure Networking with Tailscale

We will use Tailscale to create a secure, private network between your servers so Postgres and Redis are not exposed to the public internet.

1.  Create a free account at [tailscale.com](https://tailscale.com).
2.  SSH into **every** VPS (VPS 1, 2, and 3) and run the install script:
    ```bash
    curl -fsSL https://tailscale.com/install.sh | sh
    sudo tailscale up
    ```
    *Click the authentication link provided in the terminal to add each server to your Tailscale network.*
3.  On **VPS 1 (Control Plane)**, get your private Tailscale IP:
    ```bash
    tailscale ip -4
    ```
    *Save this IP address (e.g., `100.x.x.x`). We will refer to it as `<CONTROL_PLANE_IP>`.*

---

## Step 2: VPS 1 - Control Plane Setup

This node manages the API, Database, and Queues.

1.  **Install Docker & Git:**
    ```bash
    sudo apt update
    sudo apt install -y git docker.io docker-compose-v2
    sudo systemctl enable --now docker
    ```
2.  **Clone the Repository:**
    ```bash
    git clone <your-repo-url> transcoding-app
    cd transcoding-app
    ```
3.  **Configure Environment Variables:**
    Copy the provided `.env.example` file and configure it:
    ```bash
    cp .env.example .env
    nano .env
    ```
    *Ensure you set `BIND_IP`, your database credentials, and all API keys appropriately.*
4.  **Create the Backend `.env` link:**
    The API needs to read the `.env` file as well, so let's copy it into the backend directory so Docker Compose can mount it securely:
    ```bash
    cp .env backend/.env
    ```
5.  **Start the Control Plane:**
    ```bash
    sudo docker compose -f docker-compose.control.yml up -d --build
    ```
6.  **Run Database Migrations:**
    Initialize the PostgreSQL database schema using Alembic:
    ```bash
    sudo docker compose -f docker-compose.control.yml exec api alembic upgrade head
    ```

Traefik is now automatically routing traffic! You can access the application by navigating to the public IP of VPS 1 (`http://<VPS_IP>`).

---

## Step 3: VPS 2 - Transcode Worker Setup

This node pulls jobs from Redis and runs FFmpeg.

1.  **Install Docker & Git:** (Same as Step 2.1)
2.  **Clone the Repository:** (Same as Step 2.2)
3.  **Configure Environment Variables:**
    Copy the provided `.env.example` file and set the Control Plane's IP and API keys.
    ```bash
    cp .env.example .env
    nano .env
    ```
4.  **Configure Backend Variables:**
    Copy the `.env` file to the backend directory:
    ```bash
    cp .env backend/.env
    ```
5.  **Start the Transcode Worker:**
    ```bash
    sudo docker compose -f docker-compose.worker.yml up -d --build
    ```

---

## Step 4: VPS 3 - ML Worker Setup

This node generates subtitles using WhisperX.

1.  **Install Docker & Git:** (Same as Step 2.1)
2.  **(Optional but Recommended) Install NVIDIA Container Toolkit:**
    If this VPS has a GPU, install the NVIDIA drivers and docker toolkit so WhisperX can use CUDA.
    ```bash
    # Follow official NVIDIA docs to install nvidia-container-toolkit
    # Uncomment the `deploy` block in docker-compose.ml.yml
    ```
3.  **Clone the Repository:** (Same as Step 2.2)
4.  **Configure Environment Variables:**
    Configure `.env` and `backend/.env` exactly the same way you did for VPS 2.
    ```bash
    cp .env.example .env
    nano .env
    cp .env backend/.env
    ```
5.  **Start the ML Worker:**
    ```bash
    sudo docker compose -f docker-compose.ml.yml up -d --build
    ```

---

## Step 5: Verification & Maintenance

### Checking Logs
If a video fails to process, you can check the logs on the respective worker node:
*   **Transcode Worker (VPS 2):** `sudo docker logs -f transcoding-worker`
*   **ML Worker (VPS 3):** `sudo docker logs -f transcoding-worker-ml`
*   **API (VPS 1):** `sudo docker logs -f transcoding-api`

### Restarting Services
If you push new code via Git, pull the changes and rebuild the specific container:
```bash
git pull
sudo docker compose -f <your-compose-file>.yml up -d --build
```

### Securing the Web Dashboard with Traefik (HTTPS)
Your `docker-compose.control.yml` is now equipped with **Traefik** as a reverse proxy!
*   **Testing with IP:** Simply navigate to `http://<YOUR_VPS_IP>`. Traefik routes `/api`, `/docs`, and `/openapi.json` to the API container, and everything else to the Frontend React container.
*   **Enabling SSL (When you have a domain):**
    1. Update your `.env` on VPS 1 to include your domain:
       ```env
       DOMAIN=yourdomain.com
       SSL_EMAIL=your-email@example.com
       ```
    2. Open `docker-compose.control.yml` and find the blocks marked `UNCOMMENT THESE LINES LATER FOR SSL`.
    3. Uncomment those specific command flags under the `traefik` service to enable Let's Encrypt.
    4. Uncomment the `certresolver` labels under the `api` and `frontend` services, and change `entrypoints=web` to `entrypoints=websecure`.
    5. Run `sudo docker compose -f docker-compose.control.yml up -d` and Traefik will automatically provision your free SSL certificates!
