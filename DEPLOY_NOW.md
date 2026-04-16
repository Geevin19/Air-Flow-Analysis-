# ⚡ DEPLOY NOW - COMPLETE GUIDE

## 🚀 Quick Deploy (3 Commands)

```bash
# 1. Stop and clean
docker-compose down && docker system prune -af

# 2. Build and start (this will take 2-3 minutes)
docker-compose up -d --build

# 3. Wait and verify
sleep 90 && docker ps
```

---

## ✅ Expected Output

```bash
docker ps
```

Should show **ALL HEALTHY**:
```
CONTAINER ID   IMAGE                    STATUS                    NAMES
xxxxx          nginx:alpine             Up X mins (healthy)       airflow-nginx
xxxxx          smarttracker-frontend    Up X mins (healthy)       airflow-frontend
xxxxx          smarttracker-backend     Up X mins (healthy)       airflow-backend
xxxxx          postgres:15-alpine       Up X mins (healthy)       airflow-postgres
```

---

## 🧪 Quick Tests

```bash
# 1. Test frontend
curl -I http://localhost/
# Expected: HTTP/1.1 200 OK

# 2. Test API
curl http://localhost/api/health
# Expected: {"status":"healthy","database":"connected",...}

# 3. Test API docs
curl -I http://localhost/api/docs
# Expected: HTTP/1.1 200 OK
```

---

## 🌐 Browser Tests

Open these URLs and verify they load:

1. **Frontend**: http://airflowanalysis.xyz
   - Should show landing page ✅

2. **Register**: http://airflowanalysis.xyz/register
   - Should show registration form ✅

3. **Login**: http://airflowanalysis.xyz/login
   - Should show login form ✅

4. **API Docs**: http://airflowanalysis.xyz/api/docs
   - Should show FastAPI Swagger UI ✅

---

## 🔍 Detailed Verification

**Run the verification script:**

**Linux/Mac:**
```bash
chmod +x verify-frontend-build.sh
./verify-frontend-build.sh
```

**Windows:**
```powershell
.\verify-frontend-build.ps1
```

---

## 🐛 If Something Fails

### **Container Not Healthy**
```bash
# Check logs
docker logs airflow-nginx
docker logs airflow-frontend
docker logs airflow-backend

# Restart specific service
docker-compose restart nginx
```

### **Frontend Shows 403/404**
```bash
# Verify index.html exists
docker exec airflow-frontend ls -la /usr/share/nginx/html/

# Should show index.html and assets/ folder
# If missing, rebuild:
docker-compose up -d --build frontend
```

### **API Not Working**
```bash
# Check backend logs
docker logs airflow-backend

# Test backend directly
curl http://localhost:8000/health
```

### **Complete Reset**
```bash
# Nuclear option - clean everything
docker-compose down -v
docker system prune -af --volumes
docker-compose up -d --build
```

---

## 📋 What Changed

### **Frontend Dockerfile**
- ✅ Multi-stage build: Node → Nginx
- ✅ Vite builds to `/app/dist`
- ✅ Copies to `/usr/share/nginx/html`
- ✅ Verifies `index.html` exists
- ✅ Configures SPA routing

### **Nginx Config**
- ✅ Upstream for `frontend:80`
- ✅ Upstream for `backend:8000`
- ✅ `/api/` → backend (strips prefix)
- ✅ `/` → frontend (proxies)

### **Docker Compose**
- ✅ Frontend runs nginx internally
- ✅ Main nginx proxies to frontend
- ✅ Proper health checks
- ✅ All on same network

---

## 🎯 Architecture

```
┌─────────────────────────────────────┐
│   Browser: airflowanalysis.xyz     │
└─────────────────────────────────────┘
                 ↓
┌─────────────────────────────────────┐
│   Main Nginx (Port 80)              │
│   - Routes /api/* → backend         │
│   - Routes /* → frontend            │
└─────────────────────────────────────┘
         ↓                    ↓
┌──────────────────┐  ┌──────────────────┐
│ Frontend:80      │  │ Backend:8000     │
│ (Nginx + React)  │  │ (FastAPI)        │
└──────────────────┘  └──────────────────┘
                              ↓
                      ┌──────────────────┐
                      │ PostgreSQL:5432  │
                      └──────────────────┘
```

---

## ✅ Final Checklist

- [ ] All 4 containers running and healthy
- [ ] Frontend loads at http://airflowanalysis.xyz
- [ ] Register page loads at http://airflowanalysis.xyz/register
- [ ] Login page loads at http://airflowanalysis.xyz/login
- [ ] API docs load at http://airflowanalysis.xyz/api/docs
- [ ] API health returns JSON at http://airflowanalysis.xyz/api/health
- [ ] Can register new user
- [ ] Can login with credentials
- [ ] No 403, 404, 500, or 502 errors

---

## 📚 Documentation

- **FRONTEND_FIX.md** - Detailed frontend integration guide
- **DEPLOYMENT_FIXED.md** - Complete deployment documentation
- **QUICK_DEPLOY.md** - Quick reference card
- **verify-frontend-build.sh** - Automated verification script

---

**🎉 Your deployment is ready! Deploy now and test!**
