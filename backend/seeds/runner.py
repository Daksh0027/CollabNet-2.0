import argparse
import asyncio
import logging
from core.database import db
from seeds.indexes import create_indexes
from seeds.datasets import (
    get_seed_users,
    get_seed_campaigns,
    get_seed_connections,
    get_seed_threads,
    get_seed_contracts_and_events,
    get_seed_notifications,
)

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)

COLLECTIONS = [
    "users",
    "campaigns",
    "connections",
    "threads",
    "messages",
    "contracts",
    "contract_versions",
    "reviews",
    "applications",
    "events",
    "activities",
    "notifications",
    "saved_creators",
    "saved_opportunities",
    "collaboration_requests",
]


async def clear_all():
    """Drop or clear all application data collections."""
    for col_name in COLLECTIONS:
        await db[col_name].delete_many({})
    logger.info("Cleared %d collections in database.", len(COLLECTIONS))


async def get_seed_status() -> dict:
    """Return document count breakdown for each collection."""
    status = {}
    for col_name in COLLECTIONS:
        count = await db[col_name].count_documents({})
        status[col_name] = count
    return status


async def seed_all(force: bool = False):
    """Seed demo accounts, campaigns, contracts, and notifications idempotently."""
    existing_users = await db.users.count_documents({})
    if existing_users > 0 and not force:
        logger.info("Database already contains %d users. Seeding skipped.", existing_users)
        return False

    logger.info("Applying database indexes...")
    await create_indexes()

    logger.info("Generating seed dataset...")
    creators, companies = get_seed_users()
    campaigns = get_seed_campaigns(companies)
    connections = get_seed_connections(creators, companies)
    threads, messages = get_seed_threads(creators, companies)
    contracts, reviews, applications, events, activities = get_seed_contracts_and_events(
        creators, companies, campaigns
    )
    notifications = get_seed_notifications(creators, companies)

    logger.info("Inserting records into database...")
    if creators or companies:
        await db.users.insert_many(creators + companies)
    if campaigns:
        await db.campaigns.insert_many(campaigns)
    if connections:
        await db.connections.insert_many(connections)
    if threads:
        await db.threads.insert_many(threads)
    if messages:
        await db.messages.insert_many(messages)
    if contracts:
        await db.contracts.insert_many(contracts)
    if reviews:
        await db.reviews.insert_many(reviews)
    if applications:
        await db.applications.insert_many(applications)
    if events:
        await db.events.insert_many(events)
    if activities:
        await db.activities.insert_many(activities)
    if notifications:
        await db.notifications.insert_many(notifications)

    logger.info("Successfully seeded CollaboNet demo database.")
    return True


async def reset_all():
    """Wipe database, rebuild indexes, and seed pristine demo dataset."""
    logger.info("Resetting CollaboNet database...")
    await clear_all()
    await seed_all(force=True)
    logger.info("Database reset complete.")


def main():
    parser = argparse.ArgumentParser(description="CollaboNet Data Seeding CLI")
    parser.add_argument("--seed", action="store_true", help="Seed data if empty (default)")
    parser.add_argument("--reset", action="store_true", help="Clear all data and re-seed from scratch")
    parser.add_argument("--clean", action="store_true", help="Clear all collections without seeding")
    parser.add_argument("--status", action="store_true", help="Show document counts across collections")
    args = parser.parse_args()

    async def run():
        if args.status:
            counts = await get_seed_status()
            print("\n=== CollaboNet Collection Status ===")
            for col, count in sorted(counts.items()):
                print(f"  {col.ljust(25)}: {count}")
            print("===================================\n")
        elif args.clean:
            await clear_all()
        elif args.reset:
            await reset_all()
        else:
            await seed_all()

    asyncio.run(run())


if __name__ == "__main__":
    main()
