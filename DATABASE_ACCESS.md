# Database Access Guide

## Connection Details

- **Host**: localhost
- **Port**: 5432
- **Database**: smarttracker
- **Username**: postgres
- **Password**: joe123

## Method 1: Command Line Script (Easiest)

Run the check script:
```bash
cd backend
python check_db.py
```

This will show:
- All tables and their schemas
- Record counts
- All users
- All simulations

## Method 2: PostgreSQL Command Line (psql)

If you have psql installed:
```bash
# Connect to database
"D:\Postgres SQL\bin\psql.exe" -U postgres -d smarttracker

# Once connected, run these commands:
\dt                          # List all tables
\d users                     # Show users table schema
\d simulations              # Show simulations table schema
SELECT * FROM users;        # View all users
SELECT * FROM simulations;  # View all simulations
\q                          # Quit
```

## Method 3: GUI Tools

### pgAdmin (Recommended)
1. Download from: https://www.pgadmin.org/download/
2. Install and open pgAdmin
3. Right-click "Servers" → "Register" → "Server"
4. General tab: Name = "SmartTracker"
5. Connection tab:
   - Host: localhost
   - Port: 5432
   - Database: smarttracker
   - Username: postgres
   - Password: joe123
6. Click "Save"
7. Navigate: Servers → SmartTracker → Databases → smarttracker → Schemas → public → Tables

### DBeaver (Alternative)
1. Download from: https://dbeaver.io/download/
2. Install and open DBeaver
3. Click "New Database Connection"
4. Select "PostgreSQL"
5. Enter connection details above
6. Click "Test Connection" then "Finish"

## Method 4: Python Script (Custom Queries)

Create a file `query_db.py`:
```python
from sqlalchemy import create_engine, text

engine = create_engine('postgresql://postgres:joe123@localhost:5432/smarttracker')

with engine.connect() as conn:
    # Your custom query
    result = conn.execute(text("SELECT * FROM users"))
    for row in result:
        print(row)
```

Run it:
```bash
cd backend
python query_db.py
```

## Common Queries

```sql
-- Count users
SELECT COUNT(*) FROM users;

-- View recent users
SELECT username, email, created_at FROM users ORDER BY created_at DESC;

-- View user with simulations
SELECT u.username, COUNT(s.id) as simulation_count 
FROM users u 
LEFT JOIN simulations s ON u.id = s.user_id 
GROUP BY u.id, u.username;

-- Delete a user (and their simulations due to CASCADE)
DELETE FROM users WHERE username = 'testuser';

-- Clear all data
TRUNCATE users, simulations RESTART IDENTITY CASCADE;
```

## Current Database Status

Run `python check_db.py` to see current status.

As of last check:
- ✅ 2 users registered
- ✅ 0 simulations created
- ✅ All tables properly configured
