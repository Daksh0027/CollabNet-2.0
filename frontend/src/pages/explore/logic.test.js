import fc from "fast-check";
import {
  bucketToParams,
  validateContentItem,
  creatorsToCards,
  filterByCategory,
  recommendedOrder,
  applySort,
  fmtDuration,
  truncateCaption,
  rateText,
  columnsForWidth,
  badgeLabel,
  fmtMoney,
  searchParam,
  toggle,
  serializeSaved,
  parseSaved,
  savedStorageKey,
  AUDIENCE_BUCKETS,
  FOR_YOU,
  PLACEHOLDER_NAME,
  PLACEHOLDER_NICHE,
  SAVED_STORAGE_KEY_PREFIX,
} from "./logic";

const RUNS = { numRuns: 100 };

// A generated creator with the fields the ordering/validation logic reads.
const creatorArb = fc.record({
  user_id: fc.string({ minLength: 1, maxLength: 8 }),
  display_name: fc.option(fc.string(), { nil: undefined }),
  niche: fc.constantFrom("Beauty & Skincare", "Tech & Gadgets", "Travel", "Fitness", "Gaming", "Food & Cooking"),
  verified: fc.boolean(),
  top_followers: fc.nat(2_000_000),
  rate_from: fc.nat(5000),
  stats: fc.record({ engagement: fc.double({ min: 0, max: 10, noNaN: true }) }),
});

const cardArb = creatorArb.map((creator) => ({
  creator,
  userId: creator.user_id,
  niche: creator.niche,
  displayName: creator.display_name || PLACEHOLDER_NAME,
  contentId: `c:${creator.user_id}`,
}));

// Unique-id card list so permutation checks via content id are unambiguous.
const cardListArb = fc
  .uniqueArray(creatorArb, { selector: (c) => c.user_id, maxLength: 12 })
  .map((creators) =>
    creators.map((creator) => ({
      creator,
      userId: creator.user_id,
      niche: creator.niche,
      displayName: creator.display_name || PLACEHOLDER_NAME,
      contentId: `c:${creator.user_id}`,
    }))
  );

const ids = (cards) => cards.map((c) => c.contentId).sort();

// Feature: explore-discovery-feed, Property 1: Column count maps breakpoints and is bounded
test("Property 1: column count maps breakpoints and is bounded", () => {
  fc.assert(
    fc.property(fc.integer({ min: 0, max: 5000 }), (width) => {
      const cols = columnsForWidth(width);
      if (width >= 1024) expect(cols).toBe(4);
      else if (width >= 768) expect(cols).toBe(2);
      else expect(cols).toBe(1);
      expect(cols).toBeGreaterThanOrEqual(1);
      expect(cols).toBeLessThanOrEqual(4);
      if (width >= 768) expect(cols).toBeGreaterThanOrEqual(2);
    }),
    RUNS
  );
});

// Feature: explore-discovery-feed, Property 2: Content-type badge label is correct and within the allowed set
test("Property 2: badge label is correct and within the allowed set", () => {
  fc.assert(
    fc.property(fc.constantFrom("reel", "video", "photo"), (type) => {
      const label = badgeLabel(type);
      expect(["Reel", "Video", "Photo story"]).toContain(label);
      expect(label).toBe({ reel: "Reel", video: "Video", photo: "Photo story" }[type]);
    }),
    RUNS
  );
});

// Feature: explore-discovery-feed, Property 3: Duration formats as zero-padded MM:SS and round-trips
test("Property 3: duration formats as zero-padded MM:SS and round-trips", () => {
  fc.assert(
    fc.property(fc.integer({ min: 1, max: 86400 }), (seconds) => {
      const out = fmtDuration(seconds);
      expect(out).toMatch(/^\d{2,}:\d{2}$/);
      const [mm, ss] = out.split(":").map(Number);
      expect(ss).toBeLessThan(60);
      expect(mm * 60 + ss).toBe(seconds);
    }),
    RUNS
  );
});

// Feature: explore-discovery-feed, Property 4: Caption truncation is bounded and prefix-preserving
test("Property 4: caption truncation is bounded and prefix-preserving", () => {
  fc.assert(
    fc.property(fc.string({ maxLength: 400 }), (s) => {
      const out = truncateCaption(s, 120);
      if (s.length <= 120) {
        expect(out).toBe(s);
      } else {
        expect(out.endsWith("…")).toBe(true);
        const body = out.slice(0, -1);
        expect(s.startsWith(body)).toBe(true);
        expect(out.length).toBeLessThanOrEqual(121);
      }
    }),
    RUNS
  );
});

// Feature: explore-discovery-feed, Property 5: Rate text is correct for present and absent rates
test("Property 5: rate text is correct for present and absent rates", () => {
  fc.assert(
    fc.property(fc.integer({ min: 0, max: 100000 }), (rate) => {
      const out = rateText(rate);
      if (rate <= 0) expect(out).toBe("Rate per post · Not provided");
      else expect(out).toBe("Rate per post · " + fmtMoney(rate));
    }),
    RUNS
  );
  expect(rateText(1500)).toBe("Rate per post · $1,500");
});

// Feature: explore-discovery-feed, Property 6: Audience-size bucket maps to the correct request params
test("Property 6: audience-size bucket maps to the correct request params", () => {
  fc.assert(
    fc.property(fc.constantFrom(...AUDIENCE_BUCKETS.map((b) => b.key)), (key) => {
      const bucket = AUDIENCE_BUCKETS.find((b) => b.key === key);
      expect(bucketToParams(key)).toEqual({
        min_followers: bucket.min_followers,
        max_followers: bucket.max_followers,
      });
    }),
    RUNS
  );
  expect(bucketToParams("any")).toEqual({ min_followers: "", max_followers: "" });
  expect(bucketToParams("1m")).toEqual({ min_followers: "1000000", max_followers: "" });
  expect(bucketToParams("u50")).toEqual({ min_followers: "", max_followers: "50000" });
});

// Feature: explore-discovery-feed, Property 7: Search param is the trimmed query
test("Property 7: search param is the trimmed query", () => {
  fc.assert(
    fc.property(fc.string(), (raw) => {
      expect(searchParam(raw)).toBe(raw.trim());
    }),
    RUNS
  );
  expect(searchParam("   ")).toBe("");
});

// Feature: explore-discovery-feed, Property 15: Content-item validation accepts well-formed items and rejects the rest
test("Property 15: content-item validation accept/reject", () => {
  const itemArb = fc.record(
    {
      type: fc.oneof(fc.constantFrom("reel", "video", "photo"), fc.string()),
      media_url: fc.oneof(fc.string(), fc.constant("")),
      duration_seconds: fc.oneof(fc.integer({ min: -10, max: 90000 }), fc.constant(undefined)),
    },
    { requiredKeys: ["type", "media_url"] }
  );
  fc.assert(
    fc.property(itemArb, (item) => {
      const expected =
        ["reel", "video", "photo"].includes(item.type) &&
        typeof item.media_url === "string" &&
        item.media_url.length > 0 &&
        (item.duration_seconds === undefined ||
          (Number.isInteger(item.duration_seconds) &&
            item.duration_seconds >= 1 &&
            item.duration_seconds <= 86400));
      expect(validateContentItem(item)).toBe(expected);
    }),
    RUNS
  );
});

// Feature: explore-discovery-feed, Property 16: One card per creator with preserved identity
test("Property 16: one card per creator with preserved identity", () => {
  fc.assert(
    fc.property(fc.array(creatorArb, { maxLength: 10 }), (creators) => {
      const cards = creatorsToCards(creators);
      expect(cards).toHaveLength(creators.length);
      cards.forEach((card, i) => {
        expect(card.creator.user_id).toBe(creators[i].user_id);
      });
    }),
    RUNS
  );
});

// Feature: explore-discovery-feed, Property 17: Fallback card is produced when no valid content exists
test("Property 17: fallback card produced when no valid content exists", () => {
  const noContentCreator = creatorArb.map((c) => ({ ...c, content: [] }));
  fc.assert(
    fc.property(noContentCreator, (creator) => {
      const [card] = creatorsToCards([creator]);
      expect(card.fallback).toBe(true);
      expect(card.displayName).toBe(creator.display_name || PLACEHOLDER_NAME);
      expect(card.niche).toBe(creator.niche || PLACEHOLDER_NICHE);
    }),
    RUNS
  );
  const [missing] = creatorsToCards([{ user_id: "x", content: [] }]);
  expect(missing.displayName).toBe(PLACEHOLDER_NAME);
  expect(missing.niche).toBe(PLACEHOLDER_NICHE);
});

// Feature: explore-discovery-feed, Property 8: Category filtering returns a matching, order-preserving subset
test("Property 8: category filtering is an order-preserving subset", () => {
  fc.assert(
    fc.property(cardListArb, fc.constantFrom(FOR_YOU, "Fitness", "Gaming", "Travel"), (cards, cat) => {
      const out = filterByCategory(cards, cat);
      if (cat === FOR_YOU) {
        expect(ids(out)).toEqual(ids(cards));
      } else {
        out.forEach((c) => expect(c.creator.niche).toBe(cat));
        // order-preserving: filtered sequence appears in the same relative order
        const expected = cards.filter((c) => c.creator.niche === cat).map((c) => c.contentId);
        expect(out.map((c) => c.contentId)).toEqual(expected);
      }
    }),
    RUNS
  );
});

// Feature: explore-discovery-feed, Property 9: Recommended ordering is deterministic, total, and a permutation
test("Property 9: recommended ordering is deterministic, total, and a permutation", () => {
  fc.assert(
    fc.property(cardListArb, (cards) => {
      const a = recommendedOrder(cards);
      const shuffledInput = cards.slice().reverse();
      const b = recommendedOrder(shuffledInput);
      // permutation
      expect(ids(a)).toEqual(ids(cards));
      // deterministic & order-insensitive to input order
      expect(a.map((c) => c.contentId)).toEqual(b.map((c) => c.contentId));
      // adjacent ordering respects the comparator
      for (let i = 1; i < a.length; i++) {
        const prev = a[i - 1];
        const cur = a[i];
        const ep = prev.creator.stats.engagement;
        const ec = cur.creator.stats.engagement;
        expect(ep).toBeGreaterThanOrEqual(ec - 1e-9);
      }
    }),
    RUNS
  );
});

// Feature: explore-discovery-feed, Property 10: Audience-size sort is non-increasing by followers and a permutation
test("Property 10: audience sort is non-increasing and a permutation", () => {
  fc.assert(
    fc.property(cardListArb, (cards) => {
      const out = applySort(cards, "audience");
      expect(ids(out)).toEqual(ids(cards));
      for (let i = 1; i < out.length; i++) {
        expect(out[i - 1].creator.top_followers).toBeGreaterThanOrEqual(out[i].creator.top_followers);
      }
    }),
    RUNS
  );
});

// Feature: explore-discovery-feed, Property 11: Rate sort is non-decreasing by effective rate and a permutation
test("Property 11: rate sort is non-decreasing and a permutation", () => {
  const eff = (c) => (c.creator.rate_from > 0 ? c.creator.rate_from : Number.POSITIVE_INFINITY);
  fc.assert(
    fc.property(cardListArb, (cards) => {
      const out = applySort(cards, "rate");
      expect(ids(out)).toEqual(ids(cards));
      for (let i = 1; i < out.length; i++) {
        expect(eff(out[i - 1])).toBeLessThanOrEqual(eff(out[i]));
      }
    }),
    RUNS
  );
});

// Feature: explore-discovery-feed, Property 12: Sorting preserves the card set
test("Property 12: sorting preserves the card set", () => {
  fc.assert(
    fc.property(cardListArb, fc.constantFrom("recommended", "audience", "rate"), (cards, opt) => {
      expect(ids(applySort(cards, opt))).toEqual(ids(cards));
    }),
    RUNS
  );
});

// Feature: explore-discovery-feed, Property 13: Save toggle round-trips and flips membership
test("Property 13: save toggle round-trips and flips membership", () => {
  fc.assert(
    fc.property(fc.array(fc.string(), { maxLength: 10 }), fc.string(), (members, id) => {
      const set = new Set(members);
      const once = toggle(set, id);
      expect(once.has(id)).toBe(!set.has(id));
      const twice = toggle(once, id);
      expect(Array.from(twice).sort()).toEqual(Array.from(set).sort());
    }),
    RUNS
  );
});

// Feature: explore-discovery-feed, Property 14: Saved-set serialization round-trips
test("Property 14: saved-set serialization round-trips and key is injective", () => {
  fc.assert(
    fc.property(fc.array(fc.string(), { maxLength: 10 }), (members) => {
      const set = new Set(members);
      const round = parseSaved(serializeSaved(set));
      expect(Array.from(round).sort()).toEqual(Array.from(set).sort());
    }),
    RUNS
  );
  fc.assert(
    fc.property(
      fc.tuple(fc.string(), fc.string()).filter(([a, b]) => a !== b),
      ([u1, u2]) => {
        expect(savedStorageKey(u1)).not.toBe(savedStorageKey(u2));
        expect(savedStorageKey(u1).startsWith(SAVED_STORAGE_KEY_PREFIX)).toBe(true);
      }
    ),
    RUNS
  );
});
