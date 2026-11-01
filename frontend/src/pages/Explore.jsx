import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Bookmark, Check, ChevronDown, Loader2, MessageSquare, Play, Search, SlidersHorizontal, Sparkles, Users } from "lucide-react";
import { toast } from "sonner";
import api, { fmtMoney, fmtNum, fmtDate } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { PageHead, UserAvatar, VerifiedBadge, EmptyState, StatusPill } from "@/components/common";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  CATEGORY_PILLS,
  FOR_YOU,
  AUDIENCE_BUCKETS,
  SORT_OPTIONS,
  bucketToParams,
  searchParam,
  creatorsToCards,
  filterByCategory,
  applySort,
  badgeLabel,
  fmtDuration,
  truncateCaption,
  rateText,
  columnsForWidth,
  toggle,
  serializeSaved,
  parseSaved,
  savedStorageKey,
} from "@/pages/explore/logic";

const PLATFORMS = ["YouTube", "Instagram", "TikTok", "Twitch"];

function threadIdFor(a, b) {
  return [a, b].sort().join("::");
}

export default function Explore() {
  const { user } = useAuth();
  const isCreator = user?.role === "creator";
  return isCreator ? <CreatorExplore /> : <CompanyExplore />;
}

/* -------------------------------------------------------------------------- */
/* Company discovery feed                                                     */
/* -------------------------------------------------------------------------- */

function useColumnCount() {
  const [cols, setCols] = useState(() => columnsForWidth(typeof window !== "undefined" ? window.innerWidth : 1280));
  useEffect(() => {
    const onResize = () => setCols(columnsForWidth(window.innerWidth));
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);
  return cols;
}

function CompanyExplore() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const navigate = useNavigate();

  const [search, setSearch] = useState("");
  const [niche, setNiche] = useState("all");
  const [platform, setPlatform] = useState("all");
  const [bucket, setBucket] = useState("any");
  const [category, setCategory] = useState(FOR_YOU);
  const [sort, setSort] = useState("recommended");
  const [connecting, setConnecting] = useState("");
  const [detailId, setDetailId] = useState(null);

  const cols = useColumnCount();

  // Saved content, persisted per user in localStorage.
  const storageKey = savedStorageKey(user?.user_id);
  const [saved, setSaved] = useState(() => parseSaved(typeof window !== "undefined" ? window.localStorage.getItem(storageKey) : null));
  useEffect(() => {
    setSaved(parseSaved(window.localStorage.getItem(storageKey)));
  }, [storageKey]);
  const toggleSaved = (id) => {
    setSaved((prev) => {
      const next = toggle(prev, id);
      try { window.localStorage.setItem(storageKey, serializeSaved(next)); } catch (_e) { /* ignore */ }
      return next;
    });
  };

  const bucketParams = bucketToParams(bucket);
  const { data: creators, isLoading } = useQuery({
    queryKey: ["creators", search, niche, platform, bucket],
    queryFn: async () =>
      (await api.get("/creators", {
        params: {
          search: searchParam(search),
          niche: niche === "all" ? "" : niche,
          platform: platform === "all" ? "" : platform,
          min_followers: Number(bucketParams.min_followers) || 0,
          max_followers: Number(bucketParams.max_followers) || 0,
        },
      })).data,
  });
  const { data: connections } = useQuery({
    queryKey: ["connections"],
    queryFn: async () => (await api.get("/connections")).data,
  });
  const { data: aiStatus } = useQuery({ queryKey: ["ai-status"], queryFn: async () => (await api.get("/ai/status")).data });
  const { data: detail } = useQuery({
    queryKey: ["user", detailId],
    queryFn: async () => (await api.get(`/users/${detailId}`)).data,
    enabled: !!detailId,
  });

  const connMap = useMemo(() => {
    const m = {};
    (connections || []).forEach((c) => { if (c.other) m[c.other.user_id] = c; });
    return m;
  }, [connections]);

  // Build → filter by category pill → sort → return the ordered card list.
  const cards = useMemo(() => {
    const built = creatorsToCards(creators || []);
    const filtered = filterByCategory(built, category);
    return applySort(filtered, sort);
  }, [creators, category, sort]);

  // Distribute cards across N columns (masonry) preserving sort order.
  const columns = useMemo(() => {
    const buckets = Array.from({ length: cols }, () => []);
    cards.forEach((card, i) => buckets[i % cols].push(card));
    return buckets;
  }, [cards, cols]);

  const [benchmark, setBenchmark] = useState(null);
  const [benchBusy, setBenchBusy] = useState(false);

  const connect = async (creatorId) => {
    setConnecting(creatorId);
    try {
      await api.post("/connections", { to_id: creatorId, message: "" });
      toast.success("Connection request sent");
      qc.invalidateQueries({ queryKey: ["connections"] });
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Could not send request");
    } finally {
      setConnecting("");
    }
  };

  const runBenchmark = async (creatorId) => {
    setBenchBusy(true);
    try {
      const { data } = await api.post("/ai/benchmark", { creator_id: creatorId });
      setBenchmark(data);
    } catch (e) {
      toast.error(e?.response?.data?.detail || "AI request failed");
    } finally {
      setBenchBusy(false);
    }
  };

  const cardAction = (card) => {
    const conn = connMap[card.userId];
    if (!conn) {
      return (
        <Button
          size="sm"
          className="h-7 rounded-full px-4 text-xs"
          onClick={(e) => { e.stopPropagation(); connect(card.userId); }}
          disabled={connecting === card.userId}
          data-testid={`connect-button-${card.userId}`}
        >
          {connecting === card.userId ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Connect"}
        </Button>
      );
    }
    if (conn.status === "accepted") {
      return (
        <Button
          size="sm"
          variant="secondary"
          className="h-7 rounded-full px-3 text-xs"
          onClick={(e) => { e.stopPropagation(); navigate(`/app/messages?thread=${threadIdFor(user.user_id, card.userId)}`); }}
          data-testid={`message-button-${card.userId}`}
        >
          <MessageSquare className="mr-1 h-3.5 w-3.5" /> Message
        </Button>
      );
    }
    return (
      <span className="text-[11px] font-medium text-muted-foreground" data-testid={`requested-label-${card.userId}`}>
        {conn.status === "pending" ? "Requested" : conn.status}
      </span>
    );
  };

  return (
    <div data-testid="explore-creators-page">
      {/* Hero header */}
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight text-foreground sm:text-3xl" data-testid="page-title">
            Find your next creative connection.
          </h1>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Discover the work. Meet the creator. Make something great together.
          </p>
        </div>
        <span className="hidden items-center gap-1.5 text-xs text-muted-foreground sm:inline-flex">
          <Sparkles className="h-3.5 w-3.5 text-primary" /> Real content. Verified creators.
        </span>
      </div>

      {/* Search + filter row */}
      <div className="flex flex-wrap items-center gap-2.5" data-testid="creator-filters">
        <div className="relative min-w-52 flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="h-11 rounded-xl pl-9"
            placeholder="Search creators, content or inspiration…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            data-testid="creator-search-input"
          />
        </div>
        <Select value={niche} onValueChange={setNiche}>
          <SelectTrigger className="h-11 w-40 rounded-xl" data-testid="niche-filter-select"><SelectValue placeholder="All niches" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All niches</SelectItem>
            {CATEGORY_PILLS.filter((c) => c !== FOR_YOU).map((n) => <SelectItem key={n} value={n}>{n}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={platform} onValueChange={setPlatform}>
          <SelectTrigger className="h-11 w-36 rounded-xl" data-testid="platform-filter-select"><SelectValue placeholder="All platforms" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All platforms</SelectItem>
            {PLATFORMS.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={bucket} onValueChange={setBucket}>
          <SelectTrigger className="h-11 w-40 rounded-xl" data-testid="audience-filter-select"><SelectValue placeholder="Audience size" /></SelectTrigger>
          <SelectContent>
            {AUDIENCE_BUCKETS.map((b) => <SelectItem key={b.key} value={b.key}>{b.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Category pills + sort */}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2" data-testid="category-pills">
          {CATEGORY_PILLS.map((c) => {
            const active = category === c;
            return (
              <button
                key={c}
                type="button"
                onClick={() => setCategory(c)}
                data-testid={`category-pill-${c}`}
                aria-pressed={active}
                className={
                  "rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors " +
                  (active
                    ? "bg-primary text-primary-foreground"
                    : "border border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground")
                }
              >
                {c}
              </button>
            );
          })}
        </div>
        <Select value={sort} onValueChange={setSort}>
          <SelectTrigger className="h-9 w-44 rounded-full border-none bg-transparent text-xs shadow-none" data-testid="sort-select">
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <SlidersHorizontal className="h-3.5 w-3.5" />
              <SelectValue />
            </span>
          </SelectTrigger>
          <SelectContent align="end">
            {SORT_OPTIONS.map((o) => <SelectItem key={o.key} value={o.key}>{o.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Feed */}
      {isLoading ? (
        <div className="py-24 text-center text-sm text-muted-foreground" data-testid="creators-loading">Loading creators…</div>
      ) : !cards.length ? (
        <div className="mt-8"><EmptyState icon={Users} title="No creators match" body="Try widening the filters or switching categories." testId="creators-empty" /></div>
      ) : (
        <div className="mt-6 flex items-start gap-4" data-testid="creators-grid">
          {columns.map((colCards, ci) => (
            <div key={ci} className="flex min-w-0 flex-1 flex-col gap-4">
              {colCards.map((card) => (
                <ContentCard
                  key={card.contentId}
                  card={card}
                  conn={connMap[card.userId]}
                  saved={saved.has(card.contentId)}
                  onToggleSaved={() => toggleSaved(card.contentId)}
                  onOpen={() => setDetailId(card.userId)}
                  action={cardAction(card)}
                />
              ))}
            </div>
          ))}
        </div>
      )}

      {cards.length ? (
        <div className="mt-10 flex items-center justify-center gap-2 pb-4 text-xs text-muted-foreground" data-testid="feed-footer">
          <Sparkles className="h-3.5 w-3.5 text-primary" />
          More inspiration, more possibilities.
          <button className="inline-flex items-center gap-1 font-medium text-primary hover:underline" onClick={() => setCategory(FOR_YOU)}>
            Explore more <ChevronDown className="h-3.5 w-3.5" />
          </button>
        </div>
      ) : null}

      {/* Creator detail dialog */}
      <Dialog open={!!detailId} onOpenChange={(o) => { if (!o) { setDetailId(null); setBenchmark(null); } }}>
        <DialogContent className="max-w-lg" data-testid="creator-detail-dialog">
          {detail ? (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-3">
                  <UserAvatar user={detail} className="h-10 w-10" /> {detail.display_name} <VerifiedBadge show={detail.verified} />
                </DialogTitle>
              </DialogHeader>
              <div className="max-h-[60vh] space-y-4 overflow-y-auto pr-2">
                <p className="text-sm text-muted-foreground">{detail.creator?.bio}</p>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="rounded-xl border border-border p-3"><p className="eyebrow">Avg views</p><p className="font-num mt-1">{fmtNum(detail.creator?.stats?.avg_views)}</p></div>
                  <div className="rounded-xl border border-border p-3"><p className="eyebrow">Engagement</p><p className="font-num mt-1">{detail.creator?.stats?.engagement}%</p></div>
                  <div className="rounded-xl border border-border p-3"><p className="eyebrow">Video rate</p><p className="font-num mt-1">{fmtMoney(detail.creator?.rates?.video)}</p></div>
                  <div className="rounded-xl border border-border p-3"><p className="eyebrow">Rating</p><p className="font-num mt-1">{detail.rating_avg ? `${detail.rating_avg} / 5` : "—"}</p></div>
                </div>
                {detail.reviews?.length ? (
                  <div>
                    <p className="eyebrow mb-2">Reviews</p>
                    {detail.reviews.slice(0, 3).map((r) => (
                      <div key={r.review_id} className="mb-2 rounded-xl border border-border p-3 text-xs">
                        <p className="font-semibold">{r.rating}/5 · {r.campaign_title}</p>
                        <p className="mt-1 text-muted-foreground">{r.comment}</p>
                      </div>
                    ))}
                  </div>
                ) : null}
                <div className="rounded-xl border border-primary/30 bg-primary/5 p-3" data-testid="benchmark-panel">
                  <div className="flex items-center justify-between">
                    <p className="eyebrow flex items-center gap-1.5"><Sparkles className="h-3.5 w-3.5 text-primary" /> AI rate benchmark</p>
                    <Button size="sm" variant="secondary" className="h-7 rounded-full text-xs" disabled={!aiStatus?.configured || benchBusy}
                      onClick={() => runBenchmark(detail.user_id)} data-testid="benchmark-button">
                      {benchBusy ? <Loader2 className="h-3 w-3 animate-spin" /> : "Run"}
                    </Button>
                  </div>
                  {benchmark ? (
                    <div className="mt-2 text-xs" data-testid="benchmark-result">
                      <p>Verdict: <span className="font-semibold text-primary">{benchmark.verdict}</span></p>
                      {benchmark.suggested_max ? <p>Suggested per-post range: <span className="font-num">{fmtMoney(benchmark.suggested_min)} – {fmtMoney(benchmark.suggested_max)}</span></p> : null}
                      <p className="mt-1 text-muted-foreground">{benchmark.notes}</p>
                    </div>
                  ) : !aiStatus?.configured ? (
                    <p className="mt-2 text-xs text-muted-foreground" data-testid="benchmark-disabled-note">AI not configured — add an API key in backend configuration.</p>
                  ) : null}
                </div>
              </div>
              <DialogFooter>
                <Button variant="secondary" className="rounded-full" onClick={() => setDetailId(null)} data-testid="creator-detail-close-button">Close</Button>
              </DialogFooter>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* A single masonry content card. */
function ContentCard({ card, conn, saved, onToggleSaved, onOpen, action }) {
  const [imgError, setImgError] = useState(false);
  const badge = badgeLabel(card.type);
  const showMedia = !card.fallback && card.mediaUrl && !imgError;
  const isVideo = card.type === "video";

  return (
    <div
      className="group overflow-hidden rounded-2xl border border-border bg-card transition-colors hover:border-primary/40"
      data-testid={`creator-card-${card.userId}`}
    >
      {/* Media */}
      <button
        type="button"
        onClick={onOpen}
        className="relative block w-full overflow-hidden"
        data-testid={`content-media-${card.contentId}`}
        aria-label={`Open ${card.displayName}`}
      >
        {showMedia ? (
          <img
            src={card.mediaUrl}
            alt={card.caption || card.displayName}
            loading="lazy"
            onError={() => setImgError(true)}
            className="aspect-[4/5] w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="flex aspect-[4/5] w-full items-center justify-center bg-gradient-to-br from-muted to-card" data-testid={`content-fallback-${card.contentId}`}>
            <UserAvatar user={card.creator} className="h-16 w-16" />
          </div>
        )}

        {/* Top badges */}
        <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between p-2.5">
          {badge ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-black/55 px-2 py-0.5 text-[11px] font-medium text-white backdrop-blur-sm">
              {isVideo ? <Play className="h-3 w-3 fill-current" /> : null}
              {badge}
              {card.durationSeconds ? ` · ${fmtDuration(card.durationSeconds)}` : ""}
            </span>
          ) : <span />}
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onToggleSaved(); }}
            className="pointer-events-auto flex h-7 w-7 items-center justify-center rounded-full bg-white/90 text-neutral-700 shadow-sm transition-colors hover:bg-white dark:bg-black/50 dark:text-white"
            aria-pressed={saved}
            aria-label={saved ? "Remove from saved" : "Save content"}
            data-testid={`save-button-${card.contentId}`}
          >
            <Bookmark className={"h-3.5 w-3.5 " + (saved ? "fill-primary text-primary" : "")} />
          </button>
        </div>

        {/* Caption overlay */}
        {card.caption ? (
          <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent p-3 pt-10">
            <p className="line-clamp-2 text-sm font-medium text-white">{truncateCaption(card.caption, 80)}</p>
          </div>
        ) : null}
      </button>

      {/* Creator footer */}
      <div className="flex items-center gap-2.5 p-3">
        <UserAvatar user={card.creator} className="h-8 w-8" />
        <div className="min-w-0 flex-1">
          <button
            className="flex items-center gap-1 truncate text-xs font-semibold hover:text-primary"
            onClick={onOpen}
            data-testid={`creator-name-${card.userId}`}
          >
            <span className="truncate">{card.displayName}</span>
            {card.creator?.verified ? <VerifiedCheck /> : null}
          </button>
          <p className="truncate text-[11px] text-muted-foreground">{card.niche}</p>
          <p className="truncate text-[11px] font-medium text-primary">{rateText(card.creator?.rate_from)}</p>
        </div>
        <div className="shrink-0">{action}</div>
      </div>
    </div>
  );
}

function VerifiedCheck() {
  return (
    <span className="inline-flex h-3.5 w-3.5 items-center justify-center rounded-full bg-primary/15 text-primary" data-testid="verified-check" title="Verified">
      <Check className="h-2.5 w-2.5" />
    </span>
  );
}

/* -------------------------------------------------------------------------- */
/* Creator campaign feed (unchanged)                                          */
/* -------------------------------------------------------------------------- */

function CreatorExplore() {
  const qc = useQueryClient();
  const { data: campaigns, isLoading } = useQuery({
    queryKey: ["campaigns"],
    queryFn: async () => (await api.get("/campaigns")).data,
  });
  const { data: apps } = useQuery({
    queryKey: ["applications"],
    queryFn: async () => (await api.get("/applications")).data,
  });
  const [applyFor, setApplyFor] = useState(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  const appliedCampIds = useMemo(
    () => new Set((apps || []).filter((a) => a.type === "application" && a.status !== "declined").map((a) => a.camp_id)),
    [apps]);

  const apply = async () => {
    if (!applyFor) return;
    setBusy(true);
    try {
      await api.post(`/campaigns/${applyFor.camp_id}/apply`, { message });
      toast.success("Application sent");
      setApplyFor(null);
      setMessage("");
      qc.invalidateQueries({ queryKey: ["applications"] });
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Could not apply");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div data-testid="explore-campaigns-page">
      <PageHead title="Open campaigns" sub="Briefs published by verified sponsors. Apply with a short pitch." />
      {isLoading ? (
        <div className="py-24 text-center text-sm text-muted-foreground" data-testid="campaigns-loading">Loading campaigns…</div>
      ) : !campaigns?.length ? (
        <EmptyState icon={Search} title="No open campaigns right now" body="Check back soon — new briefs land here." testId="campaigns-empty" />
      ) : (
        <div className="grid gap-4" data-testid="campaigns-feed">
          {campaigns.map((c) => (
            <div key={c.camp_id} className="rounded-2xl border border-border bg-card p-6" data-testid={`campaign-card-${c.camp_id}`}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <UserAvatar user={c.company} className="h-10 w-10" />
                  <div>
                    <h3 className="font-display text-base font-semibold">{c.title}</h3>
                    <p className="text-xs text-muted-foreground">{c.company?.display_name} · apply by {fmtDate(c.deadline)}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-num text-sm font-semibold text-primary">{fmtMoney(c.budget_min)} – {fmtMoney(c.budget_max)}</p>
                  <div className="mt-1 flex justify-end">{appliedCampIds.has(c.camp_id) ? <StatusPill status="pending" /> : null}</div>
                </div>
              </div>
              <p className="mt-4 text-sm text-muted-foreground">{c.brief}</p>
              <div className="mt-4 flex flex-wrap gap-1.5">
                {c.deliverables.map((d, i) => (
                  <span key={i} className="rounded-full border border-border px-2.5 py-1 text-[11px] text-muted-foreground">{d}</span>
                ))}
                {c.niches.map((n) => (
                  <span key={n} className="rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-semibold text-primary">{n}</span>
                ))}
              </div>
              <div className="mt-5">
                {appliedCampIds.has(c.camp_id) ? (
                  <Button variant="secondary" size="sm" className="rounded-full" disabled data-testid={`applied-button-${c.camp_id}`}>
                    <Check className="mr-1 h-3.5 w-3.5" /> Applied
                  </Button>
                ) : (
                  <Button size="sm" className="rounded-full" onClick={() => setApplyFor(c)} data-testid={`apply-button-${c.camp_id}`}>Apply</Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={!!applyFor} onOpenChange={(o) => !o && setApplyFor(null)}>
        <DialogContent data-testid="apply-dialog">
          <DialogHeader><DialogTitle>Apply — {applyFor?.title}</DialogTitle></DialogHeader>
          <Textarea placeholder="Why are you a fit for this campaign?" rows={4} value={message} onChange={(e) => setMessage(e.target.value)} data-testid="apply-message-input" />
          <DialogFooter>
            <Button className="rounded-full" onClick={apply} disabled={busy} data-testid="apply-submit-button">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Send application"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
