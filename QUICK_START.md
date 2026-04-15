# ⚡ Quick Start Guide

## 🚀 Deploy in 5 Minutes

### 1. Prerequisites
```bash
# Verify Docker is installed
docker --version
docker-compose --version
```

### 2. Clone & Configure
```bash
git clone https://github.com/YOUR_USERNAME/YOUR_REPO.git
cd YOUR_REPO
cp .env.example .env
nano .env  # Edit these values:
```

**Required .env values:**
```bash
POSTGRES_PASSWORD=your_strong_password_here
SECRET_KEY=run_openssl_rand_hex_32_to_generate
MAIL_USERNAME=your-email@gmail.com
MAIL_PASSWORD=your-gmail-app-password
```

### 3. Deploy
```bash
chmod +x deploy.sh
./deploy.sh
```

### 4. Verify
```bash
# Check services
docker-compose ps

# Test health
curl http://localhost/health
curl http://localhost:8000/health
```

## 🌐 Access

- Frontend: http://localhost
- API: http://localhost:8000
- API Docs: http://localhost:8000/api/docs

## 📝 Common Commands

```bash
# View logs
docker-compose logs -f

# Restart
docker-compose restart

# Stop
docker-compose down

# Update
git pull && docker-compose down && docker-compose build && docker-compose up -d
```

## 🔒 Production Setup

### Enable HTTPS
```bash
# 1. Install certbot
sudo apt install certbot

# 2. Get certificate
sudo certbot certonly --standalone -d airflowanalysis.xyz

# 3. Edit nginx/nginx.conf (uncomment HTTPS block)

# 4. Restart
docker-compose restart nginx
```

### Configure Firewall
```bash
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

## 🆘 Troubleshooting

### Services won't start
```bash
docker-compose logs backend
docker-compose logs db
```

### Database connection failed
```bash
# Check database is running
docker-compose ps db

# Check connection
docker-compose exec backend python -c "from database import check_db_health; print(check_db_health())"
```

### Frontend not loading
```bash
# Rebuild frontend
docker-compose build frontend
docker-compose up -d frontend
```

## 📖 Full Documentation

- [DEPLOYMENT.md](DEPLOYMENT.md) - Complete deployment guide
- [PRODUCTION_SUMMARY.md](PRODUCTION_SUMMARY.md) - What was changed
- [README.md](README.md) - Project overview

---

**Need help?** Check the full [DEPLOYMENT.md](DEPLOYMENT.md) guide.
