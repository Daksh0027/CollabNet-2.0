import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { ArrowLeft, FileSignature, GitPullRequest, History, Loader2, Lock, MessageSquare, PenLine, Plus, ShieldAlert, Star, Check } from "lucide-react";
import { toast } from "sonner";
import api, { fmtMoney, fmtDate, timeAgo } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { PageHead, UserAvatar, EmptyState, StatusPill } from "@/components/common";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { SignaturePad } from "@/components/contracts/SignaturePad";

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
      ) : deal ? (
        <DealRoom key={deal.deal_id} deal={deal} onClose={() => setOpenId(null)} />
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

      <NewDealDialog open={newOpen} onClose={() => setNewOpen(false)} />
    </div>
  );
}

function DealRoom({ deal, onClose }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [signName, setSignName] = useState(user?.display_name || "");
  const [signatureStrokes, setSignatureStrokes] = useState([]);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [busy, setBusy] = useState(false);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [revisionOpen, setRevisionOpen] = useState(false);
  const [changeRequestOpen, setChangeRequestOpen] = useState(false);
  const [changeComment, setChangeComment] = useState("");
  const [escrowPercent, setEscrowPercent] = useState(deal.funding_percent || 100);
  const [escrowAmountInput, setEscrowAmountInput] = useState(
    String((Number(deal.compensation || 0) * (deal.funding_percent || 100) / 100).toFixed(2)),
  );

  const ESCROW_COPY = {
    unfunded: "Choose how much of the agreed fee to secure before work starts. The minimum escrow amount is 10%.",
    funded: "The selected portion of the fee is secured in escrow. It releases to the creator when either of you marks the campaign delivered.",
    released: "Funds released from escrow. Payout to the creator's bank is queued.",
  };

  const escrowAmount = Number(escrowAmountInput) || 0;
  const totalCompensation = Number(deal.compensation || 0);
  const minimumEscrow = totalCompensation * 0.1;
  const displayedEscrowPercent = escrowPercent.toFixed(2);
  const updateEscrowPercent = (value) => {
    const percent = Number(value);
    setEscrowPercent(percent);
    setEscrowAmountInput((totalCompensation * percent / 100).toFixed(2));
  };
  const updateEscrowAmount = (value) => {
    setEscrowAmountInput(value);
    const amount = Number(value);
    if (Number.isFinite(amount) && totalCompensation > 0) {
      setEscrowPercent(Math.min(100, Math.max(10, amount / totalCompensation * 100)));
    }
  };
  const fundEscrow = async () => {
    if (escrowAmount < minimumEscrow || escrowAmount > totalCompensation) {
      toast.error(`Enter an amount between ${fmtMoney(minimumEscrow)} and ${fmtMoney(totalCompensation)}`);
      return;
    }
    setBusy(true);
    try {
      const { data } = await api.post(`/payments/checkout/${deal.deal_id}`, {
        origin_url: window.location.origin,
        escrow_percent: escrowPercent,
        escrow_amount: escrowAmount,
      });
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
  const currentVersion = deal.current_version || deal.versions?.length || 1;

  const requestChanges = () => run(async () => {
    await api.post(`/contracts/${deal.deal_id}/change-requests`, {
      version: currentVersion,
      comment: changeComment,
    });
    setChangeComment("");
  }, "Change request sent");

  return (
    <>
      <section className="space-y-6" data-testid="deal-room-workspace">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-5">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" className="rounded-full" onClick={onClose} data-testid="close-deal-workspace">
              <ArrowLeft className="mr-1.5 h-4 w-4" /> All contracts
            </Button>
            <span className="hidden h-5 w-px bg-border sm:block" />
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="font-display text-xl font-semibold">{deal.title}</h1>
                <StatusPill status={deal.status} />
              </div>
              <p className="mt-1 text-xs text-muted-foreground">Contract review workspace · Version {currentVersion}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <UserAvatar user={deal.other} className="h-7 w-7" />
            <span>{deal.other?.display_name}</span>
          </div>
        </div>
        <div className="space-y-5">
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
                <div className="w-full max-w-sm">
                  <div className="flex items-center justify-between text-xs">
                    <label htmlFor="escrow-percent" className="font-semibold">Amount to escrow</label>
                    <span className="font-num font-semibold text-primary" data-testid="escrow-percent-value">{displayedEscrowPercent}% · {fmtMoney(escrowAmount)}</span>
                  </div>
                  <input
                    id="escrow-percent"
                    type="range"
                    min="10"
                    max="100"
                    step="10"
                    value={escrowPercent}
                    onChange={(e) => updateEscrowPercent(e.target.value)}
                    className="mt-3 w-full accent-primary"
                    data-testid="escrow-percent-input"
                  />
                  <div className="mt-1 flex justify-between text-[10px] text-muted-foreground"><span>10% minimum</span><span>100% full fee</span></div>
                  <div className="mt-3">
                    <label htmlFor="escrow-amount" className="text-xs font-semibold">Or enter an amount manually</label>
                    <div className="relative mt-1">
                      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">$</span>
                      <Input
                        id="escrow-amount"
                        type="number"
                        min={minimumEscrow.toFixed(2)}
                        max={totalCompensation.toFixed(2)}
                        step="0.01"
                        value={escrowAmountInput}
                        onChange={(e) => updateEscrowAmount(e.target.value)}
                        className="pl-7"
                        data-testid="escrow-amount-input"
                      />
                    </div>
                    <p className="mt-1 text-[10px] text-muted-foreground">Enter between {fmtMoney(minimumEscrow)} and {fmtMoney(totalCompensation)}.</p>
                  </div>
                  <Button className="mt-3 w-full rounded-full" disabled={busy} onClick={fundEscrow} data-testid="fund-escrow-button">
                    <Lock className="mr-1.5 h-4 w-4" /> Fund {displayedEscrowPercent}% — {fmtMoney(escrowAmount)}
                  </Button>
                </div>
              ) : (
                <div className="text-right">
                  <StatusPill status={deal.funding_status} />
                  {deal.funding_status !== "unfunded" && deal.funding_percent ? (
                    <p className="mt-1 text-[11px] text-muted-foreground">{deal.funding_percent}% secured · {fmtMoney(deal.funded_amount)}</p>
                  ) : null}
                </div>
              )}
            </div>
          </div>

          <div>
            <p className="eyebrow mb-2">Deliverables</p>
            <ul className="space-y-1 text-sm" data-testid="deal-deliverables">
              {deal.deliverables.map((d, i) => <li key={i} className="flex gap-2"><span className="text-primary">·</span>{d}</li>)}
            </ul>
          </div>

          <div className="rounded-2xl border border-border bg-card/60 p-4" data-testid="contract-review-panel">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="eyebrow flex items-center gap-1.5"><GitPullRequest className="h-3.5 w-3.5 text-primary" /> Contract review</p>
                <p className="mt-1 text-sm font-semibold">Reviewing version {currentVersion}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {deal.status === "in_review" ? "Comment on the terms below, then approve and sign or request changes." : "This is the accepted contract version."}
                </p>
              </div>
              {!["completed", "disputed"].includes(deal.status) ? (
                <Button variant="outline" size="sm" className="rounded-full" onClick={() => setRevisionOpen(true)} data-testid="new-contract-revision-button">
                  <Plus className="mr-1.5 h-4 w-4" /> Edit &amp; send for review
                </Button>
              ) : null}
            </div>
            <pre className="mt-4 whitespace-pre-wrap rounded-xl border border-border bg-secondary/40 p-4 text-xs leading-relaxed" data-testid="deal-agreement-text">{deal.agreement_text}</pre>
            <div className="mt-4 border-t border-border pt-4" data-testid="contract-history">
              <div className="flex items-center justify-between">
                <p className="eyebrow flex items-center gap-1.5"><History className="h-3.5 w-3.5" /> Review history</p>
                <span className="text-xs text-muted-foreground">{deal.versions?.length || 1} version{(deal.versions?.length || 1) === 1 ? "" : "s"}</span>
              </div>
              <div className="mt-3 space-y-3">
                {(deal.versions || []).slice().reverse().map((version, index) => (
                  <div key={version.version_id} className="relative flex gap-3 text-xs">
                    {index < (deal.versions || []).length - 1 ? <span className="absolute left-[5px] top-3 h-full w-px bg-border" /> : null}
                    <span className={`relative mt-1 h-3 w-3 shrink-0 rounded-full border-2 ${version.version === currentVersion ? "border-primary bg-primary/30" : "border-muted-foreground/40 bg-card"}`} />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="font-semibold">Version {version.version} {version.version === currentVersion ? "· current" : ""}</p>
                        <span className="text-muted-foreground">{fmtDate(version.created_at)}</span>
                      </div>
                      <p className="mt-1 text-muted-foreground">{version.change_summary || "Updated agreement terms"}</p>
                    </div>
                  </div>
                ))}
              </div>
              {(deal.change_requests || []).length ? (
                <div className="mt-4 rounded-xl border border-amber-500/30 bg-amber-500/5 p-3" data-testid="contract-change-requests">
                  <p className="eyebrow flex items-center gap-1.5"><MessageSquare className="h-3.5 w-3.5" /> Review comments</p>
                  {(deal.change_requests || []).slice().reverse().map((request) => (
                    <p key={request.change_request_id} className="mt-2 text-xs text-muted-foreground">
                      v{request.version} · {request.comment} · <span className="capitalize">{request.status}</span>
                    </p>
                  ))}
                </div>
              ) : null}
            </div>
            {!["completed", "disputed"].includes(deal.status) ? (
              <div className="mt-4 border-t border-border pt-4">
                {!changeRequestOpen ? (
                  <Button variant="ghost" size="sm" className="rounded-full px-0 text-muted-foreground hover:bg-transparent hover:text-foreground" onClick={() => setChangeRequestOpen(true)} data-testid="open-change-request-button">
                    <MessageSquare className="mr-1.5 h-4 w-4" /> Request changes instead
                  </Button>
                ) : (
                  <div data-testid="change-request-form">
                    <p className="text-xs font-semibold">What should change in version {currentVersion}?</p>
                    <Textarea className="mt-2" rows={2} placeholder="Mention the term or section and the change you need…" value={changeComment} onChange={(e) => setChangeComment(e.target.value)} autoFocus />
                    <div className="mt-2 flex justify-end gap-2">
                      <Button size="sm" variant="ghost" className="rounded-full" onClick={() => setChangeRequestOpen(false)}>Cancel</Button>
                      <Button size="sm" className="rounded-full" disabled={busy || !changeComment.trim()} onClick={requestChanges} data-testid="request-contract-changes-button">
                        Request changes
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ) : null}
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
              <div className="signature-consent-panel w-full" data-testid="signature-consent-panel">
                <div>
                  <p className="text-sm font-semibold text-foreground">Approve and sign version {currentVersion}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Your signature records approval of this exact version. Both parties must sign before the agreement is active.
                  </p>
                </div>
                <Input
                  value={signName}
                  onChange={(e) => setSignName(e.target.value)}
                  placeholder="Your full legal name"
                  aria-label="Full legal name"
                  data-testid="sign-name-input"
                />
                <SignaturePad
                  strokes={signatureStrokes}
                  onChange={setSignatureStrokes}
                  disabled={busy}
                />
                <label className="signature-agreement-check">
                  <Checkbox
                    checked={acceptedTerms}
                    onCheckedChange={(checked) => setAcceptedTerms(checked === true)}
                    disabled={busy}
                    data-testid="accept-agreement-checkbox"
                  />
                  <span>I have read and agree to the written agreement above.</span>
                </label>
                <Button
                  className="w-full rounded-full"
                  disabled={busy || !signName.trim() || !acceptedTerms || !signatureStrokes.some((stroke) => stroke.length > 1)}
                  onClick={() => run(
                    () => api.post(`/contracts/${deal.deal_id}/sign`, {
                      name: signName.trim(),
                      strokes: signatureStrokes,
                    }),
                    "Agreement signed"
                  )}
                  data-testid="sign-agreement-button"
                >
                  {busy ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Check className="mr-1 h-4 w-4" />}
                  Sign &amp; submit
                </Button>
              </div>
            ) : null}
            {mySig?.signed && mySig.strokes?.length ? (
              <div className="signature-saved-block w-full" data-testid="saved-signature-block">
                <p className="eyebrow mb-2">Your saved signature</p>
                <SignaturePad strokes={mySig.strokes} readOnly />
                <p className="mt-2 text-xs text-muted-foreground">
                  Signed {fmtDate(mySig.signed_at)}
                  {mySig.verification_id ? ` · Verification ${mySig.verification_id}` : ""}
                </p>
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
      </section>
      <RevisionDialog
        open={revisionOpen}
        deal={deal}
        busy={busy}
        onClose={() => setRevisionOpen(false)}
        onSubmit={async (payload) => {
          await run(() => api.post(`/contracts/${deal.deal_id}/revisions`, payload), "Revision sent for review");
          setRevisionOpen(false);
        }}
      />
    </>
  );
}

function RevisionDialog({ open, deal, busy, onClose, onSubmit }) {
  const [form, setForm] = useState(null);
  const revision = form || {
    title: deal.title,
    deliverables: (deal.deliverables || []).join("\n"),
    start_date: deal.start_date || "",
    end_date: deal.end_date || "",
    compensation: deal.compensation || "",
    agreement_text: deal.agreement_text || "",
    change_summary: "",
  };
  const update = (key, value) => setForm((current) => ({ ...(current || revision), [key]: value }));
  const submit = () => onSubmit({
    ...revision,
    compensation: Number(revision.compensation) || 0,
    deliverables: revision.deliverables.split("\n").map((item) => item.trim()).filter(Boolean),
  });
  return (
    <Dialog open={open} onOpenChange={(value) => !value && onClose()}>
      <DialogContent className="max-w-lg" data-testid="contract-revision-dialog">
        <DialogHeader><DialogTitle>Propose contract revision</DialogTitle></DialogHeader>
        <div className="grid gap-3">
          <p className="text-xs text-muted-foreground">The current accepted or pending version remains unchanged until both parties review this revision.</p>
          <Input placeholder="Deal title" value={revision.title} onChange={(e) => update("title", e.target.value)} />
          <Textarea placeholder="Deliverables (one per line)" rows={3} value={revision.deliverables} onChange={(e) => update("deliverables", e.target.value)} />
          <div className="grid grid-cols-3 gap-3">
            <Input placeholder="Start" type="date" value={revision.start_date} onChange={(e) => update("start_date", e.target.value)} />
            <Input placeholder="End" type="date" value={revision.end_date} onChange={(e) => update("end_date", e.target.value)} />
            <Input placeholder="Fee ($)" type="number" value={revision.compensation} onChange={(e) => update("compensation", e.target.value)} />
          </div>
          <Textarea placeholder="Agreement text" rows={4} value={revision.agreement_text} onChange={(e) => update("agreement_text", e.target.value)} />
          <Textarea placeholder="Summarize what changed" rows={2} value={revision.change_summary} onChange={(e) => update("change_summary", e.target.value)} />
        </div>
        <DialogFooter>
          <Button className="rounded-full" disabled={busy || !revision.title.trim()} onClick={submit} data-testid="submit-contract-revision-button">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Send revision"}
          </Button>
        </DialogFooter>
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
