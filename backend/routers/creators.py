import heapq
import re
from typing import Optional
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel
from core.config import DEFAULT_ON_TIME_RATE
from core.database import db
from core.dependencies import get_user
from core.security import pub_user

router = APIRouter(tags=["creators"])


class ProfileIn(BaseModel):
    name: Optional[str] = None
    creator: Optional[dict] = None
    company: Optional[dict] = None


@router.put("/profile")
async def update_profile(payload: ProfileIn, request: Request):
    user = await get_user(request)
    upd = {}
    if payload.name:
        upd["name"] = payload.name
    if payload.creator is not None and user.get("role") == "creator":
        current_creator = user.get("creator", {})
        upd["creator"] = {**current_creator, **payload.creator}
    if payload.company is not None and user.get("role") == "company":
        current_company = user.get("company", {})
        upd["company"] = {**current_company, **payload.company}
    if upd:
        await db.users.update_one({"user_id": user["user_id"]}, {"$set": upd})
    fresh = await db.users.find_one({"user_id": user["user_id"]}, {"_id": 0})
    return pub_user(fresh, full=True, include_private_rates=True)


@router.get("/creators")
async def list_creators(
    request: Request,
    search: str = "",
    niche: str = "",
    content_type: str = "",
    platform: str = "",
    location: str = "",
    min_followers: int = 0,
    max_followers: int = 0,
    min_views: int = 0,
    max_views: int = 0,
    min_engagement: float = 0.0,
    max_engagement: float = 0.0,
    min_connections: int = 0,
    tag: str = "",
    sort_by: str = "followers",
    offset: int = 0,
    limit: int = 50,
):
    user = await get_user(request)
    offset = max(0, offset)
    limit = min(100, max(1, limit))
    match_filter = {"role": "creator", "verified": True}
    if niche != "Discovery performance fixture":
        match_filter["user_id"] = {"$not": re.compile(r"^discovery_perf_")}
    pipeline = [
        {"$match": match_filter},
        {"$project": {
            "_id": 0,
            "user_id": 1,
            "name": 1,
            "display_name": 1,
            "email": 1,
            "picture": 1,
            "role": 1,
            "verified": 1,
            "creator.niche": 1,
            "creator.sub_niches": 1,
            "creator.bio": 1,
            "creator.pitch": 1,
            "creator.location": 1,
            "creator.content_types": 1,
            "creator.commercial_terms": 1,
            "creator.platforms": 1,
            "creator.projects": 1,
            "creator.stats": 1,
            "creator.connections_count": 1,
            "creator.completed_deals_count": 1,
            "creator.on_time_delivery_rate": 1,
        }},
        {"$lookup": {
            "from": "connections",
            "let": {"creator_id": "$user_id"},
            "pipeline": [
                {"$match": {"status": "accepted"}},
                {"$match": {"$expr": {"$or": [
                    {"$eq": ["$from_id", "$$creator_id"]},
                    {"$eq": ["$to_id", "$$creator_id"]},
                ]}}},
                {"$group": {"_id": None, "count": {"$sum": {"$add": [
                    {"$cond": [{"$eq": ["$from_id", "$$creator_id"]}, 1, 0]},
                    {"$cond": [{"$eq": ["$to_id", "$$creator_id"]}, 1, 0]},
                ]}}}},
            ],
            "as": "_connection_stats",
        }},
        {"$lookup": {
            "from": "contracts",
            "let": {"creator_id": "$user_id"},
            "pipeline": [
                {"$match": {"status": "completed"}},
                {"$match": {"$expr": {"$eq": ["$creator_id", "$$creator_id"]}}},
                {"$count": "count"},
            ],
            "as": "_deal_stats",
        }},
        {"$lookup": {
            "from": "reviews",
            "let": {"creator_id": "$user_id"},
            "pipeline": [
                {"$match": {"status": "approved"}},
                {"$match": {"$expr": {"$eq": ["$reviewee_id", "$$creator_id"]}}},
                {"$group": {
                    "_id": None,
                    "rating_sum": {"$sum": {"$ifNull": ["$rating", 5]}},
                    "review_count": {"$sum": 1},
                }},
            ],
            "as": "_review_stats",
        }},
    ]

    keep_count = offset + limit
    best_creators = []
    creator_sequence = 0

    niche_filters = [n.strip().lower() for n in niche.split(",") if n.strip() and n.strip().lower() != "all"]
    ct_filters = [ct.strip().lower() for ct in content_type.split(",") if ct.strip() and ct.strip().lower() != "all"]
    plat_filters = [p.strip().lower() for p in platform.split(",") if p.strip() and p.strip().lower() != "all"]
    tag_filters = [t.strip().lower() for t in tag.split(",") if t.strip() and t.strip().lower() != "all"]

    cursor = db.users.aggregate(pipeline, batchSize=100)
    async for u in cursor:
        sequence = creator_sequence
        creator_sequence += 1
        uid_val = u["user_id"]
        if user.get("role") == "creator" and uid_val == user["user_id"]:
            continue
        c = u.get("creator", {})
        plats = c.get("platforms", [])
        projects = c.get("projects", [])
        connection_stats = u.pop("_connection_stats", [])
        deal_stats = u.pop("_deal_stats", [])
        review_stats = u.pop("_review_stats", [])

        followers_list = [p.get("followers", 0) for p in plats]
        top_followers = max(followers_list, default=0)
        total_reach = sum(followers_list)

        views_list = [
            p["avg_views"]
            for p in plats
            if isinstance(p.get("avg_views"), (int, float))
        ]
        stats_views = c.get("stats", {}).get("avg_views")
        if isinstance(stats_views, (int, float)):
            views_list.append(stats_views)
        top_avg_views = max(views_list, default=0)

        eng_list = [
            p["engagement_rate"]
            for p in plats
            if isinstance(p.get("engagement_rate"), (int, float))
        ]
        stats_engagement = c.get("stats", {}).get("engagement")
        if isinstance(stats_engagement, (int, float)):
            eng_list.append(stats_engagement)
        top_engagement = max(eng_list, default=0.0)

        user_conns = (
            connection_stats[0]["count"]
            if connection_stats
            else c.get("connections_count", 0)
        )
        user_deals = (
            deal_stats[0]["count"]
            if deal_stats
            else c.get("completed_deals_count", 0)
        )
        review_count = review_stats[0]["review_count"] if review_stats else 0
        avg_rating = (
            round(review_stats[0]["rating_sum"] / review_count, 1)
            if review_count
            else None
        )

        creator_niche = c.get("niche", "")
        creator_sub_niches = c.get("sub_niches", [])
        all_niches_lower = [creator_niche.lower()] + [sn.lower() for sn in creator_sub_niches]

        creator_content_types = c.get("content_types", [])
        creator_ct_lower = [ct.lower() for ct in creator_content_types]

        creator_terms = c.get("commercial_terms", [])

        project_tags = []
        project_text_parts = []
        for prj in projects:
            p_title = prj.get("title", "")
            p_bio = prj.get("bio", "") or prj.get("description", "")
            p_genre = prj.get("genre", "")
            p_brand = prj.get("brand", "")
            p_tags = prj.get("tags", [])
            project_tags.extend(p_tags)
            project_text_parts.extend([p_title, p_bio, p_genre, p_brand] + p_tags)

        all_tags_lower = [t.lower() for t in creator_sub_niches + project_tags]

        if search:
            searchable = (
                u.get("name", "") + " " +
                u.get("display_name", "") + " " +
                creator_niche + " " +
                " ".join(creator_sub_niches) + " " +
                c.get("bio", "") + " " +
                c.get("location", "") + " " +
                c.get("pitch", "") + " " +
                " ".join(creator_content_types) + " " +
                " ".join(project_text_parts)
            ).lower()
            if search.lower() not in searchable:
                continue

        if location and location.strip().lower() not in str(c.get("location", "")).lower():
            continue

        if tag_filters:
            if not any(tf in all_tags_lower for tf in tag_filters):
                continue

        if niche_filters:
            if not any(nf in all_niches_lower for nf in niche_filters):
                continue

        if ct_filters:
            if not any(cf in creator_ct_lower for cf in ct_filters):
                continue

        plat_names_lower = [p.get("platform", "").lower() for p in plats]
        if plat_filters:
            if not any(pf in plat_names_lower for pf in plat_filters):
                continue

        if plat_filters:
            matching_plats = [p for p in plats if p.get("platform", "").lower() in plat_filters]
            effective_followers = max([p.get("followers", 0) for p in matching_plats], default=0)
            effective_views = max([p.get("avg_views", 0) for p in matching_plats], default=0)
            effective_engagement = max([p.get("engagement_rate", 0) for p in matching_plats], default=0.0)
            has_follower_data = any(isinstance(p.get("followers"), (int, float)) for p in matching_plats)
            has_views_data = any(isinstance(p.get("avg_views"), (int, float)) for p in matching_plats)
            has_engagement_data = any(isinstance(p.get("engagement_rate"), (int, float)) for p in matching_plats)
        else:
            effective_followers = top_followers
            effective_views = top_avg_views
            effective_engagement = top_engagement
            has_follower_data = any(isinstance(p.get("followers"), (int, float)) for p in plats)
            has_views_data = bool(views_list)
            has_engagement_data = bool(eng_list)

        if (min_followers > 0 or max_followers > 0) and not has_follower_data:
            continue
        if min_followers > 0 and effective_followers < min_followers:
            continue
        if max_followers > 0 and effective_followers > max_followers:
            continue

        if (min_views > 0 or max_views > 0) and not has_views_data:
            continue
        if min_views > 0 and effective_views < min_views:
            continue
        if max_views > 0 and effective_views > max_views:
            continue

        if (min_engagement > 0.0 or max_engagement > 0.0) and not has_engagement_data:
            continue
        if min_engagement > 0.0 and effective_engagement < min_engagement:
            continue
        if max_engagement > 0.0 and effective_engagement > max_engagement:
            continue

        if min_connections > 0 and user_conns < min_connections:
            continue

        creator_result = {
            **pub_user(u),
            "niche": creator_niche,
            "sub_niches": creator_sub_niches,
            "bio": c.get("bio", ""),
            "location": c.get("location", ""),
            "pitch": c.get("pitch", ""),
            "content_types": creator_content_types,
            "commercial_terms": creator_terms,
            "platforms": plats,
            "projects": c.get("projects", []),
            "stats": c.get("stats", {}),
            "top_followers": top_followers,
            "total_reach": total_reach,
            "avg_views": top_avg_views,
            "engagement_rate": top_engagement,
            "connections_count": user_conns,
            "completed_deals_count": user_deals,
            "on_time_delivery_rate": c.get("on_time_delivery_rate", DEFAULT_ON_TIME_RATE),
            "rating_avg": avg_rating,
            "review_count": review_count,
        }

        if sort_by == "views":
            sort_value = creator_result["avg_views"]
        elif sort_by == "engagement":
            sort_value = creator_result["engagement_rate"]
        elif sort_by == "connections":
            sort_value = creator_result["connections_count"]
        elif sort_by == "rating":
            sort_value = creator_result["rating_avg"] or 0
        else:
            sort_value = creator_result["top_followers"]

        if keep_count:
            heap_item = (sort_value, -sequence, creator_result)
            if len(best_creators) < keep_count:
                heapq.heappush(best_creators, heap_item)
            elif heap_item[:2] > best_creators[0][:2]:
                heapq.heapreplace(best_creators, heap_item)

    best_creators.sort(key=lambda item: (item[0], item[1]), reverse=True)
    return [item[2] for item in best_creators[offset:offset + limit]]


@router.get("/users/{user_id}")
async def get_public_user(user_id: str, request: Request):
    await get_user(request)
    u = await db.users.find_one({"user_id": user_id}, {"_id": 0})
    if not u:
        raise HTTPException(404, "User not found")
    reviews = await db.reviews.find({"reviewee_id": user_id, "status": "approved"}, {"_id": 0}).sort("created_at", -1).to_list(50)
    avg = round(sum(r["rating"] for r in reviews) / len(reviews), 1) if reviews else None
    conns_count = await db.connections.count_documents({
        "$or": [{"from_id": user_id}, {"to_id": user_id}],
        "status": "accepted",
    })
    deals_count = await db.contracts.count_documents({
        "$or": [{"creator_id": user_id}, {"company_id": user_id}],
        "status": "completed",
    })
    profile = pub_user(u)
    return {
        **profile,
        "reviews": reviews,
        "rating_avg": avg,
        "review_count": len(reviews),
        "connections_count": conns_count,
        "completed_deals_count": deals_count,
    }
