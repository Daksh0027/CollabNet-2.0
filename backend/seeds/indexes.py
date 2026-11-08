import logging
from core.database import db

logger = logging.getLogger(__name__)


async def create_indexes():
    """Ensure all required production indexes exist on MongoDB collections."""
    try:
        await db.users.create_index(
            [("role", 1), ("verified", 1)],
            name="creator_discovery_role_verified",
        )
        await db.connections.create_index(
            [("status", 1), ("from_id", 1)],
            name="creator_discovery_connections_from",
        )
        await db.connections.create_index(
            [("status", 1), ("to_id", 1)],
            name="creator_discovery_connections_to",
        )
        await db.contracts.create_index(
            [("status", 1), ("creator_id", 1)],
            name="creator_discovery_contracts",
        )
        await db.reviews.create_index(
            [("status", 1), ("reviewee_id", 1)],
            name="creator_discovery_reviews",
        )
        await db.collaboration_requests.create_index(
            [("sender_creator_id", 1), ("receiver_creator_id", 1)],
            unique=True,
            partialFilterExpression={"status": "pending"},
            name="unique_pending_creator_collaboration_request",
        )
        await db.saved_creators.create_index(
            [("user_id", 1), ("creator_id", 1)],
            unique=True,
            name="unique_saved_creator_per_user",
        )
        await db.saved_opportunities.create_index(
            [("creator_id", 1), ("camp_id", 1)],
            unique=True,
            name="unique_saved_opportunity_per_creator",
        )
        await db.notifications.create_index(
            [("user_id", 1), ("created_at", -1)],
            name="notifications_user_timeline",
        )
        await db.notifications.create_index(
            [("user_id", 1), ("origin", 1)],
            name="notifications_user_origin",
        )
        await db.messages.create_index(
            [("thread_id", 1), ("created_at", 1)],
            name="messages_thread_timeline",
        )
        logger.info("Database indexes verified and applied.")
    except Exception as e:
        logger.warning("Error configuring database indexes: %s", e)
