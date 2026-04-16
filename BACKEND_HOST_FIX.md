# 🔧 Backend Host Header Fix

## Problem
Backend was rejecting requests with "Invalid host header" error when accessed via custom domain `api.airflowanalysis.xyz`.

## Root Cause
FastAPI's `TrustedHostMiddleware` was commented out, but the default behavior still restricts hosts.

## Solution Applied

### 1. Enabled TrustedHostMiddleware with Wildcard
**File:** `backend/main.py`

```python
# Trusted host middleware - Allow all hosts for domain flexibility
app.add_middleware(
    TrustedHostMiddleware,
    allowed_hosts=["*"]
)
```

### 2. Ensured CORS is Fully Open
```python
# CORS Middleware - Allow all origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

### 3. Verified Server Binding
**File:** `backend/Dockerfile`

```dockerfile
CMD ["gunicorn", "main:app", \
     "--bind", "0.0.0.0:8000", \
     ...]
```

✅ Server binds to `0.0.0.0:8000` (accepts all interfaces)

## What Changed

### Before
```python
# Trusted host middleware disabled for domain flexibility
# app.add_middleware(
#     TrustedHostMiddleware,
#     allowed_hosts=['airflowanalysis.xyz', 'www.airflowanalysis.xyz', 'api.airflowanalysis.xyz', 'localhost', '127.0.0.1']
# )
```

### After
```python
# Trusted host middleware - Allow all hosts for domain flexibility
app.add_middleware(
    TrustedHostMiddleware,
    allowed_hosts=["*"]
)
```

## Testing

### 1. Rebuild Backend
```bash
docker-compose up -d --build backend
```

### 2. Test API Docs
```bash
# Should work without errors
curl http://api.airflowanalysis.xyz/docs

# Or open in browser
http://api.airflowanalysis.xyz/docs
```

### 3. Test Health Endpoint
```bash
curl http://api.airflowanalysis.xyz/health
```

### 4. Test from Frontend
```bash
# Frontend should be able to make API calls
curl http://airflowanalysis.xyz
```

## Verification Checklist

- [x] TrustedHostMiddleware enabled with `["*"]`
- [x] CORS allows all origins `["*"]`
- [x] Server binds to `0.0.0.0:8000`
- [x] No hardcoded host restrictions in code
- [x] Gunicorn runs with correct bind address

## Expected Results

✅ `http://api.airflowanalysis.xyz/docs` - Works
✅ `http://api.airflowanalysis.xyz/health` - Returns healthy status
✅ `http://api.airflowanalysis.xyz/openapi.json` - Returns OpenAPI spec
✅ Frontend can make API calls without CORS errors
✅ No "Invalid host header" errors

## Notes

- This configuration allows **all hosts** for maximum flexibility
- Suitable for development and testing
- For production, consider restricting to specific domains:
  ```python
  allowed_hosts=[
      "api.airflowanalysis.xyz",
      "airflowanalysis.xyz",
      "localhost"
  ]
  ```

## Troubleshooting

### Still Getting "Invalid host header"?

1. **Rebuild backend container:**
   ```bash
   docker-compose down
   docker-compose up -d --build backend
   ```

2. **Check backend logs:**
   ```bash
   docker-compose logs backend
   ```

3. **Verify middleware order:**
   Middleware is applied in reverse order. Ensure TrustedHostMiddleware is added after CORS.

4. **Test directly:**
   ```bash
   # Test backend directly (bypass nginx)
   curl http://localhost:8000/health
   ```

### CORS Errors?

1. **Check browser console** for specific error
2. **Verify CORS headers:**
   ```bash
   curl -I http://api.airflowanalysis.xyz/health
   ```
3. **Check nginx CORS headers** in `nginx/nginx.conf`

## Related Files

- `backend/main.py` - FastAPI app with middleware
- `backend/Dockerfile` - Gunicorn configuration
- `nginx/nginx.conf` - Reverse proxy configuration
- `docker-compose.yml` - Service orchestration
