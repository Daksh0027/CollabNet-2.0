import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Building2, Clapperboard, Handshake, FileSignature, CalendarCheck, Star, Loader2 } from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";
import { useAuth } from "@/lib/auth";
import ThemeToggle from "@/components/ThemeToggle";

const GoogleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
    <path fill="#FBBC05" d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l3.66-2.84z" />
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
  </svg>
);

const STEPS = [
  { icon: Handshake, title: "Connect", body: "Sponsors and creators send connection requests. Accept, and chat unlocks." },
  { icon: FileSignature, title: "Agree", body: "Scope, deliverables, dates and pay go into a deal room. Both sides e-sign." },
  { icon: CalendarCheck, title: "Deliver", body: "The campaign lands on a shared calendar. Both dashboards track progress." },
  { icon: Star, title: "Rate", body: "Delivery is confirmed and moderated ratings close the loop. Disputes stay private." },
];

const FEATURES = [
  { title: "Influencer Connect", body: "Search creators by niche, platform and follower range." },
  { title: "Campaign briefs", body: "Publish deliverables, timing and budget — creators apply or get invited." },
  { title: "Deal rooms", body: "One place per collaboration: agreement, signatures, status, history." },
  { title: "Shared calendar", body: "Kanban board plus a month grid with color-coded events." },
  { title: "AI helpers", body: "Thread summaries, outreach drafts and rate benchmarks (once a key is added)." },
  { title: "Moderated reviews", body: "Ratings only after delivery — no public accusations, ever." },
];

export default function Landing() {
  const { user, loading, setUser } = useAuth();
  const navigate = useNavigate();
  const [busy, setBusy] = useState("");

  useEffect(() => {
    if (!loading && user) {
      navigate(user.verified ? "/app/overview" : user.role ? "/verify" : "/onboarding", { replace: true });
    }
  }, [user, loading, navigate]);

  const loginWithGoogle = () => {
    // REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
    const redirectUrl = window.location.origin + "/app";
    window.location.href = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;
  };

  const demoLogin = async (role) => {
    setBusy(role);
    try {
      const { data } = await api.post("/auth/demo", { role });
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
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary font-display text-sm font-bold text-primary-foreground">C</div>
          <span className="font-display text-sm font-semibold tracking-wide">CollaboNet</span>
        </div>
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <button
            onClick={loginWithGoogle}
            className="rounded-full border border-border px-4 py-2 text-sm font-semibold transition-colors hover:border-primary hover:text-primary"
            data-testid="login-google-button"
          >
            Log in
          </button>
        </div>
      </header>

      <section className="relative mx-auto max-w-6xl px-6 pb-24 pt-16 sm:pt-24">
        <div className="pointer-events-none absolute -top-20 right-0 h-96 w-96 rounded-full bg-primary/20 blur-[120px]" />
        <p className="eyebrow rise">Sponsor ↔ Creator marketplace</p>
        <h1 className="font-display rise mt-6 max-w-3xl text-4xl font-bold leading-[1.08] tracking-tight sm:text-5xl lg:text-6xl" style={{ animationDelay: "60ms" }}>
          Campaigns that start with a <span className="text-primary">handshake</span>, not a cold DM.
        </h1>
        <p className="rise mt-6 max-w-xl text-base text-muted-foreground sm:text-lg" style={{ animationDelay: "120ms" }}>
          CollaboNet connects verified companies with verified creators — from first
          contact to signed agreement to delivered, reviewed campaign.
        </p>
        <div className="rise mt-10 flex flex-wrap items-center gap-4" style={{ animationDelay: "180ms" }}>
          <button
            onClick={loginWithGoogle}
            className="accent-glow flex items-center gap-3 rounded-full bg-primary px-6 py-3.5 text-sm font-bold text-primary-foreground transition-transform hover:scale-[1.02]"
            data-testid="signup-google-button"
          >
            <GoogleIcon /> Sign up with Google
          </button>
          <ArrowRight className="h-4 w-4 text-muted-foreground" />
          <span className="eyebrow">or explore a demo account</span>
          <button
            onClick={() => demoLogin("creator")}
            disabled={busy !== ""}
            className="flex items-center gap-2 rounded-full border border-border px-5 py-3 text-sm font-semibold transition-colors hover:border-primary disabled:opacity-50"
            data-testid="demo-creator-button"
          >
            {busy === "creator" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Clapperboard className="h-4 w-4 text-primary" />} Creator
          </button>
          <button
            onClick={() => demoLogin("company")}
            disabled={busy !== ""}
            className="flex items-center gap-2 rounded-full border border-border px-5 py-3 text-sm font-semibold transition-colors hover:border-primary disabled:opacity-50"
            data-testid="demo-company-button"
          >
            {busy === "company" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Building2 className="h-4 w-4 text-primary" />} Company / Sponsor
          </button>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 pb-24">
        <p className="eyebrow">How it works</p>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map(({ icon: Icon, title, body }, i) => (
            <div key={title} className="rounded-2xl border border-border bg-card p-6 transition-colors hover:border-primary/40" data-testid={`how-step-${i}`}>
              <div className="flex items-center justify-between">
                <Icon className="h-5 w-5 text-primary" />
                <span className="font-num text-xs text-muted-foreground">0{i + 1}</span>
              </div>
              <h3 className="font-display mt-4 text-base font-semibold">{title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 pb-24">
        <p className="eyebrow">What's inside</p>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f, i) => (
            <div key={f.title} className="glass rounded-2xl border border-border p-6" data-testid={`feature-card-${i}`}>
              <h3 className="font-display text-sm font-semibold text-primary">{f.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t border-border py-10 text-center">
        <p className="eyebrow">CollaboNet — MVP build · verification and payments are simulated in this phase</p>
      </footer>
    </div>
  );
}
