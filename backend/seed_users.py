"""Fix enum mismatch and seed demo users."""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.database.postgres import engine, SessionLocal, Base
from sqlalchemy import text

print("Checking & fixing userrole enum in PostgreSQL...")

fix_sql = """
DO $$
BEGIN
    -- Add lowercase values if they don't exist
    BEGIN ALTER TYPE userrole ADD VALUE IF NOT EXISTS 'shipper'; EXCEPTION WHEN others THEN NULL; END;
    BEGIN ALTER TYPE userrole ADD VALUE IF NOT EXISTS 'manager'; EXCEPTION WHEN others THEN NULL; END;
    BEGIN ALTER TYPE userrole ADD VALUE IF NOT EXISTS 'driver';  EXCEPTION WHEN others THEN NULL; END;
    BEGIN ALTER TYPE userrole ADD VALUE IF NOT EXISTS 'receiver';EXCEPTION WHEN others THEN NULL; END;
END$$;
"""

with engine.connect() as conn:
    try:
        # Check current enum values
        result = conn.execute(text("SELECT enumlabel FROM pg_enum WHERE enumtypid = 'userrole'::regtype ORDER BY enumsortorder"))
        current = [r[0] for r in result]
        print(f"Current enum values: {current}")
    except Exception as e:
        print(f"Enum may not exist yet: {e}")
        current = []

    if 'manager' not in current:
        print("Adding lowercase enum values...")
        conn.execute(text(fix_sql))
        conn.commit()
        print("Done.")
    else:
        print("Lowercase enum values already present.")

# Now create tables
print("\nCreating/verifying tables...")
Base.metadata.create_all(bind=engine)
print("Tables OK.")

# Seed users
from app.models.user import User, UserRole
from app.utils.auth import hash_password

DEMO_USERS = [
    {
        "full_name": "Sarah Chen",
        "email": "manager@routeguard.com",
        "password": "RouteGuard@2024",
        "role": UserRole.MANAGER,
        "company_name": "RouteGuard Logistics HQ",
        "phone_number": "+1-415-555-0192",
        "country": "United States",
    },
    {
        "full_name": "Kim Ji-ho",
        "email": "shipper@routeguard.com",
        "password": "RouteGuard@2024",
        "role": UserRole.SHIPPER,
        "company_name": "Seoul Export Partners Ltd.",
        "phone_number": "+82-2-555-0341",
        "country": "South Korea",
    },
    {
        "full_name": "Hans Muller",
        "email": "driver@routeguard.com",
        "password": "RouteGuard@2024",
        "role": UserRole.DRIVER,
        "company_name": "EuroFreight GmbH",
        "phone_number": "+49-40-555-0876",
        "country": "Germany",
    },
    {
        "full_name": "Anna Schmidt",
        "email": "receiver@routeguard.com",
        "password": "RouteGuard@2024",
        "role": UserRole.RECEIVER,
        "company_name": "Schmidt Distribution AG",
        "phone_number": "+49-89-555-0234",
        "country": "Germany",
    },
]

db = SessionLocal()
created = 0
skipped = 0

print("\nSeeding demo users...")
for u in DEMO_USERS:
    try:
        existing = db.query(User).filter(User.email == u["email"]).first()
        if existing:
            print(f"  SKIP  {u['email']}  (already exists)")
            skipped += 1
            continue
    except Exception:
        existing = None

    new_user = User(
        full_name=u["full_name"],
        email=u["email"],
        password_hash=hash_password(u["password"]),
        role=u["role"],
        company_name=u["company_name"],
        phone_number=u["phone_number"],
        country=u["country"],
        is_active=True,
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    print(f"  OK    {u['email']}  ({u['role'].value})")
    created += 1

db.close()
print(f"\nDone — {created} created, {skipped} skipped.")

print("\n" + "="*55)
print("  DEMO LOGIN CREDENTIALS")
print("="*55)
for u in DEMO_USERS:
    print(f"  {u['role'].value:<10}  {u['email']:<35}  {u['password']}")
print("="*55)
