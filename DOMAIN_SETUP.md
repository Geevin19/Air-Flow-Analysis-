# 🌐 Domain-Based Routing Setup

## Architecture Overview

```
airflowanalysis.xyz → Frontend (React)
api.airflowanalysis.xyz → Backend (FastAPI)
```

## DNS Configuration

Point these DNS records to your server IP:

```
A     airflowanalysis.xyz        → YOUR_SERVER_IP
A     www.airflowanalysis.xyz    → YOUR_SERVER_IP
A     api.airflowanalysis.xyz    → YOUR_SERVER_IP
```

## How It Works

### Frontend Domain: `airflowanalysis.xyz`
- Serves React application
- All static assets (HTML, CSS, JS)
- Handles client-side routing

### API Domain: `api.airflowanalysis.xyz`
- All API endpoints
- WebSocket connections at `/ws/`
- API documentation at `/docs`

### API Calls from Frontend

All API calls use the full domain:

```typescript
// Frontend makes requests to:
http://api.airflowanalysis.xyz/register
http://api.airflowanalysis.xyz/token
http://api.airflowanalysis.xyz/users/me
```

## Local Testing

For local testing without domain setup:

1. **Option 1: Use localhost**
   ```bash
   # Frontend will fallback to localhost
   docker-compose up -d --build
   
   # Access at:
   http://localhost
   ```

2. **Option 2: Edit hosts file**
   ```bash
   # Add to /etc/hosts (Linux/Mac) or C:\Windows\System32\drivers\etc\hosts (Windows)
   127.0.0.1 airflowanalysis.xyz
   127.0.0.1 api.airflowanalysis.xyz
   
   # Then access at:
   http://airflowanalysis.xyz
   ```

## Deployment Steps

### 1. Update DNS
Point your domain to server IP (wait for propagation, usually 5-60 minutes)

### 2. Deploy Application
```bash
docker-compose up -d --build
```

### 3. Verify Deployment
```bash
# Check frontend
curl http://airflowanalysis.xyz

# Check API
curl http://api.airflowanalysis.xyz/health

# Check API docs
curl http://api.airflowanalysis.xyz/docs
```

### 4. Test from Browser
- Frontend: http://airflowanalysis.xyz
- API Docs: http://api.airflowanalysis.xyz/docs

## HTTPS Setup (Optional)

To enable HTTPS:

1. **Install Certbot**
   ```bash
   docker-compose run --rm certbot certonly --webroot \
     -w /var/www/certbot \
     -d airflowanalysis.xyz \
     -d www.airflowanalysis.xyz \
     -d api.airflowanalysis.xyz \
     --email your-email@example.com \
     --agree-tos
   ```

2. **Uncomment HTTPS blocks in nginx.conf**
   - Uncomment the HTTPS server blocks
   - Uncomment the HTTP → HTTPS redirect

3. **Restart Nginx**
   ```bash
   docker-compose restart nginx
   ```

4. **Update Frontend API URL**
   ```bash
   # In docker-compose.yml, change:
   VITE_API_URL: https://api.airflowanalysis.xyz
   
   # Rebuild frontend
   docker-compose up -d --build frontend
   ```

## Configuration Files

### Frontend API Configuration
**File:** `Frontend/src/services/api.ts`
```typescript
const API_BASE = import.meta.env.VITE_API_URL || 'http://api.airflowanalysis.xyz';
```

### Nginx Routing
**File:** `nginx/nginx.conf`
- `airflowanalysis.xyz` → frontend:80
- `api.airflowanalysis.xyz` → backend:8000

### Backend CORS
**File:** `backend/main.py`
```python
ALLOWED_ORIGINS = ["*"]  # Allows all origins
```

## Troubleshooting

### Frontend can't reach API
1. Check DNS propagation: `nslookup api.airflowanalysis.xyz`
2. Check nginx logs: `docker-compose logs nginx`
3. Verify CORS is enabled: Check browser console

### API returns 502 Bad Gateway
1. Check backend is running: `docker-compose ps backend`
2. Check backend logs: `docker-compose logs backend`
3. Verify backend health: `curl http://localhost:8000/health`

### CORS errors in browser
1. Verify ALLOWED_ORIGINS in backend/.env is set to `*`
2. Check nginx CORS headers in nginx.conf
3. Clear browser cache and try again

## Production Checklist

- [ ] DNS records configured
- [ ] Docker containers running
- [ ] Frontend accessible at airflowanalysis.xyz
- [ ] API accessible at api.airflowanalysis.xyz
- [ ] API docs working at api.airflowanalysis.xyz/docs
- [ ] User registration working
- [ ] User login working
- [ ] WebSocket connections working (if using IoT features)
- [ ] HTTPS configured (optional but recommended)
- [ ] Database backups configured
- [ ] Monitoring set up

## Support

For issues:
1. Check logs: `docker-compose logs -f`
2. Verify DNS: `nslookup airflowanalysis.xyz`
3. Test API directly: `curl http://api.airflowanalysis.xyz/health`
4. Check browser console for errors
