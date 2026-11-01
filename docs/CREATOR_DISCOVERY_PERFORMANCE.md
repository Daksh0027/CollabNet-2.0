# Creator discovery performance

## Current query path

`GET /api/creators` authenticates the caller, fetches verified creator profiles, enriches them with accepted connections, completed contracts, and approved reviews, then applies the existing case-insensitive substring and exact-array filters, sorts the matches, and returns a page.

The database is MongoDB, and creator profiles are embedded BSON documents. There are no SQL joins or PostgreSQL JSONB predicates in this path.

## Bottlenecks and changes

Before optimization, discovery made four data reads after authentication: a creator query plus separate reads of accepted connections, completed contracts, and approved reviews. Authentication itself performs two reads (session and user), so the route made six MongoDB operations total. The endpoint fetched at most 500 full user documents and separately loaded up to 10,000 accepted connections and 5,000 contracts and reviews into Python. Those independent caps could omit later creators and undercount metrics. Each request transferred and retained whole global relationship collections, filtered and sorted all loaded creators in the API process, and returned up to 500 full creator profiles. The creator query had no supporting index; a local MongoDB 7.0.45 explain on the seeded database showed a collection scan examining 9 user documents to return 6 creators. This small seed is a baseline observation, not a representative large-dataset benchmark.

The endpoint now:

- Uses one MongoDB aggregation cursor with a field projection and indexed `$lookup` subpipelines for per-creator connection, contract, and review aggregates. It no longer transfers global relationship collections to Python or relies on fixed record-count caps.
- Adds indexes for `(role, verified)` and for each lookup's `(status, creator_id)` relationship key. These indexes are created idempotently at application startup.
- Streams creator documents in batches and retains only the best `offset + limit` matching results in a heap. Python still applies the existing filters and sort metrics, with stable ordering for ties.
- Defaults to 50 results and clamps requested pages to 100. Both company Explore and creator Collaborators fetch further pages on demand.
- Projects only profile fields required to preserve the discovery response shape; unrelated account fields such as private rates are not read for this query.

The route now makes three MongoDB operations total: the same two authentication reads and one discovery aggregation, independent of the number of matching creators.

The large-dataset integration test inserts 505 matching creators and more than the old per-collection caps of accepted connections, contracts, and reviews. It verifies results beyond offset 500, the 100-result page cap, and exact aggregate counts.

On the local MongoDB 7.0.45 seeded database after adding the indexes, the creator aggregation's outer query used `creator_discovery_role_verified` (6 keys and 6 documents examined for 6 creators). The three lookup explain stages used their intended indexes, reported zero collection scans, and examined 7 connection documents, 1 contract, and 1 review in total. These are execution-plan checks on the small seed, not latency or throughput guarantees for production data.

## Remaining scaling considerations

Search, location, and tag behavior includes case-insensitive substring matching, while niche, content-type, and platform values use the existing case-insensitive comparisons. To avoid changing those semantics, these predicates remain in Python and each verified creator must still be examined. The user filter therefore reduces returned matches, but does not yet make the creator scan proportional to the result count. The `$lookup` work is server-side and indexed, but still runs for each candidate creator.

Sorting is also performed after filtering in the API. Heap memory is bounded by the requested offset plus page size, rather than all matches, but very deep offsets still increase memory and scan work. A future search index or normalized, indexed filter fields could move more work into MongoDB, but should only be introduced with parity tests for current case, substring, missing-metric, and sort behavior.

Discovery intentionally continues returning the current profile-card fields, including portfolio projects and platform details. Page-size limits bound the number of returned creators, but a creator with unusually large embedded project data can still make an individual page large. If this becomes material, measure real serialized response sizes before introducing a compact-list response shape.

## Explain and monitoring

Check the leading creator index and collection scan counts with:

```javascript
db.users.find(
  { role: "creator", verified: true },
  { _id: 0, user_id: 1, creator: 1 }
).explain("executionStats")
```

For the production aggregation, use `db.users.explain("executionStats").aggregate(pipeline)` with the pipeline in `list_creators`. Inspect the lookup execution statistics for `creator_discovery_connections_from`, `creator_discovery_connections_to`, `creator_discovery_contracts`, and `creator_discovery_reviews`, plus documents examined and execution time. Monitor endpoint latency and serialized response bytes at representative creator counts; the local seeded database is too small to establish production latency targets.
