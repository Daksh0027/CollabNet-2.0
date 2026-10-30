import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowRight, Building2, Clapperboard, Handshake, FileSignature,
  CalendarCheck, Star, Loader2, Wallet, ShieldCheck, Search, Megaphone,
  MessageSquare, TrendingUp, BadgeCheck, Sparkles, PenLine, Check, PlayCircle,
} from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";
import { useAuth } from "@/lib/auth";

const GoogleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
    <path fill="#FBBC05" d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l3.66-2.84z" />
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
  </svg>
);

const STEPS = [
  { icon: Handshake, title: "Connect", body: "Sponsors and creators send requests. Accept, and a private chat unlocks." },
  { icon: FileSignature, title: "Agree", body: "Scope, deliverables, dates and pay go into a deal room. Both sides e-sign." },
  { icon: CalendarCheck, title: "Deliver", body: "The campaign lands on a shared calendar. Both dashboards track progress." },
  { icon: Star, title: "Rate", body: "Delivery confirmed, escrow released, moderated ratings close the loop." },
];

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] } },
};
const stagger = { show: { transition: { staggerChildren: 0.09 } } };

const Sparkline = () => (
  <svg viewBox="0 0 120 36" className="h-9 w-full" preserveAspectRatio="none" aria-hidden="true">
    <defs>
      <linearGradient id="spark" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="oklch(var(--primary))" stopOpacity="0.35" />
        <stop offset="100%" stopColor="oklch(var(--primary))" stopOpacity="0" />
      </linearGradient>
    </defs>
    <path d="M0,28 L18,24 L36,26 L54,16 L72,19 L90,9 L108,12 L120,4" fill="none" stroke="oklch(var(--primary))" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M0,28 L18,24 L36,26 L54,16 L72,19 L90,9 L108,12 L120,4 L120,36 L0,36 Z" fill="url(#spark)" />
  </svg>
);

function JudgeConsole({ role, setRole, onEnter, busy }) {
  const isCreator = role === "creator";
  return (
    <div className="floaty relative" data-testid="judge-console">
      <div className="pointer-events-none absolute -inset-6 rounded-[2rem] bg-primary/15 blur-3xl" />
      <div className="glass relative overflow-hidden rounded-3xl border border-border/80 p-5 shadow-2xl">
        {/* window chrome */}
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-full bg-destructive/70" />
            <span className="h-3 w-3 rounded-full bg-chart-4/70" style={{ background: "oklch(var(--chart-4))" }} />
            <span className="h-3 w-3 rounded-full bg-primary/70" />
          </div>
          <span className="eyebrow flex items-center gap-1.5">
            <span className="live-dot h-1.5 w-1.5 rounded-full bg-primary" /> live demo
          </span>
        </div>

        {/* role segmented toggle */}
        <div className="relative mb-5 flex rounded-full border border-border bg-background/60 p-1" data-testid="console-role-toggle">
          {["creator", "company"].map((r) => (
            <button
              key={r}
              onClick={() => setRole(r)}
              className="relative z-10 flex-1 rounded-full py-2 text-xs font-bold capitalize transition-colors"
              style={{ color: role === r ? "oklch(var(--primary-foreground))" : "oklch(var(--muted-foreground))" }}
              data-testid={`console-toggle-${r}`}
            >
              {r === "company" ? "Sponsor" : "Creator"}
            </button>
          ))}
          <motion.div
            className="absolute inset-y-1 w-[calc(50%-4px)] rounded-full bg-primary"
            animate={{ left: isCreator ? "4px" : "calc(50%)" }}
            transition={{ type: "spring", stiffness: 420, damping: 34 }}
          />
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={role}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.25 }}
          >
            {/* identity */}
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary font-display text-sm font-bold text-primary-foreground">
                {isCreator ? "MC" : "NA"}
              </div>
              <div>
                <p className="flex items-center gap-1.5 text-sm font-semibold">
                  {isCreator ? "Maya Chen" : "Nova Athletics"}
                  <BadgeCheck className="h-4 w-4 text-primary" />
                </p>
                <p className="eyebrow">{isCreator ? "Creator · Tech & Gadgets" : "Sponsor · Athletic wear"}</p>
              </div>
            </div>

            {/* stats */}
            <div className="mt-4 grid grid-cols-3 gap-2">
              {(isCreator
                ? [["Earnings", "$12.5k", Wallet], ["Active", "3", FileSignature], ["Rating", "4.9", Star]]
                : [["Spend", "$23.4k", Wallet], ["Briefs", "3", Megaphone], ["Creators", "6", Handshake]]
              ).map(([label, value, Icon]) => (
                <div key={label} className="rounded-xl border border-border bg-background/50 p-2.5">
                  <Icon className="h-3.5 w-3.5 text-primary" />
                  <p className="font-num mt-1.5 text-base font-semibold leading-none">{value}</p>
                  <p className="eyebrow mt-1 !text-[0.55rem]">{label}</p>
                </div>
              ))}
            </div>

            {/* earnings/spend over time */}
            <div className="mt-3 rounded-xl border border-border bg-background/50 p-3">
              <div className="flex items-center justify-between">
                <span className="eyebrow flex items-center gap-1"><TrendingUp className="h-3 w-3 text-primary" />{isCreator ? "Earnings" : "Spend"} · 6 mo</span>
                <span className="font-num text-[0.6rem] text-primary">+28%</span>
              </div>
              <Sparkline />
            </div>

            {/* live deal room / escrow */}
            <div className="mt-3 rounded-xl border border-primary/30 bg-primary/5 p-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold">Launch Week Sprint</span>
                <span className="font-num text-xs text-primary">$9,500</span>
              </div>
              <div className="mt-2 flex items-center gap-2">
                <span className="inline-flex items-center gap-1 rounded-full bg-primary/15 px-2 py-0.5 text-[0.6rem] font-semibold text-primary">
                  <ShieldCheck className="h-3 w-3" /> escrow funded
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-background/60 px-2 py-0.5 text-[0.6rem] font-semibold text-muted-foreground">
                  <PenLine className="h-3 w-3" /> e-signed ×2
                </span>
              </div>
              <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-background/70">
                <motion.div
                  className="h-full rounded-full bg-primary"
                  initial={{ width: 0 }}
                  animate={{ width: "68%" }}
                  transition={{ duration: 1.1, ease: "easeOut", delay: 0.15 }}
                />
              </div>
              <p className="mt-1.5 text-[0.6rem] text-muted-foreground">{isCreator ? "2 of 3 deliverables approved" : "On track · release on delivery"}</p>
            </div>

            <button
              onClick={() => onEnter(role)}
              disabled={busy !== ""}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-full bg-primary py-2.5 text-xs font-bold text-primary-foreground transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 hover:scale-[1.02] disabled:opacity-50 motion-reduce:transition-none"
              data-testid="console-enter-button"
            >
              {busy === role ? <Loader2 className="h-4 w-4 animate-spin" /> : <PlayCircle className="h-4 w-4" />}
              Explore this {isCreator ? "creator" : "sponsor"} demo
            </button>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

export default function Landing() {
  const { user, loading, setUser } = useAuth();
  const navigate = useNavigate();
  const [busy, setBusy] = useState("");
  const [role, setRole] = useState("creator");

  useEffect(() => {
    if (!loading && user) {
      navigate(user.verified ? "/app/overview" : user.role ? "/verify" : "/onboarding", { replace: true });
    }
  }, [user, loading, navigate]);

  const loginWithGoogle = () => {
    toast.info("Google login is unavailable in local mode. Use a demo account below.");
  };

  const demoLogin = async (r) => {
    setBusy(r);
    try {
      const { data } = await api.post("/auth/demo", { role: r });
      setUser(data);
      navigate("/app/overview");
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Demo login failed");
    } finally {
      setBusy("");
    }
  };

  return (
    <div className="grain min-h-screen overflow-x-hidden">
      {/* ambient background */}
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute inset-0 grid-bg opacity-60" />
        <div className="absolute -top-40 left-1/2 h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-primary/20 blur-[140px]" />
        <div className="absolute top-1/3 -right-40 h-96 w-96 rounded-full bg-primary/10 blur-[130px]" />
      </div>

      {/* header */}
      <header className="sticky top-0 z-50 border-b border-border/50 bg-background/70 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary font-display text-sm font-bold text-primary-foreground">C</div>
            <span className="font-display text-sm font-semibold tracking-wide">CollaboNet</span>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={loginWithGoogle}
              className="rounded-full border border-border bg-card/50 px-4 py-2 text-sm font-semibold backdrop-blur-md transition-colors hover:border-primary hover:text-primary"
              data-testid="login-google-button"
            >
              Log in
            </button>
          </div>
        </div>
      </header>

      {/* hero */}
      <section className="relative mx-auto max-w-6xl px-6 pb-24 pt-14 sm:pt-20">
        <div className="grid items-center gap-12 lg:grid-cols-[1.05fr_0.95fr]">
          <motion.div variants={stagger} initial="hidden" animate="show">
            <motion.div variants={fadeUp}>
              <span className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/5 px-3 py-1">
                <span className="live-dot h-1.5 w-1.5 rounded-full bg-primary" />
                <span className="eyebrow !text-primary">Sponsor ↔ Creator marketplace</span>
              </span>
            </motion.div>

            <motion.h1 variants={fadeUp} className="font-display mt-6 max-w-2xl text-4xl font-bold leading-[1.06] tracking-tight sm:text-5xl lg:text-6xl">
              Campaigns that start with a <span className="text-shimmer">handshake</span>, not a cold DM.
            </motion.h1>

            <motion.p variants={fadeUp} className="mt-6 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
              From first contact to signed agreement to delivered, reviewed campaign,
              with escrow-backed pay and a shared calendar. Verified brands meet verified creators.
            </motion.p>

            <motion.div variants={fadeUp} className="mt-9 flex flex-wrap items-center gap-3">
              <button
                onClick={loginWithGoogle}
                className="accent-glow flex items-center gap-3 rounded-full bg-primary px-6 py-3.5 text-sm font-bold text-primary-foreground transition-transform hover:scale-[1.03] active:scale-[0.98]"
                data-testid="signup-google-button"
              >
                <GoogleIcon /> Sign up with Google
              </button>
            </motion.div>

            <motion.div variants={fadeUp} className="mt-5">
              <p className="eyebrow mb-2 flex items-center gap-2">
              <Sparkles className="h-3.5 w-3.5 text-primary" /> no signup needed, jump into a live demo
              </p>
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={() => demoLogin("creator")}
                  disabled={busy !== ""}
                  className="pulse-ring flex items-center gap-2 rounded-full border border-primary/40 bg-primary/10 px-5 py-3 text-sm font-semibold text-primary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 hover:bg-primary/20 hover:border-primary active:scale-[0.98] disabled:opacity-50 motion-reduce:transition-none"
                  data-testid="demo-creator-button"
                >
                  {busy === "creator" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Clapperboard className="h-4 w-4" />} Enter as Creator
                </button>
                <button
                  onClick={() => demoLogin("company")}
                  disabled={busy !== ""}
                  className="flex items-center gap-2 rounded-full border border-border bg-card/60 px-5 py-3 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 hover:border-primary hover:bg-primary/5 active:scale-[0.98] disabled:opacity-50 motion-reduce:transition-none"
                  data-testid="demo-company-button"
                >
                  {busy === "company" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Building2 className="h-4 w-4 text-primary" />} Enter as Sponsor
                </button>
              </div>
            </motion.div>

            <motion.div variants={fadeUp} className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-muted-foreground">
              {["Escrow-backed pay", "Both sides e-sign", "Moderated reviews"].map((t) => (
                <span key={t} className="flex items-center gap-1.5">
                  <Check className="h-3.5 w-3.5 text-primary" /> {t}
                </span>
              ))}
            </motion.div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1], delay: 0.15 }}
          >
            <JudgeConsole role={role} setRole={setRole} onEnter={demoLogin} busy={busy} />
          </motion.div>
        </div>
      </section>

      {/* how it works — workflow deck */}
      <section className="mx-auto max-w-6xl px-6 pb-28">
        <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true, margin: "-80px" }}>
          <h2 className="font-display mt-3 max-w-xl text-2xl font-bold tracking-tight sm:text-3xl lg:text-4xl">
            One rail, first touch to final payout.
          </h2>
        </motion.div>

        <motion.div
          variants={stagger}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-60px" }}
          className="relative mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
        >
          {/* connector beam on lg */}
          <div className="beam pointer-events-none absolute left-[12%] right-[12%] top-[46px] hidden h-px lg:block" />
          {STEPS.map(({ icon: Icon, title, body }, i) => (
            <motion.div
              key={title}
              variants={fadeUp}
              className="glow-hover relative rounded-2xl border border-border bg-card/70 p-6 backdrop-blur-sm"
              data-testid={`how-step-${i}`}
            >
              <div className="relative z-10 mb-5 flex h-11 w-11 items-center justify-center rounded-full border border-primary/40 bg-background text-primary">
                <Icon className="h-5 w-5" />
              </div>
              <div className="flex items-center justify-between">
                <h3 className="font-display text-base font-semibold">{title}</h3>
                <span className="font-num text-xs text-muted-foreground">0{i + 1}</span>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">{body}</p>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* what's inside — bento grid */}
      <section className="mx-auto max-w-6xl px-6 pb-28">
        <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true, margin: "-80px" }}>
          <h2 className="font-display mt-3 max-w-xl text-2xl font-bold tracking-tight sm:text-3xl lg:text-4xl">
            Everything a collaboration needs, in one room.
          </h2>
        </motion.div>

        <motion.div
          variants={stagger}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-60px" }}
          className="mt-10 grid grid-cols-1 gap-4 md:grid-cols-6 lg:grid-cols-12"
        >
          {/* Deal rooms — big */}
          <motion.div variants={fadeUp} className="glow-hover glass relative overflow-hidden rounded-3xl border border-border p-6 md:col-span-6 lg:col-span-7" data-testid="feature-card-0">
            <div className="flex items-center gap-2">
              <FileSignature className="h-5 w-5 text-primary" />
              <h3 className="font-display text-base font-semibold text-primary">Deal rooms with escrow</h3>
            </div>
            <p className="mt-2 max-w-md text-sm text-muted-foreground">
              One place per collaboration: auto-drafted agreement, two-sided e-signature, Stripe escrow and a live status trail.
            </p>
            <div className="mt-5 rounded-2xl border border-border bg-background/50 p-4">
              <div className="flex items-center justify-between text-sm">
                <span className="font-semibold">Launch Week Sprint</span>
                <span className="font-num text-primary">$9,500</span>
              </div>
              <div className="mt-3 space-y-2">
                {[["Agreement drafted", true], ["Creator signed", true], ["Sponsor signed", true], ["Escrow funded", true], ["Delivered → funds released", false]].map(([label, done]) => (
                  <div key={label} className="flex items-center gap-2 text-xs">
                    <span className={`flex h-4 w-4 items-center justify-center rounded-full ${done ? "bg-primary text-primary-foreground" : "border border-border text-muted-foreground"}`}>
                      {done ? <Check className="h-2.5 w-2.5" /> : <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground" />}
                    </span>
                    <span className={done ? "text-foreground" : "text-muted-foreground"}>{label}</span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>

          {/* Influencer connect */}
          <motion.div variants={fadeUp} className="glow-hover glass relative overflow-hidden rounded-3xl border border-border p-6 md:col-span-6 lg:col-span-5" data-testid="feature-card-1">
            <div className="flex items-center gap-2">
              <Search className="h-5 w-5 text-primary" />
              <h3 className="font-display text-base font-semibold text-primary">Influencer Connect</h3>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">Search verified creators by niche, platform and follower range.</p>
            <div className="mt-5 space-y-2">
              {[["Maya Chen", "Tech · 850k"], ["Priya Nair", "Beauty · 310k"], ["Dario Velez", "Travel · 420k"]].map(([n, m]) => (
                <div key={n} className="flex items-center gap-3 rounded-xl border border-border bg-background/50 p-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-[0.65rem] font-bold text-primary-foreground">
                    {n.split(" ").map((w) => w[0]).join("")}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold">{n}</p>
                    <p className="eyebrow !text-[0.55rem]">{m}</p>
                  </div>
                  <BadgeCheck className="h-4 w-4 shrink-0 text-primary" />
                </div>
              ))}
            </div>
          </motion.div>

          {/* three equal */}
          {[
            { icon: Megaphone, title: "Campaign briefs", body: "Publish deliverables, timing and budget — creators apply or get invited." },
            { icon: CalendarCheck, title: "Shared calendar", body: "A kanban board plus a month grid with color-coded campaign events." },
            { icon: Star, title: "Moderated reviews", body: "Ratings only after delivery — banned words get held, disputes stay private." },
          ].map((f, i) => (
            <motion.div key={f.title} variants={fadeUp} className="glow-hover glass rounded-3xl border border-border p-6 md:col-span-2 lg:col-span-4" data-testid={`feature-card-${i + 2}`}>
              <f.icon className="h-5 w-5 text-primary" />
              <h3 className="font-display mt-4 text-sm font-semibold">{f.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{f.body}</p>
            </motion.div>
          ))}

          {/* AI helpers — wide */}
          <motion.div variants={fadeUp} className="glow-hover glass relative overflow-hidden rounded-3xl border border-primary/30 p-6 md:col-span-6 lg:col-span-12" data-testid="feature-card-5">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="max-w-xl">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-primary" />
                  <h3 className="font-display text-base font-semibold text-primary">AI helpers + campaign analytics</h3>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">
                  Thread summaries, outreach drafts and rate benchmarks, plus spend, earnings and outcome charts on every dashboard.
                </p>
              </div>
              <div className="flex items-center gap-2">
                {["Summarize", "Draft outreach", "Benchmark rate"].map((t) => (
                  <span key={t} className="rounded-full border border-primary/30 bg-primary/5 px-3 py-1.5 text-xs font-semibold text-primary">{t}</span>
                ))}
              </div>
            </div>
          </motion.div>
        </motion.div>
      </section>

      {/* final CTA */}
      <section className="mx-auto max-w-6xl px-6 pb-28">
        <motion.div
          variants={fadeUp}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-80px" }}
          className="glass relative overflow-hidden rounded-[2rem] border border-primary/30 px-8 py-14 text-center"
        >
          <div className="pointer-events-none absolute left-1/2 top-0 h-56 w-56 -translate-x-1/2 rounded-full bg-primary/25 blur-[100px]" />
          <h2 className="font-display relative mx-auto max-w-2xl text-2xl font-bold tracking-tight sm:text-3xl lg:text-4xl">
            Pick a side and watch the whole flow in 60 seconds.
          </h2>
          <p className="relative mx-auto mt-4 max-w-md text-sm text-muted-foreground">
            No account, no setup. Enter a seeded demo and explore deal rooms, escrow, calendar and analytics.
          </p>
          <div className="relative mt-8 flex flex-wrap justify-center gap-3">
            <button
              onClick={() => demoLogin("creator")}
              disabled={busy !== ""}
              className="accent-glow flex items-center gap-2 rounded-full bg-primary px-6 py-3.5 text-sm font-bold text-primary-foreground transition-transform hover:scale-[1.03] disabled:opacity-50"
              data-testid="cta-demo-creator-button"
            >
              {busy === "creator" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Clapperboard className="h-4 w-4" />} Launch Creator demo
            </button>
            <button
              onClick={() => demoLogin("company")}
              disabled={busy !== ""}
              className="flex items-center gap-2 rounded-full border border-border bg-card/60 px-6 py-3.5 text-sm font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 hover:border-primary hover:bg-primary/5 disabled:opacity-50 motion-reduce:transition-none"
              data-testid="cta-demo-company-button"
            >
              {busy === "company" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Building2 className="h-4 w-4 text-primary" />} Launch Sponsor demo
            </button>
          </div>
        </motion.div>
      </section>

      <footer className="border-t border-border py-10 text-center">
        <p className="eyebrow">CollaboNet, MVP build. Verification and payments are simulated in this phase.</p>
      </footer>
    </div>
  );
}
