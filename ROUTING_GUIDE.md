# SmartTracker - Page Routing Guide

This guide shows which file is displayed for each URL in your application.

## URL to File Mapping

### Frontend Routes (http://localhost:5173)

| URL | File Location | Description |
|-----|---------------|-------------|
| **/** | `Frontend/src/pages/LandingPage.tsx` | Homepage with features and call-to-action |
| **/login** | `Frontend/src/pages/Login.tsx` | User login page |
| **/register** | `Frontend/src/pages/Register.tsx` | User registration/signup page |
| **/dashboard** | `Frontend/src/pages/Dashboard.tsx` | User dashboard (requires login) |

### Main Application Files

| File | Purpose |
|------|---------|
| `Frontend/src/App.tsx` | Main routing configuration |
| `Frontend/src/main.tsx` | Application entry point |
| `Frontend/index.html` | HTML template |
| `Frontend/src/services/api.ts` | API service for backend calls |

### Backend API Routes (http://localhost:8000)

| Endpoint | File | Method | Description |
|----------|------|--------|-------------|
| **/** | `backend/main.py` | GET | API root message |
| **/register** | `backend/main.py` | POST | Create new user account |
| **/token** | `backend/main.py` | POST | Login and get JWT token |
| **/users/me** | `backend/main.py` | GET | Get current user info |
| **/simulations** | `backend/main.py` | POST | Create new simulation |
| **/simulations** | `backend/main.py` | GET | Get all user simulations |
| **/simulations/{id}** | `backend/main.py` | GET | Get specific simulation |
| **/docs** | Auto-generated | GET | Interactive API documentation |

## How Routing Works

### Frontend Routing (React Router)

The routing is defined in `Frontend/src/App.tsx`:

```typescript
<Routes>
  <Route path="/" element={<LandingPage />} />
  <Route path="/login" element={<Login />} />
  <Route path="/register" element={<Register />} />
  <Route path="/dashboard" element={<Dashboard />} />
  <Route path="*" element={<Navigate to="/" />} />
</Routes>
```

### When you visit a URL:

1. **http://localhost:5173/** 
   - Opens: `Frontend/src/pages/LandingPage.tsx`
   - Shows: Homepage with gradient design, features, and navigation

2. **http://localhost:5173/login**
   - Opens: `Frontend/src/pages/Login.tsx`
   - Shows: Login form with username and password fields

3. **http://localhost:5173/register**
   - Opens: `Frontend/src/pages/Register.tsx`
   - Shows: Registration form with username, email, purpose, and password

4. **http://localhost:5173/dashboard**
   - Opens: `Frontend/src/pages/Dashboard.tsx`
   - Shows: User dashboard with statistics and simulations
   - Note: Redirects to /login if not authenticated

5. **Any other URL**
   - Redirects to: `/` (LandingPage)

## Component Structure

```
Frontend/src/
├── App.tsx                    # Main app with routing
├── main.tsx                   # Entry point
├── index.css                  # Global styles
├── pages/
│   ├── LandingPage.tsx       # Route: /
│   ├── Login.tsx             # Route: /login
│   ├── Register.tsx          # Route: /register
│   └── Dashboard.tsx         # Route: /dashboard
├── services/
│   └── api.ts                # Backend API calls
└── components/
    ├── Navbar.tsx            # (if needed)
    └── SimulationChart.tsx   # (if needed)
```

## Testing the Routes

Open these URLs in your browser:

1. Landing Page: http://localhost:5173/
2. Login: http://localhost:5173/login
3. Register: http://localhost:5173/register
4. Dashboard: http://localhost:5173/dashboard

## Backend API Testing

Visit the interactive API docs:
- http://localhost:8000/docs

This shows all available endpoints and lets you test them directly.
