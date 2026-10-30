import { useNavigate, useSearchParams } from "react-router-dom";
import { XCircle } from "lucide-react";

export default function PaymentCancel() {
  const navigate = useNavigate();
  const [sp] = useSearchParams();
  const dealId = sp.get("deal_id") || "";

  return (
    <div className="grain flex min-h-screen flex-col items-center justify-center px-6 text-center" data-testid="payment-cancel-page">
      <XCircle className="h-14 w-14 text-amber-400" />
      <h1 className="font-display mt-5 text-2xl font-bold">Payment cancelled</h1>
      <p className="mt-2 max-w-sm text-sm text-muted-foreground">
        No money moved and the deal room is untouched. You can fund the escrow whenever you're ready.
      </p>
      <button
        onClick={() => navigate(dealId ? `/app/contracts?deal=${dealId}` : "/app/contracts")}
        className="mt-8 rounded-full bg-primary px-6 py-3 text-sm font-bold text-primary-foreground"
        data-testid="payment-cancel-back-button"
      >
        Back to the deal room
      </button>
    </div>
  );
}
