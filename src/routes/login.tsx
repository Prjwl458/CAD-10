import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Check, Chrome, Mail, ShieldCheck } from "lucide-react";
import { FormEvent, useState } from "react";
import { Card } from "@/components/ui-kit";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Sign in — CAD-10" },
      { name: "description", content: "Sign in to your CAD-10 workspace." },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState<{ tone: "error" | "info"; text: string } | null>(null);

  function handleEmailSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = email.trim();
    if (!value) {
      setMessage({ tone: "error", text: "Enter your email address to continue." });
      return;
    }
    if (!/^\S+@\S+\.\S+$/.test(value)) {
      setMessage({ tone: "error", text: "Enter a valid email address." });
      return;
    }
    setMessage({
      tone: "info",
      text: "Email sign-in is ready to connect when authentication is enabled.",
    });
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-4 py-5 sm:px-6 lg:px-8">
        <Link
          to="/"
          className="group inline-flex items-center gap-2 rounded-lg text-sm font-semibold tracking-tight focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <div>
            <p className="text-lg font-semibold tracking-tight">CAD-10</p>
            <p className="text-xs text-muted-foreground">PCM Milk Chilling Can</p>
          </div>
        </Link>
        <Link
          to="/"
          className="inline-flex min-h-10 items-center gap-1.5 rounded-lg px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to home
        </Link>
      </header>

      <main className="mx-auto grid w-full max-w-6xl gap-8 px-4 pb-10 pt-6 sm:px-6 sm:pt-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:gap-16 lg:px-8 lg:pb-20 lg:pt-16">
        <section className="min-w-0 max-w-xl lg:pb-8">
          <span className="inline-flex max-w-full items-center gap-2 rounded-full border border-border bg-surface px-3 py-1 text-xs font-medium text-muted-foreground">
            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary" /> CAD-10 workspace
          </span>
          <h1 className="mt-5 break-words text-3xl font-semibold leading-tight tracking-tight sm:text-5xl">
            Welcome back to <span className="text-primary">CAD-10.</span>
          </h1>
          <p className="mt-4 max-w-lg break-words text-base leading-relaxed text-muted-foreground sm:text-lg">
            Sign in to manage PCM operations, cooling performance, and engineering data.
          </p>

          <div className="mt-8 grid gap-3 min-[420px]:grid-cols-2 sm:grid-cols-3 lg:grid-cols-1">
            {[
              "Centralize your operations",
              "Track PCM cycles with precision",
              "Monitor cooling performance",
            ].map((item) => (
              <div key={item} className="flex items-center gap-3 text-sm text-muted-foreground">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent text-accent-foreground">
                  <Check className="h-4 w-4" />
                </span>
                <span className="min-w-0 break-words leading-relaxed">{item}</span>
              </div>
            ))}
          </div>
        </section>

        <Card className="w-full min-w-0 max-w-md justify-self-center p-5 sm:p-7">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
              Sign in
            </p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight">Access your workspace</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Choose a sign-in method to continue. Authentication is not connected yet, so these
              controls are UI-ready placeholders.
            </p>
          </div>

          <button
            type="button"
            onClick={() =>
              setMessage({
                tone: "info",
                text: "Google sign-in is ready to connect when authentication is enabled.",
              })
            }
            className="mt-6 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-border bg-surface px-4 text-sm font-semibold transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Chrome className="h-5 w-5" /> Continue with Google
          </button>

          <div className="my-6 flex items-center gap-3 text-xs font-medium uppercase tracking-widest text-muted-foreground">
            <span className="h-px flex-1 bg-border" />
            <span>or</span>
            <span className="h-px flex-1 bg-border" />
          </div>

          <form onSubmit={handleEmailSubmit} noValidate>
            <label htmlFor="login-email" className="text-sm font-medium text-foreground">
              Email address
            </label>
            <div className="relative mt-1.5">
              <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                id="login-email"
                name="email"
                type="email"
                autoComplete="email"
                inputMode="email"
                placeholder="you@example.com"
                value={email}
                onChange={(event) => {
                  setEmail(event.target.value);
                  if (message?.tone === "error") setMessage(null);
                }}
                aria-describedby="login-email-help"
                className="min-h-12 w-full rounded-xl border border-input bg-surface pl-10 pr-3 text-base outline-none transition-shadow focus:border-primary focus:ring-2 focus:ring-ring/25"
              />
            </div>
            <p id="login-email-help" className="mt-2 text-xs leading-relaxed text-muted-foreground">
              We’ll use this address for the future account sign-in flow.
            </p>
            <button
              type="submit"
              className="mt-4 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Mail className="h-4 w-4" /> Continue with Email
            </button>
          </form>

          {message ? (
            <p
              role={message.tone === "error" ? "alert" : "status"}
              className={`mt-4 rounded-xl border px-3 py-2 text-sm leading-relaxed ${
                message.tone === "error"
                  ? "border-critical/30 bg-critical/10 text-critical"
                  : "border-primary/20 bg-accent/50 text-accent-foreground"
              }`}
            >
              {message.text}
            </p>
          ) : null}

          <div className="mt-6 flex items-start gap-2 border-t border-border pt-4 text-xs leading-relaxed text-muted-foreground">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <span>Your local CAD-10 prototype data remains on this device.</span>
          </div>
        </Card>
      </main>
    </div>
  );
}
