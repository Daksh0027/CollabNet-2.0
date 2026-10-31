import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import api from "@/lib/api";
import LandingPage from "@/landing/LandingPage";
import { content } from "@/landing/content";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function Landing() {
  const { user, loading, setUser } = useAuth();
  const navigate = useNavigate();
  const [signInOpen, setSignInOpen] = useState(false);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!loading && user) {
      navigate(
        user.verified ? "/app/overview" : user.role ? "/verify" : "/onboarding",
        { replace: true },
      );
    }
  }, [user, loading, navigate]);

  const demoLogin = async (role) => {
    if (busy) return;
    setBusy(role);
    setError("");
    try {
      const { data } = await api.post("/auth/demo", { role });
      setUser(data);
      navigate("/app/overview");
    } catch (e) {
      setError(e?.response?.data?.detail || content.signIn.errorMessage);
    } finally {
      setBusy("");
    }
  };

  return (
    <>
      <LandingPage
        onSignIn={() => {
          setError("");
          setSignInOpen(true);
        }}
      />
      <Dialog open={signInOpen} onOpenChange={setSignInOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{content.signIn.title}</DialogTitle>
            <DialogDescription>{content.signIn.description}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3" aria-busy={Boolean(busy)}>
            {[
              ["creator", content.signIn.creatorLabel],
              ["company", content.signIn.sponsorLabel],
            ].map(([role, label]) => (
              <button
                key={role}
                type="button"
                disabled={Boolean(busy)}
                onClick={() => demoLogin(role)}
                className="min-h-11 rounded-lg border border-border px-4 py-3 text-sm font-semibold hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
              >
                {busy === role ? `${label}…` : label}
              </button>
            ))}
          </div>
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        </DialogContent>
      </Dialog>
    </>
  );
}
