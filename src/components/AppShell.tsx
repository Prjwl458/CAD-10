import { Link, useRouterState } from "@tanstack/react-router";
import {
  Gauge,
  ScanLine,
  Cylinder,
  Wrench,
  BookOpen,
  Users,
  LogIn,
  Menu,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { useSettings } from "@/hooks/useStore";
import { DemoBadge } from "./ui-kit";

export type NavItem = {
  to: string;
  label: string;
  shortLabel: string;
  icon: LucideIcon;
  primary?: boolean;
};

// Direct items shown in the mobile bottom bar
const DIRECT_NAV: NavItem[] = [
  { to: "/dashboard", label: "Dashboard", shortLabel: "Dashboard", icon: Gauge },
  { to: "/pcm", label: "CAD Scan", shortLabel: "PCM", icon: ScanLine, primary: true },
  { to: "/can", label: "Can Specs", shortLabel: "Can", icon: Cylinder },
  { to: "/maintenance", label: "Maintenance", shortLabel: "Maint.", icon: Wrench },
];

// Items shown in the mobile More menu
const MORE_NAV: NavItem[] = [
  { to: "/team", label: "Our Team", shortLabel: "Team", icon: Users },
  { to: "/help", label: "Help", shortLabel: "Help", icon: BookOpen },
  { to: "/login", label: "Sign In", shortLabel: "Sign In", icon: LogIn },
];

// All navigation items for the desktop sidebar
const DESKTOP_NAV: NavItem[] = [
  { to: "/dashboard", label: "Dashboard", shortLabel: "Dashboard", icon: Gauge },
  { to: "/pcm", label: "CAD Scan", shortLabel: "PCM", icon: ScanLine, primary: true },
  { to: "/can", label: "Can Specs", shortLabel: "Can", icon: Cylinder },
  { to: "/maintenance", label: "Maintenance", shortLabel: "Maint.", icon: Wrench },
  { to: "/help", label: "Help", shortLabel: "Help", icon: BookOpen },
  { to: "/team", label: "Our Team", shortLabel: "Team", icon: Users },
  { to: "/login", label: "Sign In", shortLabel: "Sign In", icon: LogIn },
];

export function AppShell({
  title,
  subtitle,
  children,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  children: ReactNode;
}) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const settings = useSettings();
  const [moreOpen, setMoreOpen] = useState(false);
  const moreMenuRef = useRef<HTMLDivElement>(null);
  const moreButtonRef = useRef<HTMLButtonElement>(null);
  // Marks closes that would strand focus on an unmounting element (backdrop
  // tap). The effect below then returns focus to the persistent trigger.
  // Navigation-link closes are excluded on purpose: the router owns focus
  // across route changes and must not be interfered with.
  const restoreTriggerFocusRef = useRef(false);

  const isMoreActive =
    pathname.startsWith("/team") || pathname.startsWith("/help") || pathname.startsWith("/login");

  // Close the More sheet on Escape and lock background scroll while it is open.
  useEffect(() => {
    if (!moreOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMoreOpen(false);
        moreButtonRef.current?.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    moreMenuRef.current?.querySelector<HTMLElement>("a, button")?.focus();
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [moreOpen]);

  // Return focus to the trigger after closes that unmount the focused
  // element. Runs post-commit so the trigger is mounted; the optional chain
  // makes a route-change unmount a safe no-op. No timers involved.
  useEffect(() => {
    if (moreOpen || !restoreTriggerFocusRef.current) return;
    restoreTriggerFocusRef.current = false;
    moreButtonRef.current?.focus();
  }, [moreOpen]);

  return (
    <div className="min-h-screen bg-background">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 hidden w-60 flex-col border-r border-sidebar-border bg-sidebar px-3 py-5 lg:flex">
        <Link to="/" className="px-2">
          <p className="text-lg font-semibold tracking-tight text-sidebar-foreground">CAD-10</p>
          <p className="text-xs text-muted-foreground">PCM Milk Chilling Can</p>
        </Link>
        <nav className="mt-6 flex flex-1 flex-col gap-1">
          {DESKTOP_NAV.map((item) => {
            const active =
              item.to === "/dashboard"
                ? pathname === "/" || pathname === "/dashboard"
                : pathname.startsWith(item.to);
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                  active
                    ? "bg-sidebar-accent text-sidebar-primary font-semibold"
                    : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-foreground",
                  item.primary && !active && "text-primary",
                )}
              >
                <item.icon className="h-4.5 w-4.5 shrink-0" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Main Content Area */}
      <div className="lg:pl-60">
        <header className="sticky top-0 z-20 border-b border-border bg-background/90 px-4 py-3 backdrop-blur sm:px-6">
          <div className="flex items-start justify-between gap-3 sm:items-center">
            <div className="min-w-0 flex-1">
              <h1 className="break-words text-base font-semibold leading-snug sm:truncate sm:text-xl">
                {title}
              </h1>
              {subtitle ? (
                <p className="mt-0.5 break-words text-xs leading-relaxed text-muted-foreground sm:truncate sm:text-sm">
                  {subtitle}
                </p>
              ) : null}
            </div>
            {settings.demoMode ? (
              <div className="shrink-0">
                <DemoBadge />
              </div>
            ) : null}
          </div>
        </header>

        <main className="mx-auto max-w-5xl px-4 pb-[calc(5rem+env(safe-area-inset-bottom))] pt-4 sm:px-6 lg:pb-10">
          {children}
        </main>
      </div>

      {/* Mobile More-menu backdrop overlay */}
      {moreOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-xs transition-opacity lg:hidden"
          onClick={() => {
            restoreTriggerFocusRef.current = true;
            setMoreOpen(false);
          }}
          aria-hidden="true"
        />
      )}

      {/* Mobile More-menu dropdown card */}
      {moreOpen && (
        <div
          id="mobile-more-menu"
          ref={moreMenuRef}
          role="dialog"
          aria-modal="true"
          aria-label="More navigation options"
          className="fixed inset-x-3 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-40 rounded-2xl border border-border bg-card p-2 shadow-2xl animate-in fade-in-0 zoom-in-95 lg:hidden"
        >
          <div className="flex flex-col gap-1">
            {MORE_NAV.map((item) => {
              const active = pathname.startsWith(item.to);
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  onClick={() => setMoreOpen(false)}
                  className={cn(
                    "flex min-h-12 items-center gap-3 rounded-xl px-3.5 text-sm font-medium transition-colors",
                    active
                      ? "bg-sidebar-accent text-sidebar-primary font-semibold"
                      : "text-muted-foreground hover:bg-secondary hover:text-foreground",
                  )}
                >
                  <item.icon className="h-5 w-5 shrink-0" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* Mobile bottom navigation bar */}
      <nav
        aria-label="Mobile bottom navigation"
        className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-border bg-surface/95 backdrop-blur pb-[env(safe-area-inset-bottom)] lg:hidden"
      >
        {DIRECT_NAV.map((item) => {
          const active =
            item.to === "/dashboard"
              ? pathname === "/" || pathname === "/dashboard"
              : pathname.startsWith(item.to);
          return (
            <Link
              key={item.to}
              to={item.to}
              onClick={() => setMoreOpen(false)}
              className={cn(
                "flex min-h-14 min-w-0 flex-col items-center justify-center gap-0.5 px-0.5 py-1 text-center transition-colors",
                active
                  ? "text-primary font-semibold"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <div
                className={cn(
                  "flex h-7 w-7 items-center justify-center rounded-lg transition-all",
                  item.primary && !active && "bg-primary/10 text-primary",
                  item.primary && active && "bg-primary text-primary-foreground shadow-sm",
                )}
              >
                <item.icon className="h-4.5 w-4.5 shrink-0" />
              </div>
              <span className="w-full truncate text-[10px] leading-tight sm:text-[11px]">
                {item.shortLabel ?? item.label}
              </span>
            </Link>
          );
        })}
        <button
          ref={moreButtonRef}
          type="button"
          aria-label="Open more navigation"
          aria-expanded={moreOpen}
          aria-controls="mobile-more-menu"
          onClick={() => setMoreOpen((open) => !open)}
          className={cn(
            "flex min-h-14 min-w-0 flex-col items-center justify-center gap-0.5 px-0.5 py-1 text-center transition-colors",
            isMoreActive || moreOpen
              ? "text-primary font-semibold"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          <div className="flex h-7 w-7 items-center justify-center rounded-lg">
            <Menu className="h-4.5 w-4.5 shrink-0" />
          </div>
          <span className="w-full truncate text-[10px] leading-tight sm:text-[11px]">More</span>
        </button>
      </nav>
    </div>
  );
}
