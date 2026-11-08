from core.security import uid, day_offset, iso_offset
from services.contract_service import default_agreement


def get_seed_contracts_and_events(creators, companies, campaigns):
    maya, _, _, jonas, sofia, _ = creators
    elena, _, ava = companies

    # Deal 1: Launch Week Sprint (in_review)
    deliverables_1 = ["1 YouTube dedicated review (8+ min)", "3 Instagram reels", "Stories with link sticker"]
    start_date_1 = day_offset(7)
    end_date_1 = day_offset(21)
    deal1 = {
        "deal_id": uid("deal"),
        "company_id": elena["user_id"],
        "creator_id": maya["user_id"],
        "title": "Launch Week Sprint",
        "deliverables": deliverables_1,
        "start_date": start_date_1,
        "end_date": end_date_1,
        "compensation": 9500,
        "agreement_text": default_agreement(
            "Nova Athletics", "Maya Chen", "Launch Week Sprint", deliverables_1, start_date_1, end_date_1, 9500
        ),
        "status": "in_review",
        "funding_status": "unfunded",
        "funded_at": "",
        "released_at": "",
        "stripe_session_id": "",
        "signatures": {
            "company": {"signed": False, "name": "", "signed_at": ""},
            "creator": {"signed": False, "name": "", "signed_at": ""},
        },
        "created_at": iso_offset(-1),
        "updated_at": iso_offset(-1),
    }

    # Deal 2: Marathon Expo Booth (completed & released)
    deal2 = {
        "deal_id": uid("deal"),
        "company_id": elena["user_id"],
        "creator_id": maya["user_id"],
        "title": "Marathon Expo Booth",
        "deliverables": ["2 YouTube vlogs", "Event-day stories"],
        "start_date": day_offset(-60),
        "end_date": day_offset(-46),
        "compensation": 6000,
        "agreement_text": "Signed at the expo booth — scope, timeline and fee agreed in writing.",
        "status": "completed",
        "funding_status": "released",
        "funded_at": iso_offset(-62),
        "released_at": iso_offset(-45),
        "stripe_session_id": "cs_test_seed_expo",
        "signatures": {
            "company": {"signed": True, "name": "Elena Brand", "signed_at": iso_offset(-62)},
            "creator": {"signed": True, "name": "Maya Chen", "signed_at": iso_offset(-61)},
        },
        "created_at": iso_offset(-63),
        "updated_at": iso_offset(-45),
    }

    contracts = [deal1, deal2]

    reviews = [
        {
            "review_id": uid("rev"),
            "deal_id": deal2["deal_id"],
            "campaign_title": "Marathon Expo Booth",
            "reviewer_id": elena["user_id"],
            "reviewee_id": maya["user_id"],
            "rating": 5,
            "comment": "Delivered early, great on-camera energy, audience loved the product.",
            "status": "approved",
            "moderated": True,
            "created_at": iso_offset(-44),
        },
        {
            "review_id": uid("rev"),
            "deal_id": deal2["deal_id"],
            "campaign_title": "Marathon Expo Booth",
            "reviewer_id": maya["user_id"],
            "reviewee_id": elena["user_id"],
            "rating": 5,
            "comment": "Clear briefs, fast feedback, paid on time.",
            "status": "approved",
            "moderated": True,
            "created_at": iso_offset(-44),
        },
    ]

    applications = [
        {
            "app_id": uid("app"),
            "camp_id": campaigns[0]["camp_id"],
            "campaign_title": campaigns[0]["title"],
            "creator_id": jonas["user_id"],
            "company_id": elena["user_id"],
            "type": "invitation",
            "status": "pending",
            "message": "Your strength series would fit the runner launch perfectly.",
            "created_at": iso_offset(-1),
        },
        {
            "app_id": uid("app"),
            "camp_id": campaigns[2]["camp_id"],
            "campaign_title": campaigns[2]["title"],
            "creator_id": sofia["user_id"],
            "company_id": ava["user_id"],
            "type": "application",
            "status": "pending",
            "message": "I did a ceramide routine video last month — it's my best performer.",
            "created_at": iso_offset(-1),
        },
    ]

    events = [
        {
            "event_id": uid("evt"),
            "title": "Brand audition call — Lumen",
            "date": day_offset(3),
            "type": "meeting",
            "color": "#4FC9D4",
            "status": "scheduled",
            "deal_id": "",
            "participants": [maya["user_id"]],
            "created_at": iso_offset(-4),
        },
        {
            "event_id": uid("evt"),
            "title": "Launch Week Sprint — publish window",
            "date": day_offset(7),
            "type": "campaign",
            "color": "#1ED760",
            "status": "scheduled",
            "deal_id": deal1["deal_id"],
            "participants": [elena["user_id"], maya["user_id"]],
            "created_at": iso_offset(-1),
        },
        {
            "event_id": uid("evt"),
            "title": "Q3 content planning",
            "date": day_offset(14),
            "type": "milestone",
            "color": "#D7F26B",
            "status": "scheduled",
            "deal_id": "",
            "participants": [elena["user_id"]],
            "created_at": iso_offset(-6),
        },
    ]

    activities = [
        {"act_id": uid("act"), "user_id": elena["user_id"], "text": "Opened the deal room: Launch Week Sprint.", "created_at": iso_offset(-1)},
        {"act_id": uid("act"), "user_id": maya["user_id"], "text": "Received a sponsor invitation for Zero-Drop Runner Launch.", "created_at": iso_offset(-1)},
        {"act_id": uid("act"), "user_id": elena["user_id"], "text": "Accepted Maya Chen's connection and opened chat.", "created_at": iso_offset(-9)},
        {"act_id": uid("act"), "user_id": maya["user_id"], "text": "Completed a collaboration: Marathon Expo Booth (rated 5/5).", "created_at": iso_offset(-44)},
    ]

    return contracts, reviews, applications, events, activities
