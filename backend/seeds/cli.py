import argparse
import asyncio
from seeds.runner import seed_all, reset_all, clear_all, get_seed_status


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
