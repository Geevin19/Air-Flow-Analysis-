# SmartTracker - Quick Start Guide

## ✅ Setup Complete!

Both frontend and backend are now running successfully with PostgreSQL database.

## 🚀 Access the Application

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:8000
- **API Docs**: http://localhost:8000/docs

## 🔐 Test Login/Register

1. Open your browser and go to http://localhost:5173
2. Click "Sign up" to create a new account
3. Fill in the registration form:
   - Username
   - Email
   - Purpose (select from dropdown)
   - Password (min 6 characters)
4. After registration, you'll be automatically logged in and redirected to the dashboard

## 📊 Database

- **Type**: PostgreSQL
- **Database**: smarttracker
- **Host**: localhost:5432
- **User**: postgres
- **Password**: joe123

## 🛠️ Running Servers

### Backend (Already Running)
```bash
cd backend
python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### Frontend (Already Running)
```bash
cd Frontend
npm run dev
```

## 🔧 Troubleshooting

If you need to restart the servers:

1. Stop both processes (Ctrl+C in their terminals)
2. Run the commands above again

### Database Schema Issues

If you encounter database column errors, run the migration script:
```bash
cd backend
python migrate_db.py
```

This will drop and recreate all tables with the correct schema.

## 📝 API Endpoints

- `POST /register` - Create new user
- `POST /token` - Login (returns JWT token)
- `GET /users/me` - Get current user info
- `POST /simulations` - Create simulation
- `GET /simulations` - Get all user simulations
- `GET /simulations/{id}` - Get specific simulation

## ✨ Features Working

✅ User Registration
✅ User Login
✅ JWT Authentication
✅ PostgreSQL Database
✅ Protected Routes
✅ Simulation Creation
✅ Dashboard Access
