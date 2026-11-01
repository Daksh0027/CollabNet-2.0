import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, CheckCheck } from "lucide-react";
import { toast } from "sonner";
import api, { timeAgo } from "@/lib/api";
import { ICONS, markNotificationsRead } from "@/pages/Notifications";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [markingAll, setMarkingAll] = useState(false);
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ["notifications-widget"],
    queryFn: async () =>
      (await api.get("/notifications", { params: { offset: 0, limit: 50 } }))
        .data,
    refetchInterval: 30000,
  });
  const items = data?.notifications || [];
  const unread = data?.unread || 0;

  const markAllRead = async () => {
    setMarkingAll(true);
    try {
      await api.post("/notifications/read");
      ["notifications-widget", "notifications"].forEach((key) =>
        qc.setQueriesData({ queryKey: [key] }, markNotificationsRead),
      );
      toast.success("All notifications marked as read");
    } catch (error) {
      toast.error(
        error?.response?.data?.detail ||
          "Could not mark notifications as read.",
      );
    } finally {
      setMarkingAll(false);
    }
  };

  const handleItemClick = async (notification) => {
    if (notification.link) {
      setOpen(false);
      navigate(notification.link);
    }
    if (notification.read) return;
    qc.setQueryData(["notifications-widget"], (cached) =>
      cached
        ? {
            ...cached,
            notifications: cached.notifications.map((item) =>
              item.notif_id === notification.notif_id
                ? { ...item, read: true }
                : item,
            ),
            unread: Math.max(0, (cached.unread || 0) - 1),
          }
        : cached,
    );
    try {
      await api.post(`/notifications/${notification.notif_id}/read`);
      qc.invalidateQueries({ queryKey: ["notifications"] });
    } catch {
      qc.invalidateQueries({ queryKey: ["notifications-widget"] });
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="relative rounded-lg p-2 hover:bg-secondary"
          aria-label={
            unread ? `Notifications, ${unread} unread` : "Notifications"
          }
          data-testid="notification-bell-button"
        >
          <Bell className="h-4 w-4" />
          {unread > 0 ? (
            <span
              className="font-num absolute -right-0.5 -top-0.5 rounded-full bg-primary px-1 text-[9px] font-bold text-primary-foreground"
              data-testid="notification-bell-badge"
            >
              {unread > 99 ? "99+" : unread}
            </span>
          ) : null}
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className="w-[360px] p-0"
        data-testid="notification-widget"
      >
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold">Notifications</p>
            {unread > 0 ? (
              <span
                className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary"
                data-testid="notification-widget-unread"
              >
                {unread} unread
              </span>
            ) : null}
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 gap-1.5 px-2 text-xs"
            disabled={markingAll || !unread}
            onClick={markAllRead}
            data-testid="notification-mark-all-read"
          >
            <CheckCheck className="h-3.5 w-3.5" /> Mark all read
          </Button>
        </div>
        <div className="max-h-96 overflow-y-auto" data-testid="notification-widget-list">
          {!items.length ? (
            <p className="px-4 py-10 text-center text-sm text-muted-foreground">
              All caught up — platform activity will appear here.
            </p>
          ) : (
            items.map((n) => {
              const Icon = ICONS[n.type] || Bell;
              return (
                <button
                  key={n.notif_id}
                  type="button"
                  onClick={() => handleItemClick(n)}
                  className={`flex w-full items-start gap-3 border-b border-border/60 px-4 py-3 text-left transition-colors last:border-b-0 hover:bg-secondary ${
                    n.read ? "" : "bg-primary/[0.04]"
                  }`}
                  data-testid={`notification-widget-item-${n.notif_id}`}
                  aria-label={`${n.title}${n.read ? "" : ", unread"}`}
                >
                  <div
                    className={`rounded-full p-2 shrink-0 ${
                      n.read ? "bg-secondary" : "bg-primary/10"
                    }`}
                  >
                    <Icon
                      className={`h-3.5 w-3.5 ${
                        n.read ? "text-muted-foreground" : "text-primary"
                      }`}
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-semibold text-foreground">
                      {n.title}
                    </p>
                    {n.body ? (
                      <p className="mt-0.5 line-clamp-1 text-[11px] text-muted-foreground">
                        {n.body}
                      </p>
                    ) : null}
                    <p className="mt-1 text-[10px] text-muted-foreground">
                      {timeAgo(n.created_at)}
                    </p>
                  </div>
                  {!n.read ? (
                    <span
                      className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary"
                      aria-hidden
                    />
                  ) : null}
                </button>
              );
            })
          )}
        </div>
        <div className="border-t border-border px-4 py-2">
          <button
            type="button"
            className="w-full rounded-lg py-1.5 text-center text-xs font-medium text-primary hover:bg-secondary"
            onClick={() => {
              setOpen(false);
              navigate("/app/notifications");
            }}
            data-testid="notification-widget-view-all"
          >
            View all notifications
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
