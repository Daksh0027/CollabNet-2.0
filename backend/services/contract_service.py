from typing import List, Optional
from core.security import now, uid


def default_agreement(
    company: str,
    creator: str,
    title: str,
    deliverables: List[str],
    start: str,
    end: str,
    compensation: float,
) -> str:
    items = "\n".join([f"  - {d}" for d in deliverables]) or "  - To be agreed in chat"
    return (
        f"COLLABORATION AGREEMENT — {title}\n"
        f"Parties: {company} (\"Sponsor\") and {creator} (\"Creator\")\n\n"
        f"1. Scope. The Creator will produce:\n{items}\n"
        f"2. Timeline. Content window: {start} to {end}. Publishing dates are tracked on the shared calendar.\n"
        f"3. Compensation. ${compensation} flat fee, payable within 14 days of final delivery.\n"
        f"4. Usage. Sponsor receives 30-day paid usage rights on all deliverables.\n"
        f"5. Completion. Both parties confirm delivery in the deal room and exchange moderated ratings.\n"
    )


def contract_snapshot(c: dict, version: int, author_id: str = "", change_summary: str = "") -> dict:
    return {
        "version": version,
        "version_id": uid("ver"),
        "title": c.get("title", ""),
        "deliverables": list(c.get("deliverables", [])),
        "start_date": c.get("start_date", ""),
        "end_date": c.get("end_date", ""),
        "compensation": c.get("compensation", 0),
        "agreement_text": c.get("agreement_text", ""),
        "author_id": author_id,
        "change_summary": change_summary,
        "created_at": now(),
    }


def contract_history(c: dict) -> list:
    history = c.get("versions")
    if history:
        return history
    return [{
        "version": 1,
        "version_id": f"{c.get('deal_id', 'deal')}_v1",
        "title": c.get("title", ""),
        "deliverables": list(c.get("deliverables", [])),
        "start_date": c.get("start_date", ""),
        "end_date": c.get("end_date", ""),
        "compensation": c.get("compensation", 0),
        "agreement_text": c.get("agreement_text", ""),
        "author_id": c.get("company_id", ""),
        "change_summary": "Original agreement",
        "created_at": c.get("created_at", ""),
    }]


def enrich_contract(c: dict, me_id: str) -> dict:
    other_id = c["creator_id"] if me_id == c["company_id"] else c["company_id"]
    my_role = "company" if me_id == c["company_id"] else "creator"
    return {
        **c,
        "versions": contract_history(c),
        "change_requests": c.get("change_requests", []),
        "other_role": other_id and ("company" if my_role == "creator" else "creator"),
        "my_role": my_role,
    }
