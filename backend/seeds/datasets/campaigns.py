from core.security import uid, day_offset, iso_offset


def get_seed_campaigns(companies):
    elena, marcus, ava = companies[0], companies[1], companies[2]
    return [
        {
            "camp_id": uid("cmp"),
            "company_id": elena["user_id"],
            "title": "Zero-Drop Runner Launch",
            "brief": "Launch campaign for our new zero-drop running shoe. Authentic training-story integration, not a hard sell.",
            "deliverables": ["1 YouTube dedicated review (8+ min)", "3 Instagram reels", "Stories with link sticker"],
            "budget_min": 4000,
            "budget_max": 12000,
            "deadline": day_offset(45),
            "niches": ["Fitness", "Health & Fitness", "Tech & Gadgets"],
            "status": "open",
            "created_at": iso_offset(-5),
        },
        {
            "camp_id": uid("cmp"),
            "company_id": marcus["user_id"],
            "title": "Cold Brew Summer Series",
            "brief": "Summer push for our canned cold brew. Real recipes, real moments — pool days, picnics, office afternoons.",
            "deliverables": ["2 TikTok videos", "1 Instagram reel", "Recipe caption collab"],
            "budget_min": 800,
            "budget_max": 2500,
            "deadline": day_offset(30),
            "niches": ["Food & Cooking", "Lifestyle"],
            "status": "open",
            "created_at": iso_offset(-3),
        },
        {
            "camp_id": uid("cmp"),
            "company_id": ava["user_id"],
            "title": "Barrier Repair Campaign",
            "brief": "Educational series on skin barrier repair featuring our ceramide line. Science-forward creators preferred.",
            "deliverables": ["1 YouTube integration (3 min)", "2 Instagram posts", "1 live Q&A"],
            "budget_min": 6000,
            "budget_max": 15000,
            "deadline": day_offset(60),
            "niches": ["Beauty & Skincare", "Wellness"],
            "status": "open",
            "created_at": iso_offset(-2),
        },
    ]
