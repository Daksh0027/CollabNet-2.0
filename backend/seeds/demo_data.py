from seeds.runner import seed_all, reset_all, clear_all, get_seed_status
from seeds.indexes import create_indexes

# Backward-compatibility alias
run_migrations_and_seed = seed_all
seed = seed_all

__all__ = [
    "run_migrations_and_seed",
    "seed",
    "seed_all",
    "reset_all",
    "clear_all",
    "get_seed_status",
    "create_indexes",
]
