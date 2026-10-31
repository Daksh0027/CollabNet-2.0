import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import {
  ArrowUpRight, Bell, Check, ChevronRight, CircleCheck, FileSignature,
  Flag, Handshake, Mail, Megaphone, MoreHorizontal, Search, Sparkles,
  TrendingUp, Users, Wallet, X,
} from "lucide-react";
import { toast } from "sonner";
import api, { fmtMoney, timeAgo } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { UserAvatar } from "@/components/common";
import { Button } from "@/components/ui/button";

const NEXT_LINKS = {
  "Connect your social": { label: "Verify now", to: "/verify" },
  "Add your rates": { label: "Add rates", to: "/app/account" },
  "e-signature": { label: "Open contracts", to: "/app/contracts" },
  calendar: { label: "Open calendar", to: "/app/calendar" },
  "Publish your first": { label: "Publish a brief", to: "/app/campaigns" },
  Explore: { label: "Explore", to: "/app/explore" },
};

const chartLines = [
  "M0 94 L55 116 L110 95 L165 110 L220 78 L275 112 L330 97 L385 75 L440 42",
  "M0 72 L55 91 L110 66 L165 83 L220 49 L275 80 L330 65 L385 53 L440 42",
  "M0 93 L55 105 L110 88 L165 53 L220 52 L275 77 L330 61 L385 52 L440 42",
];

function Card({ children, className = "" }) {
  return <section className={`rounded-2xl border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.02)] ${className}`}>{children}</section>;
}

function MiniIcon({ children, className = "" }) {
  return <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-500 ${className}`}>{children}</span>;
}

function ReachChart() {
  return (
    <Card className="p-4 sm:p-5">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-sm font-semibold text-slate-900">Reach Chart</h2>
          <p className="mt-1 text-[10px] text-slate-400">Creator content reach about your brand · illustrative sample</p>
        </div>
        <div className="hidden items-center gap-3 text-[10px] text-slate-400 sm:flex">
          {["Maya", "Alex", "Sam"].map((name, index) => (
            <span key={name} className="flex items-center gap-1">
              <span className={`h-1.5 w-1.5 rounded-full ${index === 0 ? "bg-blue-500" : "bg-slate-300"}`} />
              {name}
            </span>
          ))}
        </div>
      </div>
      <div className="mt-3 flex gap-2">
        <div className="flex h-[145px] flex-col justify-between pb-3 pt-1 text-[9px] text-slate-300">
          {["100k", "75k", "50k", "25k", "0"].map((label) => <span key={label}>{label}</span>)}
        </div>
        <div className="min-w-0 flex-1">
          <svg viewBox="0 0 440 130" className="h-[145px] w-full overflow-visible" preserveAspectRatio="none" aria-label="Reach chart">
            {[8, 39, 70, 101, 130].map((y) => <line key={y} x1="0" x2="440" y1={y} y2={y} stroke="#edf1f7" strokeWidth="1" />)}
            {chartLines.map((line, index) => <path key={line} d={line} fill="none" stroke={index === 1 ? "#146cff" : "#7eaaff"} strokeWidth={index === 1 ? "2" : "1.5"} strokeLinecap="round" />)}
          </svg>
          <div className="flex justify-between px-1 text-[9px] text-slate-300">
            {["Jan", "Feb", "Mar", "Apr", "May", "Jun"].map((month) => <span key={month}>{month}</span>)}
          </div>
        </div>
      </div>
    </Card>
  );
}

function MetricCard({ label, value, sub, icon: Icon, active = false, testId }) {
  return (
    <div className={`min-h-[104px] rounded-2xl border p-4 ${active ? "border-blue-500 bg-[#2f78f6] text-white shadow-[0_8px_20px_rgba(47,120,246,0.22)]" : "border-slate-200/80 bg-white text-slate-900"}`} data-testid={testId}>
      <div className="flex items-start justify-between gap-2">
        <p className={`text-[11px] font-medium ${active ? "text-white/85" : "text-slate-500"}`}>{label}</p>
        <span className={`flex h-6 w-6 items-center justify-center rounded-full ${active ? "bg-white/15" : "bg-blue-50 text-blue-500"}`}><Icon className="h-3.5 w-3.5" /></span>
      </div>
      <p className="mt-2 text-2xl font-semibold tracking-tight">{value}</p>
      <p className={`mt-1 text-[9px] ${active ? "text-white/80" : "text-slate-400"}`}>{sub}</p>
    </div>
  );
}

function WeeklyAnalysis() {
  const bars = [14, 42, 63, 42, 59, 27, 16];
  return (
    <Card className="p-4">
      <div className="flex items-start justify-between">
        <div><h2 className="text-sm font-semibold text-slate-900">Weekly Analysis</h2><p className="mt-1 text-[9px] text-slate-400">Updates per day · illustrative sample</p></div>
        <span className="rounded-full bg-blue-50 px-2 py-1 text-[9px] font-medium text-blue-500">12 this week</span>
      </div>
      <div className="mt-5 flex h-[112px] items-end justify-between gap-2 px-1">
        {bars.map((height, index) => (
          <div key={index} className="flex h-full flex-1 flex-col items-center justify-end gap-1">
            <span className="text-[8px] text-slate-400">{index === 2 || index === 4 ? 3 : index % 2 ? 2 : 1}</span>
            <div className={`w-full max-w-[16px] rounded-full ${index === 2 || index === 4 ? "bg-[repeating-linear-gradient(135deg,#d9e7ff_0,#d9e7ff_2px,#5d95ff_2px,#5d95ff_3px)]" : "bg-blue-500"}`} style={{ height: `${height}px` }} />
            <span className="text-[8px] text-slate-400">{["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][index]}</span>
          </div>
        ))}
      </div>
      <p className="mt-3 flex items-center gap-1 text-[9px] text-blue-500"><span className="h-1.5 w-1.5 rounded-full bg-blue-500" /> Updated</p>
    </Card>
  );
}

export default function Overview() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { data, isLoading } = useQuery({ queryKey: ["overview"], queryFn: async () => (await api.get("/overview")).data });

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

  if (isLoading || !data) return <div className="py-24 text-center text-sm text-muted-foreground" data-testid="overview-loading">Loading dashboard…</div>;

  const isCreator = data.role === "creator";
  const firstName = (user?.display_name || "").split(" ")[0] || "there";
  const nextLink = Object.entries(NEXT_LINKS).find(([key]) => data.next_step.includes(key));
  const tiles = isCreator
    ? [
      ["Connected Creators", data.tiles.connections, "accepted", Users, true, "tile-connections"],
      ["Total Revenue", fmtMoney(data.tiles.earnings), "from completed campaigns", Wallet, false, "tile-earnings"],
      ["Active Deals", data.tiles.active_deals, "in review or upcoming", FileSignature, false, "tile-active-deals"],
      ["Completed Collabs", data.tiles.collaborations, "completed & rated", Handshake, false, "tile-collaborations"],
    ]
    : [
      ["Connected Creators", data.tiles.connected_creators, "accepted connections", Users, true, "tile-connected-creators"],
      ["Open Briefs", data.tiles.open_briefs, "live campaign posts", Megaphone, false, "tile-open-briefs"],
      ["In Negotiation", data.tiles.in_negotiation, "active deal rooms", FileSignature, false, "tile-in-negotiation"],
      ["Total Spend", fmtMoney(data.tiles.total_spend), "completed campaigns", Wallet, false, "tile-total-spend"],
    ];

  return (
    <div className="-mx-4 -my-6 min-h-[calc(100vh-57px)] bg-[#f5f6f8] px-4 py-4 sm:-mx-6 sm:px-6 lg:-mx-8 lg:-my-8 lg:px-8 lg:py-5" data-testid="overview-page">
      <div className="mx-auto max-w-[1240px]">
        <div className="mb-5 flex items-center gap-3 rounded-2xl border border-slate-200/80 bg-white px-4 py-2.5">
          <Search className="h-4 w-4 text-slate-400" />
          <input className="min-w-0 flex-1 bg-transparent text-xs outline-none placeholder:text-slate-400" placeholder="Search your workspace" aria-label="Search your workspace" />
          <span className="hidden rounded-md bg-slate-100 px-1.5 py-0.5 text-[9px] text-slate-400 sm:inline">⌘ K</span>
          <button onClick={() => navigate("/app/notifications")} className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100" aria-label="Notifications"><Bell className="h-4 w-4" /></button>
          <button onClick={() => navigate("/app/account")} className="flex items-center gap-2 border-l border-slate-100 pl-3 text-left">
            <UserAvatar user={user} className="h-7 w-7" />
            <span className="hidden text-[10px] font-semibold text-slate-700 sm:block">{firstName}<small className="block font-normal text-slate-400">{isCreator ? "Creator" : "Sponsor"}</small></span>
          </button>
        </div>

        <div className="mb-4">
          <h1 className="text-xl font-semibold tracking-tight text-slate-900">Welcome back, {firstName}</h1>
          <p className="mt-1 text-[10px] text-slate-400">{isCreator ? "Your creator dashboard — connections, deals and earnings." : "Your sponsor dashboard — roster, briefs and negotiations."}</p>
        </div>

        <div className="grid gap-3 xl:grid-cols-[minmax(0,1.55fr)_minmax(360px,0.85fr)]">
          <div className="space-y-3">
            <ReachChart />
            <Card className="p-4 sm:p-5">
              <div className="flex items-center justify-between"><h2 className="text-sm font-semibold text-slate-900">{isCreator ? "Recent collaborations" : "Recent activity"}</h2><ArrowUpRight className="h-4 w-4 text-slate-400" /></div>
              {isCreator && data.recent_collaborations.length > 0 ? data.recent_collaborations.map((collab) => (
                <div key={collab.deal_id} className="mt-4 flex items-center gap-3 border-b border-slate-100 pb-3 last:border-0 last:pb-0">
                  <MiniIcon><Flag className="h-4 w-4" /></MiniIcon>
                  <div className="min-w-0 flex-1"><p className="truncate text-xs font-semibold text-slate-800">{collab.title}</p><p className="mt-1 text-[9px] text-slate-400">with {collab.other?.display_name} · delivered</p></div>
                  <span className="text-sm font-semibold text-blue-600">{fmtMoney(collab.compensation)}</span>
                </div>
              )) : <p className="py-8 text-center text-xs text-slate-400">No completed collaborations yet.</p>}
              {isCreator && data.recent_collaborations.length > 0 ? <div className="mt-3 flex items-center justify-between"><span className="rounded-full bg-blue-50 px-2 py-1 text-[8px] text-blue-500">Delivered</span><span className="flex items-center gap-1 text-[9px] text-slate-400"><CircleCheck className="h-3 w-3 text-blue-500" /> 5/5 completed & rated</span></div> : null}
            </Card>
            <Card className="p-4 sm:p-5">
              <h2 className="text-sm font-semibold text-slate-900">Activity</h2>
              <div className="mt-3 divide-y divide-slate-100">
                {data.activities.length === 0 ? <p className="py-4 text-xs text-slate-400">Nothing yet — your actions will be logged here.</p> : data.activities.slice(0, 3).map((activity) => (
                  <div key={activity.act_id} className="flex items-start gap-3 py-3 first:pt-0 last:pb-0"><MiniIcon><Mail className="h-3.5 w-3.5" /></MiniIcon><div className="min-w-0 flex-1"><p className="text-[10px] text-slate-700">{activity.text}</p><p className="mt-1 text-[9px] text-slate-400">{timeAgo(activity.created_at)}</p></div></div>
                ))}
              </div>
            </Card>
          </div>

          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              {tiles.map(([label, value, sub, Icon, active, testId]) => <MetricCard key={testId} label={label} value={value} sub={sub} icon={Icon} active={active} testId={testId} />)}
            </div>
            <WeeklyAnalysis />
            <Card className="border-blue-100 bg-[#eef5ff] p-4">
              <p className="flex items-center gap-1.5 text-[10px] font-medium text-blue-500"><Sparkles className="h-3 w-3" /> Next step</p>
              <p className="mt-2 text-xs font-semibold text-slate-800" data-testid="next-step-text">{data.next_step}</p>
              {nextLink ? <Button size="sm" className="mt-3 h-8 rounded-full bg-blue-600 px-3 text-[10px] hover:bg-blue-500" onClick={() => navigate(nextLink[1].to)} data-testid="next-step-action-button">{nextLink[1].label} <ArrowUpRight className="ml-1 h-3 w-3" /></Button> : null}
            </Card>
            <Card className="p-4">
              <div className="flex items-center justify-between"><h2 className="text-sm font-semibold text-slate-900">{isCreator ? "Sponsor invitations" : "Connection requests"}</h2><MoreHorizontal className="h-4 w-4 text-slate-400" /></div>
              {isCreator ? data.invitations.length === 0 ? <div className="flex flex-col items-center py-7 text-center"><MiniIcon className="mb-2"><Megaphone className="h-3.5 w-3.5" /></MiniIcon><p className="text-[10px] font-semibold text-slate-700">No invitations yet</p><p className="mt-2 max-w-[200px] text-[9px] leading-4 text-slate-400">Sponsors can invite you to their campaigns — it shows up here.</p></div> : data.invitations.map((inv) => <div key={inv.app_id} className="mt-3 flex items-center gap-2"><UserAvatar user={inv.company} className="h-8 w-8" /><div className="min-w-0 flex-1"><p className="truncate text-xs font-semibold">{inv.company?.display_name}</p><p className="truncate text-[9px] text-slate-400">{inv.campaign_title}</p></div><div className="flex gap-1"><button onClick={() => act(() => api.post(`/applications/${inv.app_id}/accept`))} className="rounded-full bg-blue-600 p-1.5 text-white" aria-label="Accept invitation"><Check className="h-3 w-3" /></button><button onClick={() => act(() => api.post(`/applications/${inv.app_id}/decline`))} className="rounded-full bg-slate-100 p-1.5 text-slate-500" aria-label="Decline invitation"><X className="h-3 w-3" /></button></div></div>) : data.requests_in.length === 0 ? <div className="flex flex-col items-center py-7 text-center"><MiniIcon className="mb-2"><Users className="h-3.5 w-3.5" /></MiniIcon><p className="text-[10px] font-semibold text-slate-700">No pending requests</p><p className="mt-2 max-w-[200px] text-[9px] leading-4 text-slate-400">Connection requests from creators land here.</p></div> : data.requests_in.map((request) => <div key={request.conn_id} className="mt-3 flex items-center gap-2"><UserAvatar user={request.other} className="h-8 w-8" /><p className="min-w-0 flex-1 truncate text-xs font-semibold">{request.other?.display_name}</p><button onClick={() => act(() => api.post(`/connections/${request.conn_id}/accept`))} className="rounded-full bg-blue-600 p-1.5 text-white" aria-label="Accept request"><Check className="h-3 w-3" /></button></div>)}
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
