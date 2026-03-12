import sqlite3

conn = sqlite3.connect('simulation.db')
c = conn.cursor()

try:
    # Add purpose column to users table
    c.execute('ALTER TABLE users ADD COLUMN purpose VARCHAR(100)')
    conn.commit()
    print('✓ Successfully added purpose column to users table')
except Exception as e:
    if 'duplicate column name' in str(e).lower():
        print('✓ Purpose column already exists')
    else:
        print(f'Error: {e}')

conn.close()
