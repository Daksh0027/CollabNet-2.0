import axios from "axios";

const api = axios.create({
  baseURL: `${process.env.REACT_APP_BACKEND_URL}/api`,
  withCredentials: true,
});

export const fmtMoney = (n) =>
  "$" + Number(n || 0).toLocaleString(undefined, { maximumFractionDigits: 0 });

export const fmtNum = (n) => {
  n = Number(n || 0);
  if (n >= 1e6) return (n / 1e6).toFixed(1).replace(/\.0$/, "") + "M";
  if (n >= 1e3) return Math.round(n / 1e3) + "K";
  return String(n);
};

export const fmtDate = (iso) => {
  if (!iso) return "TBD";
  const d = new Date(iso);
  if (isNaN(d)) return iso;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
};

export const timeAgo = (iso) => {
  if (!iso) return "";
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
};

export const STATUS_STYLES = {
  pending: "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30",
  accepted: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30",
  declined: "bg-red-500/15 text-red-700 dark:text-red-400 border-red-500/30",
  in_review: "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30",
  upcoming: "bg-sky-500/15 text-sky-700 dark:text-sky-400 border-sky-500/30",
  active: "bg-orange-500/15 text-orange-700 dark:text-orange-400 border-orange-500/30",
  completed: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30",
  disputed: "bg-red-500/15 text-red-700 dark:text-red-400 border-red-500/30",
  open: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30",
  closed: "bg-neutral-500/15 text-neutral-600 dark:text-neutral-400 border-neutral-500/30",
  approved: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30",
  scheduled: "bg-sky-500/15 text-sky-700 dark:text-sky-400 border-sky-500/30",
  unfunded: "bg-neutral-500/15 text-neutral-600 dark:text-neutral-400 border-neutral-500/30",
  funded: "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30",
  released: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30",
};

export default api;
