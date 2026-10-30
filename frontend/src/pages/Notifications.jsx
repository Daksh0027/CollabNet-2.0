import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import {
  Bell,
  Building2,
  FileSignature,
  Handshake,
  Heart,
  MessageSquare,
  Megaphone,
  Sparkles,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import api, { timeAgo } from "@/lib/api";
import { PageHead, EmptyState } from "@/components/common";

const ICONS = {
  connection: Handshake,
  message: MessageSquare,
  application: FileSignature,
  invitation: Megaphone,
  contract: FileSignature,
  review: Heart,
  campaign: Megaphone,
  verification: Sparkles,
  dispute: FileSignature,
  system: Bell,
};

const CATEGORIES = [
  { id: "all", label: "All" },
  { id: "creators", label: "Creators" },
  { id: "companies", label: "Companies" },
];

export default function Notifications() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [activeCategory, setActiveCategory] = useState("all");

  const {
    data,
    isLoading,
    isError,
    refetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: ["notifications", activeCategory],
    queryFn: async ({ pageParam = 0 }) => {
      const params =
        activeCategory === "all"
          ? { offset: pageParam, limit: 50 }
          : { origin: activeCategory, offset: pageParam, limit: 50 };
      return (await api.get("/notifications", { params })).data;
    },
    getNextPageParam: (lastPage) =>
      lastPage.has_more ? lastPage.next_offset : undefined,
    initialPageParam: 0,
  });

  const items = data?.pages.flatMap((page) => page.notifications || []) || [];
  const counts = data?.pages[0]?.counts;

  const handleNotificationClick = async (notification) => {
    if (notification.link) navigate(notification.link);
    if (notification.read) return;

    qc.setQueriesData({ queryKey: ["notifications"] }, (cached) => {
      if (!cached?.pages) return cached;
      return {
        ...cached,
        pages: cached.pages.map((page) => {
          const wasUnread = page.notifications?.some(
            (item) => item.notif_id === notification.notif_id && !item.read
          );
          if (!wasUnread) return page;
          const unreadCategory =
            notification.origin === "creator"
              ? "creators"
              : notification.origin === "company"
                ? "companies"
                : null;
          return {
            ...page,
            notifications: page.notifications.map((item) =>
              item.notif_id === notification.notif_id ? { ...item, read: true } : item
            ),
            unread: Math.max(0, (page.unread || 0) - 1),
            unread_counts: page.unread_counts
              ? {
                  ...page.unread_counts,
                  all: Math.max(0, (page.unread_counts.all || 0) - 1),
                  ...(unreadCategory
                    ? {
                        [unreadCategory]: Math.max(
                          0,
                          (page.unread_counts[unreadCategory] || 0) - 1
                        ),
                      }
                    : {}),
                }
              : page.unread_counts,
          };
        }),
      };
    });

    try {
      await api.post(`/notifications/${notification.notif_id}/read`);
    } catch (error) {
      toast.error(error?.response?.data?.detail || "Could not mark notification as read.");
      qc.invalidateQueries({ queryKey: ["notifications"] });
    }
  };

  const handleLoadMore = async () => {
    try {
      await fetchNextPage({ throwOnError: true });
    } catch (error) {
      toast.error(error?.response?.data?.detail || "Could not load more notifications.");
    }
  };

  let emptyIcon = Bell;
  let emptyTitle = "All caught up";
  let emptyBody = "Platform activity will appear here.";

  if (activeCategory === "creators") {
    emptyIcon = Users;
    emptyTitle = "No creator notifications";
    emptyBody = "Messages, applications, and updates from creators will appear here.";
  } else if (activeCategory === "companies") {
    emptyIcon = Building2;
    emptyTitle = "No company notifications";
    emptyBody = "Inquiries, invitations, and contract updates from companies will appear here.";
  }

  return (
    <div data-testid="notifications-page">
      <PageHead
        title="Notifications"
        sub="Requests, replies, contracts and ratings."
      />

      {/* Origin category filters */}
      <div
        className="notification-filter-list mb-6"
        data-testid="notification-filters"
        role="group"
        aria-label="Filter notifications"
      >
        {CATEGORIES.map((cat) => {
          const isSelected = activeCategory === cat.id;
          const count = counts ? counts[cat.id] : undefined;

          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => setActiveCategory(cat.id)}
              className={`notification-filter-button${isSelected ? " is-active" : ""}`}
              data-testid={`filter-${cat.id}`}
              aria-pressed={isSelected}
            >
              <span>{cat.label}</span>
              {typeof count === "number" ? (
                <span className="notification-filter-count" data-testid={`filter-count-${cat.id}`}>
                  {count}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>

      {isLoading ? (
        <div className="py-20 text-center text-sm text-muted-foreground">
          Loading notifications…
        </div>
      ) : isError ? (
        <div className="py-20 text-center" data-testid="notifications-error">
          <p className="text-sm text-muted-foreground">Could not load notifications.</p>
          <button
            type="button"
            className="mt-3 rounded-full border border-border bg-card px-4 py-2 text-sm font-medium text-foreground hover:bg-secondary"
            onClick={() => refetch()}
            data-testid="retry-notifications"
          >
            Try again
          </button>
        </div>
      ) : !items.length ? (
        <EmptyState
          icon={emptyIcon}
          title={emptyTitle}
          body={emptyBody}
          testId="notifications-empty"
        />
      ) : (
        <div className="space-y-2" data-testid="notifications-list">
          {items.map((n) => {
            const Icon = ICONS[n.type] || Bell;
            return (
              <button
                key={n.notif_id}
                onClick={() => handleNotificationClick(n)}
                className="group flex w-full items-start gap-4 rounded-2xl border border-border bg-card p-4 text-left transition-colors hover:border-primary/40"
                data-testid={`notification-${n.notif_id}`}
                aria-label={`${n.title}${n.read ? "" : ", unread"}`}
              >
                <div
                  className={`rounded-full p-2 shrink-0 ${
                    n.read ? "bg-secondary" : "bg-primary/10"
                  }`}
                >
                  <Icon
                    className={`h-4 w-4 ${
                      n.read ? "text-muted-foreground" : "text-primary"
                    }`}
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold text-foreground">
                      {n.title}
                    </p>
                    {n.origin === "creator" ? (
                      <span
                        className="inline-flex items-center gap-1 rounded-full border border-primary/20 bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary"
                        data-testid="origin-badge-creator"
                      >
                        <Users className="h-2.5 w-2.5" /> Creator
                      </span>
                    ) : n.origin === "company" ? (
                      <span
                        className="inline-flex items-center gap-1 rounded-full border border-primary/20 bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary"
                        data-testid="origin-badge-company"
                      >
                        <Building2 className="h-2.5 w-2.5" /> Company
                      </span>
                    ) : null}
                  </div>
                  {n.body ? (
                    <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">
                      {n.body}
                    </p>
                  ) : null}
                </div>
                <div className="flex flex-col items-end gap-1.5 shrink-0">
                  <span className="text-xs text-muted-foreground">
                    {timeAgo(n.created_at)}
                  </span>
                  {!n.read ? (
                    <span
                      className="h-2 w-2 rounded-full bg-primary"
                      title="Unread"
                    />
                  ) : null}
                </div>
              </button>
            );
          })}
        </div>
      )}
      {!isLoading && items.length > 0 && hasNextPage ? (
        <div className="mt-5 flex justify-center">
          <button
            type="button"
            className="rounded-full border border-border bg-card px-5 py-2 text-sm font-medium text-foreground transition-colors hover:border-primary/40 hover:bg-secondary disabled:cursor-wait disabled:opacity-60"
            onClick={handleLoadMore}
            disabled={isFetchingNextPage}
            data-testid="load-more-notifications"
          >
            {isFetchingNextPage ? "Loading…" : "Load more"}
          </button>
        </div>
      ) : null}
    </div>
  );
}
