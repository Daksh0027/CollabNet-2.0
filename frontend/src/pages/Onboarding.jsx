import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Building2, Clapperboard, Loader2, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";
import { useAuth } from "@/lib/auth";

const OPTIONS = [
  {
    role: "company",
    icon: Building2,
    title: "Company / Sponsor",
    body: "Discover and vet creators, publish campaign briefs, open deal rooms and run campaigns end-to-end.",
    testId: "role-select-company",
  },
  {
    role: "creator",
    icon: Clapperboard,
    title: "Creator / Influencer",
    body: "Showcase stats and rates, get discovered by sponsors, apply to campaigns and get paid collaborations.",
    testId: "role-select-creator",
  },
];

export default function Onboarding() {
  const { user, refresh } = useAuth();
  const navigate = useNavigate();
  const [busy, setBusy] = useState("");

  const pick = async (role) => {
    setBusy(role);
    try {
      await api.post("/auth/role", { role });
      await refresh();
      toast.success(role === "company" ? "Company account created" : "Creator account created");
      navigate("/verify");
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Something went wrong");
    } finally {
      setBusy("");
    }
  };

  return (
    <div className="grain flex min-h-screen flex-col items-center justify-center px-6">
      <p className="eyebrow">Step 1 of 2 — account type</p>
      <h1 className="font-display mt-4 text-center text-3xl font-bold tracking-tight sm:text-4xl" data-testid="onboarding-title">
        Welcome, {user?.name?.split(" ")[0] || "there"}. Who are you on CollaboNet?
      </h1>
      <div className="mt-12 grid w-full max-w-3xl gap-5 sm:grid-cols-2">
        {OPTIONS.map(({ role, icon: Icon, title, body, testId }) => (
          <button
            key={role}
            onClick={() => pick(role)}
            disabled={busy !== ""}
            className="group rounded-2xl border border-border bg-card p-8 text-left transition-all hover:-translate-y-1 hover:border-primary disabled:opacity-60"
            data-testid={testId}
          >
            <Icon className="h-8 w-8 text-primary" />
            <h2 className="font-display mt-5 text-lg font-semibold">{title}</h2>
            <p className="mt-2 text-sm text-muted-foreground">{body}</p>
            <span className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-primary">
              Continue <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              {busy === role ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
