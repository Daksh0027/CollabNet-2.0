import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { STATUS_STYLES } from "@/lib/api";

export function UserAvatar({ user, className = "h-9 w-9" }) {
  const initials = (user?.display_name || user?.name || "?")
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  return (
    <Avatar className={className}>
      {user?.picture ? <AvatarImage src={user.picture} alt={initials} /> : null}
      <AvatarFallback className="bg-primary text-primary-foreground font-semibold text-xs">
        {initials}
      </AvatarFallback>
    </Avatar>
  );
}

export function StatusPill({ status }) {
  const cls = STATUS_STYLES[status] || "bg-neutral-500/15 text-neutral-300 border-neutral-500/30";
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold tracking-wide ${cls}`} data-testid={`status-pill-${status}`}>
      {String(status).replace("_", " ")}
    </span>
  );
}

export function StatTile({ label, value, sub, icon: Icon, testId }) {
  return (
    <div className="rounded-3xl border border-border bg-card p-6" data-testid={testId}>
      <div className="flex items-center justify-between">
        <span className="eyebrow">{label}</span>
        {Icon ? <Icon className="h-4 w-4 text-primary" /> : null}
      </div>
      <div className="font-num mt-3 text-3xl font-semibold tracking-tight" data-testid={testId ? `${testId}-value` : undefined}>
        {value}
      </div>
      {sub ? <div className="mt-1 text-xs text-muted-foreground">{sub}</div> : null}
    </div>
  );
}

export function VerifiedBadge({ show }) {
  if (!show) return null;
  return (
    <Badge className="bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/15" data-testid="verified-badge">
      verified
    </Badge>
  );
}

export function EmptyState({ icon: Icon, title, body, testId }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card/40 px-6 py-14 text-center" data-testid={testId}>
      {Icon ? <Icon className="mb-3 h-8 w-8 text-muted-foreground" /> : null}
      <p className="text-base font-semibold text-foreground">{title}</p>
      {body ? <p className="mt-1 max-w-sm text-xs text-muted-foreground">{body}</p> : null}
    </div>
  );
}

export function SectionTitle({ children, action }) {
  return (
    <div className="mb-4 flex items-center justify-between">
      <h2 className="text-lg font-semibold tracking-tight text-foreground">{children}</h2>
      {action}
    </div>
  );
}

export function PageHead({ title, sub, action }) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl" data-testid="page-title">{title}</h1>
        {sub ? <p className="mt-2 text-sm leading-6 text-muted-foreground">{sub}</p> : null}
      </div>
      {action}
    </div>
  );
}
