import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { FileSignature, Loader2, Lock, PenLine, Plus, ShieldAlert, Star } from "lucide-react";
import { toast } from "sonner";
import api, { fmtMoney, fmtDate, timeAgo } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { PageHead, UserAvatar, EmptyState, StatusPill } from "@/components/common";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function Contracts() {
  const { data: deals, isLoading } = useQuery({
    queryKey: ["contracts"],
    queryFn: async () => (await api.get("/contracts")).data,
  });
  const [sp] = useSearchParams();
  const [openId, setOpenId] = useState(sp.get("deal") || null);
  const [newOpen, setNewOpen] = useState(false);
  const deal = deals?.find((d) => d.deal_id === openId);

  return (
    <div data-testid="contracts-page">
      <PageHead
        title="Contracts — deal rooms"
        sub="One place per collaboration: agreement, signatures and status."
        action={<Button className="rounded-full" onClick={() => setNewOpen(true)} data-testid="new-deal-button"><Plus className="mr-1 h-4 w-4" /> New deal</Button>}
      />
      {isLoading ? (
        <div className="py-24 text-center text-sm text-muted-foreground">Loading…</div>
      ) : !deals?.length ? (
        <EmptyState icon={FileSignature} title="No deal rooms yet" body="Open one with an accepted connection — scope, dates and pay go in writing." testId="contracts-empty" />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2" data-testid="contracts-list">
          {deals.map((d) => (
            <button key={d.deal_id} onClick={() => setOpenId(d.deal_id)}
              className="flex flex-col rounded-2xl border border-border bg-card p-5 text-left transition-colors hover:border-primary/50"
              data-testid={`deal-card-${d.deal_id}`}>
              <div className="flex items-center justify-between gap-2">
                <h3 className="font-display text-sm font-semibold">{d.title}</h3>
                <div className="flex gap-1.5">
                  <StatusPill status={d.status} />
                  {d.funding_status && d.funding_status !== "unfunded" ? <StatusPill status={d.funding_status} /> : null}
                </div>
              </div>
              <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                <UserAvatar user={d.other} className="h-6 w-6" /> {d.other?.display_name}
              </div>
              <div className="mt-4 flex items-center justify-between text-xs">
                <span className="font-num text-foreground">{fmtMoney(d.compensation)}</span>
                <span className="text-muted-foreground">{fmtDate(d.start_date)} → {fmtDate(d.end_date)}</span>
              </div>
            </button>
          ))}
        </div>
      )}

      {deal ? <DealRoom deal={deal} onClose={() => setOpenId(null)} /> : null}
      <NewDealDialog open={newOpen} onClose={() => setNewOpen(false)} />
    </div>
  );
}

function DealRoom({ deal, onClose }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [signName, setSignName] = useState(user?.display_name || "");
  const [busy, setBusy] = useState(false);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");

  const ESCROW_COPY = {
    unfunded: "Fee not secured yet. Fund escrow so the creator can see the money is committed before work starts — it releases automatically when the campaign is marked delivered.",
    funded: "Fee secured in escrow. It releases to the creator when either of you marks the campaign delivered.",
    released: "Funds released from escrow. Payout to the creator's bank is queued.",
  };

  const fundEscrow = async () => {
    setBusy(true);
    try {
      const { data } = await api.post(`/payments/checkout/${deal.deal_id}`, { origin_url: window.location.origin });
      window.location.href = data.checkout_url;
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Could not start checkout");
      setBusy(false);
    }
  };

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["contracts"] });
    qc.invalidateQueries({ queryKey: ["overview"] });
    qc.invalidateQueries({ queryKey: ["events"] });
  };
  const run = async (fn, ok) => {
    setBusy(true);
    try { await fn(); toast.success(ok); refresh(); }
    catch (e) { toast.error(e?.response?.data?.detail || "Action failed"); }
    finally { setBusy(false); }
  };

  const mySig = deal.signatures[deal.my_role];
  const otherRole = deal.my_role === "company" ? "creator" : "company";
  const otherSig = deal.signatures[otherRole];
  const myReview = deal.reviews?.find((r) => r.reviewer_id === user?.user_id);

  return (
    <Dialog open={!!deal} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl" data-testid="deal-room-dialog">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            {deal.title} <StatusPill status={deal.status} />
          </DialogTitle>
        </DialogHeader>
        <div className="max-h-[65vh] space-y-5 overflow-y-auto pr-2">
          <div className="flex items-center gap-3 rounded-xl border border-border p-3">
            <UserAvatar user={deal.other} />
            <div>
              <p className="text-sm font-semibold">{deal.other?.display_name}</p>
              <p className="text-xs capitalize text-muted-foreground">{deal.other_role} · {deal.other?.verified ? "verified" : "unverified"}</p>
            </div>
            <div className="ml-auto text-right">
              <p className="font-num text-lg font-semibold text-primary">{fmtMoney(deal.compensation)}</p>
              <p className="text-[11px] text-muted-foreground">{fmtDate(deal.start_date)} → {fmtDate(deal.end_date)}</p>
            </div>
          </div>

          <div className={`rounded-xl border p-4 ${deal.funding_status === "released" ? "border-emerald-500/40 bg-emerald-500/5" : deal.funding_status === "funded" ? "border-amber-500/40 bg-amber-500/5" : "border-border"}`} data-testid="escrow-panel">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="eyebrow flex items-center gap-1.5"><Lock className="h-3.5 w-3.5 text-primary" /> Escrow</p>
                <p className="mt-1 text-xs text-muted-foreground" data-testid="escrow-copy">{ESCROW_COPY[deal.funding_status] || ESCROW_COPY.unfunded}</p>
              </div>
              {deal.my_role === "company" && (deal.funding_status || "unfunded") === "unfunded" ? (
                <Button className="rounded-full" disabled={busy} onClick={fundEscrow} data-testid="fund-escrow-button">
                  <Lock className="mr-1.5 h-4 w-4" /> Fund escrow — {fmtMoney(deal.compensation)}
                </Button>
              ) : (
                <StatusPill status={deal.funding_status} />
              )}
            </div>
          </div>

          <div>
            <p className="eyebrow mb-2">Deliverables</p>
            <ul className="space-y-1 text-sm" data-testid="deal-deliverables">
              {deal.deliverables.map((d, i) => <li key={i} className="flex gap-2"><span className="text-primary">·</span>{d}</li>)}
            </ul>
          </div>

          <div>
            <p className="eyebrow mb-2">Written agreement</p>
            <pre className="whitespace-pre-wrap rounded-xl border border-border bg-secondary/40 p-4 text-xs leading-relaxed" data-testid="deal-agreement-text">{deal.agreement_text}</pre>
          </div>

          <div className="grid gap-2 sm:grid-cols-2" data-testid="deal-signatures">
            {[
              { role: "company", sig: deal.signatures.company },
              { role: "creator", sig: deal.signatures.creator },
            ].map(({ role, sig }) => (
              <div key={role} className={`rounded-xl border p-3 text-xs ${sig.signed ? "border-emerald-500/40 bg-emerald-500/5" : "border-border"}`}>
                <p className="eyebrow">{role === deal.my_role ? "You" : "Counterparty"} · {role}</p>
                {sig.signed ? (
                  <p className="mt-1 flex items-center gap-1.5 font-semibold text-emerald-400"><PenLine className="h-3.5 w-3.5" /> {sig.name} · {timeAgo(sig.signed_at)}</p>
                ) : (
                  <p className="mt-1 text-muted-foreground">Awaiting e-signature</p>
                )}
              </div>
            ))}
          </div>

          <div className="flex flex-wrap gap-2" data-testid="deal-actions">
            {!mySig?.signed && deal.status === "in_review" ? (
              <div className="flex w-full gap-2">
                <Input value={signName} onChange={(e) => setSignName(e.target.value)} placeholder="Type your full legal name" data-testid="sign-name-input" />
                <Button className="rounded-full" disabled={busy || !signName} onClick={() => run(() => api.post(`/contracts/${deal.deal_id}/sign`, { name: signName }), "Agreement e-signed")} data-testid="sign-agreement-button">
                  <PenLine className="mr-1 h-4 w-4" /> E-sign
                </Button>
              </div>
            ) : null}
            {mySig?.signed && !otherSig?.signed ? <p className="w-full text-xs text-muted-foreground">Signed on your side — waiting for the {otherRole} to sign.</p> : null}
            {["upcoming", "active"].includes(deal.status) ? (
              <Button variant="secondary" className="rounded-full" disabled={busy} onClick={() => run(() => api.post(`/contracts/${deal.deal_id}/complete`), "Campaign marked as delivered")} data-testid="complete-deal-button">
                Mark delivered
              </Button>
            ) : null}
            {!["completed", "disputed"].includes(deal.status) ? (
              <Button variant="secondary" className="rounded-full text-red-600 dark:text-red-400" disabled={busy}
                onClick={() => run(() => api.post(`/contracts/${deal.deal_id}/dispute`, { reason: "Dispute raised from deal room" }), "Dispute routed to platform review")}
                data-testid="dispute-button">
                <ShieldAlert className="mr-1 h-4 w-4" /> Raise dispute
              </Button>
            ) : null}
          </div>

          {deal.status === "completed" && !myReview ? (
            <div className="rounded-xl border border-primary/30 bg-primary/5 p-4" data-testid="review-form">
              <p className="eyebrow">Leave a moderated rating</p>
              <div className="mt-2 flex gap-1" data-testid="review-stars">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button key={n} onClick={() => setRating(n)} data-testid={`star-${n}`}>
                    <Star className={`h-5 w-5 ${n <= rating ? "fill-primary text-primary" : "text-muted-foreground"}`} />
                  </button>
                ))}
              </div>
              <Textarea className="mt-3" rows={2} placeholder="How did the collaboration go?" value={comment} onChange={(e) => setComment(e.target.value)} data-testid="review-comment-input" />
              <Button size="sm" className="mt-3 rounded-full" disabled={busy} onClick={() => run(() => api.post(`/contracts/${deal.deal_id}/review`, { rating, comment }), "Review submitted")} data-testid="review-submit-button">
                Submit review
              </Button>
            </div>
          ) : null}

          {deal.reviews?.length ? (
            <div>
              <p className="eyebrow mb-2">Reviews on this deal</p>
              {deal.reviews.map((r) => (
                <div key={r.review_id} className="mb-2 rounded-xl border border-border p-3 text-xs" data-testid={`deal-review-${r.review_id}`}>
                  <p className="font-semibold">{r.rating}/5 {r.reviewer_id === user?.user_id ? "· from you" : "· from counterparty"} · <span className="capitalize text-muted-foreground">{r.status}</span></p>
                  <p className="mt-1 text-muted-foreground">{r.comment}</p>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function NewDealDialog({ open, onClose }) {
  const qc = useQueryClient();
  const { data: connections } = useQuery({
    queryKey: ["connections", "accepted", open],
    queryFn: async () => (await api.get("/connections?status=accepted")).data,
    enabled: open,
  });
  const [form, setForm] = useState({ counterpart_id: "", title: "", deliverables: "", start_date: "", end_date: "", compensation: "", agreement_text: "" });
  const [busy, setBusy] = useState(false);

  const create = async () => {
    if (!form.counterpart_id || !form.title) { toast.error("Pick a counterparty and a title"); return; }
    setBusy(true);
    try {
      await api.post("/contracts", {
        ...form,
        compensation: Number(form.compensation) || 0,
        deliverables: form.deliverables.split("\n").map((s) => s.trim()).filter(Boolean),
      });
      toast.success("Deal room opened — agreement sent for review");
      setForm({ counterpart_id: "", title: "", deliverables: "", start_date: "", end_date: "", compensation: "", agreement_text: "" });
      onClose();
      qc.invalidateQueries({ queryKey: ["contracts"] });
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Could not open deal room");
    } finally { setBusy(false); }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg" data-testid="new-deal-dialog">
        <DialogHeader><DialogTitle>Open a deal room</DialogTitle></DialogHeader>
        <div className="grid gap-3">
          <Select value={form.counterpart_id || undefined} onValueChange={(v) => setForm({ ...form, counterpart_id: v })}>
            <SelectTrigger data-testid="deal-counterpart-select"><SelectValue placeholder="Accepted connection…" /></SelectTrigger>
            <SelectContent>
              {(connections || []).map((c) => (
                <SelectItem key={c.conn_id} value={c.other.user_id}>{c.other.display_name} ({c.other.role})</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input placeholder="Deal title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} data-testid="deal-title-input" />
          <Textarea placeholder="Deliverables (one per line)" rows={3} value={form.deliverables} onChange={(e) => setForm({ ...form, deliverables: e.target.value })} data-testid="deal-deliverables-input" />
          <div className="grid grid-cols-3 gap-3">
            <Input placeholder="Start" type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} data-testid="deal-start-input" />
            <Input placeholder="End" type="date" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} data-testid="deal-end-input" />
            <Input placeholder="Fee ($)" type="number" value={form.compensation} onChange={(e) => setForm({ ...form, compensation: e.target.value })} data-testid="deal-compensation-input" />
          </div>
          <Textarea placeholder="Agreement text (optional — a standard agreement is generated if empty)" rows={3} value={form.agreement_text} onChange={(e) => setForm({ ...form, agreement_text: e.target.value })} data-testid="deal-agreement-input" />
        </div>
        <DialogFooter>
          <Button className="rounded-full" onClick={create} disabled={busy} data-testid="deal-submit-button">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Open deal room"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
