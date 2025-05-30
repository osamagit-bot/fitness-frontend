# create_attendance_table.py
import sqlite3
import os

# Get the database file path
db_path = 'db.sqlite3'  # default location

if os.path.exists(db_path):
    # Connect to the database
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    # Check if table already exists
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='users_attendance'")
    if cursor.fetchone():
        print("Table users_attendance already exists - will drop and recreate")
        cursor.execute("DROP TABLE IF EXISTS users_attendance")
    
    # Create the attendance table
    cursor.execute('''
    CREATE TABLE "users_attendance" (
        "id" integer NOT NULL PRIMARY KEY AUTOINCREMENT,
        "check_in_time" datetime NOT NULL,
        "date" date NOT NULL,
        "member_id" integer NOT NULL REFERENCES "users_member" ("id") DEFERRABLE INITIALLY DEFERRED
    )
    ''')
    
    # Create index for member_id
    cursor.execute('''
    CREATE INDEX "users_attendance_member_id_idx" ON "users_attendance" ("member_id")
    ''')
    
    # Create unique constraint
    cursor.execute('''
    CREATE UNIQUE INDEX "users_attendance_member_id_date_uniq" ON "users_attendance" ("member_id", "date")
    ''')
    
    print("Successfully created users_attendance table")
    
    # Commit and close
    conn.commit()
    conn.close()
else:
    print(f"Database file {db_path} not found")