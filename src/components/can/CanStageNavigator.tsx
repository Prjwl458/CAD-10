import { useEffect, useId, useState } from "react";
import { Layers } from "lucide-react";
import { DISASSEMBLY_STEPS } from "@/config/can-specifications";
import { cn } from "@/lib/utils";

/**
 * Mobile-only shortcut to the existing Can stages.
 *
 * It owns no stage state: the menu lists DISASSEMBLY_STEPS (the same source
 * the stepper renders) and selection funnels through the route's existing
 * step-change handler, which smooth-scrolls to the stage milestone and lets
 * the scroll-driven animation update naturally. Scroll stays the source of
 * truth; there is no second scroll/animation controller here.
 *
 * Visibility is CSS-only (`lg:hidden`) and the route unmounts it while a
 * component is inspected, so it can never cover the mobile inspector sheet.
 */
export function CanStageNavigator({
  currentStep,
  onStepChange,
}: {
  currentStep: number;
  onStepChange: (step: number) => void;
}) {
  const [open, setOpen] = useState(false);
  const menuId = useId();

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open]);

  return (
    <div className="lg:hidden">
      {open ? (
        <div aria-hidden="true" className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
      ) : null}
      <div className="fixed bottom-[calc(5.75rem+env(safe-area-inset-bottom))] right-3 z-40 flex flex-col items-end gap-2">
        {open ? (
          <div
            id={menuId}
            role="menu"
            aria-label="Jump to a Can stage"
            className="w-56 overflow-hidden rounded-xl border border-border bg-card p-1 shadow-xl"
          >
            {DISASSEMBLY_STEPS.map((step) => {
              const isActive = step.step === currentStep;
              return (
                <button
                  key={step.step}
                  type="button"
                  role="menuitem"
                  aria-current={isActive ? "true" : undefined}
                  onClick={() => {
                    setOpen(false);
                    onStepChange(step.step);
                  }}
                  className={cn(
                    "flex min-h-10 w-full items-center gap-2.5 rounded-lg px-3 py-1.5 text-left text-xs transition-colors",
                    isActive
                      ? "bg-primary font-semibold text-primary-foreground"
                      : "text-muted-foreground hover:bg-secondary hover:text-foreground",
                  )}
                >
                  <span className="numeric w-6 shrink-0 text-[10px] opacity-75">
                    {step.stageNumber}
                  </span>
                  <span className="min-w-0 flex-1 break-words font-medium leading-snug">
                    {step.label}
                  </span>
                </button>
              );
            })}
          </div>
        ) : null}
        <button
          type="button"
          aria-label="Jump to a Can stage"
          aria-expanded={open}
          aria-controls={menuId}
          onClick={() => setOpen((value) => !value)}
          className="flex h-11 w-11 items-center justify-center rounded-full border border-border bg-surface text-foreground shadow-md transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Layers className="h-5 w-5 text-primary" />
        </button>
      </div>
    </div>
  );
}
