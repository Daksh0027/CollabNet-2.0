import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import {
  Check, Loader2, MessageSquare, Search, Sparkles, Users, SlidersHorizontal,
  X, RotateCcw, TrendingUp, Eye, Star, Layers, ShieldCheck, DollarSign,
  Building2, Video, CheckCircle2, ChevronDown, ExternalLink, Briefcase
} from "lucide-react";
import { toast } from "sonner";
import api, { fmtMoney, fmtNum, fmtDate } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { PageHead, UserAvatar, VerifiedBadge, EmptyState, StatusPill } from "@/components/common";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";

const NICHES = [
  "Tech & Gadgets",
  "Beauty & Skincare",
  "Health & Fitness",
  "Food & Cooking",
  "Gaming",
  "Travel",
  "Finance & Business",
  "Lifestyle",
  "Wellness"
];

const CONTENT_TYPES = [
  "Short-Form Video",
  "Dedicated Long-Form Video",
  "Integrated Segment",
  "Live Stream Placement",
  "Podcast Episode / Audio Read",
  "Carousel / Thought Leadership",
  "UGC Ad Production"
];

const PLATFORMS = ["YouTube", "Instagram", "TikTok", "Twitch"];

const COMMERCIAL_TERMS = [
  "100% Escrow Upfront",
  "1-Round Revision Guarantee",
  "30-Day Paid Whitelisting Available",
  "Organic Posting Only",
  "Base + Affiliate Performance",
  "Retainer / Ambassador Available"
];

const SORT_OPTIONS = [
  { value: "followers", label: "Top Followers" },
  { value: "views", label: "Highest Avg Views" },
  { value: "engagement", label: "Highest Engagement %" },
  { value: "connections", label: "Most Connections" },
  { value: "rate_asc", label: "Price: Low to High" },
  { value: "rate_desc", label: "Price: High to Low" },
  { value: "rating", label: "Highest Rated" }
];

function threadIdFor(a, b) {
  return [a, b].sort().join("::");
}

export default function Explore() {
  const { user } = useAuth();
  const isCreator = user?.role === "creator";

  return isCreator ? <CreatorExplore /> : <CompanyExplore />;
}

function CompanyExplore() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const navigate = useNavigate();

  // Search & Filter States
  const [search, setSearch] = useState("");
  const [niche, setNiche] = useState("all");
  const [platform, setPlatform] = useState("all");
  const [contentType, setContentType] = useState("all");
  const [commercialTerm, setCommercialTerm] = useState("all");
  const [sortBy, setSortBy] = useState("followers");

  // Numeric Thresholds (Sliders)
  const [minF, setMinF] = useState(0);
  const [maxF, setMaxF] = useState(0);
  const [minViews, setMinViews] = useState(0);
  const [minEngagement, setMinEngagement] = useState(0);
  const [minConnections, setMinConnections] = useState(0);
  const [minRate, setMinRate] = useState(0);
  const [maxRate, setMaxRate] = useState(0);

  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [connecting, setConnecting] = useState("");
  const [detailId, setDetailId] = useState(null);

  // Count active filters
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (niche !== "all") count++;
    if (platform !== "all") count++;
    if (contentType !== "all") count++;
    if (commercialTerm !== "all") count++;
    if (minF > 0) count++;
    if (maxF > 0) count++;
    if (minViews > 0) count++;
    if (minEngagement > 0) count++;
    if (minConnections > 0) count++;
    if (minRate > 0) count++;
    if (maxRate > 0) count++;
    return count;
  }, [niche, platform, contentType, commercialTerm, minF, maxF, minViews, minEngagement, minConnections, minRate, maxRate]);

  const resetFilters = () => {
    setSearch("");
    setNiche("all");
    setPlatform("all");
    setContentType("all");
    setCommercialTerm("all");
    setMinF(0);
    setMaxF(0);
    setMinViews(0);
    setMinEngagement(0);
    setMinConnections(0);
    setMinRate(0);
    setMaxRate(0);
    setSortBy("followers");
  };

  const { data: creators, isLoading } = useQuery({
    queryKey: [
      "creators",
      search,
      niche,
      platform,
      contentType,
      commercialTerm,
      minF ? String(minF) : "",
      maxF ? String(maxF) : "",
      minViews ? String(minViews) : "",
      minEngagement ? String(minEngagement) : "",
      minConnections ? String(minConnections) : "",
      minRate ? String(minRate) : "",
      maxRate ? String(maxRate) : "",
      sortBy
    ],
    queryFn: async () =>
      (
        await api.get("/creators", {
          params: {
            search,
            niche: niche === "all" ? "" : niche,
            platform: platform === "all" ? "" : platform,
            content_type: contentType === "all" ? "" : contentType,
            commercial_term: commercialTerm === "all" ? "" : commercialTerm,
            min_followers: Number(minF) || 0,
            max_followers: Number(maxF) || 0,
            min_views: Number(minViews) || 0,
            min_engagement: Number(minEngagement) || 0.0,
            min_connections: Number(minConnections) || 0,
            min_rate: Number(minRate) || 0,
            max_rate: Number(maxRate) || 0,
            sort_by: sortBy,
          },
        })
      ).data,
  });

  const { data: connections } = useQuery({
    queryKey: ["connections"],
    queryFn: async () => (await api.get("/connections")).data,
  });

  const { data: aiStatus } = useQuery({
    queryKey: ["ai-status"],
    queryFn: async () => (await api.get("/ai/status")).data,
  });

  const { data: detail } = useQuery({
    queryKey: ["user", detailId],
    queryFn: async () => (await api.get(`/users/${detailId}`)).data,
    enabled: !!detailId,
  });

  const connMap = useMemo(() => {
    const m = {};
    (connections || []).forEach((c) => {
      if (c.other) m[c.other.user_id] = c;
    });
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
      <PageHead
        title="Influencer Connect"
        sub="Discover verified creators by genre presets, deliverable formats, audience sliders, and portfolio projects."
      />

      {/* Main Filter Toolbar & Genre Presets */}
      <div className="space-y-3.5 rounded-2xl border border-border bg-card p-4 shadow-xs" data-testid="creator-filters">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-56 flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Search by name, niche, deliverables, or keywords…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              data-testid="creator-search-input"
            />
          </div>

          <Select value={niche} onValueChange={setNiche}>
            <SelectTrigger className="w-44" data-testid="niche-filter-select">
              <SelectValue placeholder="All Niches" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Niches</SelectItem>
              {NICHES.map((n) => (
                <SelectItem key={n} value={n}>
                  {n}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={platform} onValueChange={setPlatform}>
            <SelectTrigger className="w-36" data-testid="platform-filter-select">
              <SelectValue placeholder="All Platforms" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Platforms</SelectItem>
              {PLATFORMS.map((p) => (
                <SelectItem key={p} value={p}>
                  {p}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-44" data-testid="sort-by-select">
              <SelectValue placeholder="Sort By" />
            </SelectTrigger>
            <SelectContent>
              {SORT_OPTIONS.map((s) => (
                <SelectItem key={s.value} value={s.value}>
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            variant={showAdvancedFilters || activeFiltersCount > 0 ? "default" : "outline"}
            className="gap-2 rounded-full text-xs font-semibold"
            onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
            data-testid="filter-toggle-button"
          >
            <SlidersHorizontal className="h-3.5 w-3.5" />
            <span>Filters & Sliders</span>
            {activeFiltersCount > 0 && (
              <span className="flex h-4 w-4 items-center justify-center rounded-full bg-primary-foreground text-[10px] text-primary">
                {activeFiltersCount}
              </span>
            )}
          </Button>

          {activeFiltersCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={resetFilters}
              className="text-xs text-muted-foreground hover:text-foreground"
              data-testid="reset-filters-button"
            >
              <RotateCcw className="mr-1 h-3.5 w-3.5" /> Reset
            </Button>
          )}
        </div>

        {/* Quick Genre Preset Chips Bar */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-1 scrollbar-none">
          <span className="eyebrow shrink-0 mr-1 text-[11px]">Genres:</span>
          <button
            type="button"
            onClick={() => setNiche("all")}
            className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium transition-all ${
              niche === "all"
                ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                : "border border-border bg-background text-muted-foreground hover:border-primary/40"
            }`}
          >
            All Genres
          </button>
          {NICHES.map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setNiche(niche === n ? "all" : n)}
              className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium transition-all ${
                niche === n
                  ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                  : "border border-border bg-background text-muted-foreground hover:border-primary/40"
              }`}
            >
              {n}
            </button>
          ))}
        </div>

        {/* Collapsible Advanced Filters & Sliders Drawer */}
        {showAdvancedFilters && (
          <div className="mt-3 border-t border-border pt-4 animate-in fade-in-50 duration-150 space-y-5">
            {/* Deliverable Formats Presets */}
            <div>
              <span className="eyebrow block mb-1.5">Deliverable Formats Presets</span>
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => setContentType("all")}
                  className={`rounded-full px-3 py-1 text-xs font-medium transition-all ${
                    contentType === "all"
                      ? "bg-secondary text-secondary-foreground font-semibold ring-1 ring-primary/40"
                      : "border border-border bg-background text-muted-foreground hover:border-primary/40"
                  }`}
                >
                  Any Format
                </button>
                {CONTENT_TYPES.map((ct) => (
                  <button
                    key={ct}
                    type="button"
                    onClick={() => setContentType(contentType === ct ? "all" : ct)}
                    className={`rounded-full px-3 py-1 text-xs font-medium transition-all ${
                      contentType === ct
                        ? "bg-secondary text-secondary-foreground font-semibold ring-1 ring-primary/40"
                        : "border border-border bg-background text-muted-foreground hover:border-primary/40"
                    }`}
                  >
                    {ct}
                  </button>
                ))}
              </div>
            </div>

            {/* Precision Numeric Sliders Grid */}
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {/* Followers Range Slider */}
              <div className="space-y-2 rounded-xl border border-border/80 bg-background/50 p-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="eyebrow">Min Followers</span>
                  <span className="font-num font-bold text-foreground">
                    {minF > 0 ? fmtNum(minF) : "Any"}
                  </span>
                </div>
                <Slider
                  min={0}
                  max={1500000}
                  step={25000}
                  value={[minF]}
                  onValueChange={([val]) => setMinF(val)}
                  data-testid="min-followers-slider"
                />
                <div className="flex justify-between text-[10px] text-muted-foreground font-num">
                  <span>0</span>
                  <span>500K</span>
                  <span>1.5M+</span>
                </div>
              </div>

              {/* Min Avg Views Slider */}
              <div className="space-y-2 rounded-xl border border-border/80 bg-background/50 p-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="eyebrow">Min Avg Views</span>
                  <span className="font-num font-bold text-foreground">
                    {minViews > 0 ? fmtNum(minViews) : "Any"}
                  </span>
                </div>
                <Slider
                  min={0}
                  max={500000}
                  step={10000}
                  value={[minViews]}
                  onValueChange={([val]) => setMinViews(val)}
                  data-testid="min-views-slider"
                />
                <div className="flex justify-between text-[10px] text-muted-foreground font-num">
                  <span>0</span>
                  <span>250K</span>
                  <span>500K+</span>
                </div>
              </div>

              {/* Min Engagement % Slider */}
              <div className="space-y-2 rounded-xl border border-border/80 bg-background/50 p-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="eyebrow">Min Engagement</span>
                  <span className="font-num font-bold text-foreground">
                    {minEngagement > 0 ? `${minEngagement}%` : "Any"}
                  </span>
                </div>
                <Slider
                  min={0}
                  max={10}
                  step={0.5}
                  value={[minEngagement]}
                  onValueChange={([val]) => setMinEngagement(val)}
                  data-testid="min-engagement-slider"
                />
                <div className="flex justify-between text-[10px] text-muted-foreground font-num">
                  <span>0%</span>
                  <span>5%</span>
                  <span>10%</span>
                </div>
              </div>

              {/* Max Post Rate Slider */}
              <div className="space-y-2 rounded-xl border border-border/80 bg-background/50 p-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="eyebrow">Max Rate</span>
                  <span className="font-num font-bold text-foreground">
                    {maxRate > 0 ? fmtMoney(maxRate) : "Any"}
                  </span>
                </div>
                <Slider
                  min={0}
                  max={5000}
                  step={100}
                  value={[maxRate]}
                  onValueChange={([val]) => setMaxRate(val)}
                  data-testid="max-rate-slider"
                />
                <div className="flex justify-between text-[10px] text-muted-foreground font-num">
                  <span>$0</span>
                  <span>$2,500</span>
                  <span>$5,000+</span>
                </div>
              </div>
            </div>

            {/* Commercial Terms Presets */}
            <div>
              <span className="eyebrow block mb-1.5">Commercial & Working Terms</span>
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => setCommercialTerm("all")}
                  className={`rounded-full px-3 py-1 text-xs font-medium transition-all ${
                    commercialTerm === "all"
                      ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/40 font-semibold"
                      : "border border-border bg-background text-muted-foreground hover:border-primary/40"
                  }`}
                >
                  Any Terms
                </button>
                {COMMERCIAL_TERMS.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setCommercialTerm(commercialTerm === t ? "all" : t)}
                    className={`rounded-full px-3 py-1 text-xs font-medium transition-all ${
                      commercialTerm === t
                        ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/40 font-semibold"
                        : "border border-border bg-background text-muted-foreground hover:border-primary/40"
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Results Section */}
      {isLoading ? (
        <div className="py-24 text-center text-sm text-muted-foreground" data-testid="creators-loading">
          Loading verified creators…
        </div>
      ) : !creators?.length ? (
        <div className="mt-8">
          <EmptyState
            icon={Users}
            title="No creators match your criteria"
            body="Try adjusting your sliders, lowering minimum follower/view thresholds, or selecting All Genres."
            testId="creators-empty"
          />
        </div>
      ) : (
        <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3" data-testid="creators-grid">
          {creators.map((c) => {
            const conn = connMap[c.user_id];
            return (
              <div
                key={c.user_id}
                className="flex flex-col justify-between rounded-2xl border border-border bg-card p-5 transition-all hover:border-primary/50 hover:shadow-md"
                data-testid={`creator-card-${c.user_id}`}
              >
                <div>
                  {/* Creator Header */}
                  <div className="flex items-start gap-3">
                    <UserAvatar user={c} className="h-12 w-12 rounded-xl ring-1 ring-border" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <button
                          className="truncate text-sm font-bold text-foreground hover:text-primary transition-colors text-left"
                          onClick={() => setDetailId(c.user_id)}
                          data-testid={`creator-name-${c.user_id}`}
                        >
                          {c.display_name}
                        </button>
                        <VerifiedBadge show={c.verified} />
                      </div>
                      <p className="truncate text-xs font-medium text-primary">{c.niche}</p>
                      {c.location && (
                        <p className="truncate text-[11px] text-muted-foreground">{c.location}</p>
                      )}
                    </div>
                  </div>

                  {/* Quantitative Stats Matrix Strip */}
                  <div
                    className="mt-3.5 grid grid-cols-3 gap-2 rounded-xl border border-border/80 bg-background/50 p-2 text-center"
                    data-testid={`creator-stats-matrix-${c.user_id}`}
                  >
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Reach</p>
                      <p className="font-num text-xs font-bold text-foreground">
                        {fmtNum(c.total_reach || c.top_followers)}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Avg Views</p>
                      <p className="font-num text-xs font-bold text-foreground">
                        {fmtNum(c.avg_views || c.stats?.avg_views)}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Engagement</p>
                      <p className="font-num text-xs font-bold text-foreground">
                        {c.engagement_rate || c.stats?.engagement || 0}%
                      </p>
                    </div>
                  </div>

                  {/* Network & Track Record Row */}
                  <div className="mt-2.5 flex items-center justify-between text-xs text-muted-foreground px-1">
                    <span
                      className="inline-flex items-center gap-1 font-medium text-foreground"
                      data-testid={`creator-connections-${c.user_id}`}
                    >
                      <Users className="h-3.5 w-3.5 text-primary" />
                      {c.connections_count || 0} connections
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                      <span className="font-semibold text-foreground">{c.rating_avg ? `${c.rating_avg}` : "5.0"}</span>
                      <span>({c.completed_deals_count || 0} deals)</span>
                    </span>
                  </div>

                  {/* Platform Channels Chips */}
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {c.platforms?.map((p) => (
                      <span
                        key={p.platform}
                        className="inline-flex items-center gap-1 rounded-full border border-border bg-card px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground"
                      >
                        <span className="font-semibold text-foreground">{p.platform}:</span>
                        <span className="font-num text-primary">{fmtNum(p.followers)}</span>
                        {p.posts_count ? <span className="opacity-60">· {p.posts_count} posts</span> : null}
                      </span>
                    ))}
                  </div>

                  {/* Bio Description */}
                  <p className="mt-3 line-clamp-2 text-xs leading-relaxed text-muted-foreground">{c.bio}</p>

                  {/* Deliverable Formats Chips */}
                  {c.content_types?.length > 0 && (
                    <div className="mt-2.5 flex flex-wrap gap-1">
                      {c.content_types.slice(0, 3).map((ct) => (
                        <span
                          key={ct}
                          className="rounded-md bg-secondary/80 px-2 py-0.5 text-[10px] font-medium text-secondary-foreground"
                        >
                          {ct}
                        </span>
                      ))}
                      {c.content_types.length > 3 && (
                        <span className="rounded-md bg-secondary/50 px-1.5 py-0.5 text-[10px] text-muted-foreground">
                          +{c.content_types.length - 3}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Commercial Terms Badges */}
                  {c.commercial_terms?.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {c.commercial_terms.slice(0, 2).map((term) => (
                        <span
                          key={term}
                          className="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-600 dark:text-emerald-400"
                        >
                          {term}
                        </span>
                      ))}
                      {c.commercial_terms.length > 2 && (
                        <span className="rounded-md bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                          +{c.commercial_terms.length - 2}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Portfolio Projects Highlights Pill */}
                  {c.projects?.length > 0 && (
                    <div className="mt-2.5 flex items-center gap-1.5 text-[11px] text-primary font-medium">
                      <Briefcase className="h-3 w-3" />
                      <span>{c.projects.length} featured project{c.projects.length > 1 ? "s" : ""} on portfolio</span>
                    </div>
                  )}
                </div>

                {/* Card Footer */}
                <div className="mt-5 flex items-center justify-between border-t border-border/60 pt-3">
                  <div>
                    <span className="text-[10px] block uppercase tracking-wider text-muted-foreground">Starting Rate</span>
                    <span className="font-num text-xs text-muted-foreground">
                      from <span className="text-sm font-bold text-foreground">{fmtMoney(c.rate_from)}</span>/post
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 text-xs font-semibold"
                      onClick={() => setDetailId(c.user_id)}
                      data-testid={`media-kit-button-${c.user_id}`}
                    >
                      Media Kit
                    </Button>

                    {!conn ? (
                      <Button
                        size="sm"
                        className="h-8 rounded-full text-xs font-semibold"
                        onClick={() => connect(c.user_id)}
                        disabled={connecting === c.user_id}
                        data-testid={`connect-button-${c.user_id}`}
                      >
                        {connecting === c.user_id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Connect"}
                      </Button>
                    ) : conn.status === "accepted" ? (
                      <Button
                        size="sm"
                        variant="secondary"
                        className="h-8 rounded-full text-xs font-semibold"
                        onClick={() => navigate(`/app/messages?thread=${threadIdFor(user.user_id, c.user_id)}`)}
                        data-testid={`message-button-${c.user_id}`}
                      >
                        <MessageSquare className="mr-1 h-3.5 w-3.5" /> Message
                      </Button>
                    ) : (
                      <span className="text-xs text-muted-foreground px-2" data-testid={`requested-label-${c.user_id}`}>
                        {conn.status === "pending" ? "Requested" : conn.status}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Comprehensive Media Kit & Behance Portfolio Modal */}
      <Dialog
        open={!!detailId}
        onOpenChange={(o) => {
          if (!o) {
            setDetailId(null);
            setBenchmark(null);
          }
        }}
      >
        <DialogContent className="max-w-3xl" data-testid="creator-detail-dialog">
          {detail ? (
            <>
              <DialogHeader>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <UserAvatar user={detail} className="h-14 w-14 rounded-2xl ring-2 ring-primary/20" />
                    <div>
                      <DialogTitle className="flex items-center gap-2 text-lg font-bold">
                        {detail.display_name} <VerifiedBadge show={detail.verified} />
                      </DialogTitle>
                      <p className="text-xs font-medium text-primary">{detail.creator?.niche}</p>
                      {detail.creator?.location && (
                        <p className="text-xs text-muted-foreground">{detail.creator?.location}</p>
                      )}
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="inline-flex items-center gap-1 rounded-full border border-border bg-card px-3 py-1 text-xs font-semibold text-foreground">
                      <Users className="h-3.5 w-3.5 text-primary" />
                      {detail.connections_count || 0} connections
                    </span>
                  </div>
                </div>
              </DialogHeader>

              <div className="max-h-[70vh] space-y-6 overflow-y-auto pr-2">
                {/* Bio & Pitch */}
                <div className="space-y-2">
                  <p className="text-sm text-foreground/90 leading-relaxed">{detail.creator?.bio}</p>
                  {detail.creator?.pitch && (
                    <div className="rounded-xl border border-primary/20 bg-primary/5 p-3.5 text-xs">
                      <span className="eyebrow block text-primary font-semibold mb-1">Brand Pitch</span>
                      <p className="italic text-foreground/90">"{detail.creator?.pitch}"</p>
                    </div>
                  )}
                </div>

                {/* 4-Tile Core Performance Grid */}
                <div>
                  <h4 className="eyebrow mb-2">Core Performance Metrics</h4>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                    <div className="rounded-xl border border-border bg-card p-3">
                      <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Total Reach</p>
                      <p className="font-num text-base font-bold text-foreground mt-0.5">
                        {fmtNum(
                          detail.total_reach ||
                            detail.creator?.platforms?.reduce((acc, p) => acc + (p.followers || 0), 0)
                        )}
                      </p>
                    </div>
                    <div className="rounded-xl border border-border bg-card p-3">
                      <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Avg Views</p>
                      <p className="font-num text-base font-bold text-foreground mt-0.5">
                        {fmtNum(detail.avg_views || detail.creator?.stats?.avg_views)}
                      </p>
                    </div>
                    <div className="rounded-xl border border-border bg-card p-3">
                      <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Engagement</p>
                      <p className="font-num text-base font-bold text-foreground mt-0.5">
                        {detail.engagement_rate || detail.creator?.stats?.engagement || 0}%
                      </p>
                    </div>
                    <div className="rounded-xl border border-border bg-card p-3">
                      <p className="text-[11px] uppercase tracking-wider text-muted-foreground">On-Time Delivery</p>
                      <p className="font-num text-base font-bold text-emerald-500 mt-0.5">
                        {detail.on_time_delivery_rate || 98.0}%
                      </p>
                    </div>
                  </div>
                </div>

                {/* Behance-Style Featured Projects Showcase */}
                {detail.creator?.projects?.length > 0 && (
                  <div>
                    <h4 className="eyebrow mb-2.5 flex items-center gap-1.5">
                      <Briefcase className="h-3.5 w-3.5 text-primary" />
                      Featured Portfolio Projects & Case Studies
                    </h4>
                    <div className="grid gap-3.5 sm:grid-cols-2">
                      {detail.creator.projects.map((p) => (
                        <div
                          key={p.project_id}
                          className="flex flex-col justify-between rounded-xl border border-border bg-card p-3.5 text-xs shadow-xs transition-colors hover:border-primary/40"
                        >
                          <div>
                            <div className="relative h-32 w-full overflow-hidden rounded-lg bg-muted mb-2.5">
                              {p.media_url ? (
                                <img src={p.media_url} alt={p.title} className="h-full w-full object-cover" />
                              ) : (
                                <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                                  <Video className="h-8 w-8" />
                                </div>
                              )}
                              <span className="absolute bottom-1.5 right-1.5 rounded-md bg-black/75 px-2 py-0.5 text-[10px] font-semibold text-white">
                                {p.deliverable_type?.split(" ")[0]}
                              </span>
                            </div>

                            <h5 className="font-bold text-sm text-foreground line-clamp-1">{p.title}</h5>
                            <p className="text-primary font-medium text-xs mt-0.5">{p.brand}</p>

                            {p.metrics && (
                              <div className="mt-2 inline-flex items-center gap-1 rounded-md bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary">
                                <Sparkles className="h-3 w-3" /> {p.metrics}
                              </div>
                            )}

                            <p className="mt-2 line-clamp-3 text-muted-foreground leading-relaxed">{p.description}</p>
                          </div>

                          {p.link && (
                            <a
                              href={p.link}
                              target="_blank"
                              rel="noreferrer"
                              className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline pt-2 border-t border-border/50"
                            >
                              View Live Video / Collab <ExternalLink className="h-3 w-3" />
                            </a>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Social Channels Deep Dive */}
                {detail.creator?.platforms?.length > 0 && (
                  <div>
                    <h4 className="eyebrow mb-2">Connected Channels Breakdown</h4>
                    <div className="space-y-2">
                      {detail.creator.platforms.map((p) => (
                        <div
                          key={p.platform}
                          className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card p-3 text-xs"
                        >
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-foreground text-sm">{p.platform}</span>
                            <span className="text-muted-foreground">{p.handle}</span>
                          </div>

                          <div className="flex items-center gap-4 text-right">
                            <div>
                              <p className="text-[10px] uppercase text-muted-foreground">Followers</p>
                              <p className="font-num font-semibold text-foreground">{fmtNum(p.followers)}</p>
                            </div>
                            {p.posts_count ? (
                              <div>
                                <p className="text-[10px] uppercase text-muted-foreground">Videos/Posts</p>
                                <p className="font-num font-semibold text-foreground">{p.posts_count}</p>
                              </div>
                            ) : null}
                            {p.avg_views ? (
                              <div>
                                <p className="text-[10px] uppercase text-muted-foreground">Avg Views</p>
                                <p className="font-num font-semibold text-foreground">{fmtNum(p.avg_views)}</p>
                              </div>
                            ) : null}
                            {p.engagement_rate ? (
                              <div>
                                <p className="text-[10px] uppercase text-muted-foreground">Engagement</p>
                                <p className="font-num font-semibold text-foreground">{p.engagement_rate}%</p>
                              </div>
                            ) : null}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Rates & Deliverable Formats */}
                <div>
                  <h4 className="eyebrow mb-2">Standard Deliverable Rates</h4>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
                    <div className="rounded-xl border border-border bg-card p-2.5">
                      <span className="text-muted-foreground">Post / Carousel</span>
                      <p className="font-num text-sm font-bold text-foreground mt-1">
                        {fmtMoney(detail.creator?.rates?.post)}
                      </p>
                    </div>
                    <div className="rounded-xl border border-border bg-card p-2.5">
                      <span className="text-muted-foreground">Dedicated Video</span>
                      <p className="font-num text-sm font-bold text-foreground mt-1">
                        {fmtMoney(detail.creator?.rates?.video)}
                      </p>
                    </div>
                    <div className="rounded-xl border border-border bg-card p-2.5">
                      <span className="text-muted-foreground">Story / Status</span>
                      <p className="font-num text-sm font-bold text-foreground mt-1">
                        {fmtMoney(detail.creator?.rates?.story)}
                      </p>
                    </div>
                    <div className="rounded-xl border border-border bg-card p-2.5">
                      <span className="text-muted-foreground">Integrated Spot</span>
                      <p className="font-num text-sm font-bold text-foreground mt-1">
                        {fmtMoney(detail.creator?.rates?.integrated || detail.creator?.rates?.video * 0.6)}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Deliverables & Commercial Terms */}
                <div className="grid gap-3 sm:grid-cols-2">
                  {detail.creator?.content_types?.length > 0 && (
                    <div className="rounded-xl border border-border bg-card p-3">
                      <h4 className="eyebrow mb-2">Supported Content Formats</h4>
                      <div className="flex flex-wrap gap-1.5">
                        {detail.creator.content_types.map((ct) => (
                          <span
                            key={ct}
                            className="rounded-md bg-secondary px-2.5 py-1 text-[11px] font-medium text-secondary-foreground"
                          >
                            {ct}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {detail.creator?.commercial_terms?.length > 0 && (
                    <div className="rounded-xl border border-border bg-card p-3">
                      <h4 className="eyebrow mb-2">Commercial & Working Terms</h4>
                      <div className="flex flex-wrap gap-1.5">
                        {detail.creator.commercial_terms.map((term) => (
                          <span
                            key={term}
                            className="rounded-full border border-border bg-background px-2.5 py-1 text-[11px] font-medium text-muted-foreground"
                          >
                            {term}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Client Reviews */}
                {detail.reviews?.length ? (
                  <div>
                    <h4 className="eyebrow mb-2">
                      Verified Sponsor Reviews ({detail.reviews.length} · Average {detail.rating_avg || 5.0} ★)
                    </h4>
                    <div className="space-y-2">
                      {detail.reviews.slice(0, 3).map((r) => (
                        <div key={r.review_id} className="rounded-xl border border-border bg-card p-3 text-xs">
                          <div className="flex items-center justify-between font-semibold">
                            <span>{r.campaign_title}</span>
                            <span className="flex items-center gap-1 text-amber-500">
                              <Star className="h-3 w-3 fill-amber-500" /> {r.rating}/5
                            </span>
                          </div>
                          <p className="mt-1.5 text-muted-foreground">{r.comment}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}

                {/* AI Benchmark Panel */}
                <div className="rounded-xl border border-primary/30 bg-primary/5 p-3.5" data-testid="benchmark-panel">
                  <div className="flex items-center justify-between">
                    <p className="eyebrow flex items-center gap-1.5">
                      <Sparkles className="h-3.5 w-3.5 text-primary" /> AI rate benchmark
                    </p>
                    <Button
                      size="sm"
                      variant="secondary"
                      className="h-7 rounded-full text-xs"
                      disabled={!aiStatus?.configured || benchBusy}
                      onClick={() => runBenchmark(detail.user_id)}
                      data-testid="benchmark-button"
                    >
                      {benchBusy ? <Loader2 className="h-3 w-3 animate-spin" /> : "Run"}
                    </Button>
                  </div>
                  {benchmark ? (
                    <div className="mt-2 text-xs" data-testid="benchmark-result">
                      <p>
                        Verdict: <span className="font-semibold text-primary">{benchmark.verdict}</span>
                      </p>
                      {benchmark.suggested_max ? (
                        <p>
                          Suggested per-post range:{" "}
                          <span className="font-num">
                            {fmtMoney(benchmark.suggested_min)} – {fmtMoney(benchmark.suggested_max)}
                          </span>
                        </p>
                      ) : null}
                      <p className="mt-1 text-muted-foreground">{benchmark.notes}</p>
                    </div>
                  ) : !aiStatus?.configured ? (
                    <p className="mt-2 text-xs text-muted-foreground" data-testid="benchmark-disabled-note">
                      AI not configured — add an API key in backend configuration.
                    </p>
                  ) : null}
                </div>
              </div>

              <DialogFooter>
                <Button
                  variant="secondary"
                  className="rounded-full"
                  onClick={() => setDetailId(null)}
                  data-testid="creator-detail-close-button"
                >
                  Close
                </Button>
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

  // Filters for Campaigns
  const [search, setSearch] = useState("");
  const [niche, setNiche] = useState("all");
  const [deliverable, setDeliverable] = useState("all");
  const [minBudget, setMinBudget] = useState("");
  const [maxBudget, setMaxBudget] = useState("");
  const [commercialTerm, setCommercialTerm] = useState("all");

  const [applyFor, setApplyFor] = useState(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  const { data: campaigns, isLoading } = useQuery({
    queryKey: ["campaigns", search, niche, deliverable, minBudget, maxBudget, commercialTerm],
    queryFn: async () =>
      (
        await api.get("/campaigns", {
          params: {
            search,
            niche: niche === "all" ? "" : niche,
            content_type: deliverable === "all" ? "" : deliverable,
            min_budget: Number(minBudget) || 0,
            max_budget: Number(maxBudget) || 0,
            commercial_term: commercialTerm === "all" ? "" : commercialTerm,
          },
        })
      ).data,
  });

  const { data: apps } = useQuery({
    queryKey: ["applications"],
    queryFn: async () => (await api.get("/applications")).data,
  });

  const appliedCampIds = useMemo(
    () => new Set((apps || []).filter((a) => a.type === "application" && a.status !== "declined").map((a) => a.camp_id)),
    [apps]
  );

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

  const resetCampaignFilters = () => {
    setSearch("");
    setNiche("all");
    setDeliverable("all");
    setMinBudget("");
    setMaxBudget("");
    setCommercialTerm("all");
  };

  return (
    <div data-testid="explore-campaigns-page">
      <PageHead
        title="Open Campaigns"
        sub="Browse briefs published by verified sponsors. Filter by budget tiers, deliverables, and commercial terms."
      />

      {/* Campaign Search and Filter Bar */}
      <div className="mb-6 space-y-3 rounded-2xl border border-border bg-card p-4 shadow-xs" data-testid="campaign-filters">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-56 flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Search briefs, brands, or deliverables…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              data-testid="campaign-search-input"
            />
          </div>

          <Select value={niche} onValueChange={setNiche}>
            <SelectTrigger className="w-44" data-testid="campaign-niche-select">
              <SelectValue placeholder="All Niches" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Niches</SelectItem>
              {NICHES.map((n) => (
                <SelectItem key={n} value={n}>
                  {n}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={deliverable} onValueChange={setDeliverable}>
            <SelectTrigger className="w-44" data-testid="campaign-deliverable-select">
              <SelectValue placeholder="All Deliverables" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Deliverables</SelectItem>
              {CONTENT_TYPES.map((ct) => (
                <SelectItem key={ct} value={ct}>
                  {ct}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="flex items-center gap-1.5">
            <Input
              className="w-24"
              placeholder="Min $"
              type="number"
              value={minBudget}
              onChange={(e) => setMinBudget(e.target.value)}
              data-testid="campaign-min-budget-input"
            />
            <span className="text-xs text-muted-foreground">–</span>
            <Input
              className="w-24"
              placeholder="Max $"
              type="number"
              value={maxBudget}
              onChange={(e) => setMaxBudget(e.target.value)}
              data-testid="campaign-max-budget-input"
            />
          </div>

          <Select value={commercialTerm} onValueChange={setCommercialTerm}>
            <SelectTrigger className="w-44" data-testid="campaign-commercial-term-select">
              <SelectValue placeholder="Commercial Terms" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Terms</SelectItem>
              {COMMERCIAL_TERMS.map((t) => (
                <SelectItem key={t} value={t}>
                  {t}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {(niche !== "all" || deliverable !== "all" || minBudget || maxBudget || commercialTerm !== "all" || search) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={resetCampaignFilters}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              <RotateCcw className="mr-1 h-3.5 w-3.5" /> Reset
            </Button>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="py-24 text-center text-sm text-muted-foreground" data-testid="campaigns-loading">
          Loading campaigns…
        </div>
      ) : !campaigns?.length ? (
        <EmptyState
          icon={Search}
          title="No open campaigns match your search"
          body="Try adjusting your budget or deliverables filters to see more open briefs."
          testId="campaigns-empty"
        />
      ) : (
        <div className="grid gap-4" data-testid="campaigns-feed">
          {campaigns.map((c) => (
            <div
              key={c.camp_id}
              className="rounded-2xl border border-border bg-card p-6 shadow-xs transition-colors hover:border-primary/40"
              data-testid={`campaign-card-${c.camp_id}`}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <UserAvatar user={c.company} className="h-12 w-12 rounded-xl ring-1 ring-border" />
                  <div>
                    <h3 className="font-display text-base font-semibold text-foreground">{c.title}</h3>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                      <span className="font-medium text-foreground">{c.company?.display_name}</span>
                      {c.company?.industry && <span>· {c.company.industry}</span>}
                      {c.company?.employees ? <span>· {c.company.employees} employees</span> : null}
                      <span>· apply by {fmtDate(c.deadline)}</span>
                    </div>

                    {/* Company Reliability Metric Strip */}
                    <div className="mt-1.5 flex items-center gap-3 text-[11px] text-muted-foreground">
                      <span className="inline-flex items-center gap-1 font-medium text-foreground">
                        <Users className="h-3 w-3 text-primary" />
                        {c.company?.connections_count || 0} connections
                      </span>
                      {c.company?.total_spend > 0 && (
                        <span>
                          <span className="font-semibold text-foreground">{fmtMoney(c.company.total_spend)}</span> total spend
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-[10px] block uppercase tracking-wider text-muted-foreground">Campaign Budget</span>
                  <p className="font-num text-base font-bold text-primary">
                    {fmtMoney(c.budget_min)} – {fmtMoney(c.budget_max)}
                  </p>
                  <div className="mt-1 flex justify-end">
                    {appliedCampIds.has(c.camp_id) ? <StatusPill status="pending" /> : null}
                  </div>
                </div>
              </div>

              <p className="mt-4 text-sm leading-relaxed text-muted-foreground">{c.brief}</p>

              {/* Deliverables and Niches */}
              <div className="mt-4 flex flex-wrap gap-1.5">
                {c.deliverables.map((d, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1 rounded-full border border-border bg-background px-3 py-1 text-[11px] font-medium text-muted-foreground"
                  >
                    <CheckCircle2 className="h-3 w-3 text-primary" />
                    {d}
                  </span>
                ))}
                {c.niches.map((n) => (
                  <span
                    key={n}
                    className="rounded-full bg-primary/10 px-3 py-1 text-[11px] font-semibold text-primary"
                  >
                    {n}
                  </span>
                ))}
              </div>

              {/* Commercial Terms */}
              {c.company?.commercial_terms?.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5 border-t border-border/50 pt-2.5">
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground self-center mr-1">Terms:</span>
                  {c.company.commercial_terms.map((term) => (
                    <span
                      key={term}
                      className="rounded-full border border-border bg-card px-2 py-0.5 text-[10px] font-medium text-muted-foreground"
                    >
                      {term}
                    </span>
                  ))}
                </div>
              )}

              <div className="mt-5 flex items-center justify-between border-t border-border/50 pt-4">
                <span className="text-xs text-muted-foreground">Deadline: {fmtDate(c.deadline)}</span>
                {appliedCampIds.has(c.camp_id) ? (
                  <Button variant="secondary" size="sm" className="rounded-full" disabled data-testid={`applied-button-${c.camp_id}`}>
                    <Check className="mr-1 h-3.5 w-3.5" /> Applied
                  </Button>
                ) : (
                  <Button size="sm" className="rounded-full px-5" onClick={() => setApplyFor(c)} data-testid={`apply-button-${c.camp_id}`}>
                    Apply for Brief
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Apply Dialog */}
      <Dialog open={!!applyFor} onOpenChange={(o) => !o && setApplyFor(null)}>
        <DialogContent data-testid="apply-dialog">
          <DialogHeader>
            <DialogTitle>Apply — {applyFor?.title}</DialogTitle>
          </DialogHeader>
          <Textarea
            placeholder="Why are you a fit for this campaign? Mention relevant past deliverables and metrics…"
            rows={4}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            data-testid="apply-message-input"
          />
          <DialogFooter>
            <Button
              className="rounded-full"
              onClick={apply}
              disabled={busy}
              data-testid="apply-submit-button"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Send Application"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
