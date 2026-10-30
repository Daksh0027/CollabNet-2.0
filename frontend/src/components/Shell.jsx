import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  LayoutDashboard, Compass, Bell, MessagesSquare, Megaphone,
  FileSignature, CalendarDays, CircleUserRound, LogOut, Menu,
} from "lucide-react";
import api from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { UserAvatar } from "@/components/common";
import ThemeToggle from "@/components/ThemeToggle";
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
  { to: "/app/account", label: "Account", icon: CircleUserRound },
];

export default function Shell() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const isFullBleed = location.pathname.startsWith("/app/messages");
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

  const renderBadge = (badgeType) => {
    if (badgeType === "notifications" && notif?.unread > 0) {
      return (
        <span
          className="font-num rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-bold text-primary-foreground"
          data-testid="nav-notification-badge"
        >
          {notif.unread}
        </span>
      );
    }
    if (badgeType === "messages" && unreadChatsCount > 0) {
      return (
        <span
          className="font-num flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-bold text-primary-foreground shadow-xs"
          data-testid="nav-messages-badge"
        >
          {unreadChatsCount}
        </span>
      );
    }
    return null;
  };

  const navItems = (
    <div className="flex-1 space-y-1 px-3" data-testid="sidebar-nav">
      {NAV.map(({ to, label, icon: Icon, badgeType }) => (
        <NavLink
          key={to}
          to={to}
          className={({ isActive }) =>
            `group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors ${
              isActive
                ? "bg-primary/10 text-foreground font-semibold"
                : "text-muted-foreground hover:bg-secondary hover:text-foreground"
            }`
          }
          data-testid={`nav-${label.toLowerCase().replace(/[^a-z]+/g, "-")}`}
        >
          {({ isActive }) => (
            <>
              <span className={`absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-full bg-primary transition-opacity ${isActive ? "opacity-100" : "opacity-0"}`} />
              <Icon className={`h-4 w-4 ${isActive ? "text-primary" : ""}`} />
              <span className="flex-1">{label}</span>
              {renderBadge(badgeType)}
            </>
          )}
        </NavLink>
      ))}
    </div>
  );

  return (
    <div className="min-h-screen lg:flex">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r border-border bg-card/60 backdrop-blur-sm lg:flex" data-testid="sidebar">
        <div className="flex items-center gap-2 px-5 py-6">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary font-display text-sm font-bold text-primary-foreground">C</div>
          <span className="font-display text-sm font-semibold tracking-wide">CollaboNet</span>
        </div>
        {navItems}
        <div className="border-t border-border p-4">
          <div className="mb-2 flex items-center justify-between px-2">
            <span className="eyebrow">Appearance</span>
            <ThemeToggle />
          </div>
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
      </aside>

      <header className="sticky top-0 z-20 flex items-center justify-between border-b border-border bg-background/85 px-4 py-3 backdrop-blur lg:hidden" data-testid="mobile-header">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary font-display text-xs font-bold text-primary-foreground">C</div>
          <span className="font-display text-xs font-semibold tracking-wide">CollaboNet</span>
        </div>
        <div className="flex items-center gap-1">
          <ThemeToggle />
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
        className={`min-w-0 flex-1 lg:ml-60 ${
          isFullBleed
            ? "h-[calc(100dvh-57px)] lg:h-screen overflow-hidden p-0"
            : "px-5 py-6 lg:px-10 lg:py-8"
        }`}
        data-testid="app-main"
      >
        <div className={isFullBleed ? "h-full w-full" : "mx-auto max-w-6xl rise"}>
          <Outlet />
        </div>
      </main>
    </div>
  );
}
