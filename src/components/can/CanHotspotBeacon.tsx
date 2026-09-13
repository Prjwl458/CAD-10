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
      {/* Precision Engineering Inspection Pip */}
      <span
        className={cn(
          "relative flex items-center justify-center rounded-full transition-all duration-150",
          isSelected
            ? "h-3.5 w-3.5 border-2 border-primary bg-surface ring-2 ring-primary/30"
            : "h-3 w-3 border border-primary/70 bg-surface shadow-xs group-hover:scale-110 group-hover:border-primary group-hover:bg-primary/10",
        )}
      >
        <span
          className={cn(
            "rounded-full transition-all",
            isSelected ? "h-1.5 w-1.5 bg-primary" : "h-1 w-1 bg-primary/80 group-hover:bg-primary",
          )}
        />
      </span>

      {/* Clean Engineering Coordinate Tag */}
      <span
        className={cn(
          "pointer-events-none absolute whitespace-nowrap rounded border px-1.5 py-0.5 text-[10px] font-medium tracking-tight shadow-xs transition-opacity duration-150",
          labelAbove
            ? "bottom-full mb-1 -translate-x-1/2"
            : "left-1/2 top-full mt-1 -translate-x-1/2",
          isSelected
            ? "border-primary/40 bg-surface text-foreground opacity-100 font-semibold"
            : "border-border bg-surface/95 text-muted-foreground opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100",
        )}
      >
        {label}
      </span>
    </button>
  );
}
