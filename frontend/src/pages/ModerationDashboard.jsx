import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Loader2,
  ShieldCheck,
  ShieldAlert,
  ShieldX,
  Bot,
  Timer,
  Flag,
  X,
} from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";
import { EmptyState } from "@/components/common";

export default function ModerationDashboard() {
  const qc = useQueryClient();
  const [decisionFilter, setDecisionFilter] = useState("");

  const { data: me } = useQuery({
    queryKey: ["moderation-me"],
    queryFn: async () => (await api.get("/moderation/me")).data,
  });

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["moderation-stats"],
    queryFn: async () => (await api.get("/moderation/stats")).data,
    enabled: !!me?.is_admin,
    refetchInterval: 15000,
  });

  const { data: events, isLoading: eventsLoading } = useQuery({
    queryKey: ["moderation-events", decisionFilter],
    queryFn: async () =>
      (
        await api.get("/moderation/events", {
          params: { limit: 60, ...(decisionFilter ? { decision: decisionFilter } : {}) },
        })
      ).data,
    enabled: !!me?.is_admin,
    refetchInterval: 15000,
  });

  const reportFalsePositive = async (eventId) => {
    try {
      await api.post(`/moderation/events/${eventId}/false-positive`);
      toast.success("Marked as false positive");
      qc.invalidateQueries({ queryKey: ["moderation-stats"] });
      qc.invalidateQueries({ queryKey: ["moderation-events"] });
    } catch {
      toast.error("Could not mark false positive");
    }
  };

  if (me === undefined) {
    return <FullLoader />;
  }

  if (!me?.is_admin) {
    return (
      <div className="flex h-full items-center justify-center p-8" data-testid="moderation-denied">
        <EmptyState
          icon={ShieldX}
          title="Admin access required"
          body="This dashboard is only available to moderation administrators."
          testId="moderation-denied-state"
        />
      </div>
    );
  }

  const cards = stats
    ? [
        { label: "Messages checked", value: stats.totalChecked, icon: ShieldCheck, testId: "stat-total-checked" },
        { label: "Blocked", value: stats.blocked, icon: ShieldAlert, testId: "stat-blocked" },
        { label: "Approved", value: stats.approved, icon: ShieldCheck, testId: "stat-approved" },
        { label: "AI classified", value: stats.aiClassified, icon: Bot, testId: "stat-ai-classified" },
        { label: "AI failures", value: stats.aiFailures, icon: ShieldX, testId: "stat-ai-failures" },
        { label: "Held (fail-closed)", value: stats.held, icon: Timer, testId: "stat-held" },
        { label: "Avg latency (ms)", value: stats.avgLatencyMs, icon: Timer, testId: "stat-latency" },
        { label: "False positives", value: stats.falsePositiveReports, icon: Flag, testId: "stat-false-positives" },
      ]
    : [];

  const maxCategory = Math.max(1, ...(stats?.categoryDistribution || []).map((c) => c.count));

  return (
    <div className="h-full overflow-y-auto" data-testid="moderation-dashboard">
      <div className="mx-auto max-w-6xl space-y-6 p-5 sm:p-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Chat Moderation</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Contact-information prevention across all conversations — hybrid deterministic + AI detection.
          </p>
        </div>

        {statsLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4" data-testid="moderation-stats-grid">
              {cards.map(({ label, value, icon: Icon, testId }) => (
                <div
                  key={label}
                  className="rounded-2xl border border-border/80 bg-card/60 p-4 shadow-xs"
                  data-testid={testId}
                >
                  <div className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                    <Icon className="h-3.5 w-3.5" /> {label}
                  </div>
                  <p className="mt-1.5 font-num text-2xl font-bold">{value ?? 0}</p>
                </div>
              ))}
            </div>

            <div className="rounded-2xl border border-border/80 bg-card/60 p-5 shadow-xs">
              <p className="eyebrow mb-3 font-semibold">Detections by category</p>
              {stats?.categoryDistribution?.length ? (
                <div className="space-y-2" data-testid="category-distribution">
                  {stats.categoryDistribution.map((c) => (
                    <div key={c.category} className="flex items-center gap-3 text-xs">
                      <span className="w-56 shrink-0 truncate font-medium text-foreground/90">
                        {c.category.replaceAll("_", " ").toLowerCase()}
                      </span>
                      <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-secondary">
                        <div
                          className="h-full rounded-full bg-primary transition-all duration-300"
                          style={{ width: `${(c.count / maxCategory) * 100}%` }}
                        />
                      </div>
                      <span className="font-num w-8 text-right text-muted-foreground">{c.count}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">No moderation events recorded yet.</p>
              )}
            </div>

            <div className="rounded-2xl border border-border/80 bg-card/60 shadow-xs">
              <div className="flex items-center justify-between border-b border-border/80 px-5 py-3.5">
                <p className="eyebrow font-semibold">Recent moderation events</p>
                <div className="flex gap-1">
                  {["", "BLOCKED", "APPROVED", "HELD"].map((f) => (
                    <button
                      key={f || "all"}
                      onClick={() => setDecisionFilter(f)}
                      className={`rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors ${
                        decisionFilter === f
                          ? "bg-primary text-primary-foreground"
                          : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                      }`}
                      data-testid={`event-filter-${f ? f.toLowerCase() : "all"}`}
                    >
                      {f ? f.charAt(0) + f.slice(1).toLowerCase() : "All"}
                    </button>
                  ))}
                </div>
              </div>

              {eventsLoading ? (
                <div className="flex justify-center py-10">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : events?.length ? (
                <div className="overflow-x-auto" data-testid="moderation-events-table">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="text-left text-muted-foreground">
                        <th className="px-5 py-2 font-medium">Time</th>
                        <th className="px-3 py-2 font-medium">Category</th>
                        <th className="px-3 py-2 font-medium">Decision</th>
                        <th className="px-3 py-2 font-medium">Method</th>
                        <th className="px-3 py-2 font-medium">Risk</th>
                        <th className="px-3 py-2 font-medium">Matches (masked)</th>
                        <th className="px-3 py-2 font-medium"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {events.map((ev) => (
                        <tr key={ev.event_id} className="border-t border-border/60">
                          <td className="whitespace-nowrap px-5 py-2.5 text-muted-foreground">
                            {new Date(ev.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </td>
                          <td className="px-3 py-2.5">
                            {ev.category ? ev.category.replaceAll("_", " ").toLowerCase() : "—"}
                            {ev.platform ? ` · ${ev.platform.toLowerCase()}` : ""}
                          </td>
                          <td className="px-3 py-2.5">
                            <span
                              className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                                ev.decision === "BLOCKED"
                                  ? "bg-red-500/15 text-red-600 dark:text-red-400"
                                  : ev.decision === "HELD"
                                    ? "bg-amber-500/15 text-amber-600 dark:text-amber-400"
                                    : "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                              }`}
                            >
                              {ev.decision.toLowerCase()}
                            </span>
                          </td>
                          <td className="px-3 py-2.5 text-muted-foreground">{ev.detectionMethod.toLowerCase()}</td>
                          <td className="font-num px-3 py-2.5">{ev.riskScore}</td>
                          <td className="px-3 py-2.5 font-num text-muted-foreground">
                            {ev.matched_masked?.length ? ev.matched_masked.join(", ") : "—"}
                          </td>
                          <td className="px-3 py-2.5 text-right">
                            {!ev.reported_false_positive ? (
                              <button
                                onClick={() => reportFalsePositive(ev.event_id)}
                                className="rounded-lg px-2 py-1 text-[11px] font-medium text-muted-foreground hover:bg-secondary hover:text-foreground"
                                data-testid={`false-positive-${ev.event_id}`}
                              >
                                <Flag className="mr-1 inline h-3 w-3" /> False positive
                              </button>
                            ) : (
                              <span className="text-[11px] text-muted-foreground">reported</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-6">
                  <EmptyState
                    icon={ShieldCheck}
                    title="No events"
                    body="Moderation events will appear here as messages flow through the pipeline."
                    testId="events-empty"
                  />
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function FullLoader() {
  return (
    <div className="flex h-full items-center justify-center p-8" data-testid="moderation-loader">
      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
    </div>
  );
}
