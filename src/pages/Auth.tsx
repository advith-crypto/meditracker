import { useAuthActions } from "@convex-dev/auth/react";
import { ArrowLeft, Loader2, Mail, Pill, Sparkles } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { Navigate, useNavigate, useSearchParams } from "react-router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/use-auth";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const CODE_RE = /^\d{6}$/;

export default function AuthPage() {
  const { signIn } = useAuthActions();
  const { isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const returnTo = searchParams.get("returnTo") || "/app";

  const [step, setStep] = useState<"email" | "code">("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (isAuthenticated && !isLoading) {
      navigate(returnTo, { replace: true });
    }
  }, [isAuthenticated, isLoading, navigate, returnTo]);

  if (isAuthenticated) {
    return <Navigate to={returnTo} replace />;
  }

  const sendCode = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    const clean = email.trim().toLowerCase();
    if (!EMAIL_RE.test(clean)) {
      setError("That email address doesn’t look right. Mind checking it?");
      return;
    }
    setBusy(true);
    try {
      await signIn("email-otp", { email: clean });
      setStep("code");
    } catch {
      setError("We couldn’t send a code to that email. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const verifyCode = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    const clean = code.trim();
    if (!CODE_RE.test(clean)) {
      setError("The code has 6 digits — please enter it exactly.");
      return;
    }
    setBusy(true);
    try {
      await signIn("email-otp", { email: email.trim().toLowerCase(), code: clean });
    } catch {
      setError("That code didn’t work. It may have expired — request a new one.");
    } finally {
      setBusy(false);
    }
  };

  const guestSignIn = async () => {
    setError(null);
    setBusy(true);
    try {
      await signIn("anonymous");
    } catch {
      setError("Something went wrong while signing you in. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <header className="flex items-center px-5 py-4">
        <button
          type="button"
          onClick={() => navigate("/")}
          className="flex size-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
          aria-label="Back to home"
        >
          <ArrowLeft className="size-5" />
        </button>
        <div className="ml-1 flex items-center gap-2.5">
          <span className="flex size-8 items-center justify-center rounded-lg bg-foreground text-background">
            <Pill className="size-4" />
          </span>
          <span className="text-[15px] font-semibold tracking-tight">MediTracker</span>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-6 pb-12">
        <h1 className="text-3xl font-semibold tracking-tight">Welcome back</h1>
        <p className="mt-2 text-[15px] leading-relaxed text-muted-foreground">
          Sign in to keep your medicines and reminders — your data stays on this
          device, yours alone.
        </p>

        {error && (
          <p
            role="alert"
            className="mt-5 rounded-xl border border-border bg-muted/50 px-4 py-3 text-sm text-red-700 dark:text-red-400"
          >
            {error}
          </p>
        )}

        <div className="mt-7 space-y-6">
          {step === "email" ? (
            <form onSubmit={sendCode} className="space-y-4" noValidate>
              <div>
                <Label htmlFor="auth-email" className="mb-1.5 block">
                  Email address
                </Label>
                <Input
                  id="auth-email"
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="h-12 rounded-xl"
                />
              </div>
              <Button type="submit" className="h-12 w-full gap-2 text-base" disabled={busy}>
                {busy ? <Loader2 className="size-4 animate-spin" /> : <Mail className="size-4" />}
                Send me a code
              </Button>
              <p className="text-center text-xs text-muted-foreground">
                We’ll email you a 6-digit code to sign in.
              </p>
            </form>
          ) : (
            <form onSubmit={verifyCode} className="space-y-4" noValidate>
              <div>
                <Label htmlFor="auth-code" className="mb-1.5 block">
                  Enter the 6-digit code
                </Label>
                <Input
                  id="auth-code"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="••••••"
                  className="h-12 rounded-xl text-center text-lg tracking-[0.4em]"
                />
              </div>
              <Button type="submit" className="h-12 w-full gap-2 text-base" disabled={busy || !CODE_RE.test(code)}>
                {busy ? <Loader2 className="size-4 animate-spin" /> : null}
                Sign in
              </Button>
              <button
                type="button"
                onClick={() => {
                  setStep("email");
                  setError(null);
                }}
                className="mx-auto block text-sm font-medium text-muted-foreground underline underline-offset-4 hover:text-foreground"
              >
                Use a different email
              </button>
            </form>
          )}

          <div className="flex items-center gap-3" aria-hidden>
            <span className="h-px flex-1 bg-border" />
            <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              or
            </span>
            <span className="h-px flex-1 bg-border" />
          </div>

          <Button
            type="button"
            variant="outline"
            className="h-12 w-full gap-2 text-base"
            onClick={guestSignIn}
            disabled={busy}
          >
            {busy ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
            Continue as guest
          </Button>
          <p className="text-center text-xs leading-relaxed text-muted-foreground">
            Guest sign-in is instant — no email needed. You can add one later if
            you like.
          </p>
        </div>
      </main>
    </div>
  );
}