# 🚀 DEPLOYMENT STACK - FIXED CONFIGURATION

## ✅ What Was Fixed

### 1. **Nginx Configuration**
- ✅ Removed upstream blocks (not needed for simple proxy)
- ✅ Direct proxy to `backend:8000` for API routes
- ✅ Serve frontend static files from `/usr/share/nginx/html`
- ✅ Proper trailing slash in `proxy_pass http://backend:8000/` to strip `/api` prefix
- ✅ Simplified server block for `airflowanalysis.xyz` and `www.airflowanalysis.xyz`
- ✅ Health check endpoint at `/health`

### 2. **Docker Compose**
- ✅ Nginx now mounts `./Frontend/dist:/usr/share/nginx/html:ro` to serve frontend
- ✅ Proper `depends_on` with health checks
- ✅ All services on same network: `airflow_network`
- ✅ Nginx exposes port 80 correctly
- ✅ Frontend healthcheck timeout increased to 10s

### 3. **Frontend API Calls**
- ✅ Already using `const API_BASE = '/api'` (no hardcoded IPs)
- ✅ No localhost references
- ✅ All API calls use relative paths

### 4. **Backend**
- ✅ No TrustedHostMiddleware (prevents host header errors)
- ✅ CORS allows all origins
- ✅ Routes without `/api` prefix (nginx handles routing)

---

## 📋 Deployment Steps

### **Step 1: Stop Existing Containers**
```bash
docker-compose down
```

### **Step 2: Clean Up (Optional but Recommended)**
```bash
docker system prune -af
docker volume prune -f
```

### **Step 3: Rebuild and Start**
```bash
docker-compose up -d --build
```

### **Step 4: Wait for Services to Start**
```bash
# Wait 30-60 seconds for all services to initialize
sleep 60
```

### **Step 5: Verify Deployment**

**On Linux/Mac:**
```bash
chmod +x verify-deployment.sh
./verify-deployment.sh
```

**On Windows:**
```powershell
.\verify-deployment.ps1
```

---

## 🧪 Manual Verification

### **1. Check Container Status**
```bash
docker ps
```

**Expected Output:**
```
CONTAINER ID   IMAGE                    STATUS                    PORTS                  NAMES
xxxxx          nginx:alpine             Up X minutes (healthy)    0.0.0.0:80->80/tcp     airflow-nginx
xxxxx          smarttracker-frontend    Up X minutes (healthy)    80/tcp                 airflow-frontend
xxxxx          smarttracker-backend     Up X minutes (healthy)    0.0.0.0:8000->8000/tcp airflow-backend
xxxxx          postgres:15-alpine       Up X minutes (healthy)    0.0.0.0:5432->5432/tcp airflow-postgres
```

### **2. Test Endpoints**

**Nginx Health:**
```bash
curl http://localhost/health
# Expected: healthy
```

**Backend Health:**
```bash
curl http://localhost/api/health
# Expected: {"status":"healthy","database":"connected","timestamp":"..."}
```

**Backend Root:**
```bash
curl http://localhost/api/
# Expected: {"message":"AirFlow Analysis API is running","version":"1.0.0","status":"healthy"}
```

**API Documentation:**
```bash
curl -I http://localhost/api/docs
# Expected: HTTP/1.1 200 OK
```

**Frontend:**
```bash
curl -I http://localhost/
# Expected: HTTP/1.1 200 OK
```

### **3. Test in Browser**

Open these URLs:
- **Frontend**: http://airflowanalysis.xyz
- **API Docs**: http://airflowanalysis.xyz/api/docs
- **Health Check**: http://airflowanalysis.xyz/health

---

## 🐛 Troubleshooting

### **Nginx Container Restarting**
```bash
docker logs airflow-nginx
```

**Common Issues:**
- Config syntax error → Run `docker run --rm -v $(pwd)/nginx/nginx.conf:/etc/nginx/conf.d/default.conf:ro nginx:alpine nginx -t`
- Backend not reachable → Check `docker network inspect smarttracker_airflow_network`
- Frontend files missing → Check `docker exec airflow-nginx ls -la /usr/share/nginx/html`

### **Backend Not Responding**
```bash
docker logs airflow-backend
```

**Common Issues:**
- Database not ready → Wait for postgres healthcheck
- Port conflict → Check if port 8000 is already in use

### **Frontend Not Loading**
```bash
docker logs airflow-frontend
docker exec airflow-nginx ls -la /usr/share/nginx/html
```

**Common Issues:**
- Build failed → Check `docker logs airflow-frontend`
- Files not mounted → Verify `./Frontend/dist` exists and is mounted in nginx

### **Database Connection Issues**
```bash
docker logs airflow-postgres
docker exec -it airflow-postgres psql -U airflow -d airflowdb -c "\dt"
```

---

## 🔄 Request Flow

### **Frontend Request:**
```
Browser → http://airflowanalysis.xyz/
         ↓
Nginx (port 80) → serves from /usr/share/nginx/html/index.html
         ↓
React App loads in browser
```

### **API Request:**
```
Browser → fetch('/api/register')
         ↓
Nginx receives: http://airflowanalysis.xyz/api/register
         ↓
Nginx strips /api → proxy_pass http://backend:8000/register
         ↓
Backend receives: http://backend:8000/register
         ↓
FastAPI processes request
         ↓
Response → Nginx → Browser
```

---

## 📊 Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    airflowanalysis.xyz                      │
│                         (Port 80)                           │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
                    ┌─────────────────┐
                    │  Nginx (Alpine) │
                    │  airflow-nginx  │
                    └─────────────────┘
                         │         │
           ┌─────────────┘         └─────────────┐
           ▼                                     ▼
  ┌─────────────────┐                  ┌─────────────────┐
  │  Frontend       │                  │  Backend        │
  │  (React + Vite) │                  │  (FastAPI)      │
  │  /usr/share/    │                  │  backend:8000   │
  │  nginx/html     │                  └─────────────────┘
  └─────────────────┘                           │
                                                ▼
                                       ┌─────────────────┐
                                       │  PostgreSQL     │
                                       │  db:5432        │
                                       └─────────────────┘
```

---

## ✅ Success Criteria

- [ ] All 4 containers running and healthy
- [ ] `http://airflowanalysis.xyz` loads frontend
- [ ] `http://airflowanalysis.xyz/api/docs` shows API documentation
- [ ] `http://airflowanalysis.xyz/api/health` returns healthy status
- [ ] Registration works without errors
- [ ] Login works and redirects to dashboard
- [ ] No 405 Method Not Allowed errors
- [ ] No Invalid host header errors
- [ ] No container restarts in `docker ps`

---

## 🎯 Final Checklist

```bash
# 1. Stop everything
docker-compose down

# 2. Rebuild
docker-compose up -d --build

# 3. Wait
sleep 60

# 4. Verify
docker ps  # All should be "Up" and "healthy"

# 5. Test
curl http://localhost/health
curl http://localhost/api/health
curl http://localhost/api/docs

# 6. Browser test
# Open http://airflowanalysis.xyz
# Try registration and login
```

---

## 📝 Configuration Files

### **nginx/nginx.conf**
- Single server block for `airflowanalysis.xyz`
- `/api/` proxies to `backend:8000/` (strips prefix)
- `/` serves from `/usr/share/nginx/html`

### **docker-compose.yml**
- Nginx mounts `./Frontend/dist:/usr/share/nginx/html:ro`
- Proper `depends_on` with health checks
- All services on `airflow_network`

### **Frontend/src/services/api.ts**
- `const API_BASE = '/api'` (relative path)
- No hardcoded IPs or domains

### **backend/main.py**
- No TrustedHostMiddleware
- CORS allows all origins
- Routes without `/api` prefix

---

**🎉 Your deployment is now fixed and ready for production!**
