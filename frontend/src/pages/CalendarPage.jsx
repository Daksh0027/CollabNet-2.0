import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, Loader2, Plus } from "lucide-react";
import dayjs from "dayjs";
import { toast } from "sonner";
import api from "@/lib/api";
import { PageHead } from "@/components/common";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getCalendarDays } from "@/lib/calendar";

const EVENT_PALETTE = {
  campaign: "blue",
  meeting: "lime",
  shoot: "pink",
  milestone: "purple",
};

export default function CalendarPage() {
  const qc = useQueryClient();
  const [month, setMonth] = useState(dayjs().format("YYYY-MM"));
  const { data: events, isLoading, isError, refetch } = useQuery({
    queryKey: ["events"],
    queryFn: async () => (await api.get("/events")).data,
  });
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: "", date: dayjs().format("YYYY-MM-DD"), type: "milestone" });
  const [busy, setBusy] = useState(false);
  const [expandedDays, setExpandedDays] = useState({});

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

  const first = dayjs(`${month}-01`);
  const today = dayjs();
  const cells = getCalendarDays(month);
  const openNewEvent = (date = today.format("YYYY-MM-DD")) => {
    setForm({ title: "", date, type: "milestone" });
    setOpen(true);
  };

  return (
    <div data-testid="calendar-page">
      <PageHead
        title="Calendar"
        sub="Scheduled campaigns, meetings and milestones."
      />
      {isLoading ? (
        <div className="calendar-surface" aria-label="Loading calendar" data-testid="calendar-loading">
          <div className="calendar-toolbar">
            <div className="h-6 w-36 animate-pulse rounded bg-secondary" />
            <div className="h-8 w-64 animate-pulse rounded-full bg-secondary" />
          </div>
          <div className="calendar-weekdays" aria-hidden="true">
            {Array.from({ length: 7 }, (_, index) => <span key={index} />)}
          </div>
          <div className="calendar-days">
            {Array.from({ length: 42 }, (_, index) => (
              <div key={index} className="calendar-day-skeleton animate-pulse" />
            ))}
          </div>
        </div>
      ) : isError ? (
        <div className="calendar-error" role="alert">
          <div>
            <p className="text-sm font-semibold text-foreground">Calendar events couldn’t load</p>
            <p className="mt-1 text-xs text-muted-foreground">Check your connection and try again.</p>
          </div>
          <Button size="sm" variant="outline" onClick={() => refetch()}>Retry</Button>
        </div>
      ) : (
        <section className="calendar-surface" data-testid="month-grid" aria-label="Calendar month view">
          <div className="calendar-toolbar">
            <h2 className="font-display text-base font-semibold tracking-tight text-foreground sm:text-lg" data-testid="month-label">
              {first.format("MMMM YYYY")}
            </h2>
            <div className="calendar-toolbar-actions">
              <Button
                size="sm"
                variant="ghost"
                className="h-8 rounded-full px-3 text-xs"
                onClick={() => setMonth(today.format("YYYY-MM"))}
                data-testid="today-button"
              >
                Today
              </Button>
              <div className="calendar-month-nav" aria-label="Choose month">
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7 rounded-full"
                  onClick={() => setMonth(first.subtract(1, "month").format("YYYY-MM"))}
                  data-testid="prev-month-button"
                  aria-label="Previous month"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span aria-hidden="true">{first.format("MMMM YYYY")}</span>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7 rounded-full"
                  onClick={() => setMonth(first.add(1, "month").format("YYYY-MM"))}
                  data-testid="next-month-button"
                  aria-label="Next month"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
              <Button
                size="sm"
                className="h-8 rounded-full px-3 text-xs"
                onClick={() => openNewEvent()}
                data-testid="new-event-button"
              >
                <Plus className="mr-1 h-4 w-4" /> New event
              </Button>
            </div>
          </div>
          <div className="calendar-weekdays" role="row">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
              <span key={day} role="columnheader">{day}</span>
            ))}
          </div>
          <div className="calendar-days" role="grid" aria-label={first.format("MMMM YYYY")}>
            {cells.map((day) => {
              const date = day.format("YYYY-MM-DD");
              const dayEvents = (events || [])
                .filter((event) => event.date === date)
                .sort((left, right) => (
                  Number(Boolean(right.all_day)) - Number(Boolean(left.all_day))
                  || (left.start_time || "").localeCompare(right.start_time || "")
                  || left.title.localeCompare(right.title)
                ));
              const isCurrentMonth = day.isSame(first, "month");
              const isToday = day.isSame(today, "day");
              const expanded = Boolean(expandedDays[date]);
              const visibleEvents = expanded ? dayEvents : dayEvents.slice(0, 3);

              return (
                <div
                  key={date}
                  className={`calendar-day-cell${isCurrentMonth ? "" : " is-outside"}${isToday ? " is-today" : ""}`}
                  role="gridcell"
                  tabIndex={0}
                  aria-label={`${day.format("dddd, MMMM D")}, ${dayEvents.length} ${dayEvents.length === 1 ? "event" : "events"}`}
                  onClick={() => openNewEvent(date)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      openNewEvent(date);
                    }
                  }}
                  data-testid={`calendar-day-${date}`}
                >
                  <div className="calendar-day-header">
                    <span className={`calendar-day-number${isToday ? " is-today" : ""}`}>{day.date()}</span>
                    <button
                      type="button"
                      className="calendar-day-add"
                      aria-label={`Add event on ${day.format("MMMM D")}`}
                      onClick={(event) => {
                        event.stopPropagation();
                        openNewEvent(date);
                      }}
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <div className="calendar-day-events">
                    {visibleEvents.map((event) => {
                      const palette = EVENT_PALETTE[event.type] || "mint";
                      const time = event.start_time || event.time;
                      return (
                        <button
                          key={event.event_id}
                          type="button"
                          title={`${event.title}${time ? ` · ${time}` : ""}`}
                          aria-label={`${event.title}${time ? `, ${time}` : ""}`}
                          onClick={(clickEvent) => {
                            clickEvent.stopPropagation();
                            setForm({ title: event.title, date: event.date, type: event.type });
                            setOpen(true);
                          }}
                          className={`calendar-event-chip calendar-event-${palette}`}
                          data-testid={`calendar-event-${event.event_id}`}
                        >
                          <span className="calendar-event-title">{event.title}</span>
                          {time ? <span className="calendar-event-time">{time}</span> : null}
                        </button>
                      );
                    })}
                    {dayEvents.length > 3 ? (
                      <button
                        type="button"
                        className="calendar-more-events"
                        aria-expanded={expanded}
                        onClick={(event) => {
                          event.stopPropagation();
                          setExpandedDays((current) => ({ ...current, [date]: !current[date] }));
                        }}
                      >
                        {expanded ? "Show fewer" : `+${dayEvents.length - 3} more`}
                      </button>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent data-testid="new-event-dialog">
          <DialogHeader>
            <DialogTitle>New calendar event</DialogTitle>
            <DialogDescription>Add a campaign, meeting, shoot, or milestone to your calendar.</DialogDescription>
          </DialogHeader>
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
