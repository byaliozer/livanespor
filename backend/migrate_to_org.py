"""Update admin email and site settings to .org domain."""
import asyncio, os
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
from pathlib import Path

load_dotenv(Path(__file__).parent / '.env')

async def main():
    db = AsyncIOMotorClient(os.environ['MONGO_URL'])[os.environ['DB_NAME']]
    r1 = await db.users.update_one(
        {'email': 'admin@livanespor.com'},
        {'$set': {'email': 'admin@livanespor.org'}}
    )
    r2 = await db.site_settings.update_one(
        {'id': 'main'},
        {'$set': {'email': 'bilgi@livanespor.org'}}
    )
    print(f"users updated: {r1.modified_count}")
    print(f"site_settings updated: {r2.modified_count}")

    # verify
    u = await db.users.find_one({'role': 'super_admin'}, {'_id': 0, 'password_hash': 0})
    s = await db.site_settings.find_one({'id': 'main'}, {'_id': 0})
    print(f"\nAdmin: {u.get('email') if u else 'NONE'}")
    print(f"Site contact: {s.get('email') if s else 'NONE'}")

asyncio.run(main())
