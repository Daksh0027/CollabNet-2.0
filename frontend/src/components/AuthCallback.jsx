import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "@/lib/api";
import { useAuth } from "@/lib/auth";

export default function AuthCallback() {
  const [error, setError] = useState(null);
  const hasProcessed = useRef(false);
  const navigate = useNavigate();
  const { setUser } = useAuth();

  useEffect(() => {
    if (hasProcessed.current) return;
    hasProcessed.current = true;

    const run = async () => {
      try {
        const params = new URLSearchParams(window.location.hash.replace(/^#/, ""));
        const sessionId = params.get("session_id");
        if (!sessionId) throw new Error("No session found in URL");
        const { data: user } = await api.post("/auth/session", { session_id: sessionId });
        setUser(user);
        if (!user.role) navigate("/onboarding", { replace: true });
        else if (!user.verified) navigate("/verify", { replace: true });
        else navigate("/app/overview", { replace: true });
      } catch (e) {
        setError(e?.response?.data?.detail || e.message || "Authentication failed");
        setTimeout(() => navigate("/", { replace: true }), 2500);
      }
    };
    run();
  }, [navigate, setUser]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3" data-testid="auth-callback">
      {error ? (
        <>
          <p className="font-display text-sm text-red-400" data-testid="auth-callback-error">{error}</p>
          <p className="text-xs text-muted-foreground">Returning to the landing page…</p>
        </>
      ) : (
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <p className="eyebrow">Signing you in</p>
        </div>
      )}
    </div>
  );
}
