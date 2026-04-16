# 🚀 Docker Quick Start Guide

## One-Command Deployment

```bash
docker-compose up -d --build
```

That's it! The application will:
1. Build all containers
2. Start PostgreSQL database
3. Start FastAPI backend
4. Start React frontend
5. Start Nginx reverse proxy

## Access the Application

- **Frontend**: http://localhost
- **Backend API**: http://localhost:8000
- **API Docs**: http://localhost:8000/docs
- **Health Check**: http://localhost/health

## Default Configuration

The project comes with pre-configured defaults:

### Database
- **Host**: db (internal Docker network)
- **Port**: 5432
- **User**: airflow
- **Password**: strongpassword123
- **Database**: airflowdb

### Backend
- **Port**: 8000
- **Workers**: 4 Gunicorn + Uvicorn workers
- **Secret Key**: Auto-generated (change in production)

### Email (Optional)
- **Default**: Dummy credentials (emails won't send)
- **To enable**: Update `backend/.env` with real SMTP credentials

## Useful Commands

### View Logs
```bash
docker-compose logs -f
```

### View Specific Service Logs
```bash
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f db
```

### Stop Services
```bash
docker-compose down
```

### Restart Services
```bash
docker-compose restart
```

### Rebuild After Code Changes
```bash
docker-compose down
docker-compose up -d --build
```

### Check Service Status
```bash
docker-compose ps
```

### Access Database
```bash
docker-compose exec db psql -U airflow -d airflowdb
```

### Access Backend Shell
```bash
docker-compose exec backend bash
```

## Troubleshooting

### Port Already in Use
If port 80 or 8000 is already in use:

```bash
# Check what's using the port
netstat -ano | findstr :80
netstat -ano | findstr :8000

# Stop the conflicting service or change ports in docker-compose.yml
```

### Database Connection Issues
```bash
# Check if database is healthy
docker-compose ps

# View database logs
docker-compose logs db

# Restart database
docker-compose restart db
```

### Frontend Not Loading
```bash
# Check nginx logs
docker-compose logs nginx

# Check frontend logs
docker-compose logs frontend

# Rebuild frontend
docker-compose up -d --build frontend
```

## Production Deployment

For production deployment:

1. **Update Environment Variables**
   ```bash
   nano backend/.env
   ```
   - Change `SECRET_KEY` to a strong random value
   - Update `POSTGRES_PASSWORD` to a strong password
   - Add real email credentials (SMTP or Resend API)

2. **Enable HTTPS**
   - Uncomment Certbot service in `docker-compose.yml`
   - Uncomment HTTPS server block in `nginx/nginx.conf`
   - Run Certbot to get SSL certificates

3. **Update Domain**
   - Point your domain DNS to server IP
   - Update `server_name` in `nginx/nginx.conf`
   - Update `ALLOWED_ORIGINS` in `backend/.env`

4. **Set Up Backups**
   ```bash
   # Backup database
   docker-compose exec db pg_dump -U airflow airflowdb > backup.sql
   
   # Restore database
   docker-compose exec -T db psql -U airflow airflowdb < backup.sql
   ```

## Clean Installation

To start fresh:

```bash
# Stop and remove all containers, networks, and volumes
docker-compose down -v

# Remove all images
docker-compose down --rmi all

# Start fresh
docker-compose up -d --build
```

## Support

For issues or questions, check:
- [README.md](README.md) - Project overview
- [DEPLOYMENT.md](DEPLOYMENT.md) - Detailed deployment guide
- API Documentation: http://localhost:8000/docs
