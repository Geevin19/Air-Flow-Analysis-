# 🚀 Production Deployment Guide - OVHcloud

Complete guide to deploy AirFlow Analysis SaaS on OVHcloud infrastructure.

## 📋 Prerequisites

- OVHcloud VPS or Dedicated Server
- Domain: `airflowanalysis.xyz` pointed to your server IP
- Docker & Docker Compose installed
- SSH access to server

## 🏗️ Architecture

```
airflowanalysis.xyz
        │
    NGINX (Reverse Proxy)
        │
    ┌───────────┼───────────┐
    │                       │
Frontend              Backend
(React/Nginx)      (FastAPI/Gunicorn)
    │                       │
    └───────────┬───────────┘
                │
          PostgreSQL
```

## 🔧 Server Setup

### 1. Install Docker & Docker Compose

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Add user to docker group
sudo usermod -aG docker $USER
newgrp docker
```

### 2. Clone Repository

```bash
cd /opt
sudo git clone https://github.com/YOUR_USERNAME/YOUR_REPO.git airflow
cd airflow
sudo chown -R $USER:$USER /opt/airflow
```

### 3. Configure Environment

```bash
# Copy example environment file
cp .env.example .env

# Edit with your values
nano .env
```

**Required changes in `.env`:**
```bash
# Strong database password
POSTGRES_PASSWORD=your_strong_password_here

# Generate secret key (run: openssl rand -hex 32)
SECRET_KEY=your_generated_secret_key_32_chars_minimum

# Your email configuration
MAIL_USERNAME=your-email@gmail.com
MAIL_PASSWORD=your-gmail-app-password
MAIL_FROM=your-email@gmail.com
ADMIN_EMAIL=admin@airflowanalysis.xyz

# Production domain
ALLOWED_ORIGINS=https://airflowanalysis.xyz,https://www.airflowanalysis.xyz
VITE_API_URL=https://airflowanalysis.xyz/api
```

### 4. Build and Start Services

```bash
# Build all containers
docker-compose build

# Start services in detached mode
docker-compose up -d

# Check status
docker-compose ps

# View logs
docker-compose logs -f
```

### 5. Initialize Database

```bash
# The database tables are created automatically on first run
# Check backend logs to confirm
docker-compose logs backend | grep "Tables created"
```

## 🔒 SSL/HTTPS Setup with Let's Encrypt

### 1. Install Certbot

```bash
sudo apt install certbot python3-certbot-nginx -y
```

### 2. Stop Nginx temporarily

```bash
docker-compose stop nginx
```

### 3. Obtain SSL Certificate

```bash
sudo certbot certonly --standalone -d airflowanalysis.xyz -d www.airflowanalysis.xyz
```

### 4. Update Nginx Configuration

Edit `nginx/nginx.conf` and uncomment the HTTPS server block:

```nginx
server {
    listen 443 ssl http2;
    server_name airflowanalysis.xyz www.airflowanalysis.xyz;

    ssl_certificate /etc/letsencrypt/live/airflowanalysis.xyz/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/airflowanalysis.xyz/privkey.pem;
    
    # ... rest of configuration
}
```

### 5. Mount SSL certificates in docker-compose.yml

Add to nginx service volumes:
```yaml
volumes:
  - /etc/letsencrypt:/etc/letsencrypt:ro
```

### 6. Restart Nginx

```bash
docker-compose up -d nginx
```

### 7. Auto-renewal

```bash
# Add cron job for auto-renewal
sudo crontab -e

# Add this line:
0 3 * * * certbot renew --quiet && docker-compose restart nginx
```

## 🌐 DNS Configuration

Point your domain to your server:

```
A Record:  airflowanalysis.xyz     → YOUR_SERVER_IP
A Record:  www.airflowanalysis.xyz → YOUR_SERVER_IP
```

## 🔥 Firewall Configuration

```bash
# Allow HTTP, HTTPS, and SSH
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

## 📊 Monitoring & Maintenance

### View Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f nginx
docker-compose logs -f db
```

### Restart Services

```bash
# Restart all
docker-compose restart

# Restart specific service
docker-compose restart backend
```

### Update Application

```bash
# Pull latest code
git pull origin main

# Rebuild and restart
docker-compose down
docker-compose build
docker-compose up -d
```

### Database Backup

```bash
# Backup
docker-compose exec db pg_dump -U airflow airflow_db > backup_$(date +%Y%m%d).sql

# Restore
docker-compose exec -T db psql -U airflow airflow_db < backup_20240101.sql
```

### Health Checks

```bash
# Check all services
curl http://localhost/health
curl http://localhost:8000/health

# Check database
docker-compose exec db psql -U airflow -c "SELECT 1"
```

## 🐛 Troubleshooting

### Backend won't start

```bash
# Check logs
docker-compose logs backend

# Common issues:
# 1. Database not ready - wait 30 seconds and check again
# 2. Environment variables missing - check .env file
# 3. Port conflict - ensure port 8000 is free
```

### Frontend not loading

```bash
# Check nginx logs
docker-compose logs nginx

# Rebuild frontend
docker-compose build frontend
docker-compose up -d frontend
```

### Database connection issues

```bash
# Check database is running
docker-compose ps db

# Check connection
docker-compose exec backend python -c "from database import check_db_health; print(check_db_health())"
```

### SSL certificate issues

```bash
# Test certificate
sudo certbot certificates

# Renew manually
sudo certbot renew --force-renewal
```

## 📈 Performance Optimization

### 1. Enable Nginx Caching

Add to `nginx/nginx.conf`:
```nginx
proxy_cache_path /var/cache/nginx levels=1:2 keys_zone=api_cache:10m max_size=100m;
```

### 2. Increase Worker Processes

Edit `backend/Dockerfile`:
```dockerfile
CMD ["gunicorn", "main:app", "--workers", "8", ...]
```

### 3. Database Connection Pooling

Already configured in `backend/database.py`:
- Pool size: 10
- Max overflow: 20

## 🔐 Security Checklist

- [x] Strong database password
- [x] Secret key generated (32+ characters)
- [x] HTTPS enabled
- [x] Firewall configured
- [x] Non-root user for containers
- [x] Security headers in Nginx
- [x] Rate limiting enabled
- [x] CORS properly configured
- [ ] Regular backups scheduled
- [ ] Monitoring setup (optional)

## 📞 Support

For issues or questions:
- Check logs: `docker-compose logs -f`
- Review this guide
- Check GitHub issues

## 🎯 Access Points

After deployment:

- **Frontend**: https://airflowanalysis.xyz
- **API**: https://airflowanalysis.xyz/api
- **API Docs**: https://airflowanalysis.xyz/api/docs
- **Health Check**: https://airflowanalysis.xyz/health

---

**Deployment Status**: ✅ Production Ready
