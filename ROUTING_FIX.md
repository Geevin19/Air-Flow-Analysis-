# 🔧 Complete Routing Fix

## Problems Fixed

1. ❌ "Invalid host header" from FastAPI
2. ❌ 405 Method Not Allowed on /api/register
3. ❌ Frontend calling wrong API path
4. ❌ Nginx not routing /api correctly

## Solutions Applied

### 1. Backend Fix (FastAPI)

**File:** `backend/main.py`

**Changes:**
- ✅ **REMOVED** `TrustedHostMiddleware` completely
- ✅ **REMOVED** import for `TrustedHostMiddleware`
- ✅ Kept CORS enabled with wildcard `["*"]`
- ✅ Routes remain without `/api` prefix:
  - `@app.post("/register")`
  - `@app.post("/token")`
  - `@app.get("/docs")`

**Why:** TrustedHostMiddleware was causing "Invalid host header" errors. Removing it allows all domains.

### 2. Nginx Fix (CRITICAL)

**File:** `nginx/nginx.conf`

**Key Changes:**
```nginx
# CRITICAL: proxy_pass MUST end with /
location /api/ {
    proxy_pass http://backend_api/;  # ← Trailing slash strips /api
    ...
}
```

**How it works:**
- Request: `http://airflowanalysis.xyz/api/register`
- Nginx strips `/api` prefix
- Forwards to backend: `http://backend:8000/register`
- Backend route matches: `@app.post("/register")`

**Simplified to single server block:**
- Handles all domains: `airflowanalysis.xyz`, `api.airflowanalysis.xyz`, `localhost`
- Routes `/api/*` → backend
- Routes `/*` → frontend
- Routes `/ws/*` → WebSocket

### 3. Frontend Fix

**File:** `Frontend/src/services/api.ts`

**Before:**
```typescript
const API_BASE = import.meta.env.VITE_API_URL || 'http://api.airflowanalysis.xyz';
```

**After:**
```typescript
const API_BASE = '/api';  // Relative path
```

**Why:** Using relative path `/api` works everywhere:
- Local: `http://localhost/api/register`
- Production: `http://airflowanalysis.xyz/api/register`
- No hardcoded IPs or domains

**File:** `Frontend/Dockerfile`

**Removed:**
```dockerfile
ARG VITE_API_URL=...
ENV VITE_API_URL=...
```

**Why:** No build args needed, uses relative path

**File:** `docker-compose.yml`

**Removed:**
```yaml
args:
  VITE_API_URL: http://api.airflowanalysis.xyz
```

### 4. Docker Compose Verification

**File:** `docker-compose.yml`

✅ All services on same network: `airflow_network`
✅ Container names:
- `airflow-backend`
- `airflow-frontend`
- `airflow-nginx`
- `airflow-postgres`

## Deployment Steps

### 1. Clean Rebuild (REQUIRED)

```bash
# Stop all containers
docker-compose down

# Remove all Docker resources (optional but recommended)
docker system prune -af

# Rebuild and start
docker-compose up -d --build
```

### 2. Verify Services

```bash
# Check all services are running
docker-compose ps

# Should show:
# airflow-postgres   Up (healthy)
# airflow-backend    Up (healthy)
# airflow-frontend   Up
# airflow-nginx      Up
```

### 3. Test Endpoints

```bash
# Test frontend
curl http://airflowanalysis.xyz

# Test API docs
curl http://airflowanalysis.xyz/api/docs

# Test health
curl http://airflowanalysis.xyz/api/health

# Test register (should return 422 for missing data, not 405)
curl -X POST http://airflowanalysis.xyz/api/register
```

## Expected Results

### ✅ Working Endpoints

| Endpoint | Expected Result |
|----------|----------------|
| `http://airflowanalysis.xyz` | Frontend loads |
| `http://airflowanalysis.xyz/api/docs` | FastAPI docs loads |
| `http://airflowanalysis.xyz/api/health` | `{"status":"healthy"}` |
| `http://airflowanalysis.xyz/api/register` | 422 (validation error) not 405 |
| `http://localhost` | Frontend loads (local testing) |
| `http://localhost/api/docs` | FastAPI docs loads (local testing) |

### ✅ No More Errors

- ❌ "Invalid host header" → ✅ Fixed
- ❌ 405 Method Not Allowed → ✅ Fixed
- ❌ CORS errors → ✅ Fixed
- ❌ Wrong API path → ✅ Fixed

## Architecture Flow

```
Browser Request: http://airflowanalysis.xyz/api/register
    ↓
Nginx (port 80)
    ↓
Matches: location /api/
    ↓
proxy_pass http://backend:8000/
    ↓
Strips /api prefix
    ↓
Forwards: http://backend:8000/register
    ↓
FastAPI Backend
    ↓
Matches: @app.post("/register")
    ↓
Returns: 200 OK
```

## Troubleshooting

### Still Getting 405 Errors?

1. **Check nginx logs:**
   ```bash
   docker-compose logs nginx
   ```

2. **Verify proxy_pass has trailing slash:**
   ```bash
   docker-compose exec nginx cat /etc/nginx/conf.d/default.conf | grep proxy_pass
   ```
   Should show: `proxy_pass http://backend_api/;`

3. **Test backend directly:**
   ```bash
   curl http://localhost:8000/docs
   ```

### Still Getting "Invalid host header"?

1. **Verify TrustedHostMiddleware is removed:**
   ```bash
   docker-compose exec backend grep -n "TrustedHost" main.py
   ```
   Should return nothing or only comments

2. **Rebuild backend:**
   ```bash
   docker-compose up -d --build backend
   ```

### Frontend Can't Reach API?

1. **Check API_BASE in browser console:**
   ```javascript
   // Should be '/api'
   ```

2. **Verify nginx routing:**
   ```bash
   curl -I http://localhost/api/health
   ```

3. **Check CORS headers:**
   ```bash
   curl -I http://localhost/api/health | grep -i access-control
   ```

## Files Changed

- ✅ `backend/main.py` - Removed TrustedHostMiddleware
- ✅ `Frontend/src/services/api.ts` - Changed to relative path `/api`
- ✅ `Frontend/Dockerfile` - Removed build args
- ✅ `Frontend/vite.config.ts` - Updated proxy config
- ✅ `nginx/nginx.conf` - Simplified single server block
- ✅ `docker-compose.yml` - Removed frontend build args

## Testing Checklist

- [ ] `docker-compose down` executed
- [ ] `docker-compose up -d --build` executed
- [ ] All 4 containers running (ps shows Up)
- [ ] Frontend loads at `http://airflowanalysis.xyz`
- [ ] API docs load at `http://airflowanalysis.xyz/api/docs`
- [ ] Health endpoint returns healthy
- [ ] Register endpoint returns 422 (not 405)
- [ ] No "Invalid host header" errors
- [ ] No CORS errors in browser console

## Success Criteria

✅ User can access frontend
✅ User can register account
✅ User can login
✅ API calls work from frontend
✅ No 405 errors
✅ No host header errors
✅ Works on both domain and localhost
