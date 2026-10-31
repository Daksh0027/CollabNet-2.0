import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Activity, ArrowUpRight, Check, Loader2, Megaphone, Plus, Sparkles, UserPlus, X } from "lucide-react";
import { toast } from "sonner";
import api, { fmtMoney, fmtDate } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { PageHead, UserAvatar, EmptyState, StatusPill } from "@/components/common";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function Campaigns() {
  const { user } = useAuth();
  return user?.role === "company" ? <CompanyCampaigns /> : <CreatorCampaigns />;
}

function CompanyCampaigns() {
  const qc = useQueryClient();
  const { data: campaigns, isLoading } = useQuery({
    queryKey: ["campaigns", "mine"],
    queryFn: async () => (await api.get("/campaigns?mine=1")).data,
  });
  const { data: apps } = useQuery({ queryKey: ["applications"], queryFn: async () => (await api.get("/applications")).data });
  const { data: connections } = useQuery({
    queryKey: ["connections", "accepted"],
    queryFn: async () => (await api.get("/connections?status=accepted")).data,
  });

  const [open, setOpen] = useState(false);
  const [inviteFor, setInviteFor] = useState(null);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ title: "", brief: "", deliverables: "", budget_min: "", budget_max: "", deadline: "", niches: "" });

  const create = async () => {
    if (!form.title) { toast.error("Title is required"); return; }
    setBusy(true);
    try {
      await api.post("/campaigns", {
        title: form.title, brief: form.brief,
        deliverables: form.deliverables.split("\n").map((s) => s.trim()).filter(Boolean),
        budget_min: Number(form.budget_min) || 0, budget_max: Number(form.budget_max) || 0,
        deadline: form.deadline, niches: form.niches.split(",").map((s) => s.trim()).filter(Boolean),
      });
      toast.success("Campaign brief published");
      setOpen(false);
      setForm({ title: "", brief: "", deliverables: "", budget_min: "", budget_max: "", deadline: "", niches: "" });
      qc.invalidateQueries({ queryKey: ["campaigns"] });
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Could not publish");
    } finally { setBusy(false); }
  };

  const act = async (fn) => {
    try { await fn(); qc.invalidateQueries({ queryKey: ["applications"] }); qc.invalidateQueries({ queryKey: ["connections"] }); }
    catch (e) { toast.error(e?.response?.data?.detail || "Action failed"); }
  };

  const closeCampaign = async (campId) => {
    try { await api.post(`/campaigns/${campId}/close`); toast.success("Campaign closed"); qc.invalidateQueries({ queryKey: ["campaigns"] }); }
    catch (e) { toast.error("Could not close"); }
  };

  const appsByCamp = useMemo(() => {
    const m = {};
    (apps || []).filter((a) => a.type === "application").forEach((a) => { (m[a.camp_id] ||= []).push(a); });
    return m;
  }, [apps]);

  return (
    <div data-testid="campaigns-page">
      <PageHead
        title="Campaigns & Events"
        sub="Your published briefs and the creators applying to them."
        action={<Button className="rounded-full" onClick={() => setOpen(true)} data-testid="new-brief-button"><Plus className="mr-1 h-4 w-4" /> New brief</Button>}
      />
      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div>
          {isLoading ? (
            <div className="py-24 text-center text-sm text-muted-foreground">Loading…</div>
          ) : !campaigns?.length ? (
            <EmptyState icon={Megaphone} title="No briefs yet" body="Publish your first campaign brief and creators matching your niche get notified." testId="my-campaigns-empty" />
          ) : (
            <div className="space-y-5" data-testid="my-campaigns-list">
              {campaigns.map((c) => (
                <div key={c.camp_id} className="rounded-2xl border border-border bg-card p-6" data-testid={`my-campaign-${c.camp_id}`}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-display text-base font-semibold">{c.title}</h3>
                    <StatusPill status={c.status} />
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {fmtMoney(c.budget_min)} – {fmtMoney(c.budget_max)} · apply by {fmtDate(c.deadline)}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="secondary" className="rounded-full" onClick={() => setInviteFor(c)} data-testid={`invite-button-${c.camp_id}`}>
                    <UserPlus className="mr-1 h-3.5 w-3.5" /> Invite
                  </Button>
                  {c.status === "open" ? (
                    <Button size="sm" variant="secondary" className="rounded-full" onClick={() => closeCampaign(c.camp_id)} data-testid={`close-button-${c.camp_id}`}>Close</Button>
                  ) : null}
                </div>
              </div>
              <p className="mt-3 text-sm text-muted-foreground">{c.brief}</p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {c.deliverables.map((d, i) => <span key={i} className="rounded-full border border-border px-2.5 py-1 text-[11px] text-muted-foreground">{d}</span>)}
              </div>
              <div className="mt-5 border-t border-border pt-4">
                <p className="eyebrow mb-3">Applications ({(appsByCamp[c.camp_id] || []).length})</p>
                {(appsByCamp[c.camp_id] || []).length === 0 ? (
                  <p className="text-xs text-muted-foreground">No applications yet.</p>
                ) : (
                  <div className="space-y-2" data-testid={`applications-${c.camp_id}`}>
                    {appsByCamp[c.camp_id].map((a) => (
                      <div key={a.app_id} className="flex items-center gap-3 rounded-xl border border-border bg-secondary/40 p-3">
                        <UserAvatar user={a.creator} className="h-8 w-8" />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold">{a.creator?.display_name}</p>
                          {a.message ? <p className="truncate text-xs text-muted-foreground">“{a.message}”</p> : null}
                        </div>
                        {a.status === "pending" ? (
                          <div className="flex gap-2">
                            <Button size="sm" className="h-8 rounded-full px-3" onClick={() => act(() => api.post(`/applications/${a.app_id}/accept`))} data-testid={`app-accept-${a.app_id}`}>
                              <Check className="h-3.5 w-3.5" />
                            </Button>
                            <Button size="sm" variant="secondary" className="h-8 rounded-full px-3" onClick={() => act(() => api.post(`/applications/${a.app_id}/decline`))} data-testid={`app-decline-${a.app_id}`}>
                              <X className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        ) : <StatusPill status={a.status} />}
                      </div>
                    ))}
                  </div>
                )}
              </div>
                </div>
              ))}
            </div>
          )}
        </div>
        <CompetitiveSignals />
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg" data-testid="new-brief-dialog">
          <DialogHeader><DialogTitle>New campaign brief</DialogTitle></DialogHeader>
          <div className="grid gap-3">
            <Input placeholder="Campaign title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} data-testid="brief-title-input" />
            <Textarea placeholder="Brief — what's the campaign about?" rows={3} value={form.brief} onChange={(e) => setForm({ ...form, brief: e.target.value })} data-testid="brief-text-input" />
            <Textarea placeholder="Deliverables (one per line)" rows={3} value={form.deliverables} onChange={(e) => setForm({ ...form, deliverables: e.target.value })} data-testid="brief-deliverables-input" />
            <div className="grid grid-cols-3 gap-3">
              <Input placeholder="Budget min" type="number" value={form.budget_min} onChange={(e) => setForm({ ...form, budget_min: e.target.value })} data-testid="brief-budget-min-input" />
              <Input placeholder="Budget max" type="number" value={form.budget_max} onChange={(e) => setForm({ ...form, budget_max: e.target.value })} data-testid="brief-budget-max-input" />
              <Input placeholder="Deadline" type="date" value={form.deadline} onChange={(e) => setForm({ ...form, deadline: e.target.value })} data-testid="brief-deadline-input" />
            </div>
            <Input placeholder="Niches (comma separated)" value={form.niches} onChange={(e) => setForm({ ...form, niches: e.target.value })} data-testid="brief-niches-input" />
          </div>
          <DialogFooter>
            <Button className="rounded-full" onClick={create} disabled={busy} data-testid="brief-submit-button">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Publish brief"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!inviteFor} onOpenChange={(o) => !o && setInviteFor(null)}>
        <DialogContent data-testid="invite-dialog">
          <DialogHeader><DialogTitle>Invite a connected creator — {inviteFor?.title}</DialogTitle></DialogHeader>
          {!connections?.length ? (
            <p className="text-sm text-muted-foreground">No accepted connections yet — connect with creators in Explore first.</p>
          ) : (
            <div className="max-h-72 space-y-2 overflow-y-auto">
              {connections.map((c) => (
                <div key={c.conn_id} className="flex items-center gap-3 rounded-xl border border-border p-3">
                  <UserAvatar user={c.other} className="h-8 w-8" />
                  <p className="flex-1 text-sm font-semibold">{c.other?.display_name}</p>
                  <Button size="sm" variant="secondary" className="rounded-full" onClick={async () => {
                    try {
                      await api.post(`/campaigns/${inviteFor.camp_id}/invite`, { creator_id: c.other.user_id, message: `Inviting you to ${inviteFor.title}` });
                      toast.success("Invitation sent");
                      qc.invalidateQueries({ queryKey: ["applications"] });
                      setInviteFor(null);
                    } catch (e) { toast.error(e?.response?.data?.detail || "Invite failed"); }
                  }} data-testid={`invite-send-${c.other.user_id}`}>Invite</Button>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function CompetitiveSignals() {
  const signals = [
    { brand: "Brewhaus Coffee", signal: "Increasing creator activity around short-form product stories", confidence: 82, change: "+18%", color: "bg-amber-500" },
    { brand: "Lumen Skincare", signal: "Testing educational content with niche beauty creators", confidence: 74, change: "+11%", color: "bg-primary" },
    { brand: "HydratePro", signal: "Likely preparing a seasonal wellness push", confidence: 61, change: "+7%", color: "bg-foreground" },
  ];

  return (
    <aside className="rounded-2xl border border-border bg-card p-5" data-testid="competitive-signals-panel">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="eyebrow flex items-center gap-1.5"><Sparkles className="h-3.5 w-3.5 text-primary" /> Market watch</p>
          <h2 className="mt-1 font-display text-base font-semibold">What similar brands may be doing</h2>
        </div>
        <Activity className="h-4 w-4 shrink-0 text-primary" />
      </div>
      <p className="mt-2 text-xs leading-5 text-muted-foreground">
        Probabilistic signals based on public activity and creator-market patterns. Not verified competitor reporting.
      </p>
      <div className="mt-5 space-y-4">
        {signals.map((signal) => (
          <div key={signal.brand} className="rounded-xl border border-border bg-secondary/30 p-3" data-testid={`competitive-signal-${signal.brand.toLowerCase().replace(/\s+/g, "-")}`}>
            <div className="flex items-start gap-2">
              <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${signal.color}`} />
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-semibold">{signal.brand}</p>
                  <span className="flex shrink-0 items-center text-xs font-semibold text-emerald-600 dark:text-emerald-400"><ArrowUpRight className="mr-0.5 h-3 w-3" />{signal.change}</span>
                </div>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">{signal.signal}</p>
                <div className="mt-3 flex items-center gap-2">
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-border">
                    <div className="h-full rounded-full bg-primary" style={{ width: `${signal.confidence}%` }} />
                  </div>
                  <span className="text-[10px] font-medium text-muted-foreground">{signal.confidence}% confidence</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
      <button type="button" className="mt-4 text-xs font-semibold text-primary hover:underline" onClick={() => toast.info("More market signals will be available as your campaign data grows.")}>
        View signal methodology
      </button>
    </aside>
  );
}

function CreatorCampaigns() {
  const qc = useQueryClient();
  const { data: apps } = useQuery({ queryKey: ["applications"], queryFn: async () => (await api.get("/applications")).data });
  const mine = apps || [];

  const act = async (fn) => {
    try { await fn(); qc.invalidateQueries({ queryKey: ["applications"] }); }
    catch (e) { toast.error(e?.response?.data?.detail || "Action failed"); }
  };

  return (
    <div data-testid="creator-campaigns-page">
      <PageHead title="My Applications" sub="Track your sponsorship applications and invitations." />
      <Tabs defaultValue="applications">
        <TabsList className="rounded-full" data-testid="creator-campaigns-tabs">
          <TabsTrigger value="applications" className="rounded-full" data-testid="tab-applications">My applications</TabsTrigger>
          <TabsTrigger value="invitations" className="rounded-full" data-testid="tab-invitations">Invitations</TabsTrigger>
        </TabsList>
        {["applications", "invitations"].map((tab) => {
          const rows = mine.filter((a) => (tab === "applications" ? a.type === "application" : a.type === "invitation"));
          return (
            <TabsContent key={tab} value={tab} className="mt-6">
              {rows.length === 0 ? (
                <EmptyState icon={Megaphone} title={tab === "applications" ? "No applications yet" : "No invitations yet"} body={tab === "applications" ? "Apply to open campaigns in Explore." : "Sponsors who want to work with you show up here."} testId={`${tab}-empty`} />
              ) : (
                <div className="space-y-3" data-testid={`${tab}-list`}>
                  {rows.map((a) => (
                    <div key={a.app_id} className="flex flex-wrap items-center gap-3 rounded-2xl border border-border bg-card p-4">
                      <UserAvatar user={tab === "applications" ? a.company : a.creator} className="h-9 w-9" />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold">{a.campaign_title}</p>
                        <p className="text-xs text-muted-foreground">
                          {tab === "applications" ? "applied to" : "invitation from"} {a.company?.display_name}
                          {a.message ? ` · “${a.message}”` : ""}
                        </p>
                      </div>
                      {a.type === "invitation" && a.status === "pending" ? (
                        <div className="flex gap-2">
                          <Button size="sm" className="rounded-full" onClick={() => act(() => api.post(`/applications/${a.app_id}/accept`))} data-testid={`invitation-accept-${a.app_id}`}>Accept</Button>
                          <Button size="sm" variant="secondary" className="rounded-full" onClick={() => act(() => api.post(`/applications/${a.app_id}/decline`))} data-testid={`invitation-decline-${a.app_id}`}>Decline</Button>
                        </div>
                      ) : a.type === "application" && a.status === "pending" ? (
                        <Button size="sm" variant="secondary" className="rounded-full" onClick={() => act(() => api.post(`/applications/${a.app_id}/withdraw`))} data-testid={`application-withdraw-${a.app_id}`}>
                          Withdraw
                        </Button>
                      ) : (
                        <StatusPill status={a.status} />
                      )}
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
          );
        })}
      </Tabs>
    </div>
  );
}
