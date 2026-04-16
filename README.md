# 🌊 AirFlow Analysis - Production SaaS Platform

Production-grade air flow simulation and IoT monitoring platform deployed on OVHcloud.

## 🎯 Features

- **Real-time IoT Monitoring**: Live sensor data streaming via WebSocket
- **Air Flow Simulation**: Advanced CFD-based pipe flow analysis
- **User Management**: Secure authentication with email verification
- **3D Visualization**: Interactive Three.js-powered simulations
- **Production Ready**: Docker-based deployment with Nginx reverse proxy

## 🏗️ Architecture

```
Frontend (React + Vite + Nginx)
    ↓
Nginx Reverse Proxy
    ↓
Backend (FastAPI + Gunicorn)
    ↓
PostgreSQL Database
```

## 🚀 Quick Start

### One-Command Deployment

```bash
docker-compose up -d --build
```

That's it! No configuration needed. The application will:
1. ✅ Build all containers automatically
2. ✅ Start PostgreSQL with pre-configured credentials
3. ✅ Start FastAPI backend with 4 workers
4. ✅ Start React frontend with Nginx
5. ✅ Start Nginx reverse proxy

### Access the Application

- **Frontend**: http://localhost
- **Backend API**: http://localhost:8000
- **API Docs**: http://localhost:8000/docs
- **Health Check**: http://localhost/health

### Prerequisites

- Docker & Docker Compose installed
- Ports 80, 443, 5432, 8000 available
- 2GB+ RAM recommended

### Verify Setup (Optional)

```bash
# Linux/Mac
./verify-setup.sh

# Windows PowerShell
.\verify-setup.ps1
```

## 📖 Documentation

- [Docker Quick Start](DOCKER_QUICK_START.md) - Zero-config deployment guide
- [Deployment Guide](DEPLOYMENT.md) - Production setup with HTTPS
- [API Documentation](http://localhost:8000/docs) - Interactive API docs (after starting)

## 🛠️ Development

### Local Development

```bash
# Backend
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload

# Frontend
cd Frontend
npm install
npm run dev
```

### Environment Variables

See `.env.example` for all required configuration.

## 🔒 Security

- HTTPS with Let's Encrypt
- JWT-based authentication
- Rate limiting
- CORS protection
- Security headers
- Non-root containers

## 📊 Monitoring

```bash
# View logs
docker-compose logs -f

# Health check
curl https://airflowanalysis.xyz/health

# Service status
docker-compose ps
```

## 🔧 Maintenance

```bash
# Update application
git pull origin main
docker-compose down
docker-compose build
docker-compose up -d

# Backup database
docker-compose exec db pg_dump -U airflow airflow_db > backup.sql

# Restart services
docker-compose restart
```

## 📝 Tech Stack

### Frontend
- React 18
- TypeScript
- Vite
- Three.js
- Recharts
- Axios

### Backend
- FastAPI
- SQLAlchemy
- PostgreSQL
- Gunicorn + Uvicorn
- JWT Authentication

### Infrastructure
- Docker & Docker Compose
- Nginx (Reverse Proxy)
- Let's Encrypt (SSL)
- OVHcloud (Hosting)

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## 📄 License

This project is licensed under the MIT License.

## 📞 Support

For issues or questions:
- Open an issue on GitHub
- Check [DEPLOYMENT.md](DEPLOYMENT.md)
- Review API docs at `/api/docs`

---

**Status**: ✅ Production Ready | **Version**: 1.0.0
