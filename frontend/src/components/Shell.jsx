import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  LayoutDashboard, Compass, Bell, MessagesSquare, Megaphone, Columns3,
  FileSignature, CalendarDays, CircleUserRound, LogOut, Menu,
} from "lucide-react";
import api from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { UserAvatar } from "@/components/common";
import { DashboardSidebar } from "@/components/application/dashboard/dashboard-sidebar";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const NAV = [
  { to: "/app/overview", label: "Overview", icon: LayoutDashboard },
  { to: "/app/explore", label: "Explore", icon: Compass },
  { to: "/app/notifications", label: "Notifications", icon: Bell, badgeType: "notifications" },
  { to: "/app/messages", label: "Messages", icon: MessagesSquare, badgeType: "messages" },
  { to: "/app/campaigns", label: "Campaigns & Events", icon: Megaphone },
  { to: "/app/contracts", label: "Contracts", icon: FileSignature },
  { to: "/app/calendar", label: "Calendar", icon: CalendarDays },
  { to: "/app/project-board", label: "Project Board", icon: Columns3 },
  { to: "/app/account", label: "Account", icon: CircleUserRound },
];

export default function Shell() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const isFullBleed = location.pathname.startsWith("/app/messages");
  const isProjectBoard = location.pathname === "/app/project-board";
  const { data: notif } = useQuery({
    queryKey: ["notifications"],
    queryFn: async () => (await api.get("/notifications")).data,
    refetchInterval: 30000,
  });
  const { data: threads } = useQuery({
    queryKey: ["threads"],
    queryFn: async () => (await api.get("/threads")).data,
    refetchInterval: 20000,
  });

  const unreadChatsCount = threads?.filter((t) => (t.unread || 0) > 0).length || 0;
  const activeNav = NAV.find(({ to }) => (
    location.pathname === to || location.pathname.startsWith(`${to}/`)
  ));
  const sidebarItems = NAV.map(({ to, label, icon: Icon, badgeType }) => {
    const badge = badgeType === "notifications"
      ? notif?.unread
      : badgeType === "messages"
        ? unreadChatsCount
        : 0;
    return {
      key: to,
      label,
      icon: Icon,
      href: to,
      testId: `nav-${label.toLowerCase().replace(/[^a-z]+/g, "-")}`,
      ...(badge > 0 && {
        badge,
        badgeTestId: badgeType === "notifications"
          ? "nav-notification-badge"
          : "nav-messages-badge",
      }),
    };
  });

  return (
    <div className="min-h-screen lg:flex">
      <DashboardSidebar
        className="fixed inset-y-3 left-3 z-30 hidden h-[calc(100dvh-1.5rem)] lg:flex"
        items={sidebarItems}
        selected={activeNav?.to}
        headerContent={
          <div className="flex items-center gap-2 px-1">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary font-display text-sm font-bold text-primary-foreground">C</div>
            <span className="truncate font-display text-sm font-semibold tracking-wide">CollaboNet</span>
          </div>
        }
        footerContent={
          <div className="w-full border-t border-border pt-3">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left hover:bg-secondary" data-testid="sidebar-user-menu">
                  <UserAvatar user={user} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{user?.display_name}</p>
                    <p className="truncate text-xs capitalize text-muted-foreground">{user?.role === "company" ? "Company / Sponsor" : "Creator"}</p>
                  </div>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-52">
                <DropdownMenuItem onClick={() => navigate("/app/account")} data-testid="menu-account">Account settings</DropdownMenuItem>
                <DropdownMenuItem onClick={logout} className="text-red-600 dark:text-red-400" data-testid="menu-logout">
                  <LogOut className="mr-2 h-4 w-4" /> Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        }
      />

      <header className="sticky top-0 z-20 flex items-center justify-between border-b border-border bg-background/85 px-4 py-3 backdrop-blur lg:hidden" data-testid="mobile-header">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary font-display text-xs font-bold text-primary-foreground">C</div>
          <span className="font-display text-xs font-semibold tracking-wide">CollaboNet</span>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => navigate("/app/notifications")} className="relative rounded-lg p-2 hover:bg-secondary" data-testid="mobile-notifications-button">
            <Bell className="h-4 w-4" />
            {notif?.unread > 0 ? (
              <span className="font-num absolute -right-0.5 -top-0.5 rounded-full bg-primary px-1 text-[9px] font-bold text-primary-foreground">{notif.unread}</span>
            ) : null}
          </button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="rounded-lg p-2 hover:bg-secondary" data-testid="mobile-menu-button">
                <Menu className="h-5 w-5" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56" data-testid="mobile-menu-content">
              {NAV.map(({ to, label, icon: Icon }) => (
                <DropdownMenuItem key={to} onClick={() => navigate(to)} data-testid={`mobile-menu-${label.toLowerCase().replace(/[^a-z]+/g, "-")}`}>
                  <Icon className="mr-2 h-4 w-4" /> {label}
                </DropdownMenuItem>
              ))}
              <DropdownMenuItem onClick={logout} className="text-red-600 dark:text-red-400" data-testid="mobile-menu-logout">
                <LogOut className="mr-2 h-4 w-4" /> Log out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <main
        className={`min-w-0 flex-1 lg:ml-[284px] ${
          isFullBleed
            ? "h-[calc(100dvh-57px)] lg:h-screen overflow-hidden p-0"
            : isProjectBoard
              ? "px-4 py-5 sm:px-6 lg:px-6 lg:py-6"
              : "px-4 py-6 sm:px-6 lg:px-8 lg:py-8"
        }`}
        data-testid="app-main"
      >
        <div className={isFullBleed ? "h-full w-full" : isProjectBoard ? "w-full max-w-none rise" : "mx-auto max-w-6xl rise"}>
          <Outlet />
        </div>
      </main>
    </div>
  );
}
