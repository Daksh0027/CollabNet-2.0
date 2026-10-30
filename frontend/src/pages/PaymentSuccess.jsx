import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { CheckCircle2, Loader2 } from "lucide-react";
import api from "@/lib/api";

export default function PaymentSuccess() {
  const [sp] = useSearchParams();
  const navigate = useNavigate();
  const sessionId = sp.get("session_id");
  const dealId = sp.get("deal_id") || "";
  const [state, setState] = useState("checking");
  const tries = useRef(0);

  useEffect(() => {
    let timer;
    const poll = async () => {
      if (!sessionId) {
        setState("pending");
        return;
      }
      try {
        const { data } = await api.get(`/payments/status/${sessionId}`);
        if (data.payment_status === "paid") {
          setState("paid");
          setTimeout(() => navigate(`/app/contracts${dealId ? `?deal=${dealId}` : ""}`, { replace: true }), 1800);
          return;
        }
      } catch {
        // fall through to retry
      }
      tries.current += 1;
      if (tries.current >= 5) {
        setState("pending");
        return;
      }
      timer = setTimeout(poll, 2000);
    };
    poll();
    return () => clearTimeout(timer);
  }, [sessionId, dealId, navigate]);

  return (
    <div className="grain flex min-h-screen flex-col items-center justify-center px-6 text-center" data-testid="payment-success-page">
      {state === "paid" ? (
        <>
          <CheckCircle2 className="h-14 w-14 text-emerald-400" data-testid="payment-success-icon" />
          <h1 className="font-display mt-5 text-2xl font-bold">Payment received</h1>
          <p className="mt-2 max-w-sm text-sm text-muted-foreground">
            The fee is secured in escrow. It releases to the creator when the campaign is marked delivered.
          </p>
        </>
      ) : (
        <>
          <Loader2 className="h-14 w-14 animate-spin text-primary" />
          <h1 className="font-display mt-5 text-2xl font-bold">
            {state === "checking" ? "Confirming your payment…" : "Payment is processing"}
          </h1>
          <p className="mt-2 max-w-sm text-sm text-muted-foreground">
            {state === "checking"
              ? "Talking to Stripe — this only takes a moment."
              : "The payment usually clears within a minute. The deal room updates as soon as it lands."}
          </p>
          {state === "pending" ? (
            <button onClick={() => navigate(dealId ? `/app/contracts?deal=${dealId}` : "/app/contracts")}
              className="mt-8 rounded-full bg-primary px-6 py-3 text-sm font-bold text-primary-foreground"
              data-testid="payment-success-continue-button">
              Back to the deal room
            </button>
          ) : null}
        </>
      )}
    </div>
  );
}
