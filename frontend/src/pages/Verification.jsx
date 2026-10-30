import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { BadgeCheck, Building2, Loader2, PhoneCall, Youtube } from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

const PLAT_COLORS = { YouTube: "text-red-400", Instagram: "text-pink-400", TikTok: "text-sky-300", Twitch: "text-purple-400" };

export default function Verification() {
  const { user, refresh } = useAuth();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [platforms, setPlatforms] = useState({});
  const [form, setForm] = useState({
    company_name: "", industry: "", website: "", employees: "", about: "", company_email: "",
  });

  if (user?.verified) {
    return (
      <div className="grain flex min-h-screen flex-col items-center justify-center px-6 text-center">
        <BadgeCheck className="h-12 w-12 text-emerald-400" data-testid="already-verified-icon" />
        <h1 className="font-display mt-4 text-2xl font-bold">You're verified</h1>
        <p className="mt-2 text-sm text-muted-foreground">Your account is fully unlocked.</p>
        <Button className="mt-8 rounded-full" onClick={() => navigate("/app/overview")} data-testid="go-to-dashboard-button">
          Go to dashboard
        </Button>
      </div>
    );
  }

  const toggle = (p) => {
    setPlatforms((s) => {
      const next = { ...s };
      if (next[p]) delete next[p];
      else next[p] = { handle: "", followers: "" };
      return next;
    });
  };

  const connect = async () => {
    const list = Object.entries(platforms).filter(([, v]) => v.handle);
    if (list.length === 0) {
      toast.error("Add at least one account handle");
      return;
    }
    setBusy(true);
    await new Promise((r) => setTimeout(r, 1200));
    try {
      await api.post("/verify/social", {
        platforms: list.map(([platform, v]) => ({
          platform, handle: v.handle, followers: Number(v.followers) || 0,
        })),
      });
      await refresh();
      toast.success("Accounts connected — you're verified");
      navigate("/app/overview");
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Verification failed");
    } finally {
      setBusy(false);
    }
  };

  const verifyCompany = async () => {
    if (!form.company_name || !form.company_email) {
      toast.error("Company name and company email are required");
      return;
    }
    setBusy(true);
    await new Promise((r) => setTimeout(r, 1200));
    try {
      await api.post("/verify/company", {
        ...form,
        employees: Number(form.employees) || 0,
      });
      await refresh();
      toast.success("Company verified — onboarding call booked");
      navigate("/app/overview");
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Verification failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grain min-h-screen px-6 py-14">
      <div className="mx-auto max-w-2xl">
        <p className="eyebrow">Step 2 of 2 — verification</p>
        <h1 className="font-display mt-4 text-3xl font-bold tracking-tight" data-testid="verify-title">
          {user?.role === "creator" ? "Connect your accounts" : "Verify your company"}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {user?.role === "creator"
            ? "Link your social accounts so sponsors can trust your numbers."
            : "Confirm your company details and book the onboarding call."}
        </p>

        {user?.role === "creator" ? (
          <div className="mt-10 space-y-4" data-testid="creator-verify-panel">
            {["YouTube", "Instagram", "TikTok", "Twitch"].map((p) => {
              const on = !!platforms[p];
              return (
                <div key={p} className={`rounded-2xl border p-5 transition-colors ${on ? "border-primary/50 bg-primary/5" : "border-border bg-card"}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Youtube className={`h-5 w-5 ${PLAT_COLORS[p]}`} />
                      <span className="font-semibold">{p}</span>
                    </div>
                    <Button variant={on ? "secondary" : "default"} size="sm" className="rounded-full" onClick={() => toggle(p)} data-testid={`platform-toggle-${p.toLowerCase()}`}>
                      {on ? "Remove" : "Connect"}
                    </Button>
                  </div>
                  {on ? (
                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      <Input placeholder="@handle" value={platforms[p].handle}
                        onChange={(e) => setPlatforms((s) => ({ ...s, [p]: { ...s[p], handle: e.target.value } }))}
                        data-testid={`platform-handle-input-${p.toLowerCase()}`} />
                      <Input placeholder="Followers" type="number" value={platforms[p].followers}
                        onChange={(e) => setPlatforms((s) => ({ ...s, [p]: { ...s[p], followers: e.target.value } }))}
                        data-testid={`platform-followers-input-${p.toLowerCase()}`} />
                    </div>
                  ) : null}
                </div>
              );
            })}
            <Button className="mt-4 w-full rounded-full py-6 text-sm font-bold" onClick={connect} disabled={busy} data-testid="connect-accounts-button">
              {busy ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Simulated OAuth in progress…</> : "Connect accounts (simulated OAuth)"}
            </Button>
          </div>
        ) : (
          <div className="mt-10 space-y-5" data-testid="company-verify-panel">
            <div className="rounded-2xl border border-border bg-card p-6">
              <div className="flex items-center gap-2 text-primary"><Building2 className="h-4 w-4" /><span className="eyebrow">Company details</span></div>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <Input placeholder="Company name *" value={form.company_name} onChange={(e) => setForm({ ...form, company_name: e.target.value })} data-testid="company-name-input" />
                <Input placeholder="Industry" value={form.industry} onChange={(e) => setForm({ ...form, industry: e.target.value })} data-testid="company-industry-input" />
                <Input placeholder="Website" value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} data-testid="company-website-input" />
                <Input placeholder="Employees" type="number" value={form.employees} onChange={(e) => setForm({ ...form, employees: e.target.value })} data-testid="company-employees-input" />
                <Input placeholder="Company email (work mail) *" type="email" className="sm:col-span-2" value={form.company_email} onChange={(e) => setForm({ ...form, company_email: e.target.value })} data-testid="company-email-input" />
                <Textarea placeholder="What does the company do?" className="sm:col-span-2" value={form.about} onChange={(e) => setForm({ ...form, about: e.target.value })} data-testid="company-about-input" />
              </div>
            </div>
            <Button className="w-full rounded-full py-6 text-sm font-bold" onClick={verifyCompany} disabled={busy} data-testid="company-verify-submit-button">
              {busy ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Checking details…</> : "Submit & book onboarding call"}
            </Button>
            <div className="flex items-center gap-3 rounded-2xl border border-dashed border-border p-4 text-xs text-muted-foreground" data-testid="onboarding-call-note">
              <PhoneCall className="h-4 w-4 text-primary" />
              After submitting, a 20-minute onboarding call slot is reserved for you (simulated in this MVP).
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
