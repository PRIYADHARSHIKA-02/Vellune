# Full Stack Setup Guide

A comprehensive guide to configuring, migrating, and running Vellune's frontend and backend services.

---

## 🛠️ Infrastructure Requirements

### Docker Containers
Vellune relies on containerized **PostgreSQL** and **Redis** to ensure zero host service dependencies:

```yaml
# docker-compose.yml
services:
  postgres:
    image: postgres:15-alpine
    ports:
      - "5433:5432" # Mapped to 5433 to avoid local postgres conflicts
  redis:
    image: redis:7-alpine
    ports:
      - "6380:6379" # Mapped to 6380 to avoid local redis conflicts
```

Run compose from the root:
```bash
docker compose up -d
```

---

## 🔌 Backend Server Configuration

1. Install dependencies:
   ```bash
   cd backend
   npm install
   ```

2. Configure Environment Variables (`backend/.env`):
   ```env
   PORT=3000
   DATABASE_URL=postgres://postgres:postgres@localhost:5433/vellune
   REDIS_URL=redis://localhost:6380
   JWT_SECRET=super_secure_key
   ```

3. Synchronize Schema:
   Drizzle ORM handles database synchronization directly without long SQL scripts:
   ```bash
   npm run db:push
   ```

4. Boot Development Compiler:
   ```bash
   npm run dev
   ```

---

## 💻 Frontend Client Configuration

1. Install dependencies:
   ```bash
   cd frontend
   npm install
   ```

2. Configure Environment Variables (`frontend/.env.local`):
   ```env
   NEXT_PUBLIC_API_URL=http://localhost:3000/api/v1
   ```

3. Boot Next.js Dev Server:
   ```bash
   npm run dev
   ```
