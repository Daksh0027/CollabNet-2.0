// Pure logic module for the Explore discovery feed.
//
// This module holds side-effect-free helpers (ranking, bucket→param mapping,
// formatting, validation, and save-set math) plus the shared constants used
// across the feature. Everything here is deterministic and unit-testable with
// no React or I/O dependency.

// ---------------------------------------------------------------------------
// Shared constants
// ---------------------------------------------------------------------------

/**
 * Category pill labels in fixed left-to-right display order (Req 5.1).
 * "For you" is the recommended/default pill; the rest are niche categories.
 */
export const CATEGORY_PILLS = [
  "For you",
  "Beauty & Skincare",
  "Tech & Gadgets",
  "Food & Cooking",
  "Travel",
  "Fitness",
  "Gaming",
];

/** The default/recommended category pill. */
export const FOR_YOU = "For you";

/**
 * Audience-size bucket table (Req 4.7, 4.8, 4.9).
 *
 * Each entry maps a dropdown option to its `min_followers` / `max_followers`
 * request bounds. An empty string ("") means the corresponding param is
 * omitted/empty; `bucketToParams` converts "" to the backend's 0 sentinel.
 */
export const AUDIENCE_BUCKETS = [
  { key: "any", label: "Any size", min_followers: "", max_followers: "" },
  { key: "u50", label: "Under 50K", min_followers: "", max_followers: "50000" },
  { key: "50-250", label: "50K – 250K", min_followers: "50000", max_followers: "250000" },
  { key: "250-1m", label: "250K – 1M", min_followers: "250000", max_followers: "1000000" },
  { key: "1m", label: "1M+", min_followers: "1000000", max_followers: "" },
];

/** Sort options for the Sort_Control (Req 7.1, 7.2). */
export const SORT_OPTIONS = [
  { key: "recommended", label: "Recommended" },
  { key: "audience", label: "Audience size" },
  { key: "rate", label: "Rate" },
];

/** Content-type → badge label (Req 2.2). */
export const BADGE_LABELS = {
  reel: "Reel",
  video: "Video",
  photo: "Photo story",
};

const CONTENT_TYPES = ["reel", "video", "photo"];

/** Placeholder values for fallback cards missing fields (Req 10.3). */
export const PLACEHOLDER_NAME = "Unknown creator";
export const PLACEHOLDER_NICHE = "Uncategorized";

/**
 * Prefix for the per-user saved-items localStorage key (D3 / Req 8.4).
 * The full key is `${SAVED_STORAGE_KEY_PREFIX}<userId>`.
 */
export const SAVED_STORAGE_KEY_PREFIX = "collabonet.savedContent.v1.";

// ---------------------------------------------------------------------------
// Responsive + formatting helpers (Req 1.5, 2.2, 2.3, 2.4, 2.9, 2.10, 12.1-12.3)
// ---------------------------------------------------------------------------

/**
 * Map a viewport width (px) to the grid column count (Req 1.5, 12.1–12.3).
 *   width >= 1024        → 4
 *   768 <= width <= 1023 → 2
 *   width < 768          → 1
 */
export function columnsForWidth(width) {
  const w = Number(width) || 0;
  if (w >= 1024) return 4;
  if (w >= 768) return 2;
  return 1;
}

/** Map a content-type to its badge label (Req 2.2). */
export function badgeLabel(type) {
  return BADGE_LABELS[type] || "";
}

/**
 * Format whole seconds as zero-padded MM:SS (Req 2.3).
 * Minutes are padded to at least two digits; seconds are always two digits
 * and strictly < 60.
 */
export function fmtDuration(seconds) {
  const total = Math.max(0, Math.floor(Number(seconds) || 0));
  const mins = Math.floor(total / 60);
  const secs = total % 60;
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

/**
 * Truncate a caption to `max` chars with a single trailing ellipsis (Req 2.4).
 * Returns the input unchanged when its length is <= max; otherwise a `max`-char
 * prefix plus "…" (total visible length <= max + 1).
 */
export function truncateCaption(text, max = 120) {
  const s = typeof text === "string" ? text : "";
  if (s.length <= max) return s;
  return s.slice(0, max) + "…";
}

/** Format a number with thousands separators, prefixed with "$" (Req 2.9). */
export function fmtMoney(n) {
  return "$" + Number(n || 0).toLocaleString("en-US", { maximumFractionDigits: 0 });
}

/**
 * Build the creator rate text (Req 2.9, 2.10, 10.10).
 *   present rate → "Rate per post · $1,500"
 *   missing/zero → "Rate per post · Not provided"
 */
export function rateText(rateFrom) {
  const rate = Number(rateFrom) || 0;
  if (rate <= 0) return "Rate per post · Not provided";
  return "Rate per post · " + fmtMoney(rate);
}

// ---------------------------------------------------------------------------
// Request-param helpers (Req 3.4, 4.7, 4.8, 4.9)
// ---------------------------------------------------------------------------

/**
 * Map an audience-size bucket key to `{ min_followers, max_followers }`
 * (Req 4.7–4.9). Unknown keys fall back to the "any" (both-empty) mapping.
 */
export function bucketToParams(bucketKey) {
  const bucket = AUDIENCE_BUCKETS.find((b) => b.key === bucketKey) || AUDIENCE_BUCKETS[0];
  return { min_followers: bucket.min_followers, max_followers: bucket.max_followers };
}

/**
 * Normalize a raw search input into the trimmed query param (Req 3.4).
 * Whitespace-only input yields "".
 */
export function searchParam(raw) {
  return (typeof raw === "string" ? raw : "").trim();
}

// ---------------------------------------------------------------------------
// Content validation + card expansion (Req 10.1-10.3, 10.6-10.8)
// ---------------------------------------------------------------------------

/**
 * Return true iff a backend content item is well-formed (Req 10.6, 10.7):
 *   - `type` ∈ {reel, video, photo}
 *   - `media_url` is a non-empty string
 *   - if `duration_seconds` is present it is a whole number in [1, 86400]
 */
export function validateContentItem(item) {
  if (!item || typeof item !== "object") return false;
  if (!CONTENT_TYPES.includes(item.type)) return false;
  if (typeof item.media_url !== "string" || item.media_url.length === 0) return false;
  if (item.duration_seconds !== undefined && item.duration_seconds !== null) {
    const d = item.duration_seconds;
    if (typeof d !== "number" || !Number.isInteger(d) || d < 1 || d > 86400) return false;
  }
  return true;
}

/**
 * Expand creators into exactly one normalized Card each (Req 10.1, 10.2, 10.8).
 * Uses the first valid content item; otherwise produces a fallback card.
 * Missing display name / niche are replaced with placeholders (Req 10.3).
 */
export function creatorsToCards(creators) {
  const list = Array.isArray(creators) ? creators : [];
  return list.map((creator) => {
    const items = Array.isArray(creator?.content) ? creator.content : [];
    const valid = items.find(validateContentItem);
    const displayName = creator?.display_name || creator?.name || PLACEHOLDER_NAME;
    const niche = creator?.niche || PLACEHOLDER_NICHE;
    const base = {
      creator,
      displayName,
      niche,
      userId: creator?.user_id,
    };
    if (valid) {
      return {
        ...base,
        contentId: valid.content_id,
        fallback: false,
        type: valid.type,
        durationSeconds: valid.duration_seconds ?? null,
        caption: valid.caption ?? null,
        mediaUrl: valid.media_url,
      };
    }
    return {
      ...base,
      contentId: `fallback:${creator?.user_id}`,
      fallback: true,
      type: null,
      durationSeconds: null,
      caption: null,
      mediaUrl: null,
    };
  });
}

// ---------------------------------------------------------------------------
// Category filtering + ordering (Req 5.3, 5.4, 6.x, 7.4, 7.5, 7.7)
// ---------------------------------------------------------------------------

/**
 * Filter cards by the selected category pill (Req 5.3, 5.4).
 * "For you" returns the full list unchanged; a niche pill returns the
 * order-preserving subset whose creator niche equals the category.
 */
export function filterByCategory(cards, category) {
  const list = Array.isArray(cards) ? cards : [];
  if (!category || category === FOR_YOU) return list.slice();
  return list.filter((card) => (card?.creator?.niche || card?.niche) === category);
}

function engagementOf(card) {
  return Number(card?.creator?.stats?.engagement) || 0;
}
function followersOf(card) {
  return Number(card?.creator?.top_followers) || 0;
}
function verifiedOf(card) {
  return card?.creator?.verified ? 1 : 0;
}
function rateOf(card) {
  const r = Number(card?.creator?.rate_from) || 0;
  // Missing/zero rate sorts last for "rate" ascending (treat as +∞).
  return r > 0 ? r : Number.POSITIVE_INFINITY;
}
function idOf(card) {
  return String(card?.creator?.user_id ?? card?.userId ?? "");
}

/**
 * Produce the deterministic "For you" recommended ordering (Req 6.2, 6.4, 6.5).
 * Order: engagement desc, then verified-first, then top_followers desc, with a
 * stable ascending `user_id` tiebreaker so the order is total and repeatable.
 * Returns a new array (input is not mutated) and is a permutation of the input.
 */
export function recommendedOrder(cards) {
  const list = Array.isArray(cards) ? cards.slice() : [];
  return list.sort((a, b) => {
    const e = engagementOf(b) - engagementOf(a);
    if (e !== 0) return e;
    const v = verifiedOf(b) - verifiedOf(a);
    if (v !== 0) return v;
    const f = followersOf(b) - followersOf(a);
    if (f !== 0) return f;
    return idOf(a).localeCompare(idOf(b));
  });
}

/**
 * Order cards by the selected sort option (Req 7.4, 7.5).
 *   "recommended" → recommendedOrder
 *   "audience"    → top_followers desc, then user_id asc
 *   "rate"        → effective rate asc (missing/zero last), then user_id asc
 * Returns a new array; always a permutation of the input.
 */
export function applySort(cards, option) {
  const list = Array.isArray(cards) ? cards.slice() : [];
  if (option === "audience") {
    return list.sort((a, b) => {
      const f = followersOf(b) - followersOf(a);
      if (f !== 0) return f;
      return idOf(a).localeCompare(idOf(b));
    });
  }
  if (option === "rate") {
    return list.sort((a, b) => {
      const r = rateOf(a) - rateOf(b);
      if (r !== 0 && Number.isFinite(r)) return r;
      if (rateOf(a) !== rateOf(b)) return rateOf(a) < rateOf(b) ? -1 : 1;
      return idOf(a).localeCompare(idOf(b));
    });
  }
  return recommendedOrder(list);
}

// ---------------------------------------------------------------------------
// Save-set helpers (Req 2.6, 8.1, 8.2, 8.4, 8.5)
// ---------------------------------------------------------------------------

/**
 * Flip membership of `id` in a saved-set (Req 2.6, 8.1, 8.2).
 * Returns a NEW Set; the input is not mutated.
 */
export function toggle(set, id) {
  const next = new Set(set || []);
  if (next.has(id)) next.delete(id);
  else next.add(id);
  return next;
}

/** Serialize a saved-set to a de-duplicated JSON array string (Req 8.4). */
export function serializeSaved(set) {
  return JSON.stringify(Array.from(new Set(set || [])));
}

/**
 * Parse a serialized saved-set back into a Set (Req 8.4, 8.5).
 * Tolerates malformed / non-array input by returning an empty Set.
 */
export function parseSaved(str) {
  try {
    const parsed = JSON.parse(str);
    if (Array.isArray(parsed)) return new Set(parsed);
  } catch (_err) {
    // fall through
  }
  return new Set();
}

/** Build the per-user saved-items storage key (Req 8.4). Injective over userIds. */
export function savedStorageKey(userId) {
  return `${SAVED_STORAGE_KEY_PREFIX}${userId ?? ""}`;
}
