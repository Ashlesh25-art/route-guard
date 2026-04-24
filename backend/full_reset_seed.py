"""
full_reset_seed.py — Complete reset and seed for RouteGuard
"""
import sys, os, uuid
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import bcrypt
from app.database.postgres import engine
from sqlalchemy import text

print("=" * 60)
print("  RouteGuard - Full Reset & Seed (Direct SQL)")
print("=" * 60)

FULL_SQL = """
-- 1. Drop old objects
DROP TABLE IF EXISTS users CASCADE;
DROP TYPE IF EXISTS userrole CASCADE;
DROP TYPE IF EXISTS user_role CASCADE;

-- 2. Create enum with lowercase values
CREATE TYPE userrole AS ENUM ('shipper', 'manager', 'driver', 'receiver');

-- 3. Create users table
CREATE TABLE users (
    user_id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name     VARCHAR(100) NOT NULL,
    email         VARCHAR(100) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role          userrole NOT NULL,
    company_name  VARCHAR(100),
    phone_number  VARCHAR(20),
    country       VARCHAR(50),
    is_active     BOOLEAN DEFAULT true,
    created_at    TIMESTAMPTZ DEFAULT now(),
    updated_at    TIMESTAMPTZ DEFAULT now(),
    last_login    TIMESTAMPTZ
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role  ON users(role);
"""

with engine.connect() as conn:
    print("\n[1/3] Running DDL (drop + recreate table & enum)...")
    conn.execute(text(FULL_SQL))
    conn.commit()
    print("      Schema OK.")

DEMO_USERS = [
    ("Sarah Chen",   "manager@routeguard.com",  "RouteGuard@2024", "manager",  "RouteGuard Logistics HQ",      "+1-415-555-0192", "United States"),
    ("Kim Ji-ho",    "shipper@routeguard.com",   "RouteGuard@2024", "shipper",  "Seoul Export Partners Ltd.",   "+82-2-555-0341",  "South Korea"),
    ("Hans Muller",  "driver@routeguard.com",    "RouteGuard@2024", "driver",   "EuroFreight GmbH",             "+49-40-555-0876", "Germany"),
    ("Anna Schmidt", "receiver@routeguard.com",  "RouteGuard@2024", "receiver", "Schmidt Distribution AG",      "+49-89-555-0234", "Germany"),
]

print("\n[2/3] Inserting demo users...")
with engine.connect() as conn:
    for (name, email, password, role, company, phone, country) in DEMO_USERS:
        uid = str(uuid.uuid4())
        pw_hash = bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()
        conn.execute(text("""
            INSERT INTO users
                (user_id, full_name, email, password_hash, role, company_name, phone_number, country, is_active)
            VALUES
                (gen_random_uuid(), :name, :email, :pw, CAST(:role AS userrole), :company, :phone, :country, true)
        """), {"name": name, "email": email, "pw": pw_hash, "role": role,
               "company": company, "phone": phone, "country": country})
        print(f"      OK  {email}  ({role})")
    conn.commit()

print("\n[3/3] Verifying...")
with engine.connect() as conn:
    result = conn.execute(text("SELECT email, role, full_name FROM users ORDER BY role"))
    rows = result.fetchall()
    print(f"      {len(rows)} users in DB:")
    for row in rows:
        print(f"        {row[1]:<10}  {row[0]:<35}  {row[2]}")

print("\n" + "=" * 60)
print("  DEMO LOGIN CREDENTIALS")
print("=" * 60)
print(f"  {'Role':<10}  {'Email':<35}  Password")
print(f"  {'-'*65}")
for (name, email, password, role, *_) in DEMO_USERS:
    print(f"  {role:<10}  {email:<35}  {password}")
print("=" * 60)
print("\n  Start backend: cd backend && python -m uvicorn app.main:app --reload")
print("  Start frontend: cd frontend && npm run dev\n")
