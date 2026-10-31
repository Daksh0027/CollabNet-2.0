import { useEffect, useMemo, useState } from "react";
import { useInfiniteQuery, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import {
  Bookmark, Check, Loader2, MessageSquare, Search, Sparkles, Users, SlidersHorizontal,
  X, RotateCcw, TrendingUp, Eye, Star, Layers, ShieldCheck, DollarSign,
  Building2, Video, CheckCircle2, ChevronDown, ExternalLink, Briefcase,
  Pin, FolderGit2, BookOpen, Hash, Tag
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import CreatorFiltersDrawer from "./CreatorFiltersDrawer";

export const NICHES = [
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

export const GENRE_COLORS = {
  "Tech & Gadgets": "bg-blue-500",
  "Beauty & Skincare": "bg-pink-500",
  "Health & Fitness": "bg-emerald-500",
  "Food & Cooking": "bg-amber-500",
  "Gaming": "bg-purple-500",
  "Travel": "bg-cyan-500",
  "Finance & Business": "bg-teal-500",
  "Lifestyle": "bg-rose-500",
  "Wellness": "bg-lime-500",
};

export const CONTENT_TYPES = [
  "Short-Form Video",
  "Dedicated Long-Form Video",
  "Integrated Segment",
  "Live Stream Placement",
  "Podcast Episode / Audio Read",
  "Carousel / Thought Leadership",
  "UGC Ad Production"
];

export const PLATFORMS = ["YouTube", "Instagram", "TikTok", "Twitch"];

const SORT_OPTIONS = [
  { value: "followers", label: "Top Followers" },
  { value: "views", label: "Highest Avg Views" },
  { value: "engagement", label: "Highest Engagement %" },
  { value: "connections", label: "Most Connections" },
  { value: "rating", label: "Highest Rated" },
];
const CREATOR_PAGE_SIZE = 50;

function threadIdFor(a, b) {
  return [a, b].sort().join("::");
}

function selectedFilterValues(value) {
  return value === "all" ? [] : value.split(",").filter(Boolean);
}

function toggleFilterValue(current, value) {
  const values = selectedFilterValues(current);
  const next = values.includes(value)
    ? values.filter((item) => item !== value)
    : [...values, value];
  return next.length ? next.join(",") : "all";
}

function filterSelectValue(value) {
  const values = selectedFilterValues(value);
  if (!values.length) return "all";
  return values.length === 1 ? values[0] : "multiple";
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

  // Search & filter state
  const [search, setSearch] = useState("");
  const [niche, setNiche] = useState("all");
  const [platform, setPlatform] = useState("all");
  const [contentType, setContentType] = useState("all");
  const [location, setLocation] = useState("");
  const [tag, setTag] = useState("");
  const [sortBy, setSortBy] = useState("followers");
  const [minF, setMinF] = useState(0);
  const [maxF, setMaxF] = useState(0);
  const [minViews, setMinViews] = useState(0);
  const [maxViews, setMaxViews] = useState(0);
  const [minEngagement, setMinEngagement] = useState(0);
  const [maxEngagement, setMaxEngagement] = useState(0);
  const [minConnections, setMinConnections] = useState(0);

  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [connecting, setConnecting] = useState("");
  const [detailId, setDetailId] = useState(null);
  const [modalProjectTagFilter, setModalProjectTagFilter] = useState("all");
  const [modalProjectSearch, setModalProjectSearch] = useState("");

  const filterState = useMemo(
    () => ({
      search,
      niche,
      platform,
      contentType,
      location,
      tag,
      minF,
      maxF,
      minViews,
      maxViews,
      minEngagement,
      maxEngagement,
      minConnections,
      sortBy,
    }),
    [
      search, niche, platform, contentType, location, tag, minF, maxF,
      minViews, maxViews, minEngagement, maxEngagement, minConnections, sortBy,
    ]
  );
  const [queryFilters, setQueryFilters] = useState(filterState);

  useEffect(() => {
    const timeout = setTimeout(() => setQueryFilters(filterState), 300);
    return () => clearTimeout(timeout);
  }, [filterState]);

  const activeFilterChips = useMemo(() => {
    const chips = [];
    const addRange = (key, label, min, max, suffix = "") => {
      if (!min && !max) return;
      const format = (value) => {
        if (!value) return "Any";
        return suffix === "%" ? `${value}%` : fmtNum(value);
      };
      chips.push({ key, label: `${label}: ${format(min)} – ${format(max)}` });
    };

    if (search.trim()) chips.push({ key: "search", label: `Search: ${search.trim()}` });
    if (location.trim()) chips.push({ key: "location", label: `Location: ${location.trim()}` });
    if (tag.trim()) chips.push({ key: "tag", label: `Project tag: ${tag.trim()}` });
    selectedFilterValues(niche).forEach((value) => chips.push({ key: "niche", value, label: value }));
    selectedFilterValues(platform).forEach((value) => chips.push({ key: "platform", value, label: value }));
    selectedFilterValues(contentType).forEach((value) => chips.push({ key: "contentType", value, label: value }));
    addRange("followers", "Followers", minF, maxF);
    addRange("views", "Average views", minViews, maxViews);
    addRange("engagement", "Engagement", minEngagement, maxEngagement, "%");
    if (minConnections > 0) {
      chips.push({ key: "connections", label: `Connections: ${fmtNum(minConnections)}+` });
    }
    return chips;
  }, [
    search, location, tag, niche, platform, contentType, minF, maxF, minViews,
    maxViews, minEngagement, maxEngagement, minConnections,
  ]);
  const activeFiltersCount = activeFilterChips.length;

  const resetFilters = () => {
    setSearch("");
    setNiche("all");
    setPlatform("all");
    setContentType("all");
    setLocation("");
    setTag("");
    setMinF(0);
    setMaxF(0);
    setMinViews(0);
    setMaxViews(0);
    setMinEngagement(0);
    setMaxEngagement(0);
    setMinConnections(0);
    setSortBy("followers");
  };

  const {
    data: creatorPages,
    isLoading,
    isFetching,
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: [
      "creators",
      queryFilters.search.trim(),
      queryFilters.niche,
      queryFilters.platform,
      queryFilters.contentType,
      queryFilters.minF ? String(queryFilters.minF) : "",
      queryFilters.maxF ? String(queryFilters.maxF) : "",
      queryFilters.minViews ? String(queryFilters.minViews) : "",
      queryFilters.minEngagement ? String(queryFilters.minEngagement) : "",
      queryFilters.minConnections ? String(queryFilters.minConnections) : "",
      queryFilters.sortBy,
      queryFilters.maxViews ? String(queryFilters.maxViews) : "",
      queryFilters.maxEngagement ? String(queryFilters.maxEngagement) : "",
      queryFilters.location.trim(),
      queryFilters.tag.trim(),
    ],
    initialPageParam: 0,
    queryFn: async ({ signal, pageParam }) =>
      (
        await api.get("/creators", {
          params: {
            search: queryFilters.search.trim(),
            niche: queryFilters.niche === "all" ? "" : queryFilters.niche,
            platform: queryFilters.platform === "all" ? "" : queryFilters.platform,
            content_type: queryFilters.contentType === "all" ? "" : queryFilters.contentType,
            location: queryFilters.location.trim(),
            tag: queryFilters.tag.trim(),
            min_followers: queryFilters.minF,
            max_followers: queryFilters.maxF,
            min_views: queryFilters.minViews,
            max_views: queryFilters.maxViews,
            min_engagement: queryFilters.minEngagement,
            max_engagement: queryFilters.maxEngagement,
            min_connections: queryFilters.minConnections,
            sort_by: queryFilters.sortBy,
            offset: pageParam,
            limit: CREATOR_PAGE_SIZE,
          },
          signal,
        })
      ).data,
    getNextPageParam: (lastPage, pages) => (
      lastPage.length === CREATOR_PAGE_SIZE
        ? pages.length * CREATOR_PAGE_SIZE
        : undefined
    ),
  });
  const creators = useMemo(
    () => creatorPages?.pages.flatMap((page) => page) || [],
    [creatorPages]
  );

  const updateFilterField = (field, value) => {
    const setters = {
      location: setLocation,
      tag: setTag,
      minF: setMinF,
      maxF: setMaxF,
      minViews: setMinViews,
      maxViews: setMaxViews,
      minEngagement: setMinEngagement,
      maxEngagement: setMaxEngagement,
      minConnections: setMinConnections,
    };
    setters[field]?.(value);
  };

  const toggleMultiFilter = (field, value) => {
    const setters = {
      niche: setNiche,
      platform: setPlatform,
      contentType: setContentType,
    };
    setters[field]?.((current) => toggleFilterValue(current, value));
  };

  const removeFilterChip = (chip) => {
    if (chip.key === "search") setSearch("");
    else if (chip.key === "location") setLocation("");
    else if (chip.key === "tag") setTag("");
    else if (chip.key === "niche") toggleMultiFilter("niche", chip.value);
    else if (chip.key === "platform") toggleMultiFilter("platform", chip.value);
    else if (chip.key === "contentType") toggleMultiFilter("contentType", chip.value);
    else if (chip.key === "followers") {
      setMinF(0);
      setMaxF(0);
    } else if (chip.key === "views") {
      setMinViews(0);
      setMaxViews(0);
    } else if (chip.key === "engagement") {
      setMinEngagement(0);
      setMaxEngagement(0);
    } else if (chip.key === "connections") setMinConnections(0);
  };

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
        sub="Discover verified creators by niche, platform, performance, location, and portfolio signals."
      />

      {/* Main Filter Toolbar & Genre Presets */}
      <div className="space-y-3.5 rounded-2xl border border-border bg-card p-4 shadow-xs" data-testid="creator-filters">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-56 flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Search creators, niches, locations, or project tags…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              data-testid="creator-search-input"
            />
          </div>

          <Select
            value={filterSelectValue(niche)}
            onValueChange={(value) => value !== "multiple" && setNiche(value)}
          >
            <SelectTrigger className="w-44" data-testid="niche-filter-select">
              <SelectValue placeholder="All Niches" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Niches</SelectItem>
              {selectedFilterValues(niche).length > 1 && (
                <SelectItem value="multiple" disabled>Multiple selected</SelectItem>
              )}
              {NICHES.map((n) => (
                <SelectItem key={n} value={n}>
                  {n}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={filterSelectValue(contentType)}
            onValueChange={(value) => value !== "multiple" && setContentType(value)}
          >
            <SelectTrigger className="w-44" data-testid="content-type-filter-select">
              <SelectValue placeholder="All Deliverables" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Deliverables</SelectItem>
              {selectedFilterValues(contentType).length > 1 && (
                <SelectItem value="multiple" disabled>Multiple selected</SelectItem>
              )}
              {CONTENT_TYPES.map((type) => (
                <SelectItem key={type} value={type}>
                  {type}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={filterSelectValue(platform)}
            onValueChange={(value) => value !== "multiple" && setPlatform(value)}
          >
            <SelectTrigger className="w-36" data-testid="platform-filter-select">
              <SelectValue placeholder="All Platforms" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Platforms</SelectItem>
              {selectedFilterValues(platform).length > 1 && (
                <SelectItem value="multiple" disabled>Multiple selected</SelectItem>
              )}
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
            onClick={() => setShowAdvancedFilters(true)}
            data-testid="filter-toggle-button"
          >
            <SlidersHorizontal className="h-3.5 w-3.5" />
            <span>More filters</span>
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
              onClick={() => toggleMultiFilter("niche", n)}
              className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium transition-all ${
                selectedFilterValues(niche).includes(n)
                  ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                  : "border border-border bg-background text-muted-foreground hover:border-primary/40"
              }`}
            >
              {n}
            </button>
          ))}
        </div>
      </div>

      {activeFilterChips.length > 0 && (
        <div className="mt-3 flex flex-wrap items-center gap-2" data-testid="active-filter-chips">
          {activeFilterChips.map((chip) => (
            <button
              key={`${chip.key}:${chip.value || ""}`}
              type="button"
              onClick={() => removeFilterChip(chip)}
              aria-label={`Remove filter ${chip.label}`}
              className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-border bg-card px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground"
              data-testid="active-filter-chip"
            >
              <span className="truncate">{chip.label}</span>
              <X className="h-3 w-3 shrink-0" />
            </button>
          ))}
          <Button
            variant="ghost"
            size="sm"
            onClick={resetFilters}
            className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
            data-testid="clear-all-filters-button"
          >
            Clear all
          </Button>
        </div>
      )}

      <CreatorFiltersDrawer
        isOpen={showAdvancedFilters}
        onOpenChange={setShowAdvancedFilters}
        filters={filterState}
        options={{
          niches: NICHES,
          platforms: PLATFORMS,
          contentTypes: CONTENT_TYPES,
        }}
        onFieldChange={updateFilterField}
        onMultiToggle={toggleMultiFilter}
        onReset={resetFilters}
      />

      <div className="mt-5 flex items-center justify-between text-xs text-muted-foreground" aria-live="polite">
        <span data-testid="creator-results-count">
          {creators?.length || 0} matching creator{creators?.length === 1 ? "" : "s"} shown
        </span>
        <span className="flex items-center gap-3">
          {isFetching && <span role="status">Updating results…</span>}
          {activeFiltersCount > 0 && (
            <span>{activeFiltersCount} active filter{activeFiltersCount === 1 ? "" : "s"}</span>
          )}
        </span>
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
            body="Try widening a numeric range, lowering a minimum threshold, or selecting All Genres."
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

                  {/* GitHub-Style Featured Projects Snippet */}
                  {c.projects?.length > 0 && (
                    <div className="mt-2.5 rounded-xl border border-border/70 bg-background/50 p-2.5 text-xs">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="inline-flex items-center gap-1.5 font-semibold text-foreground">
                          <FolderGit2 className="h-3.5 w-3.5 text-primary" />
                          {c.projects.filter((p) => p.pinned).length || c.projects.length} featured project{c.projects.length > 1 ? "s" : ""}
                        </span>
                        {c.projects.some((p) => p.pinned) && (
                          <span className="inline-flex items-center gap-0.5 text-[10px] text-amber-500 font-medium">
                            <Pin className="h-2.5 w-2.5 fill-current" /> Pinned
                          </span>
                        )}
                      </div>

                      {/* Top Pinned Project Title & Tags */}
                      {c.projects[0] && (
                        <div className="mt-1.5 pt-1.5 border-t border-border/40">
                          <p className="line-clamp-1 text-[11px]">
                            <span className="font-semibold text-foreground hover:text-primary transition-colors cursor-pointer" onClick={() => setDetailId(c.user_id)}>
                              {c.projects[0].title}
                            </span>
                            <span className="text-muted-foreground"> · {c.projects[0].bio || c.projects[0].description}</span>
                          </p>
                          {c.projects[0].tags?.length > 0 && (
                            <div className="mt-1 flex flex-wrap gap-1">
                              {c.projects[0].tags.slice(0, 3).map((tag) => (
                                <span
                                  key={tag}
                                  className="font-mono text-[9px] text-primary bg-primary/10 px-1.5 py-0.5 rounded-full"
                                >
                                  #{tag}
                                </span>
                              ))}
                              {c.projects[0].tags.length > 3 && (
                                <span className="text-[9px] text-muted-foreground self-center">
                                  +{c.projects[0].tags.length - 3}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Card Footer */}
                <div className="mt-5 flex items-center justify-between border-t border-border/60 pt-3">
                  <div className="flex items-center gap-1.5">
                    <span className="inline-flex items-center rounded-full bg-muted/60 px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
                      Custom Deal Proposal
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
      {hasNextPage && (
        <div className="mt-6 flex justify-center">
          <Button
            variant="outline"
            onClick={() => fetchNextPage()}
            disabled={isFetchingNextPage}
            data-testid="load-more-creators-button"
          >
            {isFetchingNextPage ? "Loading creators…" : "Load more creators"}
          </Button>
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

                {/* GitHub-Style Featured Projects & Pinned Showcases */}
                {detail.creator?.projects?.length > 0 && (() => {
                  const projects = detail.creator.projects;
                  const availableTags = Array.from(new Set(projects.flatMap((p) => p.tags || [])));
                  const filteredProjects = projects.filter((p) => {
                    if (modalProjectTagFilter !== "all" && !(p.tags || []).includes(modalProjectTagFilter)) {
                      return false;
                    }
                    if (modalProjectSearch.trim()) {
                      const q = modalProjectSearch.toLowerCase();
                      const matchText = (
                        p.title +
                        " " +
                        (p.bio || p.description || "") +
                        " " +
                        (p.genre || "") +
                        " " +
                        (p.brand || "") +
                        " " +
                        (p.tags || []).join(" ")
                      ).toLowerCase();
                      if (!matchText.includes(q)) return false;
                    }
                    return true;
                  });

                  return (
                    <div className="space-y-3" data-testid="modal-projects-section">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border/60 pb-2">
                        <div className="flex items-center gap-2">
                          <FolderGit2 className="h-4 w-4 text-primary" />
                          <h4 className="font-display text-sm font-bold text-foreground">
                            Projects & Pinned Repositories ({projects.length})
                          </h4>
                        </div>
                        {/* Modal Project Search */}
                        <div className="relative w-full sm:w-48">
                          <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-muted-foreground" />
                          <Input
                            placeholder="Find a project…"
                            value={modalProjectSearch}
                            onChange={(e) => setModalProjectSearch(e.target.value)}
                            className="h-7 pl-7 text-[11px] rounded-full"
                            data-testid="modal-project-search"
                          />
                        </div>
                      </div>

                      {/* Topic Tags Bar inside Modal */}
                      {availableTags.length > 0 && (
                        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-[11px]">
                          <span className="eyebrow shrink-0 text-[10px] mr-1">Topics:</span>
                          <button
                            type="button"
                            onClick={() => setModalProjectTagFilter("all")}
                            className={`shrink-0 rounded-full px-2.5 py-0.5 font-medium transition-all ${
                              modalProjectTagFilter === "all"
                                ? "bg-primary text-primary-foreground font-semibold"
                                : "border border-border bg-background text-muted-foreground hover:border-primary/40"
                            }`}
                          >
                            All ({projects.length})
                          </button>
                          {availableTags.map((tag) => {
                            const count = projects.filter((p) => (p.tags || []).includes(tag)).length;
                            return (
                              <button
                                key={tag}
                                type="button"
                                onClick={() => setModalProjectTagFilter(modalProjectTagFilter === tag ? "all" : tag)}
                                className={`shrink-0 rounded-full px-2.5 py-0.5 font-mono text-[10px] transition-all ${
                                  modalProjectTagFilter === tag
                                    ? "bg-secondary text-secondary-foreground font-semibold ring-1 ring-primary/50"
                                    : "border border-border bg-background text-muted-foreground hover:border-primary/40"
                                }`}
                              >
                                #{tag} ({count})
                              </button>
                            );
                          })}
                        </div>
                      )}

                      {/* GitHub Pinned Repository Cards Grid */}
                      {!filteredProjects.length ? (
                        <p className="text-xs text-muted-foreground py-4 text-center">
                          No projects match topic "#{modalProjectTagFilter}"
                        </p>
                      ) : (
                        <div className="grid gap-3.5 sm:grid-cols-2">
                          {filteredProjects.map((p) => {
                            const genreColor = GENRE_COLORS[p.genre] || "bg-primary";
                            const isPinned = p.pinned ?? true;
                            return (
                              <div
                                key={p.project_id}
                                className="flex flex-col justify-between rounded-xl border border-border bg-card p-3.5 text-xs shadow-xs transition-colors hover:border-primary/50"
                                data-testid={`modal-project-card-${p.project_id}`}
                              >
                                <div>
                                  {/* Media Thumbnail */}
                                  <div className="relative h-32 w-full overflow-hidden rounded-lg bg-muted mb-2.5 border border-border/60">
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

                                  {/* Title & Brand */}
                                  <div className="flex items-start justify-between gap-1.5">
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                      <BookOpen className="h-3.5 w-3.5 text-primary shrink-0" />
                                      <h5 className="font-bold text-sm text-foreground hover:text-primary transition-colors">
                                        {p.title}
                                      </h5>
                                    </div>
                                    {isPinned && (
                                      <span className="shrink-0 inline-flex items-center gap-0.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold text-amber-500 dark:text-amber-400">
                                        <Pin className="h-2.5 w-2.5 fill-current" /> Pinned
                                      </span>
                                    )}
                                  </div>

                                  {p.brand && (
                                    <p className="text-primary font-medium text-xs mt-0.5">{p.brand}</p>
                                  )}

                                  {/* Bio / Description */}
                                  <p className="mt-2 line-clamp-2 text-muted-foreground text-[11px] leading-relaxed">
                                    {p.bio || p.description}
                                  </p>

                                  {/* Topics / Tags */}
                                  {p.tags?.length > 0 && (
                                    <div className="mt-2 flex flex-wrap gap-1">
                                      {p.tags.map((t) => (
                                        <span
                                          key={t}
                                          className="rounded-full bg-secondary/80 px-2 py-0.5 text-[10px] font-mono text-secondary-foreground"
                                        >
                                          #{t}
                                        </span>
                                      ))}
                                    </div>
                                  )}
                                </div>

                                {/* Footer: Genre Dot + Metrics + Live Link */}
                                <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-border/50 pt-2 text-[11px]">
                                  <div className="flex items-center gap-2.5">
                                    <span className="inline-flex items-center gap-1.5 font-medium text-foreground">
                                      <span className={`h-2.5 w-2.5 rounded-full ${genreColor}`} />
                                      {p.genre || "General"}
                                    </span>
                                    {p.metrics && (
                                      <span className="inline-flex items-center gap-1 font-semibold text-primary">
                                        <Sparkles className="h-3 w-3" />
                                        {p.metrics}
                                      </span>
                                    )}
                                  </div>

                                  {p.link && (
                                    <a
                                      href={p.link}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="inline-flex items-center gap-1 font-semibold text-primary hover:underline"
                                    >
                                      Live Collab <ExternalLink className="h-3 w-3" />
                                    </a>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })()}

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

                {/* Supported Content Formats */}
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
  const navigate = useNavigate();

  const [search, setSearch] = useState("");
  const [niche, setNiche] = useState("all");
  const [deliverable, setDeliverable] = useState("all");
  const [opportunityTab, setOpportunityTab] = useState("all");
  const [applyFor, setApplyFor] = useState(null);
  const [detailFor, setDetailFor] = useState(null);
  const [message, setMessage] = useState("");
  const [reviewApplication, setReviewApplication] = useState(false);
  const [busy, setBusy] = useState(false);

  const { data: campaigns, isLoading, isError } = useQuery({
    queryKey: ["campaigns", search, niche, deliverable, opportunityTab],
    queryFn: async () =>
      (
        await api.get("/campaigns", {
          params: {
            search,
            niche: niche === "all" ? "" : niche,
            content_type: deliverable === "all" ? "" : deliverable,
            recommended: opportunityTab === "recommended" ? 1 : 0,
            limit: 200,
          },
        })
      ).data,
  });

  const { data: apps } = useQuery({
    queryKey: ["applications"],
    queryFn: async () => (await api.get("/applications")).data,
  });
  const { data: savedOpportunities = [] } = useQuery({
    queryKey: ["saved-opportunities"],
    queryFn: async () => (await api.get("/saved-opportunities")).data,
  });

  const appliedCampIds = useMemo(
    () => new Set((apps || []).filter((a) => a.type === "application" && ["pending", "accepted"].includes(a.status)).map((a) => a.camp_id)),
    [apps]
  );
  const applicationByCampaign = useMemo(
    () => new Map((apps || []).filter((application) => application.type === "application").map((application) => [application.camp_id, application])),
    [apps]
  );
  const savedIds = useMemo(
    () => new Set(savedOpportunities.map((opportunity) => opportunity.camp_id)),
    [savedOpportunities]
  );
  const visibleCampaigns = useMemo(
    () => opportunityTab === "saved"
      ? (campaigns || []).filter((campaign) => savedIds.has(campaign.camp_id))
      : campaigns || [],
    [campaigns, opportunityTab, savedIds]
  );

  const apply = async () => {
    if (!applyFor) return;
    setBusy(true);
    try {
      await api.post(`/campaigns/${applyFor.camp_id}/apply`, { message });
      toast.success("Application sent");
      setApplyFor(null);
      setMessage("");
      setReviewApplication(false);
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
  };

  const toggleSaved = async (campaign) => {
    try {
      if (savedIds.has(campaign.camp_id)) {
        await api.delete(`/saved-opportunities/${campaign.camp_id}`);
        toast.success("Opportunity removed from saved");
      } else {
        await api.post("/saved-opportunities", { camp_id: campaign.camp_id });
        toast.success("Opportunity saved");
      }
      await qc.invalidateQueries({ queryKey: ["saved-opportunities"] });
    } catch (error) {
      toast.error(error?.response?.data?.detail || "Could not update saved opportunities");
    }
  };
  const filterChips = [
    ...(search.trim() ? [{ key: "search", label: `Search: ${search.trim()}` }] : []),
    ...(niche !== "all" ? [{ key: "niche", label: niche }] : []),
    ...(deliverable !== "all" ? [{ key: "deliverable", label: deliverable }] : []),
  ];

  return (
    <div data-testid="explore-campaigns-page">
      <PageHead
        title="Explore"
        sub="Discover sponsorship opportunities from verified brands that match your audience."
        action={
          <Button type="button" variant="outline" onClick={() => navigate("/app/campaigns")} data-testid="my-applications-shortcut">
            My applications
          </Button>
        }
      />

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

          {(niche !== "all" || deliverable !== "all" || search) && (
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
        {filterChips.length ? (
          <div className="flex flex-wrap gap-2" data-testid="campaign-filter-chips">
            {filterChips.map((chip) => (
              <button
                type="button"
                key={chip.key}
                onClick={() => {
                  if (chip.key === "search") setSearch("");
                  if (chip.key === "niche") setNiche("all");
                  if (chip.key === "deliverable") setDeliverable("all");
                }}
                aria-label={`Remove ${chip.label} filter`}
                className="inline-flex items-center gap-1 rounded-full border border-border px-2.5 py-1 text-xs text-muted-foreground hover:text-foreground"
              >
                {chip.label}<X className="h-3 w-3" />
              </button>
            ))}
          </div>
        ) : null}
      </div>

      <Tabs value={opportunityTab} onValueChange={setOpportunityTab} className="mb-5">
        <TabsList className="flex h-auto flex-wrap justify-start gap-1 rounded-2xl p-1" data-testid="opportunity-tabs">
          <TabsTrigger value="all" data-testid="opportunities-all-tab">All opportunities</TabsTrigger>
          <TabsTrigger value="recommended" data-testid="opportunities-recommended-tab">For you</TabsTrigger>
          <TabsTrigger value="saved" data-testid="opportunities-saved-tab">Saved</TabsTrigger>
        </TabsList>
      </Tabs>

      {isLoading ? (
        <div className="py-24 text-center text-sm text-muted-foreground" data-testid="campaigns-loading">
          Loading campaigns…
        </div>
      ) : isError ? (
        <EmptyState
          icon={Search}
          title="Could not load opportunities"
          body="Please retry or adjust your search."
          testId="campaigns-error"
        />
      ) : !visibleCampaigns.length ? (
        <EmptyState
          icon={Search}
          title={opportunityTab === "saved" ? "No saved opportunities match" : "No open opportunities match"}
          body={opportunityTab === "recommended"
            ? "No currently open opportunities match your profile niche. Try All opportunities or adjust your filters."
            : "Try clearing a filter or broadening your search."}
          testId="campaigns-empty"
        />
      ) : (
        <div className="grid gap-4" data-testid="campaigns-feed">
          {visibleCampaigns.map((c) => (
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
                      <span>· apply by {fmtDate(c.deadline)}</span>
                    </div>

                    <div className="mt-1.5 flex items-center gap-3 text-[11px] text-muted-foreground">
                      <span className="inline-flex items-center gap-1 font-medium text-foreground">
                        <Users className="h-3 w-3 text-primary" />
                        {c.company?.connections_count || 0} connections
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-2">
                  <span className="inline-flex items-center rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-semibold text-primary">
                    Sponsorship opportunity
                  </span>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    aria-label={savedIds.has(c.camp_id) ? `Unsave ${c.title}` : `Save ${c.title}`}
                    onClick={() => toggleSaved(c)}
                    data-testid={`save-opportunity-${c.camp_id}`}
                  >
                    <Bookmark className={`h-4 w-4 ${savedIds.has(c.camp_id) ? "fill-current text-primary" : ""}`} />
                  </Button>
                </div>
                <div className="text-right">
                  <div className="mt-1 flex justify-end">
                    {appliedCampIds.has(c.camp_id) ? <StatusPill status={applicationByCampaign.get(c.camp_id)?.status} /> : null}
                  </div>
                </div>
              </div>

              <p className="mt-4 line-clamp-3 text-sm leading-relaxed text-muted-foreground">{c.brief}</p>

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

              <div className="mt-5 flex items-center justify-between border-t border-border/50 pt-4">
                <span className="text-xs text-muted-foreground">Deadline: {fmtDate(c.deadline)}</span>
                <div className="flex gap-2">
                  <Button type="button" variant="outline" size="sm" onClick={() => setDetailFor(c)} data-testid={`details-button-${c.camp_id}`}>
                    View details
                  </Button>
                  {appliedCampIds.has(c.camp_id) ? (
                    <Button variant="secondary" size="sm" className="rounded-full" disabled data-testid={`applied-button-${c.camp_id}`}>
                      <Check className="mr-1 h-3.5 w-3.5" /> Applied
                    </Button>
                  ) : (
                    <Button size="sm" className="rounded-full px-5" onClick={() => { setApplyFor(c); setReviewApplication(false); }} data-testid={`apply-button-${c.camp_id}`}>
                      Apply
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Apply Dialog */}
      <Dialog open={!!applyFor} onOpenChange={(o) => !o && setApplyFor(null)}>
        <DialogContent data-testid="apply-dialog">
          <DialogHeader>
            <DialogTitle>{reviewApplication ? "Review your application" : `Apply — ${applyFor?.title}`}</DialogTitle>
          </DialogHeader>
          {reviewApplication ? (
            <div className="space-y-3 rounded-xl border border-border bg-secondary/30 p-4 text-sm">
              <p><span className="font-semibold">Campaign:</span> {applyFor?.title}</p>
              <p><span className="font-semibold">Brand:</span> {applyFor?.company?.display_name}</p>
              <p className="whitespace-pre-wrap text-muted-foreground">{message || "No application message added."}</p>
              <p className="text-xs text-muted-foreground">Compensation details are shared directly during the campaign process.</p>
            </div>
          ) : (
            <Textarea
              placeholder="Why are you a fit for this campaign? Mention relevant past work and platform metrics…"
              rows={4}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              data-testid="apply-message-input"
            />
          )}
          <DialogFooter>
            {reviewApplication ? (
              <>
                <Button type="button" variant="outline" onClick={() => setReviewApplication(false)}>Back</Button>
                <Button className="rounded-full" onClick={apply} disabled={busy} data-testid="apply-submit-button">
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Submit application"}
                </Button>
              </>
            ) : (
              <Button type="button" className="rounded-full" onClick={() => setReviewApplication(true)} data-testid="review-application-button">
                Review application
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(detailFor)} onOpenChange={(open) => !open && setDetailFor(null)}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl" data-testid="opportunity-details-dialog">
          <DialogHeader><DialogTitle>{detailFor?.title}</DialogTitle></DialogHeader>
          {detailFor ? (
            <div className="space-y-5">
              <div className="flex items-center gap-3">
                <UserAvatar user={detailFor.company} className="h-12 w-12 rounded-xl" />
                <div>
                  <p className="font-semibold">{detailFor.company?.display_name}</p>
                  <p className="text-xs text-muted-foreground">{detailFor.company?.industry || "Brand"} · Apply by {fmtDate(detailFor.deadline)}</p>
                </div>
              </div>
              <p className="whitespace-pre-wrap text-sm leading-6 text-muted-foreground">{detailFor.brief}</p>
              <div>
                <h3 className="mb-2 text-sm font-semibold">Deliverables</h3>
                <ul className="list-inside list-disc space-y-1 text-sm text-muted-foreground">
                  {(detailFor.deliverables || []).map((deliverable, index) => <li key={`${deliverable}-${index}`}>{deliverable}</li>)}
                </ul>
              </div>
              <div className="flex flex-wrap gap-2">
                {(detailFor.niches || []).map((value) => <span key={value} className="rounded-full bg-primary/10 px-2.5 py-1 text-xs text-primary">{value}</span>)}
              </div>
              <p className="text-xs text-muted-foreground">Compensation details are handled directly with the brand.</p>
            </div>
          ) : null}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDetailFor(null)}>Close</Button>
            {detailFor && !appliedCampIds.has(detailFor.camp_id) ? (
              <Button type="button" onClick={() => { setApplyFor(detailFor); setDetailFor(null); setReviewApplication(false); }}>Apply</Button>
            ) : null}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
