import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, FileSignature, Handshake, Heart, MessageSquare, Megaphone, Sparkles } from "lucide-react";
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

export default function Notifications() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { data } = useQuery({
    queryKey: ["notifications"],
    queryFn: async () => (await api.get("/notifications")).data,
  });

  useEffect(() => {
    api.post("/notifications/read").then(() => qc.invalidateQueries({ queryKey: ["notifications"] })).catch(() => {});
  }, [qc]);

  const items = data?.notifications || [];

  return (
    <div data-testid="notifications-page">
      <PageHead title="Notifications" sub="Requests, replies, contracts and ratings." />
      {!items.length ? (
        <EmptyState icon={Bell} title="All caught up" body="Platform activity will appear here." testId="notifications-empty" />
      ) : (
        <div className="space-y-2" data-testid="notifications-list">
          {items.map((n) => {
            const Icon = ICONS[n.type] || Bell;
            return (
              <button
                key={n.notif_id}
                onClick={() => n.link && navigate(n.link)}
                className="flex w-full items-start gap-4 rounded-2xl border border-border bg-card p-4 text-left transition-colors hover:border-primary/40"
                data-testid={`notification-${n.notif_id}`}
              >
                <div className={`rounded-full p-2 ${n.read ? "bg-secondary" : "bg-primary/10"}`}>
                  <Icon className={`h-4 w-4 ${n.read ? "text-muted-foreground" : "text-primary"}`} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold">{n.title}</p>
                  {n.body ? <p className="mt-0.5 text-xs text-muted-foreground">{n.body}</p> : null}
                </div>
                <span className="text-xs text-muted-foreground">{timeAgo(n.created_at)}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
