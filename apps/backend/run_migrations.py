import asyncio
import asyncpg
import os

# Database connection from your .env
DATABASE_URL = "postgresql://postgres:z6lbXkV0JTp2WBkW@db.eglgymfplmnhpiuhpcna.supabase.co:5432/postgres"

async def run_migrations():
    print("Connecting to database...")
    conn = await asyncpg.connect(DATABASE_URL)
    print("Connected!")
    
    try:
        # Read migration file 002
        print("\nRunning migration 002...")
        with open("../database/migrations/002_add_browser_id_to_posts.sql", "r") as f:
            migration_sql = f.read()
        
        # Execute migration
        await conn.execute(migration_sql)
        print("Migration 002 completed!")
        
        # Read migration file 003
        print("\nRunning migration 003...")
        with open("../database/migrations/003_admin_sessions.sql", "r") as f:
            migration_sql = f.read()
        
        # Execute migration
        await conn.execute(migration_sql)
        print("Migration 003 completed!")
        
        print("\nAll migrations completed successfully!")
        
    except Exception as e:
        print(f"\nError: {e}")
        raise
    finally:
        await conn.close()
        print("\nDatabase connection closed")

if __name__ == "__main__":
    asyncio.run(run_migrations())
