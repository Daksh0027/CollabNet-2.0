import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, MessagesSquare, Send, Sparkles, Wand2 } from "lucide-react";
import { toast } from "sonner";
import api, { timeAgo, fmtNum } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { PageHead, UserAvatar, EmptyState } from "@/components/common";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function Messages() {
  const [params, setParams] = useSearchParams();
  const tid = params.get("thread") || "";
  const qc = useQueryClient();
  const { user } = useAuth();
  const [text, setText] = useState("");
  const [summary, setSummary] = useState(null);
  const [sumBusy, setSumBusy] = useState(false);
  const [draftOpen, setDraftOpen] = useState(false);
  const [draftKind, setDraftKind] = useState("outreach");
  const [draftContext, setDraftContext] = useState("");

  const { data: threads } = useQuery({
    queryKey: ["threads"],
    queryFn: async () => (await api.get("/threads")).data,
    refetchInterval: 20000,
  });
  const { data: detail } = useQuery({
    queryKey: ["thread", tid],
    queryFn: async () => (await api.get(`/threads/${tid}`)).data,
    enabled: !!tid,
  });
  const { data: aiStatus } = useQuery({ queryKey: ["ai-status"], queryFn: async () => (await api.get("/ai/status")).data });

  useEffect(() => {
    if (!tid && threads?.length) setParams({ thread: threads[0].thread_id }, { replace: true });
  }, [tid, threads, setParams]);

  const send = async () => {
    if (!text.trim() || !tid) return;
    try {
      await api.post(`/threads/${tid}`, { text });
      setText("");
      qc.invalidateQueries({ queryKey: ["thread", tid] });
      qc.invalidateQueries({ queryKey: ["threads"] });
    } catch (e) {
      toast.error("Message failed to send");
    }
  };

  const summarize = async () => {
    setSumBusy(true);
    try {
      const { data } = await api.post("/ai/summarize", { thread_id: tid });
      setSummary(data.summary);
    } catch (e) {
      toast.error(e?.response?.data?.detail || "AI request failed");
    } finally {
      setSumBusy(false);
    }
  };

  const draft = async () => {
    try {
      const { data } = await api.post("/ai/draft", { kind: draftKind, to_id: detail?.other?.user_id || "", context: draftContext });
      setText(data.draft);
      setDraftOpen(false);
      toast.success("Draft inserted into the composer");
    } catch (e) {
      toast.error(e?.response?.data?.detail || "AI request failed");
    }
  };

  const aiOff = !aiStatus?.configured;

  return (
    <div data-testid="messages-page">
      <PageHead title="Messages" sub="Chat unlocks once a connection request is accepted." />
      <div className="flex h-[calc(100vh-16rem)] min-h-[480px] overflow-hidden rounded-2xl border border-border bg-card">
        <div className="w-72 shrink-0 overflow-y-auto border-r border-border" data-testid="thread-list">
          {!threads?.length ? (
            <div className="p-4"><EmptyState icon={MessagesSquare} title="No conversations" body="Connect with someone in Explore, then chat here." testId="threads-empty" /></div>
          ) : threads.map((t) => (
            <button
              key={t.thread_id}
              onClick={() => { setParams({ thread: t.thread_id }); setSummary(null); }}
              className={`flex w-full items-center gap-3 border-b border-border p-4 text-left transition-colors hover:bg-secondary/50 ${t.thread_id === tid ? "bg-primary/5" : ""}`}
              data-testid={`thread-item-${t.other?.user_id}`}
            >
              <UserAvatar user={t.other} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{t.other?.display_name}</p>
                <p className="truncate text-xs text-muted-foreground">{t.last_message || "New conversation"}</p>
              </div>
              {t.unread > 0 ? (
                <span className="font-num rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-bold text-primary-foreground" data-testid="thread-unread-badge">{t.unread}</span>
              ) : null}
            </button>
          ))}
        </div>

        <div className="flex min-w-0 flex-1 flex-col" data-testid="thread-panel">
          {!tid || !detail ? (
            <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">Select a conversation</div>
          ) : (
            <>
              <div className="flex items-center gap-3 border-b border-border p-4">
                <UserAvatar user={detail.other} />
                <div>
                  <p className="text-sm font-bold">{detail.other?.display_name}</p>
                  <p className="text-xs capitalize text-muted-foreground">{detail.other?.role} · verified: {detail.other?.verified ? "yes" : "no"}</p>
                </div>
              </div>
              <div className="flex-1 space-y-3 overflow-y-auto p-4" data-testid="message-list">
                {detail.messages.map((m) => {
                  const mine = m.sender_id === user?.user_id;
                  return (
                    <div key={m.msg_id} className={`flex ${mine ? "justify-end" : "justify-start"}`} data-testid={`message-${m.msg_id}`}>
                      <div className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm ${mine ? "rounded-br-sm bg-primary text-primary-foreground" : "rounded-bl-sm bg-secondary"}`}>
                        <p className="whitespace-pre-wrap">{m.text}</p>
                        <p className={`mt-1 text-right text-[10px] ${mine ? "text-primary-foreground/70" : "text-muted-foreground"}`}>{timeAgo(m.created_at)}</p>
                      </div>
                    </div>
                  );
                })}
                {detail.messages.length === 0 ? <p className="py-10 text-center text-xs text-muted-foreground">Say hello — this thread is private between you two.</p> : null}
              </div>
              <div className="border-t border-border p-3">
                {summary ? (
                  <div className="mb-3 rounded-xl border border-primary/30 bg-primary/5 p-3 text-xs" data-testid="thread-summary">
                    <p className="eyebrow mb-1 flex items-center gap-1.5"><Sparkles className="h-3 w-3 text-primary" /> AI summary</p>
                    <p className="whitespace-pre-wrap text-muted-foreground">{summary}</p>
                  </div>
                ) : null}
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="secondary" className="h-9 rounded-full" disabled={aiOff} title={aiOff ? "AI not configured" : "Draft with AI"} onClick={() => setDraftOpen(true)} data-testid="ai-draft-button">
                    <Wand2 className="h-4 w-4" />
                  </Button>
                  <Input
                    placeholder="Write a message…"
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && send()}
                    data-testid="message-input"
                  />
                  <Button size="sm" className="h-9 rounded-full px-4" onClick={send} data-testid="send-message-button">
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>

        <div className="hidden w-72 shrink-0 overflow-y-auto border-l border-border p-4 lg:block" data-testid="counterparty-panel">
          {!detail ? (
            <p className="text-xs text-muted-foreground">Counterparty profile shows here.</p>
          ) : (
            <CounterpartyCard user={detail.other} summarySlot={
              <Button size="sm" variant="secondary" className="mt-4 w-full rounded-full text-xs" disabled={aiOff || sumBusy} onClick={summarize} data-testid="ai-summarize-button">
                {sumBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <><Sparkles className="mr-1 h-3.5 w-3.5" /> Summarize with AI</>}
              </Button>
            } />
          )}
        </div>
      </div>

      <Dialog open={draftOpen} onOpenChange={setDraftOpen}>
        <DialogContent data-testid="ai-draft-dialog">
          <DialogHeader><DialogTitle>Draft with AI</DialogTitle></DialogHeader>
          <Select value={draftKind} onValueChange={setDraftKind}>
            <SelectTrigger data-testid="draft-kind-select"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="outreach">Outreach message</SelectItem>
              <SelectItem value="counteroffer">Counter-offer</SelectItem>
            </SelectContent>
          </Select>
          <Input placeholder="Context — e.g. budget, deliverables, tone" value={draftContext} onChange={(e) => setDraftContext(e.target.value)} data-testid="draft-context-input" />
          <DialogFooter>
            <Button className="rounded-full" onClick={draft} data-testid="draft-generate-button">Generate</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function CounterpartyCard({ user, summarySlot }) {
  const c = user?.creator || {};
  const co = user?.company || {};
  return (
    <div data-testid="counterparty-card">
      <div className="flex flex-col items-center text-center">
        <UserAvatar user={user} className="h-16 w-16" />
        <p className="mt-3 text-sm font-bold">{user?.display_name}</p>
        <p className="text-xs capitalize text-muted-foreground">{user?.role === "company" ? co.industry || "Company" : c.niche || "Creator"}</p>
      </div>
      <div className="mt-4 space-y-2 text-xs text-muted-foreground">
        {user?.role === "creator" ? (
          <>
            {c.platforms?.map((p) => (
              <p key={p.platform} className="flex justify-between rounded-lg border border-border px-2.5 py-1.5">
                <span>{p.platform}</span><span className="font-num text-foreground">{fmtNum(p.followers)}</span>
              </p>
            ))}
            {c.rates?.video ? <p className="flex justify-between rounded-lg border border-border px-2.5 py-1.5"><span>Video rate</span><span className="font-num text-foreground">${c.rates.video}</span></p> : null}
          </>
        ) : (
          <>
            {co.about ? <p className="leading-relaxed">{co.about}</p> : null}
            {co.employees ? <p className="flex justify-between rounded-lg border border-border px-2.5 py-1.5"><span>Team</span><span className="font-num text-foreground">{co.employees}</span></p> : null}
          </>
        )}
        <p className="flex justify-between rounded-lg border border-border px-2.5 py-1.5"><span>Member since</span><span className="text-foreground">{new Date(user?.created_at || Date.now()).getFullYear()}</span></p>
      </div>
      {summarySlot}
    </div>
  );
}
