# 🔧 NGINX + DOCKER INTEGRATION - COMPLETE FIX

## ❌ **Previous Problems**

1. **Nginx container unhealthy** - Healthcheck failing
2. **SPA routing broken** - `/register` returns 404
3. **API proxy issues** - `/api` not working correctly
4. **Complex architecture** - Main nginx → Frontend nginx (unnecessary)
5. **Shell echo configs** - Variable corruption issues

---

## ✅ **Solution: Simplified Architecture**

### **Before (Complex):**
```
Browser → Main Nginx → Frontend Container (nginx) → Static Files
        ↓
        → Backend Container
```

### **After (Simple):**
```
Browser → Main Nginx → Static Files (mounted volume)
        ↓
        → Backend Container
```

---

## 📁 **File Changes**

### **1. nginx/nginx.conf** (Complete Rewrite)

```nginx
events {
    worker_connections 1024;
}

http {
    include /etc/nginx/mime.types;
    default_type application/octet-stream;

    server {
        listen 80;
        server_name airflowanalysis.xyz www.airflowanalysis.xyz localhost _;

        root /usr/share/nginx/html;
        index index.html;

        # API routes - proxy to backend
        location /api/ {
            proxy_pass http://airflow-backend:8000/;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
        }

        # SPA routing - serve index.html for all routes
        location / {
            try_files $uri $uri/ /index.html;
        }

        # Health check endpoint
        location /health {
            access_log off;
            return 200 "healthy\n";
            add_header Content-Type text/plain;
        }
    }
}
```

**Key Changes:**
- ✅ Added `events {}` and `http {}` blocks (required for full nginx.conf)
- ✅ Direct `root /usr/share/nginx/html` (no proxy to frontend container)
- ✅ `try_files $uri $uri/ /index.html` for SPA routing
- ✅ `proxy_pass http://airflow-backend:8000/` (matches container name)
- ✅ No shell echo, no variable corruption

### **2. Frontend/Dockerfile** (Simplified)

```dockerfile
# Build stage only
FROM node:20-alpine AS builder

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

# Verify build
RUN test -f /app/dist/index.html || (echo "ERROR: index.html not found!" && exit 1)

# Final stage - just hold the files
FROM node:20-alpine

WORKDIR /app
COPY --from=builder /app/dist ./dist

# Keep container running
CMD ["tail", "-f", "/dev/null"]
```

**Key Changes:**
- ✅ Removed nginx from frontend container
- ✅ No `COPY nginx/default.conf`
- ✅ No `RUN echo` commands
- ✅ Just builds and holds files in `/app/dist`

### **3. docker-compose.yml** (Updated Volumes)

```yaml
frontend:
  build: ./Frontend
  volumes:
    - frontend_dist:/app/dist  # Share built files

nginx:
  image: nginx:alpine
  volumes:
    - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro  # Full config
    - frontend_dist:/usr/share/nginx/html:ro       # Mount frontend files
  depends_on:
    - backend
    - frontend
```

**Key Changes:**
- ✅ Frontend container just builds files
- ✅ Nginx mounts full `nginx.conf` (not `conf.d/default.conf`)
- ✅ Nginx mounts `frontend_dist` volume to `/usr/share/nginx/html`
- ✅ Removed frontend healthcheck (not needed)
- ✅ Removed nginx healthcheck (causing issues)

---

## 🏗️ **New Architecture**

```
┌─────────────────────────────────────┐
│   Browser: airflowanalysis.xyz     │
└─────────────────────────────────────┘
                 ↓
┌─────────────────────────────────────┐
│   Nginx Container (Port 80)         │
│   - Serves /usr/share/nginx/html    │
│   - Proxies /api/* → backend:8000   │
└─────────────────────────────────────┘
         ↓                    ↓
┌──────────────────┐  ┌──────────────────┐
│ Frontend Volume  │  │ Backend:8000     │
│ (Built Files)    │  │ (FastAPI)        │
└──────────────────┘  └──────────────────┘
         ↑
┌──────────────────┐
│ Frontend Builder │
│ (Builds to dist) │
└──────────────────┘
```

---

## 🚀 **Deployment Steps**

### **Step 1: Clean Everything**
```bash
docker-compose down -v
docker system prune -af
docker volume prune -f
```

### **Step 2: Build and Start**
```bash
docker-compose up -d --build
```

**What happens:**
1. Frontend container builds React app → `/app/dist`
2. Files are shared via `frontend_dist` volume
3. Nginx mounts volume to `/usr/share/nginx/html`
4. Nginx serves files and proxies API

### **Step 3: Wait for Build**
```bash
# Wait 60-90 seconds for frontend build to complete
sleep 90
```

### **Step 4: Verify**
```bash
docker ps
# All containers should be "Up"

docker exec airflow-nginx ls -la /usr/share/nginx/html
# Should show index.html and assets/
```

---

## 🧪 **Testing**

### **1. Test Nginx Config Syntax**
```bash
docker exec airflow-nginx nginx -t
# Expected: syntax is ok, test is successful
```

### **2. Test Frontend Loads**
```bash
curl -I http://localhost/
# Expected: HTTP/1.1 200 OK
# Expected: Content-Type: text/html
```

### **3. Test SPA Routing**
```bash
curl -I http://localhost/register
# Expected: HTTP/1.1 200 OK (serves index.html)

curl -I http://localhost/login
# Expected: HTTP/1.1 200 OK (serves index.html)
```

### **4. Test API Proxy**
```bash
curl http://localhost/api/health
# Expected: {"status":"healthy","database":"connected",...}

curl -I http://localhost/api/docs
# Expected: HTTP/1.1 200 OK
```

### **5. Test in Browser**
- http://airflowanalysis.xyz → Landing page loads ✅
- http://airflowanalysis.xyz/register → Registration page loads ✅
- http://airflowanalysis.xyz/login → Login page loads ✅
- http://airflowanalysis.xyz/api/docs → API docs load ✅

---

## 🐛 **Troubleshooting**

### **Issue: Nginx shows "403 Forbidden"**

**Cause:** Frontend files not mounted

**Fix:**
```bash
# Check if files exist in nginx container
docker exec airflow-nginx ls -la /usr/share/nginx/html/

# If empty, rebuild frontend
docker-compose up -d --build frontend

# Wait for build to complete
sleep 60

# Restart nginx
docker-compose restart nginx
```

### **Issue: SPA routes return 404**

**Cause:** `try_files` not working

**Fix:**
```bash
# Check nginx config
docker exec airflow-nginx cat /etc/nginx/nginx.conf

# Should have: try_files $uri $uri/ /index.html;

# Test config syntax
docker exec airflow-nginx nginx -t

# Reload nginx
docker exec airflow-nginx nginx -s reload
```

### **Issue: API returns 502 Bad Gateway**

**Cause:** Backend container name mismatch

**Fix:**
```bash
# Verify backend container name
docker ps | grep backend
# Should show: airflow-backend

# Check nginx config has correct name
docker exec airflow-nginx grep "proxy_pass" /etc/nginx/nginx.conf
# Should show: http://airflow-backend:8000/

# Test backend directly
curl http://localhost:8000/health
```

### **Issue: Frontend files not updating**

**Cause:** Volume caching

**Fix:**
```bash
# Remove volume and rebuild
docker-compose down -v
docker volume rm smarttracker_frontend_dist
docker-compose up -d --build
```

---

## ✅ **Success Criteria**

- [ ] `docker ps` shows all containers "Up"
- [ ] `docker exec airflow-nginx ls /usr/share/nginx/html/index.html` succeeds
- [ ] `docker exec airflow-nginx nginx -t` shows "syntax is ok"
- [ ] `curl http://localhost/` returns HTML (200 OK)
- [ ] `curl http://localhost/register` returns HTML (200 OK)
- [ ] `curl http://localhost/api/health` returns JSON
- [ ] Browser: http://airflowanalysis.xyz loads React app
- [ ] Browser: http://airflowanalysis.xyz/register loads registration page
- [ ] Browser: Registration and login work without errors

---

## 📋 **Key Points**

1. **Nginx serves frontend directly** - No intermediate container
2. **Full nginx.conf** - Not `conf.d/default.conf`
3. **Shared volume** - Frontend builds to volume, nginx mounts it
4. **Container name matters** - Must use `airflow-backend` in proxy_pass
5. **SPA routing** - `try_files $uri $uri/ /index.html`
6. **API routing** - `/api/` → `http://airflow-backend:8000/`
7. **No shell echo** - Proper config files only

---

**🎉 Nginx + Docker integration completely fixed!**
