# Quick Supabase Setup (5 Minutes)

## 1. Get Your Supabase Credentials

From your Supabase dashboard:
- **Settings** → **Database** → Copy **Connection String**
- **Settings** → **API** → Copy **Project URL** and **Anon Key**

## 2. Update backend/.env

```env
# Replace these with your actual values
SUPABASE_URL=https://xxxxxxxxxxxxx.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@db.xxxxxxxxxxxxx.supabase.co:5432/postgres
```

## 3. Install & Setup

```bash
# Install backend dependencies
cd backend
pip install -r requirements.txt

# Setup database tables
python setup_supabase.py

# Start backend
python main.py
```

## 4. Start Frontend

```bash
# In a new terminal
cd Frontend
npm install
npm run dev
```

## 5. Open Browser

Go to `http://localhost:5173` and start using the app!

---

## Need Help?

See [SUPABASE_SETUP.md](SUPABASE_SETUP.md) for detailed instructions.

## Common Issues

**Connection Error?**
- Check your password in DATABASE_URL
- Add `?sslmode=require` to the end of DATABASE_URL

**Tables not created?**
- Run `python setup_supabase.py` again
- Or create them manually in Supabase SQL Editor (see SUPABASE_SETUP.md)
