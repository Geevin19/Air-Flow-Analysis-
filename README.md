# Airflow Analysis App

Air Flow Analysis in Pipes Using Vector Calculus

## Project Structure

```
airflow-analysis-app/
│
├── frontend/                    # React + TypeScript Frontend
│   │
│   ├── public/
│   │   └── index.html
│   │
│   ├── src/
│   │   │
│   │   ├── pages/
│   │   │   ├── LandingPage.tsx
│   │   │   ├── Login.tsx
│   │   │   ├── Register.tsx
│   │   │   ├── Dashboard.tsx
│   │   │   └── Simulation.tsx
│   │   │
│   │   ├── components/
│   │   │   ├── Navbar.tsx
│   │   │   └── SimulationChart.tsx
│   │   │
│   │   ├── services/
│   │   │   └── api.ts
│   │   │
│   │   ├── App.tsx
│   │   └── main.tsx
│   │
│   └── package.json
│
├── backend/                     # Python Backend (FastAPI)
│   │
│   ├── main.py                  # FastAPI entry
│   ├── models.py                # Database models
│   ├── schemas.py               # Request/response schemas
│   ├── auth.py                  # Login & register logic
│   ├── simulation.py            # Air flow calculations
│   ├── database.py              # PostgreSQL connection
│   └── requirements.txt
│
├── database/
│   └── schema.sql
│
├── .env
├── .gitignore
└── README.md
```

## Setup Instructions

### Backend
```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

## Technologies

- **Frontend**: React, TypeScript
- **Backend**: FastAPI, Python
- **Database**: PostgreSQL
- **Calculations**: Vector Calculus for Air Flow Analysis
