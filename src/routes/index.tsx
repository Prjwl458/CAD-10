import { createFileRoute, Link } from "@tanstack/react-router";
import { ScanLine, Snowflake, Activity, Gauge, ArrowRight, Cylinder, Users } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "CAD-10 — Smart PCM Milk Chilling Can" },
      {
        name: "description",
        content:
          "CAD-10 is a low-cost PCM milk chilling can with tag-based PCM cycle tracking, cooling-performance analytics and lifecycle monitoring.",
      },
      { property: "og:title", content: "CAD-10 — Smart PCM Milk Chilling Can" },
      {
        property: "og:description",
        content:
          "Scan. Track. Chill. CAD Scan identification, cycle tracking and cooling analytics for small dairy farms.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

const FLOW = [
  { icon: ScanLine, label: "CAD Scan" },
  { icon: Activity, label: "Track cycles" },
  { icon: Snowflake, label: "PCM life" },
  { icon: Gauge, label: "Improve cooling" },
];

function Landing() {
  return (
    <div className="min-h-screen bg-background">
      <header className="mx-auto flex max-w-5xl min-w-0 items-center justify-between gap-3 px-4 py-5 sm:px-5">
        <div className="min-w-0">
          <p className="break-words text-lg font-semibold tracking-tight">CAD-10</p>
          <p className="break-words text-xs text-muted-foreground">PCM Milk Chilling Can</p>
        </div>
        <div className="flex shrink-0 items-center gap-2 sm:gap-4">
          <Link
            to="/team"
            className="inline-flex min-h-11 items-center rounded-lg px-2 text-sm font-semibold text-muted-foreground hover:text-foreground"
          >
            Our Team
          </Link>
          <Link
            to="/login"
            className="inline-flex min-h-11 items-center rounded-lg px-2 text-sm font-semibold text-primary"
          >
            Sign in
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-5xl min-w-0 px-4 pb-20 sm:px-5">
        <section className="min-w-0 pt-6 sm:pt-12">
          <span className="inline-flex max-w-full items-center gap-2 break-words rounded-full border border-border bg-surface px-3 py-1 text-xs font-medium text-muted-foreground">
            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary" /> Engineering prototype
          </span>
          <h1 className="mt-4 break-words text-3xl font-semibold leading-tight tracking-tight min-[380px]:text-4xl sm:text-5xl">
            CAD-10
            <span className="mt-2 block break-words text-xl font-medium leading-snug text-primary min-[380px]:text-2xl sm:text-3xl">
              Smart PCM Milk Chilling Can
            </span>
          </h1>
          <p className="mt-4 max-w-xl break-words text-base leading-relaxed text-muted-foreground">
            Low-cost milk cooling with intelligent PCM cycle tracking.
          </p>

          <p className="numeric mt-6 break-words text-xl font-semibold tracking-tight">
            Tap. Track. Chill.
          </p>

          <div className="mt-6 grid grid-cols-1 gap-3 min-[420px]:grid-cols-2 sm:flex sm:flex-wrap">
            <Link
              to="/dashboard"
              className="inline-flex min-h-12 items-center justify-center rounded-xl bg-primary px-6 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
            >
              Open Dashboard
            </Link>
            <Link
              to="/pcm"
              search={{ pcmId: undefined }}
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-border bg-surface px-6 text-sm font-semibold hover:bg-secondary"
            >
              <ScanLine className="h-4 w-4 shrink-0" /> Scan PCM
            </Link>
            <Link
              to="/can"
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-border bg-surface px-6 text-sm font-semibold hover:bg-secondary"
            >
              <Cylinder className="h-4 w-4 shrink-0" /> Can
            </Link>
            <Link
              to="/team"
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-border bg-surface px-6 text-sm font-semibold hover:bg-secondary"
            >
              <Users className="h-4 w-4 shrink-0" /> Our Team
            </Link>
            <Link
              to="/help"
              className="inline-flex min-h-12 items-center justify-center gap-1 px-2 text-sm font-semibold text-primary min-[420px]:col-span-2 sm:col-span-1"
            >
              Explore CAD-10 <ArrowRight className="ml-1 h-4 w-4 shrink-0" />
            </Link>
          </div>
        </section>

        <section className="mt-10 min-w-0 rounded-2xl border border-border bg-card p-4 sm:mt-12 sm:p-5">
          <h2 className="break-words text-sm font-semibold uppercase tracking-widest text-muted-foreground">
            Features
          </h2>
          <ol className="mt-4 grid gap-3 min-[480px]:grid-cols-2 sm:grid-cols-4">
            {FLOW.map((step, i) => (
              <li
                key={step.label}
                className="flex min-w-0 items-center gap-3 sm:flex-col sm:text-center"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent text-accent-foreground">
                  <step.icon className="h-5 w-5" />
                </span>
                <span className="min-w-0 break-words text-sm font-medium leading-snug">
                  <span className="numeric mr-1 text-xs text-muted-foreground">{i + 1}</span>
                  {step.label}
                </span>
              </li>
            ))}
          </ol>
        </section>

        <section className="mt-8 grid gap-4 sm:mt-10 sm:grid-cols-3">
          {[
            {
              title: "PCM lifecycle",
              body: "Every PCM pack carries a tag. Scan it to identify the pack, start a cycle, and confirm completion — cycle counts accurately reflect verified recharges.",
            },
            {
              title: "Can architecture",
              body: "A 3-layer cylindrical milk can with an HDPE outer shell, double insulation, and stainless-steel inner chamber with 4 PCM columns.",
            },
            {
              title: "Maintenance & care",
              body: "Step-by-step cleaning routines after every milk batch, regular seal and insulation checklist inspections, and service issue reporting.",
            },
          ].map((f) => (
            <article
              key={f.title}
              className="min-w-0 rounded-2xl border border-border bg-card p-4 sm:p-5"
            >
              <h3 className="break-words text-base font-semibold leading-snug">{f.title}</h3>
              <p className="mt-2 break-words text-sm leading-relaxed text-muted-foreground">
                {f.body}
              </p>
            </article>
          ))}
        </section>

        <p className="mt-8 break-words text-xs leading-relaxed text-muted-foreground sm:mt-10">
          All calculated values are engineering estimates based on configured parameters and require
          experimental validation. The application does not perform milk quality or safety testing.
        </p>
      </main>
    </div>
  );
}
