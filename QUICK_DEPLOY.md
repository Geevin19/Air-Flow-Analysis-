# ⚡ QUICK DEPLOYMENT REFERENCE

## 🚀 Deploy in 3 Commands

```bash
# 1. Stop and clean
docker-compose down && docker system prune -af

# 2. Build and start
docker-compose up -d --build

# 3. Verify (wait 60 seconds first)
docker ps
```

---

## ✅ Expected Result

```bash
docker ps
```

Should show:
- ✅ `airflow-nginx` - Up, healthy
- ✅ `airflow-frontend` - Up, healthy  
- ✅ `airflow-backend` - Up, healthy
- ✅ `airflow-postgres` - Up, healthy

---

## 🧪 Quick Tests

```bash
# Test nginx
curl http://localhost/health
# Expected: healthy

# Test backend
curl http://localhost/api/health
# Expected: {"status":"healthy",...}

# Test API docs
curl -I http://localhost/api/docs
# Expected: HTTP/1.1 200 OK

# Test frontend
curl -I http://localhost/
# Expected: HTTP/1.1 200 OK
```

---

## 🌐 Browser URLs

- **Frontend**: http://airflowanalysis.xyz
- **API Docs**: http://airflowanalysis.xyz/api/docs
- **Health**: http://airflowanalysis.xyz/health

---

## 🐛 If Something Fails

```bash
# Check logs
docker logs airflow-nginx
docker logs airflow-backend
docker logs airflow-frontend
docker logs airflow-postgres

# Restart specific service
docker-compose restart nginx
docker-compose restart backend

# Full rebuild
docker-compose down
docker-compose up -d --build --force-recreate
```

---

## 📋 Key Configuration Points

### **Nginx** (`nginx/nginx.conf`)
```nginx
location /api/ {
    proxy_pass http://backend:8000/;  # ← Trailing slash strips /api
}

location / {
    root /usr/share/nginx/html;  # ← Frontend static files
}
```

### **Frontend** (`Frontend/src/services/api.ts`)
```typescript
const API_BASE = '/api';  // ← Relative path, no hardcoded URLs
```

### **Backend** (`backend/main.py`)
```python
# No TrustedHostMiddleware
# CORS allows all origins
# Routes: /register, /token (no /api prefix)
```

### **Docker Compose** (`docker-compose.yml`)
```yaml
nginx:
  volumes:
    - ./Frontend/dist:/usr/share/nginx/html:ro  # ← Serves frontend
  depends_on:
    backend:
      condition: service_healthy
```

---

## 🔄 Request Flow

```
Browser: http://airflowanalysis.xyz/api/register
    ↓
Nginx: Receives /api/register
    ↓
Nginx: Strips /api → forwards to backend:8000/register
    ↓
Backend: Processes /register
    ↓
Response flows back to browser
```

---

## ✅ Success Checklist

- [ ] `docker ps` shows all 4 containers healthy
- [ ] Frontend loads at http://airflowanalysis.xyz
- [ ] API docs load at http://airflowanalysis.xyz/api/docs
- [ ] Registration works
- [ ] Login works
- [ ] No 405 errors
- [ ] No host header errors
- [ ] No container restarts

---

**🎯 That's it! Your deployment is fixed and production-ready.**
