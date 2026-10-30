import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Bell,
  Building2,
  FileSignature,
  Handshake,
  Heart,
  Layers,
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
  { id: "all", label: "All", icon: Layers },
  { id: "creators", label: "Creators", icon: Users },
  { id: "companies", label: "Companies", icon: Building2 },
];

export default function Notifications() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [activeCategory, setActiveCategory] = useState("all");

  const { data, isLoading } = useQuery({
    queryKey: ["notifications", activeCategory],
    queryFn: async () => {
      const params =
        activeCategory === "all"
          ? {}
          : { origin: activeCategory };
      return (await api.get("/notifications", { params })).data;
    },
  });

  useEffect(() => {
    api
      .post("/notifications/read")
      .then(() => qc.invalidateQueries({ queryKey: ["notifications"] }))
      .catch(() => toast.error("Could not mark notifications as read."));
  }, [qc]);

  const items = data?.notifications || [];

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
        className="mb-6 flex flex-wrap items-center gap-2"
        data-testid="notification-filters"
      >
        {CATEGORIES.map((cat) => {
          const Icon = cat.icon;
          const isSelected = activeCategory === cat.id;
          const count = data?.counts ? data.counts[cat.id] : undefined;

          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => setActiveCategory(cat.id)}
              className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold transition-all duration-150 cursor-pointer ${
                isSelected
                  ? "bg-primary text-primary-foreground shadow-sm shadow-primary/20"
                  : "bg-card border border-border text-muted-foreground hover:bg-secondary hover:text-foreground"
              }`}
              data-testid={`filter-${cat.id}`}
              aria-pressed={isSelected}
            >
              <Icon
                className={`h-3.5 w-3.5 ${
                  isSelected ? "text-primary-foreground" : "text-muted-foreground"
                }`}
              />
              <span>{cat.label}</span>
              {typeof count === "number" ? (
                <span
                  className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold leading-none ${
                    isSelected
                      ? "bg-primary-foreground/20 text-primary-foreground"
                      : "bg-secondary text-muted-foreground"
                  }`}
                  data-testid={`filter-count-${cat.id}`}
                >
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
                onClick={() => n.link && navigate(n.link)}
                className="group flex w-full items-start gap-4 rounded-2xl border border-border bg-card p-4 text-left transition-colors hover:border-primary/40"
                data-testid={`notification-${n.notif_id}`}
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
    </div>
  );
}
