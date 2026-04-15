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

### Prerequisites

- Docker & Docker Compose
- Domain pointed to your server
- 2GB+ RAM, 20GB+ storage

### Deployment

```bash
# Clone repository
git clone https://github.com/YOUR_USERNAME/YOUR_REPO.git
cd YOUR_REPO

# Configure environment
cp .env.example .env
nano .env  # Edit with your values

# Deploy
chmod +x deploy.sh
./deploy.sh
```

### Access

- **Frontend**: https://airflowanalysis.xyz
- **API**: https://airflowanalysis.xyz/api
- **API Docs**: https://airflowanalysis.xyz/api/docs

## 📖 Documentation

- [Deployment Guide](DEPLOYMENT.md) - Complete production setup
- [API Documentation](https://airflowanalysis.xyz/api/docs) - Interactive API docs

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
