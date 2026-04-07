# Air Flow Analysis Platform

Advanced simulation platform for cylindrical air flow analysis using computational fluid dynamics.

## Features

- **Real-time 3D Simulations** with interactive visualization
- **Dark/Light Mode** toggle with persistent theme
- **User Authentication** with JWT tokens
- **Interactive Dashboard** for managing simulations
- **Multiple Pipe Shapes** (Straight, L-Shaped, S-Curve, U-Bend, Helix)
- **Visualization Modes** (Pressure, Velocity, Friction, Material)
- **Particle Effects** with customizable colors and sizes

## Tech Stack

### Frontend
- React 18 + TypeScript
- Vite
- Three.js for 3D visualization
- React Router

### Backend
- FastAPI (Python)
- SQLAlchemy ORM
- PostgreSQL/Supabase
- JWT Authentication

## Quick Start

### Prerequisites
- Python 3.8+
- Node.js 16+
- Supabase account

### Setup

1. **Clone the repository**
```bash
git clone https://github.com/Geevin19/Air-Flow-Analysis-.git
cd Air-Flow-Analysis-
```

2. **Configure Backend**

Create `backend/.env`:
```env
PROJECT_URL=https://your-project.supabase.co
PROJECT_ANON_KEY=your-anon-key
DATABASE_URL=postgresql://postgres:password@host:port/postgres
SECRET_KEY=your-secret-key
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
```

3. **Install Dependencies**

Backend:
```bash
cd backend
pip install -r requirements.txt
```

Frontend:
```bash
cd Frontend
npm install
```

4. **Run the Application**

Backend:
```bash
cd backend
python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

Frontend:
```bash
cd Frontend
npm run dev
```

5. **Access the Application**
- Frontend: http://localhost:5173
- Backend API: http://localhost:8000
- API Docs: http://localhost:8000/docs

## Project Structure

```
├── Frontend/              # React frontend
│   ├── src/
│   │   ├── pages/        # Page components
│   │   ├── components/   # Reusable components
│   │   └── services/     # API services
│   └── package.json
│
├── backend/              # FastAPI backend
│   ├── main.py          # Application entry
│   ├── models.py        # Database models
│   ├── auth.py          # Authentication
│   ├── simulation.py    # Simulation logic
│   └── requirements.txt
│
└── README.md
```

## API Endpoints

### Authentication
- `POST /register` - Register new user
- `POST /token` - Login
- `GET /users/me` - Get current user

### Simulations
- `POST /simulations` - Create simulation
- `GET /simulations` - List user simulations
- `GET /simulations/{id}` - Get simulation details
- `DELETE /simulations/{id}` - Delete simulation

## Simulation Features

- Reynolds number calculation
- Pressure drop analysis
- Friction factor computation
- Flow regime detection (Laminar/Turbulent)
- Velocity profile visualization
- Multiple material support (Steel, Copper, PVC, etc.)
- Real-time parameter updates

## License

MIT License

## Links

- [GitHub Repository](https://github.com/Geevin19/Air-Flow-Analysis-.git)
- [Supabase](https://supabase.com)
- [FastAPI](https://fastapi.tiangolo.com)
- [React](https://react.dev)

---

Made with ❤️ by the SmartTracker Team
