import type { ReactNode, InputHTMLAttributes, ElementType } from "react";
import { cn } from "@/lib/utils";
import type { StatusLevel } from "@/types";

export function Card({
  children,
  className,
  as: As = "div",
}: {
  children: ReactNode;
  className?: string;
  as?: ElementType;
}) {
  return (
    <As className={cn("rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-5", className)}>
      {children}
    </As>
  );
}

export function SectionTitle({ title, subtitle }: { title: ReactNode; subtitle?: ReactNode }) {
  return (
    <div className="mb-3 min-w-0">
      <h2 className="break-words text-base font-semibold leading-snug sm:text-lg">{title}</h2>
      {subtitle ? (
        <p className="mt-0.5 break-words text-sm leading-relaxed text-muted-foreground">
          {subtitle}
        </p>
      ) : null}
    </div>
  );
}

const statusStyles: Record<StatusLevel, string> = {
  GOOD: "bg-success/12 text-success border-success/30",
  MONITOR: "bg-warning/15 text-warning-foreground border-warning/40",
  INSPECT: "bg-critical/10 text-critical border-critical/30",
};

export function StatusPill({ status, label }: { status: StatusLevel; label?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold tracking-wide",
        statusStyles[status],
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {label ?? (status === "INSPECT" ? "INSPECT / REPLACE" : status)}
    </span>
  );
}

export function DemoBadge({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border border-warning/40 bg-warning/15 px-2 py-0.5 text-[10px] font-bold tracking-widest text-warning-foreground",
        className,
      )}
    >
      DEMO DATA
    </span>
  );
}

export function Metric({
  label,
  value,
  unit,
  hint,
  tone = "default",
}: {
  label: string;
  value: string | number;
  unit?: string;
  hint?: ReactNode;
  tone?: "default" | "cold" | "warm";
}) {
  return (
    <div className="min-w-0 flex-1">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p
        className={cn(
          "numeric mt-1 text-2xl font-semibold sm:text-3xl lg:text-4xl",
          tone === "cold" && "text-primary",
          tone === "warm" && "text-warning-foreground",
        )}
      >
        {value}
        {unit ? (
          <span className="ml-1 text-base font-medium text-muted-foreground sm:text-lg">
            {unit}
          </span>
        ) : null}
      </p>
      {hint ? <div className="mt-1 text-xs text-muted-foreground">{hint}</div> : null}
    </div>
  );
}

export function Button({
  children,
  variant = "primary",
  className,
  ...props
}: {
  children: ReactNode;
  variant?: "primary" | "secondary" | "ghost" | "critical" | "success";
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const variants = {
    primary: "bg-primary text-primary-foreground hover:bg-primary/90",
    secondary: "border border-border bg-surface text-foreground hover:bg-secondary",
    ghost: "text-primary hover:bg-accent",
    critical: "bg-critical text-critical-foreground hover:bg-critical/90",
    success: "bg-success text-success-foreground hover:bg-success/90",
  } as const;
  return (
    <button
      {...props}
      className={cn(
        "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold transition-colors disabled:pointer-events-none disabled:opacity-50",
        variants[variant],
        className,
      )}
    >
      {children}
    </button>
  );
}

export function Field({
  label,
  unit,
  hint,
  error,
  ...props
}: {
  label: string;
  unit?: string;
  hint?: string;
  error?: string;
} & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-foreground">
        {label}
        {unit ? <span className="ml-1 text-muted-foreground">({unit})</span> : null}
      </span>
      <input
        {...props}
        className={cn(
          "numeric mt-1.5 min-h-11 w-full rounded-xl border border-input bg-surface px-3 text-base outline-none focus:border-primary focus:ring-2 focus:ring-ring/25",
          error && "border-critical",
        )}
      />
      {hint && !error ? (
        <span className="mt-1 block text-xs text-muted-foreground">{hint}</span>
      ) : null}
      {error ? <span className="mt-1 block text-xs font-medium text-critical">{error}</span> : null}
    </label>
  );
}

export function Note({
  children,
  tone = "muted",
}: {
  children: ReactNode;
  tone?: "muted" | "warning";
}) {
  return (
    <p
      className={cn(
        "rounded-xl border px-3 py-2 text-xs leading-relaxed",
        tone === "warning"
          ? "border-warning/40 bg-warning/10 text-warning-foreground"
          : "border-border bg-muted text-muted-foreground",
      )}
    >
      {children}
    </p>
  );
}

export function Row({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-4 border-b border-border/70 py-2 last:border-0">
      <span className="min-w-0 text-sm text-muted-foreground">{label}</span>
      <span className="numeric min-w-0 break-words text-right text-sm font-medium text-foreground">
        {value}
      </span>
    </div>
  );
}

export function formatDate(value?: string) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

export function formatDateTime(value?: string) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return `${formatDate(value)}, ${d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
}
