# Supabase Database Setup Guide

## Prerequisites
- Supabase account with a project created
- Python 3.8+ installed
- Node.js and npm installed

## Step 1: Get Supabase Credentials

1. Go to your Supabase project dashboard
2. Navigate to **Settings** → **API**
3. Copy the following:
   - **Project URL** (e.g., `https://xxxxxxxxxxxxx.supabase.co`)
   - **Anon/Public Key** (starts with `eyJ...`)
4. Navigate to **Settings** → **Database**
5. Copy the **Connection String** (URI format)
   - It should look like: `postgresql://postgres:[YOUR-PASSWORD]@db.xxxxxxxxxxxxx.supabase.co:5432/postgres`

## Step 2: Configure Backend Environment

1. Open `backend/.env` file
2. Replace the placeholders with your actual Supabase credentials:

```env
# Supabase Configuration
SUPABASE_URL=https://xxxxxxxxxxxxx.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Database URL (Supabase PostgreSQL)
DATABASE_URL=postgresql://postgres:[YOUR-PASSWORD]@db.xxxxxxxxxxxxx.supabase.co:5432/postgres

# JWT Configuration
SECRET_KEY=your-secret-key-change-this-in-production-09876543210
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
```

## Step 3: Install Backend Dependencies

```bash
cd backend
pip install -r requirements.txt
```

## Step 4: Create Database Tables

Run the database initialization script:

```bash
python init_db.py
```

This will create the following tables in your Supabase database:
- `users` - User accounts
- `simulations` - Simulation data

## Step 5: Verify Database Connection

Test the database connection:

```bash
python check_db.py
```

## Step 6: Start the Backend Server

```bash
python main.py
```

Or use uvicorn directly:

```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

The backend should now be running at `http://localhost:8000`

## Step 7: Start the Frontend

In a new terminal:

```bash
cd Frontend
npm install
npm run dev
```

The frontend should now be running at `http://localhost:5173`

## Database Schema

### Users Table
```sql
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR UNIQUE NOT NULL,
    email VARCHAR UNIQUE NOT NULL,
    hashed_password VARCHAR NOT NULL,
    purpose VARCHAR,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Simulations Table
```sql
CREATE TABLE simulations (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    name VARCHAR NOT NULL,
    parameters JSONB,
    results JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## Troubleshooting

### Connection Issues

If you get connection errors:

1. **Check your password**: Make sure you're using the correct database password
2. **Check firewall**: Ensure your IP is allowed in Supabase settings
3. **Verify connection string**: Make sure the format is correct

### SSL Certificate Issues

If you get SSL errors, update your DATABASE_URL to include SSL mode:

```env
DATABASE_URL=postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres?sslmode=require
```

### Table Creation Issues

If tables aren't created automatically:

1. Go to Supabase Dashboard → SQL Editor
2. Run the SQL commands from the "Database Schema" section above manually

## Testing the Setup

1. Open `http://localhost:5173` in your browser
2. Click "Sign Up" and create a new account
3. Login with your credentials
4. Create a new simulation
5. Verify the data appears in your Supabase dashboard under **Table Editor**

## Security Notes

- Never commit your `.env` file to git
- The `.env` file is already in `.gitignore`
- Change the `SECRET_KEY` to a strong random value in production
- Use environment variables in production deployments

## Supabase Dashboard Features

You can use the Supabase dashboard to:
- View and edit data in **Table Editor**
- Run SQL queries in **SQL Editor**
- Monitor API usage in **API Logs**
- Set up Row Level Security (RLS) policies
- Create database backups

## Next Steps

- Set up Row Level Security (RLS) policies in Supabase for better security
- Configure email authentication if needed
- Set up database backups
- Monitor API usage and performance
