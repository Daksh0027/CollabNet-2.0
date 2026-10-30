import { BrowserRouter, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { Toaster } from "sonner";
import { Loader2 } from "lucide-react";
import { AuthProvider, useAuth } from "@/lib/auth";
import { ThemeProvider, useTheme } from "@/lib/theme";
import AuthCallback from "@/components/AuthCallback";
import Shell from "@/components/Shell";
import Landing from "@/pages/Landing";
import Onboarding from "@/pages/Onboarding";
import Verification from "@/pages/Verification";
import PaymentSuccess from "@/pages/PaymentSuccess";
import PaymentCancel from "@/pages/PaymentCancel";
import Overview from "@/pages/Overview";
import Explore from "@/pages/Explore";
import Campaigns from "@/pages/Campaigns";
import Messages from "@/pages/Messages";
import Contracts from "@/pages/Contracts";
import CalendarPage from "@/pages/CalendarPage";
import Account from "@/pages/Account";
import Notifications from "@/pages/Notifications";

export const FullLoader = () => (
  <div className="flex min-h-screen items-center justify-center" data-testid="full-loader">
    <Loader2 className="h-8 w-8 animate-spin text-primary" />
  </div>
);

function RequireUser({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <FullLoader />;
  if (!user) return <Navigate to="/" replace />;
  return children;
}

function Protected({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <FullLoader />;
  if (!user) return <Navigate to="/" replace />;
  if (!user.role) return <Navigate to="/onboarding" replace />;
  if (!user.verified) return <Navigate to="/verify" replace />;
  return children;
}

function AppRouter() {
  const location = useLocation();
  // Detect the OAuth session_id synchronously during render, before any
  // /auth/me check can race the cookie handshake.
  if (location.hash?.includes("session_id=")) return <AuthCallback />;
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/onboarding" element={<RequireUser><Onboarding /></RequireUser>} />
      <Route path="/verify" element={<RequireUser><Verification /></RequireUser>} />
      <Route path="/payment/success" element={<PaymentSuccess />} />
      <Route path="/payment/cancel" element={<PaymentCancel />} />
      <Route
        path="/app"
        element={
          <Protected>
            <Shell />
          </Protected>
        }
      >
        <Route index element={<Navigate to="/app/overview" replace />} />
        <Route path="overview" element={<Overview />} />
        <Route path="explore" element={<Explore />} />
        <Route path="campaigns" element={<Campaigns />} />
        <Route path="messages" element={<Messages />} />
        <Route path="contracts" element={<Contracts />} />
        <Route path="calendar" element={<CalendarPage />} />
        <Route path="account" element={<Account />} />
        <Route path="notifications" element={<Notifications />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <AppRouter />
          <ThemedToaster />
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}

function ThemedToaster() {
  const { theme } = useTheme();
  return <Toaster theme={theme} position="top-right" />;
}
