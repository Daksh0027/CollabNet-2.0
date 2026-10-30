import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarDays, ChevronLeft, ChevronRight, Columns3, Loader2, Plus } from "lucide-react";
import dayjs from "dayjs";
import { toast } from "sonner";
import api, { fmtDate } from "@/lib/api";
import { PageHead, EmptyState } from "@/components/common";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const COLS = ["scheduled", "active", "completed"];

export default function CalendarPage() {
  const qc = useQueryClient();
  const [view, setView] = useState("kanban");
  const [month, setMonth] = useState(dayjs().format("YYYY-MM"));
  const { data: events, isLoading } = useQuery({
    queryKey: ["events"],
    queryFn: async () => (await api.get("/events")).data,
  });
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: "", date: dayjs().format("YYYY-MM-DD"), type: "milestone" });
  const [busy, setBusy] = useState(false);

  const move = async (eventId, status) => {
    try {
      await api.post(`/events/${eventId}/status`, { status });
      qc.invalidateQueries({ queryKey: ["events"] });
    } catch (e) { toast.error("Could not move event"); }
  };

  const create = async () => {
    if (!form.title || !form.date) { toast.error("Title and date required"); return; }
    setBusy(true);
    try {
      await api.post("/events", form);
      toast.success("Event added");
      setOpen(false);
      setForm({ title: "", date: dayjs().format("YYYY-MM-DD"), type: "milestone" });
      qc.invalidateQueries({ queryKey: ["events"] });
    } catch (e) { toast.error("Could not add event"); }
    finally { setBusy(false); }
  };

  const monthEvents = (events || []).filter((e) => e.date?.startsWith(month));
  const first = dayjs(`${month}-01`);
  const startIdx = (first.day() + 6) % 7;
  const daysInMonth = first.daysInMonth();
  const cells = [...Array(startIdx).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => first.add(i, "day"))];

  return (
    <div data-testid="calendar-page">
      <PageHead
        title="Calendar"
        sub="Scheduled campaigns, meetings and milestones."
        action={
          <div className="flex gap-2">
            <Button size="sm" variant={view === "kanban" ? "default" : "secondary"} className="rounded-full" onClick={() => setView("kanban")} data-testid="view-kanban-button"><Columns3 className="mr-1 h-4 w-4" /> Kanban</Button>
            <Button size="sm" variant={view === "month" ? "default" : "secondary"} className="rounded-full" onClick={() => setView("month")} data-testid="view-month-button"><CalendarDays className="mr-1 h-4 w-4" /> Month</Button>
            <Button size="sm" className="rounded-full" onClick={() => setOpen(true)} data-testid="new-event-button"><Plus className="mr-1 h-4 w-4" /> New event</Button>
          </div>
        }
      />
      {isLoading ? (
        <div className="py-24 text-center text-sm text-muted-foreground">Loading…</div>
      ) : view === "kanban" ? (
        <div className="grid gap-4 lg:grid-cols-3" data-testid="kanban-board">
          {COLS.map((col) => (
            <div key={col} className="rounded-2xl border border-border bg-card p-4" data-testid={`kanban-column-${col}`}>
              <p className="eyebrow mb-3 capitalize">{col.replace("_", " ")}</p>
              <div className="space-y-3">
                {(events || []).filter((e) => e.status === col).map((e) => {
                  const idx = COLS.indexOf(e.status);
                  return (
                    <div key={e.event_id} className="rounded-xl border border-border bg-secondary/40 p-3" data-testid={`event-card-${e.event_id}`}>
                      <span className="mb-2 block h-1 w-8 rounded-full" style={{ background: e.color }} />
                      <p className="text-sm font-semibold">{e.title}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">{fmtDate(e.date)} · {e.type}</p>
                      <div className="mt-2 flex justify-end gap-1">
                        {idx > 0 ? (
                          <button onClick={() => move(e.event_id, COLS[idx - 1])} className="rounded-full border border-border px-2 text-xs hover:border-primary" data-testid={`event-move-back-${e.event_id}`}>←</button>
                        ) : null}
                        {idx < COLS.length - 1 ? (
                          <button onClick={() => move(e.event_id, COLS[idx + 1])} className="rounded-full border border-border px-2 text-xs hover:border-primary" data-testid={`event-move-forward-${e.event_id}`}>→</button>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
                {!(events || []).some((e) => e.status === col) ? <p className="text-xs text-muted-foreground">Nothing here.</p> : null}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-border bg-card p-5" data-testid="month-grid">
          <div className="mb-4 flex items-center justify-between">
            <Button size="sm" variant="secondary" className="rounded-full" onClick={() => setMonth(first.subtract(1, "month").format("YYYY-MM"))} data-testid="prev-month-button"><ChevronLeft className="h-4 w-4" /></Button>
            <p className="font-display text-sm font-semibold" data-testid="month-label">{first.format("MMMM YYYY")}</p>
            <Button size="sm" variant="secondary" className="rounded-full" onClick={() => setMonth(first.add(1, "month").format("YYYY-MM"))} data-testid="next-month-button"><ChevronRight className="h-4 w-4" /></Button>
          </div>
          <div className="grid grid-cols-7 gap-1.5 text-center">
            {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => <p key={d} className="eyebrow">{d}</p>)}
            {cells.map((d, i) => (
              <div key={i} className={`min-h-20 rounded-lg border p-1.5 text-left ${d ? "border-border" : "border-transparent"}`}>
                {d ? (
                  <>
                    <p className="font-num text-[10px] text-muted-foreground">{d.date()}</p>
                    {monthEvents.filter((e) => e.date === d.format("YYYY-MM-DD")).map((e) => (
                      <button key={e.event_id} onClick={() => setForm({ title: e.title, date: e.date, type: e.type }) || setOpen(true)}
                        className="mt-1 block w-full truncate rounded px-1 py-0.5 text-left text-[10px] font-semibold"
                        style={{ background: `${e.color}22`, color: e.color }}
                        data-testid={`calendar-event-${e.event_id}`}>
                        {e.title}
                      </button>
                    ))}
                  </>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent data-testid="new-event-dialog">
          <DialogHeader><DialogTitle>New calendar event</DialogTitle></DialogHeader>
          <div className="grid gap-3">
            <Input placeholder="Event title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} data-testid="event-title-input" />
            <div className="grid grid-cols-2 gap-3">
              <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} data-testid="event-date-input" />
              <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                <SelectTrigger data-testid="event-type-select"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="milestone">Milestone</SelectItem>
                  <SelectItem value="meeting">Meeting</SelectItem>
                  <SelectItem value="campaign">Campaign</SelectItem>
                  <SelectItem value="shoot">Shoot</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button className="rounded-full" onClick={create} disabled={busy} data-testid="event-submit-button">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Add event"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
