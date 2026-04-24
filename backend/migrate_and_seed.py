"""
migrate_and_seed.py
===================
1. Drops the users table and old enum types
2. Recreates everything cleanly with lowercase enum values
3. Seeds 4 demo accounts
"""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.database.postgres import engine, SessionLocal, Base
from sqlalchemy import text
import bcrypt, uuid

print("=" * 60)
print("  RouteGuard - Full Migration & Seed")
print("=" * 60)

# ── Step 1: Drop old tables & enum types ─────────────────────────
print("\n[1/4] Dropping existing users table and enum types...")
with engine.connect() as conn:
    conn.execute(text("DROP TABLE IF EXISTS users CASCADE"))
    conn.execute(text("DROP TYPE IF EXISTS userrole CASCADE"))
    conn.execute(text("DROP TYPE IF EXISTS user_role CASCADE"))
    conn.commit()
print("      Dropped OK.")

# ── Step 2: Recreate tables from ORM ────────────────────────────
print("\n[2/4] Creating fresh tables from ORM models...")
Base.metadata.create_all(bind=engine)
print("      Tables created OK.")

# ── Step 3: Verify enum values ───────────────────────────────────
print("\n[3/4] Verifying enum values in DB...")
with engine.connect() as conn:
    try:
        result = conn.execute(text(
            "SELECT enumlabel FROM pg_enum WHERE enumtypid = 'userrole'::regtype ORDER BY enumsortorder"
        ))
        vals = [r[0] for r in result]
        print(f"      userrole enum values: {vals}")
    except Exception as e:
        print(f"      Note: {e}")

# ── Step 4: Seed demo users ──────────────────────────────────────
print("\n[4/4] Seeding demo users...")

DEMO_USERS = [
    {
        "full_name": "Sarah Chen",
        "email": "manager@routeguard.com",
        "password": "RouteGuard@2024",
        "role": "manager",
        "company_name": "RouteGuard Logistics HQ",
        "phone_number": "+1-415-555-0192",
        "country": "United States",
    },
    {
        "full_name": "Kim Ji-ho",
        "email": "shipper@routeguard.com",
        "password": "RouteGuard@2024",
        "role": "shipper",
        "company_name": "Seoul Export Partners Ltd.",
        "phone_number": "+82-2-555-0341",
        "country": "South Korea",
    },
    {
        "full_name": "Hans Muller",
        "email": "driver@routeguard.com",
        "password": "RouteGuard@2024",
        "role": "driver",
        "company_name": "EuroFreight GmbH",
        "phone_number": "+49-40-555-0876",
        "country": "Germany",
    },
    {
        "full_name": "Anna Schmidt",
        "email": "receiver@routeguard.com",
        "password": "RouteGuard@2024",
        "role": "receiver",
        "company_name": "Schmidt Distribution AG",
        "phone_number": "+49-89-555-0234",
        "country": "Germany",
    },
]

with engine.connect() as conn:
    for u in DEMO_USERS:
        uid = str(uuid.uuid4())
        pw_hash = bcrypt.hashpw(u["password"].encode(), bcrypt.gensalt()).decode()
        conn.execute(text("""
            INSERT INTO users (user_id, full_name, email, password_hash, role,
                               company_name, phone_number, country, is_active)
            VALUES (CAST(:uid AS UUID), :full_name, :email, :pw_hash, :role,
                    :company_name, :phone_number, :country, true)
        """), {
            "uid": uid,
            "full_name": u["full_name"],
            "email": u["email"],
            "pw_hash": pw_hash,
            "role": u["role"],
            "company_name": u["company_name"],
            "phone_number": u["phone_number"],
            "country": u["country"],
        })
        print(f"      OK  {u['email']}  ({u['role']})")
    conn.commit()

print("\n" + "=" * 60)
print("  DEMO LOGIN CREDENTIALS")
print("=" * 60)
print(f"  {'Role':<10}  {'Email':<35}  Password")
print(f"  {'-'*65}")
for u in DEMO_USERS:
    print(f"  {u['role']:<10}  {u['email']:<35}  {u['password']}")
print("=" * 60)
print("\n  All done! Start the backend: python -m uvicorn app.main:app --reload")
