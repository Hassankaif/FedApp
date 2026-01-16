import asyncio
import aiomysql

# ---------------------------------------------------------
# Configuration: Matches your main.py but uses 127.0.0.1
# ---------------------------------------------------------
DB_CONFIG = {
    "host": "127.0.0.1",       # Changed from "HASSAN" to "127.0.0.1"
    "port": 3306,
    "user": "root",
    "password": "kaif&*9363",  # Your actual password
    "db": "FederatedLearning",
    "autocommit": True
}

async def test_connection():
    print(f"🔌 Connecting to MySQL at {DB_CONFIG['host']}...")
    
    try:
        # Attempt to create a connection pool
        pool = await aiomysql.create_pool(**DB_CONFIG)
        
        async with pool.acquire() as conn:
            async with conn.cursor() as cur:
                # Run a simple query to verify access
                await cur.execute("SELECT VERSION();")
                version = await cur.fetchone()
                print(f"✅ SUCCESS: Connected to MySQL server!")
                print(f"📊 Server Version: {version[0]}")
                
        # Clean up
        pool.close()
        await pool.wait_closed()
        
    except Exception as e:
        print("\n❌ CONNECTION FAILED")
        print("---------------------")
        print(f"Error: {e}")
        print("---------------------")
        print("Tip: If the error is 'Access denied', check your password.")
        print("Tip: If the error is 'Host not allowed', ensure host is '127.0.0.1'.")

if __name__ == "__main__":
    # Windows-specific fix for asyncio loop (often needed for aiomysql on Windows)
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    asyncio.run(test_connection())