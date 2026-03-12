# How to Start SmartTracker Servers

## Method 1: Using Batch Files (Easiest)

1. Double-click `start-backend.bat` in the project root
2. Double-click `start-frontend.bat` in the project root

## Method 2: Using Terminal (Recommended)

### Start Backend (Terminal 1)

```bash
# Navigate to backend folder
cd backend

# Start the backend server
py -m uvicorn main:app --reload
```

You should see:
```
INFO:     Uvicorn running on http://127.0.0.1:8000 (Press CTRL+C to quit)
INFO:     Started reloader process
INFO:     Started server process
INFO:     Waiting for application startup.
INFO:     Application startup complete.
```

### Start Frontend (Terminal 2 - Open a new terminal)

```bash
# Navigate to Frontend folder (capital F!)
cd Frontend

# Start the frontend server
npm run dev
```

You should see:
```
VITE v5.x.x  ready in xxx ms

➜  Local:   http://localhost:5173/
➜  Network: use --host to expose
```

## Common Errors and Solutions

### Error: "Could not import module 'main'"
**Solution:** You're not in the backend folder. Run `cd backend` first.

### Error: "Could not read package.json"
**Solution:** You're not in the Frontend folder. Run `cd Frontend` first (note the capital F).

### Error: "npm: command not found"
**Solution:** Node.js is not installed or not in PATH.

### Error: "py: command not found"
**Solution:** Python is not installed or not in PATH. Try `python` instead of `py`.

## Verify Servers are Running

1. **Backend:** Open http://localhost:8000 in browser
   - You should see: `{"message":"Simulation API is running"}`

2. **Frontend:** Open http://localhost:5173 in browser
   - You should see: SmartTracker landing page

## Stop Servers

Press `CTRL+C` in each terminal window to stop the servers.

## Current Directory Check

Before running commands, check where you are:

```bash
# Windows PowerShell
pwd

# Should show:
# For backend: C:\Users\Geevin R\Smarttracker\backend
# For frontend: C:\Users\Geevin R\Smarttracker\Frontend
```

## Quick Start Commands (Copy-Paste)

**Terminal 1 (Backend):**
```bash
cd "C:\Users\Geevin R\Smarttracker\backend"
py -m uvicorn main:app --reload
```

**Terminal 2 (Frontend):**
```bash
cd "C:\Users\Geevin R\Smarttracker\Frontend"
npm run dev
```
