import { X } from "lucide-react";
import {
  CAN_COMPONENTS,
  type CanComponentId,
  type DisassemblyStep,
} from "@/config/can-specifications";
import { cn } from "@/lib/utils";

/**
 * The ONE information surface of the Can experience.
 *
 * Everything it shows derives from the existing active-step state (or the
 * selected hotspot) — it owns no scroll state of its own, so the panel can
 * never fall out of sync with the disassembly it annotates. The same element is
 * the right-hand column on desktop and a docked sheet over the Can on mobile:
 * its content is replaced in place and never accumulates.
 *
 * On mobile it is a contextual inspector: nothing is shown while the user is
 * merely scrolling the disassembly, and the sheet docks over the lower edge of
 * the Can the moment a component is inspected — then reverts on close. That
 * keeps the Can uncovered (and every hotspot anchor reachable) in step mode.
 */
export function CanInspector({
  activeStepData,
  selectedId,
  onClose,
  className,
}: {
  /** Active scroll-step narrative — fallback content when nothing is selected. */
  activeStepData?: DisassemblyStep;
  selectedId: CanComponentId | null;
  onClose?: () => void;
  className?: string;
}) {
  const component = selectedId ? CAN_COMPONENTS[selectedId] : null;
  const isPinned = Boolean(component);

  // Guard only — the route always supplies an active step.
  if (!component && !activeStepData) return null;

  const stageNumber = activeStepData?.stageNumber ?? "00";
  const stageLabel = activeStepData?.label ?? "";

  const title = component?.name ?? activeStepData?.componentTitle ?? "";
  const material = component?.material ?? activeStepData?.material ?? "";
  const description = component?.description ?? activeStepData?.description ?? "";
  const specifications = component?.specifications ?? activeStepData?.specifications ?? [];
  // Material is already the identity line — never repeat it as a spec row.
  const specs = specifications.filter((spec) => spec.label.toLowerCase() !== "material");

  // Key drives a short crossfade: old content is replaced inside the same panel.
  const contentKey = component ? component.id : `step-${activeStepData?.step ?? 0}`;

  return (
    <div
      aria-live="polite"
      className={cn(
        "flex-col overflow-hidden rounded-2xl border bg-card shadow-xs transition-colors duration-200 lg:h-full lg:justify-between",
        // Desktop: always present as the right-hand column with fixed height matching stage.
        // Mobile: it is a contextual inspector — it appears with the inspected
        // component and reverts on close, so the Can is never covered while the
        // user is scrolling through the disassembly.
        isPinned
          ? "pointer-events-auto flex border-primary/40"
          : "pointer-events-none hidden border-border lg:pointer-events-auto lg:flex",
        className,
      )}
    >
      {/* Header — always visible, so the surface stays readable even while the
          detail body is collapsed on mobile. */}
      <div className="flex items-start justify-between gap-2 border-b border-border/60 p-2.5 sm:p-3.5">
        <div className="min-w-0">
          <p className="numeric text-[10px] font-medium tracking-wider text-muted-foreground">
            {stageNumber}
            <span className="mx-1 text-muted-foreground/50">·</span>
            {isPinned ? "COMPONENT" : stageLabel.toUpperCase()}
          </p>
          <h3
            key={`${contentKey}-title`}
            className="animate-in fade-in mt-0.5 break-words text-sm font-semibold leading-snug text-foreground duration-200"
          >
            {title}
          </h3>
          {material ? (
            <p
              key={`${contentKey}-material`}
              className="animate-in fade-in mt-0.5 break-words text-[11px] leading-relaxed text-muted-foreground duration-200"
            >
              {material}
            </p>
          ) : null}
        </div>

        {isPinned && onClose ? (
          <button
            type="button"
            onClick={onClose}
            aria-label="Close component information"
            className="-mr-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        ) : null}
      </div>

      {/* Body — the detail half of the surface. Centred on desktop so the
          two-part composition reads as a deliberate spec sheet. */}
      <div
        className={cn(
          "min-h-0 flex-1 flex-col p-2.5 sm:p-3.5",
          isPinned ? "flex" : "hidden lg:flex",
        )}
      >
        <div
          key={contentKey}
          className="animate-in fade-in flex min-h-0 flex-1 flex-col justify-start gap-2 sm:gap-3 duration-200"
        >
          {description ? (
            <p className="line-clamp-2 text-[11px] leading-snug text-muted-foreground sm:leading-relaxed lg:line-clamp-none">
              {description}
            </p>
          ) : null}

          {specs.length > 0 ? (
            <dl className="grid grid-cols-2 gap-x-3 gap-y-1.5 border-t border-border/60 pt-2 sm:gap-y-2 sm:pt-2.5">
              {specs.map((spec) => (
                <div key={spec.label} className="min-w-0">
                  <dt className="truncate text-[9px] font-medium uppercase tracking-wider text-muted-foreground/70">
                    {spec.label}
                  </dt>
                  <dd className="numeric mt-0.5 text-[11px] font-medium leading-tight break-words text-foreground">
                    {spec.value}
                  </dd>
                </div>
              ))}
            </dl>
          ) : null}
        </div>
      </div>
    </div>
  );
}
