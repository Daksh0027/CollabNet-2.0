from core.security import uid, iso_offset


def get_seed_threads(creators, companies):
    maya, dario, _, _, _, leo = creators
    elena, marcus, ava = companies

    threads = []
    messages = []

    # Thread 1: Elena & Maya
    tid_1 = "::".join(sorted([elena["user_id"], maya["user_id"]]))
    last_maya_msg = "I'll review the draft agreement and send it over shortly!"
    threads.append({
        "thread_id": tid_1,
        "participants": [elena["user_id"], maya["user_id"]],
        "last_message": last_maya_msg,
        "last_at": iso_offset(-0.02),
        "last_sender_id": maya["user_id"],
        "reads": {elena["user_id"]: iso_offset(-0.01), maya["user_id"]: iso_offset(-0.02)},
        "created_at": iso_offset(-9),
    })
    msgs_1 = [
        (elena["user_id"], "Hi Maya! We're launching a zero-drop runner and your training series is exactly the tone we want.", -8),
        (maya["user_id"], "Hi Elena — I watched the product teaser, the sole design looks great. What deliverables do you have in mind?", -7),
        (elena["user_id"], "One dedicated YouTube review, three reels, and stories with a link sticker. Budget is flexible around $9.5k.", -6),
        (maya["user_id"], "That works. Send over the brief and I'll review timelines.", -5),
        (elena["user_id"], "Perfect, let's draft the deal room.", -1),
        (maya["user_id"], last_maya_msg, -0.02),
    ]
    for sender, text, off in msgs_1:
        messages.append({
            "msg_id": uid("msg"),
            "thread_id": tid_1,
            "sender_id": sender,
            "text": text,
            "created_at": iso_offset(off),
        })

    # Thread 2: Marcus & Maya
    tid_2 = "::".join(sorted([marcus["user_id"], maya["user_id"]]))
    threads.append({
        "thread_id": tid_2,
        "participants": [marcus["user_id"], maya["user_id"]],
        "last_message": "Would you be open to featuring our precision cold-brew system in your next workspace makeover? Budget is flexible around $3,500.",
        "last_at": iso_offset(-0.025),
        "last_sender_id": marcus["user_id"],
        "reads": {marcus["user_id"]: iso_offset(-0.02), maya["user_id"]: iso_offset(-0.1)},
        "created_at": iso_offset(-2),
    })
    messages.append({
        "msg_id": uid("msg"),
        "thread_id": tid_2,
        "sender_id": marcus["user_id"],
        "text": "Hey Maya! We really love your desk setup videos and your morning routine content.",
        "created_at": iso_offset(-0.08),
    })
    messages.append({
        "msg_id": uid("msg"),
        "thread_id": tid_2,
        "sender_id": marcus["user_id"],
        "text": "Would you be open to featuring our precision cold-brew system in your next workspace makeover? Budget is flexible around $3,500.",
        "created_at": iso_offset(-0.025),
    })

    # Thread 3: Ava & Maya
    tid_3 = "::".join(sorted([ava["user_id"], maya["user_id"]]))
    threads.append({
        "thread_id": tid_3,
        "participants": [ava["user_id"], maya["user_id"]],
        "last_message": "Hi Maya! We are preparing our holiday smart-wellness lineup. Would love to send you our smart LED rejuvenation mask for an honest review.",
        "last_at": iso_offset(-0.01),
        "last_sender_id": ava["user_id"],
        "reads": {ava["user_id"]: iso_offset(-0.01), maya["user_id"]: iso_offset(-1)},
        "created_at": iso_offset(-1),
    })
    messages.append({
        "msg_id": uid("msg"),
        "thread_id": tid_3,
        "sender_id": ava["user_id"],
        "text": "Hi Maya! We are preparing our holiday smart-wellness lineup. Would love to send you our smart LED rejuvenation mask for an honest review.",
        "created_at": iso_offset(-0.01),
    })

    # Thread 4: Leo & Maya
    tid_4 = "::".join(sorted([leo["user_id"], maya["user_id"]]))
    threads.append({
        "thread_id": tid_4,
        "participants": [leo["user_id"], maya["user_id"]],
        "last_message": "Yes! Got the review unit yesterday, let me know if you want to test co-op.",
        "last_at": iso_offset(-1.2),
        "last_sender_id": maya["user_id"],
        "reads": {leo["user_id"]: iso_offset(-1.0), maya["user_id"]: iso_offset(-1.2)},
        "created_at": iso_offset(-3),
    })
    messages.append({
        "msg_id": uid("msg"),
        "thread_id": tid_4,
        "sender_id": maya["user_id"],
        "text": "Hey Leo! Loved the stream yesterday, that 1v4 clutch was unbelievable.",
        "created_at": iso_offset(-2),
    })
    messages.append({
        "msg_id": uid("msg"),
        "thread_id": tid_4,
        "sender_id": leo["user_id"],
        "text": "Haha thanks Maya! Are you checking out the new handheld OLED console launch?",
        "created_at": iso_offset(-1.8),
    })
    messages.append({
        "msg_id": uid("msg"),
        "thread_id": tid_4,
        "sender_id": maya["user_id"],
        "text": "Yes! Got the review unit yesterday, let me know if you want to test co-op.",
        "created_at": iso_offset(-1.2),
    })

    # Thread 5: Dario & Maya
    tid_5 = "::".join(sorted([dario["user_id"], maya["user_id"]]))
    threads.append({
        "thread_id": tid_5,
        "participants": [dario["user_id"], maya["user_id"]],
        "last_message": "Awesome, just ordered one. Appreciate the tip!",
        "last_at": iso_offset(-3.5),
        "last_sender_id": dario["user_id"],
        "reads": {dario["user_id"]: iso_offset(-3.5), maya["user_id"]: iso_offset(-3.2)},
        "created_at": iso_offset(-5),
    })
    messages.append({
        "msg_id": uid("msg"),
        "thread_id": tid_5,
        "sender_id": dario["user_id"],
        "text": "Hey Maya, what portable power bank do you recommend for heavy camera gear on flights?",
        "created_at": iso_offset(-4),
    })
    messages.append({
        "msg_id": uid("msg"),
        "thread_id": tid_5,
        "sender_id": maya["user_id"],
        "text": "Definitely the Anker Prime 27k mAh with 140W fast charge. It charges both laptop and camera quickly.",
        "created_at": iso_offset(-3.8),
    })
    messages.append({
        "msg_id": uid("msg"),
        "thread_id": tid_5,
        "sender_id": dario["user_id"],
        "text": "Awesome, just ordered one. Appreciate the tip!",
        "created_at": iso_offset(-3.5),
    })

    return threads, messages
