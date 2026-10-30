import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarDays, ChevronLeft, ChevronRight, Loader2, Plus } from "lucide-react";
import dayjs from "dayjs";
import { toast } from "sonner";
import api, { fmtDate } from "@/lib/api";
import { PageHead, EmptyState } from "@/components/common";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function CalendarPage() {
  const qc = useQueryClient();
  const [month, setMonth] = useState(dayjs().format("YYYY-MM"));
  const { data: events, isLoading } = useQuery({
    queryKey: ["events"],
    queryFn: async () => (await api.get("/events")).data,
  });
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: "", date: dayjs().format("YYYY-MM-DD"), type: "milestone" });
  const [busy, setBusy] = useState(false);

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
        action={<Button size="sm" className="rounded-full" onClick={() => setOpen(true)} data-testid="new-event-button"><Plus className="mr-1 h-4 w-4" /> New event</Button>}
      />
      {isLoading ? (
        <div className="py-24 text-center text-sm text-muted-foreground">Loading…</div>
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
