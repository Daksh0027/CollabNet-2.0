import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Users, FileSignature, Wallet, Handshake, Megaphone, ArrowRight, Check, X, Sparkles } from "lucide-react";
import { toast } from "sonner";
import api, { fmtMoney, timeAgo } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { PageHead, StatTile, UserAvatar, EmptyState, SectionTitle } from "@/components/common";
import { Button } from "@/components/ui/button";

const NEXT_LINKS = {
  "Connect your social": { label: "Verify now", to: "/verify" },
  "Add your rates": { label: "Add rates", to: "/app/account" },
  "e-signature": { label: "Open contracts", to: "/app/contracts" },
  "calendar": { label: "Open calendar", to: "/app/calendar" },
  "Publish your first": { label: "Publish a brief", to: "/app/campaigns" },
  "Explore": { label: "Explore", to: "/app/explore" },
};

export default function Overview() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { data, isLoading } = useQuery({
    queryKey: ["overview"],
    queryFn: async () => (await api.get("/overview")).data,
  });

  const act = async (fn) => {
    try {
      await fn();
      qc.invalidateQueries({ queryKey: ["overview"] });
      qc.invalidateQueries({ queryKey: ["connections"] });
      qc.invalidateQueries({ queryKey: ["applications"] });
      qc.invalidateQueries({ queryKey: ["notifications"] });
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Action failed");
    }
  };

  const acceptConn = (id) => act(() => api.post(`/connections/${id}/accept`));
  const declineConn = (id) => act(() => api.post(`/connections/${id}/decline`));
  const acceptApp = (id) => act(() => api.post(`/applications/${id}/accept`));
  const declineApp = (id) => act(() => api.post(`/applications/${id}/decline`));

  if (isLoading || !data) {
    return <div className="py-24 text-center text-sm text-muted-foreground" data-testid="overview-loading">Loading dashboard…</div>;
  }

  const isCreator = data.role === "creator";
  const nextLink = Object.entries(NEXT_LINKS).find(([k]) => data.next_step.includes(k));

  return (
    <div data-testid="overview-page">
      <PageHead
        title={`Welcome back, ${(user?.display_name || "").split(" ")[0]}`}
        sub={isCreator ? "Your creator dashboard — connections, deals and earnings." : "Your sponsor dashboard — roster, briefs and negotiations."}
      />

      <div className={`grid gap-4 ${isCreator ? "sm:grid-cols-2 lg:grid-cols-4" : "sm:grid-cols-2 lg:grid-cols-4"}`}>
        {isCreator ? (
          <>
            <StatTile testId="tile-connections" label="Connections" value={data.tiles.connections} icon={Users} sub="accepted" />
            <StatTile testId="tile-active-deals" label="Active deals" value={data.tiles.active_deals} icon={FileSignature} sub="in review or upcoming" />
            <StatTile testId="tile-earnings" label="Earnings" value={fmtMoney(data.tiles.earnings)} icon={Wallet} sub="from completed campaigns" />
            <StatTile testId="tile-collaborations" label="Collaborations" value={data.tiles.collaborations} icon={Handshake} sub="completed & rated" />
          </>
        ) : (
          <>
            <StatTile testId="tile-connected-creators" label="Connected creators" value={data.tiles.connected_creators} icon={Users} sub="accepted connections" />
            <StatTile testId="tile-open-briefs" label="Open briefs" value={data.tiles.open_briefs} icon={Megaphone} sub="live campaign posts" />
            <StatTile testId="tile-in-negotiation" label="In negotiation" value={data.tiles.in_negotiation} icon={FileSignature} sub="active deal rooms" />
            <StatTile testId="tile-total-spend" label="Total spend" value={fmtMoney(data.tiles.total_spend)} icon={Wallet} sub="completed campaigns" />
          </>
        )}
      </div>

      <div className="mt-4 flex items-start gap-3 rounded-2xl border border-primary/30 bg-primary/5 p-5" data-testid="next-step-card">
        <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
        <div className="flex-1">
          <p className="eyebrow">Next step</p>
          <p className="mt-1 text-sm font-semibold" data-testid="next-step-text">{data.next_step}</p>
        </div>
        {nextLink ? (
          <Button size="sm" className="rounded-full" onClick={() => navigate(nextLink[1].to)} data-testid="next-step-action-button">
            {nextLink[1].label} <ArrowRight className="ml-1 h-3.5 w-3.5" />
          </Button>
        ) : null}
      </div>

      <div className="mt-10 grid gap-8 lg:grid-cols-2">
        <div>
          <SectionTitle>{isCreator ? "Sponsor invitations" : "Connection requests"}</SectionTitle>
          {isCreator ? (
            data.invitations.length === 0 ? (
              <EmptyState icon={Megaphone} title="No invitations yet" body="Sponsors can invite you to their campaigns — it shows up here." testId="invitations-empty" />
            ) : (
              <div className="space-y-3" data-testid="invitations-list">
                {data.invitations.map((inv) => (
                  <div key={inv.app_id} className="flex items-start gap-3 rounded-2xl border border-border bg-card p-4">
                    <UserAvatar user={inv.company} />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold">{inv.company?.display_name}</p>
                      <p className="text-xs text-muted-foreground">invited you to <span className="text-foreground">{inv.campaign_title}</span></p>
                      {inv.message ? <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">“{inv.message}”</p> : null}
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" className="h-8 rounded-full px-3" onClick={() => acceptApp(inv.app_id)} data-testid={`invitation-accept-${inv.app_id}`}>
                        <Check className="h-3.5 w-3.5" />
                      </Button>
                      <Button size="sm" variant="secondary" className="h-8 rounded-full px-3" onClick={() => declineApp(inv.app_id)} data-testid={`invitation-decline-${inv.app_id}`}>
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )
          ) : data.requests_in.length === 0 ? (
            <EmptyState icon={Users} title="No pending requests" body="Connection requests from creators land here." testId="requests-empty" />
          ) : (
            <div className="space-y-3" data-testid="requests-list">
              {data.requests_in.map((c) => (
                <div key={c.conn_id} className="flex items-start gap-3 rounded-2xl border border-border bg-card p-4">
                  <UserAvatar user={c.other} />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold">{c.other?.display_name}</p>
                    {c.message ? <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">“{c.message}”</p> : null}
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" className="h-8 rounded-full px-3" onClick={() => acceptConn(c.conn_id)} data-testid={`request-accept-${c.conn_id}`}>
                      <Check className="h-3.5 w-3.5" />
                    </Button>
                    <Button size="sm" variant="secondary" className="h-8 rounded-full px-3" onClick={() => declineConn(c.conn_id)} data-testid={`request-decline-${c.conn_id}`}>
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div>
          <SectionTitle>{isCreator ? "Recent collaborations" : "Recent activity"}</SectionTitle>
          {isCreator ? (
            data.recent_collaborations.length === 0 ? (
              <EmptyState icon={Handshake} title="No completed collaborations yet" body="Signed and delivered campaigns appear here with your ratings." testId="collabs-empty" />
            ) : (
              <div className="space-y-3" data-testid="recent-collabs-list">
                {data.recent_collaborations.map((c) => (
                  <div key={c.deal_id} className="rounded-2xl border border-border bg-card p-4">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold">{c.title}</p>
                      <span className="font-num text-sm text-primary">{fmtMoney(c.compensation)}</span>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">with {c.other?.display_name} · delivered</p>
                  </div>
                ))}
              </div>
            )
          ) : null}
          <div className="space-y-3 rounded-2xl border border-border bg-card p-5" data-testid="activity-feed">
            <p className="eyebrow">Activity</p>
            {data.activities.length === 0 ? (
              <p className="text-xs text-muted-foreground">Nothing yet — your actions will be logged here.</p>
            ) : (
              data.activities.map((a) => (
                <div key={a.act_id} className="flex items-start gap-3 text-sm">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                  <div>
                    <p>{a.text}</p>
                    <p className="text-xs text-muted-foreground">{timeAgo(a.created_at)}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
