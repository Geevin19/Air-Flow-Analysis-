# SmartTracker - Air Flow Analysis Platform

Advanced simulation platform for cylindrical air flow analysis using vector calculus and computational fluid dynamics.

## 🌟 Features

- **Premium UI** with Dark/Light mode toggle
- **Real-time Simulations** with live preview
- **Interactive Dashboard** with clickable simulation cards
- **User Authentication** with JWT tokens
- **Database Integration** with Supabase/PostgreSQL
- **Responsive Design** with smooth animations
- **Delete & Manage** simulations easily

## 🚀 Quick Start with Supabase

### 1. Get Supabase Credentials
- Go to your Supabase project dashboard
- Copy **Connection String** from Settings → Database
- Copy **Project URL** and **Anon Key** from Settings → API

### 2. Configure Backend
Edit `backend/.env`:
```env
SUPABASE_URL=https://xxxxxxxxxxxxx.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@db.xxxxxxxxxxxxx.supabase.co:5432/postgres
```

### 3. Install & Run
```bash
# Backend
cd backend
pip install -r requirements.txt
python setup_supabase.py
python main.py

# Frontend (new terminal)
cd Frontend
npm install
npm run dev
```

### 4. Open Browser
Visit `http://localhost:5173` 🎉

📖 **Detailed Setup**: See [QUICK_SUPABASE_SETUP.md](QUICK_SUPABASE_SETUP.md)

## 📁 Project Structure

```
smarttracker/
│
├── Frontend/                    # React + TypeScript Frontend
│   ├── src/
│   │   ├── pages/
│   │   │   ├── LandingPage.tsx
│   │   │   ├── Login.tsx
│   │   │   ├── Register.tsx
│   │   │   ├── Dashboard.tsx    # Premium UI with dark mode
│   │   │   ├── Simulation.tsx   # Real-time simulation
│   │   │   └── LiveIoT.tsx
│   │   ├── components/
│   │   │   ├── Navbar.tsx
│   │   │   └── SimulationChart.tsx
│   │   ├── services/
│   │   │   └── api.ts
│   │   └── App.tsx
│   └── package.json
│
├── backend/                     # Python Backend (FastAPI)
│   ├── main.py                  # FastAPI entry
│   ├── models.py                # Database models
│   ├── schemas.py               # Request/response schemas
│   ├── auth.py                  # Authentication logic
│   ├── simulation.py            # Air flow calculations
│   ├── database.py              # Database connection
│   ├── setup_supabase.py        # Database setup script
│   └── requirements.txt
│
├── SUPABASE_SETUP.md           # Detailed Supabase guide
├── QUICK_SUPABASE_SETUP.md     # Quick setup guide
└── README.md
```

## 🛠️ Technologies

### Frontend
- React 18 with TypeScript
- Vite for fast development
- Axios for API calls
- React Router for navigation
- Custom CSS with dark mode support

### Backend
- FastAPI (Python)
- SQLAlchemy ORM
- PostgreSQL/Supabase
- JWT Authentication
- Pydantic for validation

### Database
- Supabase (PostgreSQL)
- User management
- Simulation data storage
- Real-time capabilities

## 🎨 UI Features

- **Dark/Light Mode**: Toggle between themes with persistent storage
- **Responsive Design**: Works on all screen sizes
- **Smooth Animations**: Professional transitions and hover effects
- **Interactive Cards**: Click to view simulation details
- **Delete Functionality**: Remove simulations with confirmation
- **Error Boundaries**: Graceful error handling

## 📊 Simulation Features

- Cylindrical air flow analysis
- Real-time velocity profile visualization
- Reynolds number calculation
- Pressure drop analysis
- Friction factor computation
- Laminar/Turbulent flow detection
- Interactive parameter controls

## 🔐 Authentication

- User registration with email validation
- Secure password hashing (bcrypt)
- JWT token-based authentication
- Protected API endpoints
- Session persistence

## 📝 API Endpoints

### Authentication
- `POST /register` - Create new user
- `POST /token` - Login and get JWT token
- `GET /users/me` - Get current user info

### Simulations
- `POST /simulations` - Create new simulation
- `GET /simulations` - Get all user simulations
- `GET /simulations/{id}` - Get specific simulation
- `DELETE /simulations/{id}` - Delete simulation

## 🐛 Troubleshooting

### Connection Issues
- Verify DATABASE_URL in `backend/.env`
- Check Supabase password
- Add `?sslmode=require` to DATABASE_URL if needed

### Frontend Issues
- Clear browser cache
- Delete `node_modules` and run `npm install` again
- Check if backend is running on port 8000

### Backend Issues
- Ensure all dependencies are installed
- Check Python version (3.8+ required)
- Verify database tables are created

## 📚 Documentation

- [Quick Supabase Setup](QUICK_SUPABASE_SETUP.md)
- [Detailed Supabase Guide](SUPABASE_SETUP.md)
- [Quick Start Guide](QUICK_START.md)
- [Database Access](DATABASE_ACCESS.md)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License.

## 👥 Team

- Frontend & Backend Development
- UI/UX Design
- Database Architecture
- Simulation Engine

## 🔗 Links

- [GitHub Repository](https://github.com/Geevin19/Air-Flow-Analysis-.git)
- [Supabase](https://supabase.com)
- [FastAPI Documentation](https://fastapi.tiangolo.com)
- [React Documentation](https://react.dev)

---

Made with ❤️ by the SmartTracker Team
