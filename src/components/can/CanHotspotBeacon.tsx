import { cn } from "@/lib/utils";
import type { CanComponentId } from "@/config/can-specifications";

/**
 * Interactive inspection pip anchored to a point on the CAN artwork.
 * `u` / `v` are fractions of the artwork frame (0..1). Visual treatment is
 * identical for every beacon; labels sit deterministically below the pip, or
 * above it when the anchor sits in the lower part of the artwork so labels
 * never collide with the stage edge.
 */
export function CanHotspotBeacon({
  componentId,
  label,
  u,
  v,
  labelPosition,
  isSelected,
  onClick,
  className,
}: {
  componentId: CanComponentId;
  label: string;
  u: number;
  v: number;
  labelPosition?: "above" | "below";
  isSelected: boolean;
  onClick: (id: CanComponentId) => void;
  className?: string;
}) {
  const labelAbove = labelPosition ? labelPosition === "above" : v >= 0.62;

  return (
    <button
      type="button"
      onClick={() => onClick(componentId)}
      aria-label={`Inspect ${label}`}
      style={{ left: `${u * 100}%`, top: `${v * 100}%` }}
      className={cn(
        "group pointer-events-auto absolute z-10 -translate-x-1/2 -translate-y-1/2 cursor-pointer flex min-h-11 min-w-11 items-center justify-center focus:outline-none",
        className,
      )}
    >
      {/* Restrained technical marker: crisp 12px pip, 44px tap target kept on
          the button. Tappable at a glance via high-contrast dot + halo ring. */}
      <span
        className={cn(
          "relative flex items-center justify-center rounded-full bg-surface shadow-[0_1px_3px_rgba(15,35,60,0.35)] ring-1 ring-primary/40 transition-all duration-150",
          isSelected
            ? "h-4 w-4 border-2 border-primary bg-primary ring-2 ring-primary/50"
            : "h-3 w-3 border-[1.5px] border-primary/80 group-hover:scale-125 group-hover:border-primary group-hover:ring-2 group-hover:ring-primary/30 group-focus-visible:ring-2 group-focus-visible:ring-primary/60",
        )}
      >
        <span
          className={cn(
            "rounded-full",
            isSelected ? "h-1.5 w-1.5 bg-primary-foreground" : "h-[5px] w-[5px] bg-primary",
          )}
        />
      </span>

      {/* Engineering callout tag: reveal on hover/focus/selection only, so
          labels never collide. Position rule unchanged (above/below). */}
      <span
        className={cn(
          "pointer-events-none absolute whitespace-nowrap rounded-md border px-2 py-0.5 text-[10px] font-medium tracking-wide shadow-sm transition-opacity duration-150",
          labelAbove
            ? "bottom-full mb-1 -translate-x-1/2"
            : "left-1/2 top-full mt-1 -translate-x-1/2",
          isSelected
            ? "border-primary/50 bg-surface font-semibold text-foreground opacity-100"
            : "border-border bg-surface/95 text-muted-foreground opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100",
        )}
      >
        {label}
      </span>
    </button>
  );
}
