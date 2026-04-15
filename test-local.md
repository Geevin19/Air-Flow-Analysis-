# 🧪 Quick Local Test (No Docker Required)

## Option 1: Test with Existing Supabase (Fastest)

### Backend (Terminal 1)
```powershell
cd backend

# Run backend with existing Supabase
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### Frontend (Terminal 2)
```powershell
cd Frontend

# Run frontend
npm run dev
```

**Access:**
- Frontend: http://localhost:5173
- Backend: http://localhost:8000
- API Docs: http://localhost:8000/api/docs

---

## Option 2: Test Full Docker Stack (Production-like)

### Prerequisites
1. Start Docker Desktop
2. Wait for it to be fully running

### Run
```powershell
# Build (first time only - takes 5-10 minutes)
docker-compose build

# Start all services
docker-compose up -d

# View logs
docker-compose logs -f
```

**Access:**
- Frontend: http://localhost
- Backend: http://localhost:8000
- API Docs: http://localhost:8000/api/docs

### Stop
```powershell
docker-compose down
```

---

## What's Running

### Without Docker:
- Backend: FastAPI on port 8000 (connected to Supabase)
- Frontend: Vite dev server on port 5173

### With Docker:
- PostgreSQL: Port 5432
- Backend: Gunicorn + Uvicorn on port 8000
- Frontend: Nginx on port 3000
- Nginx Proxy: Port 80

---

## Recommendation

**For development/testing:** Use Option 1 (no Docker)
**For production testing:** Use Option 2 (Docker)

The Docker build is currently running in the background and will complete in a few minutes.
