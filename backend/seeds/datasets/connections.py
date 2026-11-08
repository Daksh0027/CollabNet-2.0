from core.security import uid, iso_offset


def get_seed_connections(creators, companies):
    maya, dario, priya, jonas, sofia, leo = creators
    elena, marcus, ava = companies

    return [
        {
            "conn_id": uid("con"),
            "from_id": elena["user_id"],
            "to_id": maya["user_id"],
            "from_role": "company",
            "to_role": "creator",
            "status": "accepted",
            "message": "Loved the smart-home series. Want to work on our runner launch?",
            "created_at": iso_offset(-10),
            "updated_at": iso_offset(-9),
        },
        {
            "conn_id": uid("con"),
            "from_id": marcus["user_id"],
            "to_id": maya["user_id"],
            "from_role": "company",
            "to_role": "creator",
            "status": "accepted",
            "message": "Loved your desk setup video!",
            "created_at": iso_offset(-2),
            "updated_at": iso_offset(-2),
        },
        {
            "conn_id": uid("con"),
            "from_id": ava["user_id"],
            "to_id": maya["user_id"],
            "from_role": "company",
            "to_role": "creator",
            "status": "accepted",
            "message": "Collab on smart wellness device",
            "created_at": iso_offset(-1),
            "updated_at": iso_offset(-1),
        },
        {
            "conn_id": uid("con"),
            "from_id": leo["user_id"],
            "to_id": maya["user_id"],
            "from_role": "creator",
            "to_role": "creator",
            "status": "accepted",
            "message": "Gaming collab",
            "created_at": iso_offset(-3),
            "updated_at": iso_offset(-3),
        },
        {
            "conn_id": uid("con"),
            "from_id": dario["user_id"],
            "to_id": maya["user_id"],
            "from_role": "creator",
            "to_role": "creator",
            "status": "accepted",
            "message": "Travel tech setup",
            "created_at": iso_offset(-5),
            "updated_at": iso_offset(-5),
        },
        {
            "conn_id": uid("con"),
            "from_id": marcus["user_id"],
            "to_id": priya["user_id"],
            "from_role": "company",
            "to_role": "creator",
            "status": "pending",
            "message": "Your ingredient breakdowns are excellent — open to a coffee collab?",
            "created_at": iso_offset(-2),
            "updated_at": iso_offset(-2),
        },
    ]
