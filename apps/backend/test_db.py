import asyncio
import sys
sys.path.insert(0, '.')

from app.database import get_db

async def test():
    db_gen = get_db()
    db = await db_gen.__anext__()
    
    try:
        # Check total posts
        total = await db.fetchval('SELECT COUNT(*) FROM posts')
        print(f"Total posts in database: {total}")
        
        # Check posts not removed
        active = await db.fetchval('SELECT COUNT(*) FROM posts WHERE is_removed = FALSE')
        print(f"Active posts (not removed): {active}")
        
        # Get one post to verify schema
        post = await db.fetchrow('SELECT id, type, caption FROM posts LIMIT 1')
        if post:
            print(f"Sample post: id={post['id']}, type={post['type']}, caption={post['caption']}")
        else:
            print("No posts found in database!")
    except Exception as e:
        print(f"Error: {e}")
    finally:
        await db.close()

if __name__ == '__main__':
    asyncio.run(test())
