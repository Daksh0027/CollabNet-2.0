import { useMemo, useState } from "react";
import { useInfiniteQuery, useQuery, useQueryClient } from "@tanstack/react-query";
import { Navigate } from "react-router-dom";
import { Bookmark, Loader2, MapPin, Search, UserRoundPlus, Users, X } from "lucide-react";
import { toast } from "sonner";
import api, { fmtNum } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { EmptyState, PageHead, UserAvatar, VerifiedBadge } from "@/components/common";
import CreatorFiltersDrawer from "./CreatorFiltersDrawer";
import { NICHES, PLATFORMS, CONTENT_TYPES } from "./Explore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const PAGE_SIZE = 24;

function platformSummary(platforms = []) {
  return platforms
    .map((platform) => `${platform.platform} ${fmtNum(platform.followers || 0)}`)
    .join(" · ");
}

function CreatorCard({ creator, relationship, saved, onSave, onView, onRequest, onRespond, busy }) {
  return (
    <article
      className="flex h-full flex-col rounded-2xl border border-border bg-card p-5 shadow-xs"
      data-testid={`collaborator-card-${creator.user_id}`}
    >
      <div className="flex items-start gap-3">
        <UserAvatar user={creator} className="h-11 w-11 rounded-xl" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <h2 className="truncate text-sm font-semibold">{creator.display_name}</h2>
            <VerifiedBadge show={creator.verified} />
          </div>
          {creator.location ? (
            <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
              <MapPin className="h-3 w-3" /> {creator.location}
            </p>
          ) : null}
        </div>
        <Button
          type="button"
          size="icon"
          variant="ghost"
          aria-label={saved ? `Remove ${creator.display_name} from saved creators` : `Save ${creator.display_name}`}
          onClick={() => onSave(creator)}
          data-testid={`save-collaborator-${creator.user_id}`}
        >
          <Bookmark className={`h-4 w-4 ${saved ? "fill-current text-primary" : ""}`} />
        </Button>
      </div>

      <div className="mt-4 flex flex-wrap gap-1.5">
        {[creator.niche, ...(creator.sub_niches || [])].filter(Boolean).map((niche) => (
          <span key={niche} className="rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-medium text-primary">
            {niche}
          </span>
        ))}
      </div>

      <p className="mt-3 line-clamp-3 min-h-12 text-xs leading-5 text-muted-foreground">
        {creator.bio || "This creator hasn't added a bio yet."}
      </p>
      <p className="mt-3 min-h-4 text-[11px] text-muted-foreground">
        {platformSummary(creator.platforms) || "Social channels not listed"}
      </p>

      <div className="mt-auto flex flex-wrap gap-2 border-t border-border pt-4">
        <Button type="button" variant="outline" size="sm" onClick={() => onView(creator.user_id)}>
          View profile
        </Button>
        {relationship?.status === "pending" && relationship.direction === "outgoing" ? (
          <Button type="button" size="sm" variant="secondary" disabled>
            Request sent
          </Button>
        ) : relationship?.status === "pending" && relationship.direction === "incoming" ? (
          <>
            <Button type="button" size="sm" disabled={busy} onClick={() => onRespond(relationship.request_id, "accept")}>
              Accept
            </Button>
            <Button type="button" size="sm" variant="secondary" disabled={busy} onClick={() => onRespond(relationship.request_id, "reject")}>
              Decline
            </Button>
          </>
        ) : relationship?.status === "accepted" ? (
          <Button type="button" size="sm" variant="secondary" disabled>
            Connected
          </Button>
        ) : (
          <Button type="button" size="sm" onClick={() => onRequest(creator)} data-testid={`request-collaboration-${creator.user_id}`}>
            Collaborate
          </Button>
        )}
      </div>
    </article>
  );
}

function RequestCard({ request, direction, onAction, busy }) {
  const other = direction === "received" ? request.sender : request.receiver;
  return (
    <article className="rounded-2xl border border-border bg-card p-4" data-testid={`collaboration-request-${request.request_id}`}>
      <div className="flex flex-wrap items-start gap-3">
        <UserAvatar user={other} />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">{request.title}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {direction === "received" ? "From" : "To"} {other?.display_name || "Creator"}
            {request.collaboration_type ? ` · ${request.collaboration_type}` : ""}
          </p>
          {request.message ? <p className="mt-3 whitespace-pre-wrap text-sm">{request.message}</p> : null}
          {request.proposed_idea ? <p className="mt-2 whitespace-pre-wrap text-xs text-muted-foreground">{request.proposed_idea}</p> : null}
          <p className="mt-2 text-xs capitalize text-muted-foreground">Status: {request.status}</p>
        </div>
        {request.status === "pending" ? (
          direction === "received" ? (
            <div className="flex gap-2">
              <Button size="sm" disabled={busy} onClick={() => onAction(request.request_id, "accept")}>Accept</Button>
              <Button size="sm" variant="secondary" disabled={busy} onClick={() => onAction(request.request_id, "reject")}>Decline</Button>
            </div>
          ) : (
            <Button size="sm" variant="secondary" disabled={busy} onClick={() => onAction(request.request_id, "withdraw")}>Withdraw</Button>
          )
        ) : null}
      </div>
    </article>
  );
}

export default function Collaborators() {
  const { user } = useAuth();
  if (user?.role !== "creator") return <Navigate to="/app/explore" replace />;
  return <CollaboratorsContent />;
}

function CollaboratorsContent() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("discover");
  const [search, setSearch] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [profileId, setProfileId] = useState("");
  const [requestFor, setRequestFor] = useState(null);
  const [busy, setBusy] = useState(false);
  const [filters, setFilters] = useState({
    search: "",
    niche: "all",
    platform: "all",
    contentType: "all",
    location: "",
    tag: "",
    minF: 0,
    maxF: 0,
    minViews: 0,
    maxViews: 0,
    minEngagement: 0,
    maxEngagement: 0,
    minConnections: 0,
    sortBy: "followers",
  });
  const [requestForm, setRequestForm] = useState({
    title: "",
    collaboration_type: "",
    message: "",
    proposed_idea: "",
    platform: "",
    deliverables: "",
    preferred_dates: "",
    location: "",
  });

  const creatorQuery = useInfiniteQuery({
    queryKey: ["collaborators", filters],
    initialPageParam: 0,
    queryFn: async ({ pageParam, signal }) => (
      await api.get("/creators", {
        signal,
        params: {
          search: filters.search.trim(),
          niche: filters.niche === "all" ? "" : filters.niche,
          platform: filters.platform === "all" ? "" : filters.platform,
          content_type: filters.contentType === "all" ? "" : filters.contentType,
          location: filters.location.trim(),
          tag: filters.tag.trim(),
          min_followers: filters.minF,
          max_followers: filters.maxF,
          min_views: filters.minViews,
          max_views: filters.maxViews,
          min_engagement: filters.minEngagement,
          max_engagement: filters.maxEngagement,
          min_connections: filters.minConnections,
          sort_by: filters.sortBy,
          offset: pageParam,
          limit: PAGE_SIZE,
        },
      })
    ).data,
    getNextPageParam: (lastPage, pages) => (
      lastPage.length === PAGE_SIZE ? pages.length * PAGE_SIZE : undefined
    ),
    enabled: activeTab === "discover" || activeTab === "saved",
  });
  const { data: savedCreators = [] } = useQuery({
    queryKey: ["saved-creators"],
    queryFn: async () => (await api.get("/saved-creators")).data,
  });
  const { data: connections = [] } = useQuery({
    queryKey: ["my-creator-connections"],
    queryFn: async () => (await api.get("/my-connections")).data,
  });
  const { data: collaborations = [] } = useQuery({
    queryKey: ["my-collaborations"],
    queryFn: async () => (await api.get("/collaborations")).data,
  });
  const { data: requests = [] } = useQuery({
    queryKey: ["collaboration-requests"],
    queryFn: async () => (await api.get("/collaboration-requests")).data,
  });
  const { data: profile } = useQuery({
    queryKey: ["user", profileId],
    queryFn: async () => (await api.get(`/users/${profileId}`)).data,
    enabled: Boolean(profileId),
  });

  const allCreators = useMemo(
    () => creatorQuery.data?.pages.flat() || [],
    [creatorQuery.data]
  );
  const savedIds = useMemo(
    () => new Set(savedCreators.map((saved) => saved.creator_id)),
    [savedCreators]
  );
  const connectionMap = useMemo(() => {
    const map = new Map();
    connections.forEach((connection) => {
      if (connection.other?.user_id) {
        map.set(connection.other.user_id, { ...connection, status: "accepted" });
      }
    });
    requests.forEach((request) => {
      const direction = request.sender_creator_id === user.user_id ? "outgoing" : "incoming";
      const otherId = direction === "outgoing" ? request.receiver_creator_id : request.sender_creator_id;
      const previous = map.get(otherId);
      if (!previous || (request.status === "pending" && previous.status !== "accepted")) {
        map.set(otherId, { ...request, direction });
      }
    });
    return map;
  }, [connections, requests, user.user_id]);

  const visibleCreators = useMemo(() => {
    if (activeTab !== "saved") return allCreators;
    return allCreators.filter((creator) => savedIds.has(creator.user_id));
  }, [activeTab, allCreators, savedIds]);

  const updateFilter = (field, value) => {
    const fields = {
      location: "location",
      tag: "tag",
      minF: "minF",
      maxF: "maxF",
      minViews: "minViews",
      maxViews: "maxViews",
      minEngagement: "minEngagement",
      maxEngagement: "maxEngagement",
      minConnections: "minConnections",
    };
    if (fields[field]) setFilters((current) => ({ ...current, [fields[field]]: value }));
  };
  const toggleMulti = (field, value) => {
    setFilters((current) => {
      const selected = current[field] === "all" ? [] : current[field].split(",").filter(Boolean);
      const next = selected.includes(value)
        ? selected.filter((item) => item !== value)
        : [...selected, value];
      return { ...current, [field]: next.length ? next.join(",") : "all" };
    });
  };
  const resetFilters = () => {
    setSearch("");
    setFilters({
      search: "",
      niche: "all",
      platform: "all",
      contentType: "all",
      location: "",
      tag: "",
      minF: 0,
      maxF: 0,
      minViews: 0,
      maxViews: 0,
      minEngagement: 0,
      maxEngagement: 0,
      minConnections: 0,
      sortBy: "followers",
    });
  };
  const activeFiltersCount = [
    search.trim(),
    filters.location.trim(),
    filters.tag.trim(),
    ...["niche", "platform", "contentType"].flatMap((key) => (
      filters[key] === "all" ? [] : filters[key].split(",")
    )),
    filters.minF,
    filters.maxF,
    filters.minViews,
    filters.maxViews,
    filters.minEngagement,
    filters.maxEngagement,
    filters.minConnections,
  ].filter(Boolean).length;
  const clearFilter = (field) => {
    if (field === "search") setSearch("");
    else if (["niche", "platform", "contentType"].includes(field)) {
      setFilters((current) => ({ ...current, [field]: "all" }));
    } else updateFilter(field, typeof filters[field] === "number" ? 0 : "");
  };
  const filterChips = [
    ...(search.trim() ? [{ field: "search", label: `Search: ${search.trim()}` }] : []),
    ...(filters.location ? [{ field: "location", label: `Location: ${filters.location}` }] : []),
    ...(filters.tag ? [{ field: "tag", label: `Tag: ${filters.tag}` }] : []),
    ...["niche", "platform", "contentType"].flatMap((field) => (
      filters[field] === "all"
        ? []
        : filters[field].split(",").map((label) => ({ field, label }))
    )),
  ];

  const saveCreator = async (creator) => {
    try {
      if (savedIds.has(creator.user_id)) {
        await api.delete(`/saved-creators/${creator.user_id}`);
        toast.success("Removed from saved creators");
      } else {
        await api.post("/saved-creators", { creator_id: creator.user_id });
        toast.success("Creator saved");
      }
      await queryClient.invalidateQueries({ queryKey: ["saved-creators"] });
    } catch (error) {
      toast.error(error?.response?.data?.detail || "Could not update saved creators");
    }
  };
  const sendRequest = async () => {
    if (!requestFor || !requestForm.title.trim()) {
      toast.error("Add a title for your collaboration request");
      return;
    }
    setBusy(true);
    try {
      await api.post("/collaboration-requests", {
        to_id: requestFor.user_id,
        ...requestForm,
        title: requestForm.title.trim(),
        deliverables: requestForm.deliverables.split("\n").map((value) => value.trim()).filter(Boolean),
      });
      toast.success("Collaboration request sent");
      setRequestFor(null);
      setRequestForm({
        title: "",
        collaboration_type: "",
        message: "",
        proposed_idea: "",
        platform: "",
        deliverables: "",
        preferred_dates: "",
        location: "",
      });
      await queryClient.invalidateQueries({ queryKey: ["collaboration-requests"] });
    } catch (error) {
      toast.error(error?.response?.data?.detail || "Could not send request");
    } finally {
      setBusy(false);
    }
  };
  const respondToRequest = async (requestId, action) => {
    setBusy(true);
    try {
      await api.post(`/collaboration-requests/${requestId}/${action}`);
      toast.success(action === "accept" ? "Collaboration accepted" : action === "reject" ? "Request declined" : "Request withdrawn");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["collaboration-requests"] }),
        queryClient.invalidateQueries({ queryKey: ["my-creator-connections"] }),
        queryClient.invalidateQueries({ queryKey: ["my-collaborations"] }),
      ]);
    } catch (error) {
      toast.error(error?.response?.data?.detail || "Could not update request");
    } finally {
      setBusy(false);
    }
  };

  const requestItems = (direction) => requests.filter((request) => (
    direction === "received"
      ? request.receiver_creator_id === user.user_id
      : request.sender_creator_id === user.user_id
  ));
  const connectionsContent = connections.map((connection) => connection.other).filter(Boolean);

  return (
    <div data-testid="collaborators-page">
      <PageHead
        title="Collaborators"
        sub="Find creators, build connections, and create something together."
      />

      <div className="space-y-4 rounded-2xl border border-border bg-card p-4 shadow-xs">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-56 flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Search creators, niches, locations, or portfolio tags…"
              value={search}
              onChange={(event) => {
                const value = event.target.value;
                setSearch(value);
                setFilters((current) => ({ ...current, search: value }));
              }}
              data-testid="collaborator-search"
            />
          </div>
          <Button
            type="button"
            variant={activeFiltersCount ? "default" : "outline"}
            onClick={() => setFiltersOpen(true)}
            data-testid="collaborator-filter-toggle"
          >
            Filters{activeFiltersCount ? ` (${activeFiltersCount})` : ""}
          </Button>
          {activeFiltersCount ? (
            <Button type="button" variant="ghost" onClick={resetFilters} data-testid="collaborator-clear-filters">
              Clear all
            </Button>
          ) : null}
        </div>
        {filterChips.length ? (
          <div className="flex flex-wrap gap-2" data-testid="collaborator-filter-chips">
            {filterChips.map((chip, index) => (
              <button
                type="button"
                key={`${chip.field}-${chip.label}-${index}`}
                onClick={() => clearFilter(chip.field)}
                className="inline-flex items-center gap-1 rounded-full border border-border px-2.5 py-1 text-xs text-muted-foreground hover:text-foreground"
                aria-label={`Remove ${chip.label} filter`}
              >
                {chip.label}<X className="h-3 w-3" />
              </button>
            ))}
          </div>
        ) : null}
      </div>

      <CreatorFiltersDrawer
        isOpen={filtersOpen}
        onOpenChange={setFiltersOpen}
        filters={filters}
        options={{ niches: NICHES, platforms: PLATFORMS, contentTypes: CONTENT_TYPES }}
        onFieldChange={updateFilter}
        onMultiToggle={toggleMulti}
        onReset={resetFilters}
      />

      <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-6">
        <TabsList className="h-auto flex-wrap justify-start gap-1 rounded-2xl p-1" data-testid="collaborator-tabs">
          <TabsTrigger value="discover">Discover</TabsTrigger>
          <TabsTrigger value="saved">Saved</TabsTrigger>
          <TabsTrigger value="connections">My connections</TabsTrigger>
          <TabsTrigger value="active">Active collaborations</TabsTrigger>
          <TabsTrigger value="received">Received requests</TabsTrigger>
          <TabsTrigger value="sent">Sent requests</TabsTrigger>
        </TabsList>

        <TabsContent value="discover" className="mt-5">
          <div className="mb-3 text-xs text-muted-foreground" aria-live="polite">
            {creatorQuery.isLoading ? "Finding creators…" : `${allCreators.length} collaborators shown`}
          </div>
          {creatorQuery.isLoading ? (
            <div className="py-16 text-center text-sm text-muted-foreground"><Loader2 className="mx-auto mb-2 h-5 w-5 animate-spin" />Loading creators…</div>
          ) : creatorQuery.isError ? (
            <EmptyState icon={Users} title="Could not load creators" body="Please retry your search." testId="collaborators-error" />
          ) : !allCreators.length ? (
            <EmptyState icon={Users} title="No creators match these filters" body="Try clearing a filter or broadening your search." testId="collaborators-empty" />
          ) : (
            <>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {allCreators.map((creator) => (
                  <CreatorCard
                    key={creator.user_id}
                    creator={creator}
                    relationship={connectionMap.get(creator.user_id)}
                    saved={savedIds.has(creator.user_id)}
                    onSave={saveCreator}
                    onView={setProfileId}
                    onRequest={setRequestFor}
                    onRespond={respondToRequest}
                    busy={busy}
                  />
                ))}
              </div>
              {creatorQuery.hasNextPage ? (
                <div className="mt-5 text-center">
                  <Button type="button" variant="outline" disabled={creatorQuery.isFetchingNextPage} onClick={() => creatorQuery.fetchNextPage()}>
                    {creatorQuery.isFetchingNextPage ? "Loading…" : "Load more creators"}
                  </Button>
                </div>
              ) : null}
            </>
          )}
        </TabsContent>

        <TabsContent value="saved" className="mt-5">
          {creatorQuery.isLoading ? (
            <div className="py-16 text-center text-sm text-muted-foreground">Loading saved creators…</div>
          ) : !visibleCreators.length ? (
            <EmptyState icon={Bookmark} title="No saved creators match" body="Save a creator from Discover, or adjust the current filters." testId="saved-creators-empty" />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {visibleCreators.map((creator) => (
                <CreatorCard key={creator.user_id} creator={creator} relationship={connectionMap.get(creator.user_id)} saved onSave={saveCreator} onView={setProfileId} onRequest={setRequestFor} onRespond={respondToRequest} busy={busy} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="connections" className="mt-5">
          {!connectionsContent.length ? (
            <EmptyState icon={Users} title="No creator connections yet" body="Accept a collaboration request to connect and open a chat." testId="creator-connections-empty" />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {connectionsContent.map((creator) => (
                <CreatorCard key={creator.user_id} creator={creator} relationship={{ status: "accepted" }} saved={savedIds.has(creator.user_id)} onSave={saveCreator} onView={setProfileId} onRequest={setRequestFor} onRespond={respondToRequest} busy={busy} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="active" className="mt-5">
          {!collaborations.length ? (
            <EmptyState icon={Users} title="No active collaborations" body="Accept a collaboration request to start a shared project." testId="active-collaborations-empty" />
          ) : (
            <div className="grid gap-3">
              {collaborations.map((collaboration) => (
                <article key={collaboration.collaboration_id} className="rounded-2xl border border-border bg-card p-4" data-testid={`active-collaboration-${collaboration.collaboration_id}`}>
                  <div className="flex items-start gap-3">
                    <UserAvatar user={collaboration.other} />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold">{collaboration.title}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        With {collaboration.other?.display_name || "creator"}
                        {collaboration.collaboration_type ? ` · ${collaboration.collaboration_type}` : ""}
                        {collaboration.platform ? ` · ${collaboration.platform}` : ""}
                      </p>
                      {collaboration.deliverables?.length ? (
                        <ul className="mt-2 list-inside list-disc text-xs text-muted-foreground">
                          {collaboration.deliverables.map((item, index) => <li key={`${item}-${index}`}>{item}</li>)}
                        </ul>
                      ) : null}
                    </div>
                    <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs capitalize text-primary">{collaboration.status}</span>
                  </div>
                </article>
              ))}
            </div>
          )}
        </TabsContent>

        {["received", "sent"].map((direction) => {
          const items = requestItems(direction);
          return (
            <TabsContent key={direction} value={direction} className="mt-5">
              {!items.length ? (
                <EmptyState icon={UserRoundPlus} title={direction === "received" ? "No collaboration requests received" : "No collaboration requests sent"} body="Requests and their status will appear here." testId={`collaboration-${direction}-empty`} />
              ) : (
                <div className="space-y-3">
                  {items.map((item) => (
                    <RequestCard key={item.request_id} request={item} direction={direction} onAction={respondToRequest} busy={busy} />
                  ))}
                </div>
              )}
            </TabsContent>
          );
        })}
      </Tabs>

      <Dialog open={Boolean(requestFor)} onOpenChange={(open) => !open && setRequestFor(null)}>
        <DialogContent className="max-w-xl" data-testid="collaboration-request-dialog">
          <DialogHeader>
            <DialogTitle>Collaborate with {requestFor?.display_name}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <Input placeholder="Request title" value={requestForm.title} onChange={(event) => setRequestForm({ ...requestForm, title: event.target.value })} data-testid="collaboration-title" />
            <Input placeholder="Collaboration type (e.g. joint Reel)" value={requestForm.collaboration_type} onChange={(event) => setRequestForm({ ...requestForm, collaboration_type: event.target.value })} />
            <Textarea placeholder="Message" rows={3} value={requestForm.message} onChange={(event) => setRequestForm({ ...requestForm, message: event.target.value })} />
            <Textarea placeholder="Proposed idea" rows={3} value={requestForm.proposed_idea} onChange={(event) => setRequestForm({ ...requestForm, proposed_idea: event.target.value })} />
            <div className="grid gap-3 sm:grid-cols-2">
              <Input placeholder="Platform" value={requestForm.platform} onChange={(event) => setRequestForm({ ...requestForm, platform: event.target.value })} />
              <Input placeholder="Preferred dates" value={requestForm.preferred_dates} onChange={(event) => setRequestForm({ ...requestForm, preferred_dates: event.target.value })} />
              <Input placeholder="Location or remote" value={requestForm.location} onChange={(event) => setRequestForm({ ...requestForm, location: event.target.value })} />
            </div>
            <Textarea placeholder="Expected deliverables (one per line)" rows={2} value={requestForm.deliverables} onChange={(event) => setRequestForm({ ...requestForm, deliverables: event.target.value })} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setRequestFor(null)}>Cancel</Button>
            <Button type="button" disabled={busy || !requestForm.title.trim()} onClick={sendRequest} data-testid="send-collaboration-request">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Send request"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(profileId)} onOpenChange={(open) => !open && setProfileId("")}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl" data-testid="collaborator-profile-dialog">
          <DialogHeader>
            <DialogTitle>{profile?.display_name || "Creator profile"}</DialogTitle>
          </DialogHeader>
          {profile ? (
            <div className="space-y-5">
              <div className="flex items-center gap-3">
                <UserAvatar user={profile} className="h-14 w-14 rounded-xl" />
                <div>
                  <p className="font-semibold">{profile.display_name}</p>
                  <p className="text-xs text-muted-foreground">{profile.creator?.location || "Location not listed"}</p>
                </div>
              </div>
              <p className="whitespace-pre-wrap text-sm text-muted-foreground">{profile.creator?.bio || "No bio provided."}</p>
              <div>
                <h3 className="mb-2 text-sm font-semibold">Platforms</h3>
                <div className="flex flex-wrap gap-2">
                  {(profile.creator?.platforms || []).map((platform) => (
                    <span key={`${platform.platform}-${platform.handle}`} className="rounded-lg border border-border px-3 py-2 text-xs">
                      {platform.platform}{platform.handle ? ` · ${platform.handle}` : ""}
                      {platform.followers ? ` · ${fmtNum(platform.followers)} followers` : ""}
                    </span>
                  ))}
                  {!profile.creator?.platforms?.length ? <span className="text-xs text-muted-foreground">No public platform details.</span> : null}
                </div>
              </div>
              <div>
                <h3 className="mb-2 text-sm font-semibold">Featured work</h3>
                <div className="grid gap-2 sm:grid-cols-2">
                  {(profile.creator?.projects || []).map((project) => (
                    <div key={project.project_id || project.title} className="rounded-xl border border-border p-3">
                      <p className="text-sm font-medium">{project.title}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{project.bio || project.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <p className="py-8 text-center text-sm text-muted-foreground">Loading profile…</p>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setProfileId("")}>Close</Button>
            {profile && connectionMap.get(profile.user_id)?.status !== "accepted" ? (
              <Button type="button" onClick={() => { setRequestFor(profile); setProfileId(""); }}>Collaborate</Button>
            ) : null}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
