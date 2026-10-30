import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Check, Loader2, MessageSquare, Search, Sparkles, Users } from "lucide-react";
import { toast } from "sonner";
import api, { fmtMoney, fmtNum, fmtDate } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { PageHead, UserAvatar, VerifiedBadge, EmptyState, StatusPill } from "@/components/common";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const NICHES = ["Tech & Gadgets", "Travel", "Beauty & Skincare", "Fitness", "Food & Cooking", "Gaming", "Lifestyle", "Wellness"];
const PLATFORMS = ["YouTube", "Instagram", "TikTok", "Twitch"];

function threadIdFor(a, b) {
  return [a, b].sort().join("::");
}

export default function Explore() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const isCreator = user?.role === "creator";

  return isCreator ? <CreatorExplore /> : <CompanyExplore />;
}

function CompanyExplore() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [niche, setNiche] = useState("all");
  const [platform, setPlatform] = useState("all");
  const [minF, setMinF] = useState("");
  const [maxF, setMaxF] = useState("");
  const [connecting, setConnecting] = useState("");
  const [detailId, setDetailId] = useState(null);

  const { data: creators, isLoading } = useQuery({
    queryKey: ["creators", search, niche, platform, minF, maxF],
    queryFn: async () =>
      (await api.get("/creators", {
        params: { search, niche: niche === "all" ? "" : niche, platform: platform === "all" ? "" : platform, min_followers: Number(minF) || 0, max_followers: Number(maxF) || 0 },
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

  return (
    <div data-testid="explore-creators-page">
      <PageHead title="Influencer Connect" sub="Search verified creators by niche, platform and audience size." />
      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-border bg-card p-4" data-testid="creator-filters">
        <div className="relative min-w-52 flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search creators…" value={search} onChange={(e) => setSearch(e.target.value)} data-testid="creator-search-input" />
        </div>
        <Select value={niche} onValueChange={setNiche}>
          <SelectTrigger className="w-44" data-testid="niche-filter-select"><SelectValue placeholder="Niche" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All niches</SelectItem>
            {NICHES.map((n) => <SelectItem key={n} value={n}>{n}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={platform} onValueChange={setPlatform}>
          <SelectTrigger className="w-36" data-testid="platform-filter-select"><SelectValue placeholder="Platform" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All platforms</SelectItem>
            {PLATFORMS.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
          </SelectContent>
        </Select>
        <Input className="w-28" placeholder="Min followers" type="number" value={minF} onChange={(e) => setMinF(e.target.value)} data-testid="min-followers-input" />
        <Input className="w-28" placeholder="Max followers" type="number" value={maxF} onChange={(e) => setMaxF(e.target.value)} data-testid="max-followers-input" />
      </div>

      {isLoading ? (
        <div className="py-24 text-center text-sm text-muted-foreground" data-testid="creators-loading">Loading creators…</div>
      ) : !creators?.length ? (
        <div className="mt-8"><EmptyState icon={Users} title="No creators match" body="Try widening the filters." testId="creators-empty" /></div>
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3" data-testid="creators-grid">
          {creators.map((c) => {
            const conn = connMap[c.user_id];
            return (
              <div key={c.user_id} className="flex flex-col rounded-2xl border border-border bg-card p-5 transition-colors hover:border-primary/40" data-testid={`creator-card-${c.user_id}`}>
                <div className="flex items-center gap-3">
                  <UserAvatar user={c} className="h-11 w-11" />
                  <div className="min-w-0 flex-1">
                    <button className="truncate text-sm font-bold hover:text-primary" onClick={() => setDetailId(c.user_id)} data-testid={`creator-name-${c.user_id}`}>{c.display_name}</button>
                    <p className="text-xs text-muted-foreground">{c.niche}</p>
                  </div>
                  <VerifiedBadge show={c.verified} />
                </div>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {c.platforms.map((p) => (
                    <span key={p.platform} className="rounded-full border border-border px-2 py-0.5 text-[11px] text-muted-foreground">
                      {p.platform} · {fmtNum(p.followers)}
                    </span>
                  ))}
                </div>
                <p className="mt-3 line-clamp-2 flex-1 text-xs text-muted-foreground">{c.bio}</p>
                <div className="mt-4 flex items-center justify-between">
                  <span className="font-num text-xs text-muted-foreground">from <span className="text-sm font-semibold text-foreground">{fmtMoney(c.rate_from)}</span>/post</span>
                  {!conn ? (
                    <Button size="sm" className="rounded-full" onClick={() => connect(c.user_id)} disabled={connecting === c.user_id} data-testid={`connect-button-${c.user_id}`}>
                      {connecting === c.user_id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Connect"}
                    </Button>
                  ) : conn.status === "accepted" ? (
                    <Button size="sm" variant="secondary" className="rounded-full" onClick={() => navigate(`/app/messages?thread=${threadIdFor(user.user_id, c.user_id)}`)} data-testid={`message-button-${c.user_id}`}>
                      <MessageSquare className="mr-1 h-3.5 w-3.5" /> Message
                    </Button>
                  ) : (
                    <span className="text-xs text-muted-foreground" data-testid={`requested-label-${c.user_id}`}>{conn.status === "pending" ? "Requested" : conn.status}</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

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
