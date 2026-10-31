import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowDown, ArrowDownWideNarrow, ArrowLeft, ArrowRight, ArrowUp, CalendarDays, ChevronRight, Filter,
  MessageSquare, MoreHorizontal, Plus, Search, SlidersHorizontal,
  Tag, X,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

const STORAGE_KEY = "collabonet-project-board-v2";
const COLUMN_ORDER_STORAGE_KEY = "collabonet-project-board-column-order-v1";

const COLUMNS = [
  { id: "todo", name: "To do", limit: 8, dot: "bg-primary" },
  { id: "progress", name: "In progress", limit: 4, dot: "bg-chart-3" },
  { id: "review", name: "Review", limit: 3, dot: "bg-chart-5" },
  { id: "done", name: "Done", limit: 6, dot: "bg-chart-2" },
];

const PRIORITIES = ["Urgent", "High", "Medium", "Low"];

const PRIORITY_STYLES = {
  Urgent: "border-destructive/25 bg-destructive/10 text-destructive",
  High: "border-chart-3/25 bg-chart-3/10 text-chart-3",
  Medium: "border-chart-5/25 bg-chart-5/10 text-chart-5",
  Low: "border-primary/25 bg-primary/10 text-primary",
};

const AVATAR_STYLES = [
  "bg-primary/10 text-primary",
  "bg-accent text-accent-foreground",
  "bg-secondary text-secondary-foreground",
  "bg-muted text-muted-foreground",
];

const INITIAL_TICKETS = [];
const INITIAL_COLUMN_ORDER = COLUMNS.map((column) => column.id);

const EMPTY_FORM = {
  title: "",
  project: "CollaboNet",
  description: "",
  priority: "Medium",
  tag: "",
  status: "todo",
  dueDate: "",
};

function loadTickets() {
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (!saved) return INITIAL_TICKETS;
    const parsed = JSON.parse(saved);
    if (Array.isArray(parsed) && parsed.every((ticket) => (
      ticket && typeof ticket.id === "string" && typeof ticket.title === "string"
      && (ticket.status === "backlog" || COLUMNS.some((column) => column.id === ticket.status))
    ))) {
      return parsed.map((ticket) => (
        ticket.status === "backlog" ? { ...ticket, status: "todo" } : ticket
      ));
    }
    console.error("Saved project board data is invalid; using the starter board.");
  } catch (error) {
    console.error("Could not load saved project board data.", error);
  }
  return INITIAL_TICKETS;
}

function loadColumnOrder() {
  try {
    const saved = window.localStorage.getItem(COLUMN_ORDER_STORAGE_KEY);
    if (!saved) return INITIAL_COLUMN_ORDER;
    const parsed = JSON.parse(saved);
    if (
      Array.isArray(parsed)
      && parsed.length === COLUMNS.length
      && parsed.every((columnId) => COLUMNS.some((column) => column.id === columnId))
      && new Set(parsed).size === COLUMNS.length
    ) {
      return parsed;
    }
    console.error("Saved project board column order is invalid; using the default order.");
  } catch (error) {
    console.error("Could not load saved project board column order.", error);
  }
  return INITIAL_COLUMN_ORDER;
}

function formatSince(value) {
  if (!value) return "Added just now";
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return "Added recently";
  return `Since ${date.toLocaleDateString(undefined, { day: "numeric", month: "short" })}`;
}

function AssigneeAvatars({ assignees = [] }) {
  return (
    <div className="flex items-center -space-x-2" aria-label={`${assignees.length} assignees`}>
      {assignees.slice(0, 3).map((initials, index) => (
        <span
          key={`${initials}-${index}`}
          className={`flex h-7 w-7 items-center justify-center rounded-full border-2 border-card text-[10px] font-semibold ${AVATAR_STYLES[index % AVATAR_STYLES.length]}`}
          title={initials}
        >
          {initials}
        </span>
      ))}
      {assignees.length > 3 ? (
        <span className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-card bg-muted text-[9px] font-semibold text-muted-foreground">
          +{assignees.length - 3}
        </span>
      ) : null}
    </div>
  );
}

function TicketCard({ ticket, onPointerDown, onClick, onMove, canMoveUp, canMoveDown }) {
  return (
    <div>
      <button
        type="button"
        onPointerDown={(event) => onPointerDown(event, ticket.id)}
        onClick={(event) => onClick(event, ticket)}
        className="group w-full rounded-xl border border-border bg-card p-3 text-left shadow-sm transition hover:border-primary/50 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        data-testid={`ticket-card-${ticket.id}`}
        aria-label={`${ticket.id}: ${ticket.title}. Open ticket details or drag to move.`}
      >
        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <span className="font-semibold text-foreground">{ticket.id}</span>
          <ChevronRight className="h-3 w-3 shrink-0" />
          <span className="truncate">{ticket.project}</span>
          <MoreHorizontal className="ml-auto h-4 w-4 shrink-0 opacity-0 transition group-hover:opacity-100" />
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          <span className={`rounded-md border px-1.5 py-0.5 text-[10px] font-medium ${PRIORITY_STYLES[ticket.priority] || PRIORITY_STYLES.Medium}`}>
            {ticket.priority}
          </span>
          {ticket.tag ? (
            <span className="inline-flex max-w-full items-center gap-1 truncate rounded-md border border-border px-1.5 py-0.5 text-[10px] text-muted-foreground">
              <Tag className="h-2.5 w-2.5 shrink-0" /> {ticket.tag}
            </span>
          ) : null}
        </div>
        <p className="mt-2.5 text-[13px] font-semibold leading-5 text-foreground">{ticket.title}</p>
        {ticket.description ? (
          <p className="mt-1 line-clamp-2 text-xs leading-5 text-muted-foreground">{ticket.description}</p>
        ) : null}
        <p className="mt-2 text-[11px] text-muted-foreground">{formatSince(ticket.createdAt)}</p>
        <div className="mt-3 flex items-center justify-between border-t border-border pt-2.5">
          <AssigneeAvatars assignees={ticket.assignees} />
          <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
            {ticket.dueDate ? (
              <span className="inline-flex items-center gap-1">
                <CalendarDays className="h-3.5 w-3.5" />
                {new Date(`${ticket.dueDate}T00:00:00`).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
              </span>
            ) : null}
            {ticket.comments > 0 ? (
              <span className="inline-flex items-center gap-1">
                <MessageSquare className="h-3.5 w-3.5" /> {ticket.comments}
              </span>
            ) : null}
          </div>
        </div>
      </button>
      <div className="flex justify-end gap-1 pt-1">
        <button
          type="button"
          onClick={() => onMove(ticket.id, -1)}
          disabled={!canMoveUp}
          className="rounded-md p-1 text-muted-foreground transition hover:bg-card hover:text-foreground disabled:cursor-not-allowed disabled:opacity-30"
          aria-label={`Move ${ticket.id} up`}
          data-testid={`move-ticket-up-${ticket.id}`}
        >
          <ArrowUp className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={() => onMove(ticket.id, 1)}
          disabled={!canMoveDown}
          className="rounded-md p-1 text-muted-foreground transition hover:bg-card hover:text-foreground disabled:cursor-not-allowed disabled:opacity-30"
          aria-label={`Move ${ticket.id} down`}
          data-testid={`move-ticket-down-${ticket.id}`}
        >
          <ArrowDown className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

export default function ProjectBoard() {
  const [tickets, setTickets] = useState(loadTickets);
  const [columnOrder, setColumnOrder] = useState(loadColumnOrder);
  const [search, setSearch] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [sortBy, setSortBy] = useState("manual");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [activeTicket, setActiveTicket] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [dropTarget, setDropTarget] = useState("");
  const storageWarningShown = useRef(false);
  const pointerDragRef = useRef(null);
  const suppressClickRef = useRef(false);
  const dragPreviewRef = useRef(null);

  const clearDragPreview = useCallback(() => {
    document.querySelectorAll("[data-project-board-drag-preview]").forEach((preview) => preview.remove());
    dragPreviewRef.current = null;
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(tickets));
    } catch (error) {
      console.error("Could not save project board data.", error);
      if (!storageWarningShown.current) {
        toast.error("Board changes could not be saved in this browser.");
        storageWarningShown.current = true;
      }
    }
  }, [tickets]);

  useEffect(() => {
    try {
      window.localStorage.setItem(COLUMN_ORDER_STORAGE_KEY, JSON.stringify(columnOrder));
    } catch (error) {
      console.error("Could not save project board column order.", error);
    }
  }, [columnOrder]);

  const visibleTickets = useMemo(() => {
    const query = search.trim().toLowerCase();
    return tickets.filter((ticket) => {
      const matchesSearch = !query || [
        ticket.id, ticket.title, ticket.project, ticket.tag,
      ].some((value) => value?.toLowerCase().includes(query));
      const matchesPriority = priorityFilter === "all" || ticket.priority === priorityFilter;
      return matchesSearch && matchesPriority;
    });
  }, [tickets, search, priorityFilter]);

  const orderedTickets = useMemo(() => {
    const priorityRank = Object.fromEntries(PRIORITIES.map((priority, index) => [priority, index]));
    return [...visibleTickets].sort((a, b) => {
      if (sortBy === "manual") return tickets.indexOf(a) - tickets.indexOf(b);
      if (sortBy === "priority") return priorityRank[a.priority] - priorityRank[b.priority];
      if (sortBy === "alphabetical") return a.title.localeCompare(b.title);
      return (b.createdAt || "").localeCompare(a.createdAt || "");
    });
  }, [tickets, visibleTickets, sortBy]);

  const openNewTicket = (status = "todo") => {
    setActiveTicket(null);
    setForm({ ...EMPTY_FORM, status });
    setDialogOpen(true);
  };

  const openTicket = (ticket) => {
    setActiveTicket(ticket);
    setForm({
      title: ticket.title,
      project: ticket.project || "",
      description: ticket.description || "",
      priority: ticket.priority || "Medium",
      tag: ticket.tag || "",
      status: ticket.status,
      dueDate: ticket.dueDate || "",
    });
    setDialogOpen(true);
  };

  const saveTicket = (event) => {
    event.preventDefault();
    const title = form.title.trim();
    if (!title) {
      toast.error("Add a ticket title before saving.");
      return;
    }

    if (activeTicket) {
      setTickets((current) => current.map((ticket) => (
        ticket.id === activeTicket.id
          ? { ...ticket, ...form, title, project: form.project.trim() || "CollaboNet", tag: form.tag.trim() }
          : ticket
      )));
      toast.success("Ticket updated.");
    } else {
      const nextId = tickets.reduce((largest, ticket) => {
        const match = ticket.id.match(/(\d+)$/);
        return Math.max(largest, match ? Number(match[1]) : 0);
      }, 0) + 1;
      setTickets((current) => [{
        id: `CN-${nextId}`,
        ...form,
        title,
        project: form.project.trim() || "CollaboNet",
        tag: form.tag.trim(),
        createdAt: new Date().toISOString().slice(0, 10),
        assignees: [],
        comments: 0,
      }, ...current]);
      toast.success("Ticket added to the board.");
    }
    setDialogOpen(false);
  };

  const deleteTicket = () => {
    if (!activeTicket) return;
    setTickets((current) => current.filter((ticket) => ticket.id !== activeTicket.id));
    setDialogOpen(false);
    toast.success("Ticket removed.");
  };

  const moveTicket = useCallback((ticketId, status) => {
    if (!COLUMNS.some((column) => column.id === status)) return;
    setTickets((current) => current.map((ticket) => (
      ticket.id === ticketId ? { ...ticket, status } : ticket
    )));
  }, []);

  const moveTicketWithinColumn = (ticketId, direction) => {
    setSortBy("manual");
    setTickets((current) => {
      const ticketIndex = current.findIndex((ticket) => ticket.id === ticketId);
      if (ticketIndex < 0) return current;
      const status = current[ticketIndex].status;
      const columnIndexes = current
        .map((ticket, index) => (ticket.status === status ? index : -1))
        .filter((index) => index >= 0);
      const position = columnIndexes.indexOf(ticketIndex);
      const nextPosition = position + direction;
      if (position < 0 || nextPosition < 0 || nextPosition >= columnIndexes.length) return current;
      const next = [...current];
      const nextIndex = columnIndexes[nextPosition];
      [next[ticketIndex], next[nextIndex]] = [next[nextIndex], next[ticketIndex]];
      return next;
    });
  };

  const moveColumn = (columnId, direction) => {
    setColumnOrder((current) => {
      const currentIndex = current.indexOf(columnId);
      const nextIndex = currentIndex + direction;
      if (currentIndex < 0 || nextIndex < 0 || nextIndex >= current.length) return current;
      const next = [...current];
      [next[currentIndex], next[nextIndex]] = [next[nextIndex], next[currentIndex]];
      return next;
    });
  };

  const beginCardDrag = (event, ticketId) => {
    if (event.button !== 0) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    pointerDragRef.current = {
      ticketId,
      element: event.currentTarget,
      startX: event.clientX,
      startY: event.clientY,
      offsetX: event.clientX - bounds.left,
      offsetY: event.clientY - bounds.top,
      moved: false,
    };
  };

  const handlePointerMove = useCallback((event) => {
    const drag = pointerDragRef.current;
    if (!drag) return;
    if (!drag.moved) {
      if (Math.hypot(event.clientX - drag.startX, event.clientY - drag.startY) < 6) return;
      drag.moved = true;
      suppressClickRef.current = true;
      const bounds = drag.element.getBoundingClientRect();
      const preview = drag.element.cloneNode(true);
      preview.removeAttribute("data-testid");
      preview.removeAttribute("aria-label");
      preview.setAttribute("aria-hidden", "true");
      preview.removeAttribute("draggable");
      preview.dataset.projectBoardDragPreview = "true";
      Object.assign(preview.style, {
        position: "fixed",
        left: `${bounds.left}px`,
        top: `${bounds.top}px`,
        width: `${bounds.width}px`,
        margin: "0",
        opacity: "1",
        zIndex: "9999",
        pointerEvents: "none",
      });
      document.body.appendChild(preview);
      dragPreviewRef.current = preview;
    }

    event.preventDefault();
    const preview = dragPreviewRef.current;
    preview.style.left = `${event.clientX - drag.offsetX}px`;
    preview.style.top = `${event.clientY - drag.offsetY}px`;
    const target = document.elementFromPoint(event.clientX, event.clientY)
      ?.closest("[data-testid^='project-board-column-']");
    setDropTarget(target?.dataset.testid?.replace("project-board-column-", "") || "");
  }, []);

  const handlePointerUp = useCallback((event) => {
    const drag = pointerDragRef.current;
    if (!drag) return;
    const didDrag = drag.moved;
    if (didDrag) {
      const target = document.elementFromPoint(event.clientX, event.clientY)
        ?.closest("[data-testid^='project-board-column-']");
      const status = target?.dataset.testid?.replace("project-board-column-", "");
      if (status && COLUMNS.some((column) => column.id === status)) {
        moveTicket(drag.ticketId, status);
      }
    }
    pointerDragRef.current = null;
    clearDragPreview();
    setDropTarget("");
    if (didDrag) window.setTimeout(() => { suppressClickRef.current = false; }, 0);
  }, [clearDragPreview, moveTicket]);

  const handleCardClick = (event, ticket) => {
    if (suppressClickRef.current) {
      event.preventDefault();
      suppressClickRef.current = false;
      return;
    }
    openTicket(ticket);
  };

  useEffect(() => {
    window.addEventListener("pointermove", handlePointerMove, { passive: false });
    window.addEventListener("pointerup", handlePointerUp);
    window.addEventListener("pointercancel", handlePointerUp);
    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
      window.removeEventListener("pointercancel", handlePointerUp);
      pointerDragRef.current = null;
      clearDragPreview();
    };
  }, [clearDragPreview, handlePointerMove, handlePointerUp]);

  return (
    <section className="space-y-5" data-testid="project-board-page">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow !tracking-[0.12em]">CollaboNet workspace</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl" data-testid="project-board-title">
            Project Board
          </h1>
          <p className="mt-1.5 text-sm leading-6 text-muted-foreground">
            Keep collaboration work moving from first draft to done.
          </p>
        </div>
        <Button
          className="h-10 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-sm hover:bg-primary/90"
          onClick={() => openNewTicket()}
          data-testid="new-ticket-button"
        >
          <Plus className="h-4 w-4" /> New ticket
        </Button>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card p-3 shadow-sm">
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
          <label className="relative min-w-[190px] flex-1 sm:max-w-xs">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search tickets..."
              className="h-9 border-input pl-9 text-sm shadow-none"
              aria-label="Search tickets"
              data-testid="board-search-input"
            />
            {search ? (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:bg-secondary hover:text-foreground"
                aria-label="Clear search"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            ) : null}
          </label>

          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger className="h-9 w-[132px] border-input bg-card text-xs" aria-label="Filter by priority" data-testid="priority-filter">
                <SelectValue placeholder="All priorities" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All priorities</SelectItem>
                {PRIORITIES.map((priority) => <SelectItem key={priority} value={priority}>{priority}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <ArrowDownWideNarrow className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="h-9 w-[132px] border-input bg-card text-xs" aria-label="Sort tickets" data-testid="board-sort-select">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="manual">Manual order</SelectItem>
                <SelectItem value="newest">Recently added</SelectItem>
                <SelectItem value="priority">Priority</SelectItem>
                <SelectItem value="alphabetical">Alphabetical</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <SlidersHorizontal className="h-4 w-4" />
          <span>{visibleTickets.length} tickets</span>
        </div>
      </div>

      <div className="-mx-1 overflow-x-auto px-1 pb-3" data-testid="project-board-scroll">
        <div className="grid min-h-[min(64vh,720px)] grid-flow-col auto-cols-[minmax(248px,1fr)] gap-3">
          {columnOrder.map((columnId, columnIndex) => {
            const column = COLUMNS.find((item) => item.id === columnId);
            const columnTickets = orderedTickets.filter((ticket) => ticket.status === column.id);
            return (
              <section
                key={column.id}
                className={`flex min-h-[min(64vh,720px)] flex-col rounded-2xl border p-2.5 transition-colors ${dropTarget === column.id ? "border-primary/50 bg-primary/5" : "border-transparent bg-muted/70"}`}
                aria-label={`${column.name}, ${columnTickets.length} tickets`}
                data-testid={`project-board-column-${column.id}`}
              >
                <div className="mb-2 flex items-center gap-2 px-1.5 py-1">
                  <span className={`h-2 w-2 rounded-full ${column.dot}`} />
                  <h2 className="text-[13px] font-semibold text-foreground">{column.name}</h2>
                  <span className="text-xs tabular-nums text-muted-foreground">
                    {columnTickets.length}/{column.limit}
                  </span>
                  <div className="ml-auto flex items-center gap-0.5">
                    <button
                      type="button"
                      onClick={() => openNewTicket(column.id)}
                      className="rounded-md p-1 text-muted-foreground transition hover:bg-card hover:text-primary"
                      aria-label={`Add ticket to ${column.name}`}
                      data-testid={`add-ticket-${column.id}`}
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => moveColumn(column.id, -1)}
                      disabled={columnIndex === 0}
                      className="rounded-md p-1 text-muted-foreground transition hover:bg-card hover:text-foreground disabled:cursor-not-allowed disabled:opacity-30"
                      aria-label={`Move ${column.name} left`}
                      data-testid={`move-column-left-${column.id}`}
                    >
                      <ArrowLeft className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => moveColumn(column.id, 1)}
                      disabled={columnIndex === columnOrder.length - 1}
                      className="rounded-md p-1 text-muted-foreground transition hover:bg-card hover:text-foreground disabled:cursor-not-allowed disabled:opacity-30"
                      aria-label={`Move ${column.name} right`}
                      data-testid={`move-column-right-${column.id}`}
                    >
                      <ArrowRight className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      className="rounded-md p-1 text-muted-foreground transition hover:bg-card hover:text-foreground"
                      aria-label={`${column.name} options`}
                      onClick={() => toast.info(`${column.name} contains ${columnTickets.length} tickets.`)}
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <div className="flex flex-1 flex-col gap-2.5">
                  {columnTickets.map((ticket, ticketIndex) => (
                    <TicketCard
                      key={ticket.id}
                      ticket={ticket}
                      onPointerDown={beginCardDrag}
                      onClick={handleCardClick}
                      onMove={moveTicketWithinColumn}
                      canMoveUp={ticketIndex > 0}
                      canMoveDown={ticketIndex < columnTickets.length - 1}
                    />
                  ))}
                  {columnTickets.length === 0 ? (
                    <div className="flex min-h-28 flex-1 items-center justify-center rounded-xl border border-dashed border-border bg-card/50 text-xs text-muted-foreground">
                      {tickets.some((ticket) => ticket.status === column.id) ? "No matching tickets" : "Drop a ticket here"}
                    </div>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => openNewTicket(column.id)}
                    className="flex items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs font-medium text-muted-foreground transition hover:bg-card hover:text-primary"
                    data-testid={`column-quick-add-${column.id}`}
                  >
                    <Plus className="h-3.5 w-3.5" /> Add ticket
                  </button>
                </div>
              </section>
            );
          })}
        </div>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg rounded-2xl" data-testid="ticket-dialog">
          <DialogHeader className="pr-7">
            <DialogTitle>{activeTicket ? `Edit ${activeTicket.id}` : "New ticket"}</DialogTitle>
            <DialogDescription>
              {activeTicket ? "Update ticket details or move it to another stage." : "Add work to the project board."}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={saveTicket} className="grid gap-4">
            <label className="grid gap-1.5 text-sm font-medium text-slate-700">
              Title <span className="text-rose-600" aria-hidden="true">*</span>
              <Input
                autoFocus
                value={form.title}
                onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
                placeholder="What needs to be done?"
                maxLength={140}
                data-testid="ticket-title-input"
              />
            </label>
            <label className="grid gap-1.5 text-sm font-medium text-slate-700">
              Description
              <Textarea
                value={form.description}
                onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
                placeholder="Add context, links, or acceptance criteria..."
                rows={3}
                maxLength={1000}
                className="resize-y"
                data-testid="ticket-description-input"
              />
            </label>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="grid gap-1.5 text-sm font-medium text-slate-700">
                Project
                <Input
                  value={form.project}
                  onChange={(event) => setForm((current) => ({ ...current, project: event.target.value }))}
                  placeholder="Project name"
                  maxLength={60}
                  data-testid="ticket-project-input"
                />
              </label>
              <label className="grid gap-1.5 text-sm font-medium text-slate-700">
                Label
                <Input
                  value={form.tag}
                  onChange={(event) => setForm((current) => ({ ...current, tag: event.target.value }))}
                  placeholder="e.g. launch"
                  maxLength={30}
                  data-testid="ticket-tag-input"
                />
              </label>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <label className="grid gap-1.5 text-sm font-medium text-slate-700">
                Priority
                <Select value={form.priority} onValueChange={(value) => setForm((current) => ({ ...current, priority: value }))}>
                  <SelectTrigger aria-label="Ticket priority" data-testid="ticket-priority-select"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PRIORITIES.map((priority) => <SelectItem key={priority} value={priority}>{priority}</SelectItem>)}
                  </SelectContent>
                </Select>
              </label>
              <label className="grid gap-1.5 text-sm font-medium text-slate-700">
                Status
                <Select value={form.status} onValueChange={(value) => setForm((current) => ({ ...current, status: value }))}>
                  <SelectTrigger aria-label="Ticket status" data-testid="ticket-status-select"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {COLUMNS.map((column) => <SelectItem key={column.id} value={column.id}>{column.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </label>
              <label className="grid gap-1.5 text-sm font-medium text-slate-700">
                Due date
                <Input
                  type="date"
                  value={form.dueDate}
                  onChange={(event) => setForm((current) => ({ ...current, dueDate: event.target.value }))}
                  data-testid="ticket-due-date-input"
                />
              </label>
            </div>
            <DialogFooter className="mt-1 gap-2 sm:justify-between">
              {activeTicket ? (
                <Button type="button" variant="ghost" className="text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={deleteTicket} data-testid="delete-ticket-button">
                  Delete ticket
                </Button>
              ) : <span />}
              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                <Button type="submit" className="bg-primary text-primary-foreground hover:bg-primary/90" data-testid="save-ticket-button">
                  {activeTicket ? "Save changes" : "Create ticket"}
                </Button>
              </div>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </section>
  );
}
