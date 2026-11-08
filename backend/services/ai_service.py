import json
import re
import httpx
from fastapi import HTTPException
from core.config import AI_API_KEY, AI_BASE_URL, AI_MODEL


def ai_guard():
    if not AI_API_KEY:
        raise HTTPException(503, "AI not configured — add your OpenRouter API key in backend configuration")


async def ai_complete(system: str, user_text: str) -> str:
    ai_guard()
    async with httpx.AsyncClient(timeout=60) as client:
        response = await client.post(
            f"{AI_BASE_URL}/chat/completions",
            headers={
                "Authorization": f"Bearer {AI_API_KEY}",
                "Content-Type": "application/json",
            },
            json={
                "model": AI_MODEL,
                "messages": [
                    {"role": "system", "content": system},
                    {"role": "user", "content": user_text},
                ],
            },
        )
    if response.status_code != 200:
        raise HTTPException(502, f"AI provider error: {response.status_code}")
    data = response.json()
    try:
        return data["choices"][0]["message"]["content"]
    except (KeyError, IndexError):
        raise HTTPException(502, "Unexpected AI provider response")


async def summarize_messages(msgs: list) -> str:
    transcript = "\n".join(f"{m['sender_id']}: {m['text']}" for m in reversed(msgs))
    return await ai_complete(
        "You summarize chat threads between a sponsor and a content creator on a campaign marketplace. "
        "Reply with 3-5 short bullets: what was agreed, what is pending, next step. Plain text only.",
        transcript,
    )


async def draft_outreach(sender_name: str, sender_role: str, recipient_name: str, kind: str, context: str) -> str:
    prompt = (
        f"Write a {kind} message from {sender_name} ({sender_role}) to {recipient_name}. "
        f"Context: {context or 'a campaign collaboration on CollaboNet'}. "
        f"Reply with the message text only, max 120 words, friendly and specific."
    )
    return await ai_complete(
        "You write concise outreach messages for a sponsor-creator marketplace. "
        "No subject lines, no quotes around the message.",
        prompt,
    )


async def benchmark_creator_rates(creator: dict) -> dict:
    raw = await ai_complete(
        "You benchmark creator rates for a sponsor marketplace. Reply ONLY with JSON: "
        '{"verdict": "under|fair|premium", "suggested_min": number, "suggested_max": number, "notes": "1-2 sentences"}. '
        "Suggested range is a per-post rate in USD.",
        f"Niche: {creator.get('niche')}. Platforms: {json.dumps(creator.get('platforms', []))}. "
        f"Stats: {json.dumps(creator.get('stats', {}))}. Current rates: {json.dumps(creator.get('rates', {}))}.",
    )
    try:
        # Non-greedy search for JSON object
        match = re.search(r"\{[^{}]*\}", raw)
        if match:
            return json.loads(match.group(0))
        return json.loads(raw)
    except Exception:
        return {"verdict": "fair", "suggested_min": 0, "suggested_max": 0, "notes": raw[:200]}
