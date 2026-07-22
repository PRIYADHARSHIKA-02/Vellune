# Quick Start Guide

Get up and running with Vellune locally in under 5 minutes.

---

## 🚀 Step 1: Clone and Start Infrastructure

Start the local PostgreSQL and Redis containers using Docker Compose:

```bash
docker compose up -d
```

* This spins up PostgreSQL on port `5433` (to prevent conflicts with standard host services) and Redis on port `6380`.

---

## 🚀 Step 2: Initialize Database and Start Backend

Navigate to the backend directory, install packages, apply migrations, and boot the server:

```bash
cd backend
npm install

# Copy .env.example to .env and configure variables
cp .env.example .env

# Synchronize database schema directly via Drizzle
npm run db:push

# Start backend compiler
npm run dev
```

* The backend API server will run at `http://localhost:3001`.

---

## 🚀 Step 3: Start Frontend Client

In a new terminal window, navigate to the frontend directory, install dependencies, and run:

```bash
cd frontend
npm install
npm run dev
```

* The Next.js client application will boot at `http://localhost:3000`.
