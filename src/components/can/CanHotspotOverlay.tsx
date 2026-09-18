import { cn } from "@/lib/utils";
import {
  CAN_ART_DIMS,
  CAN_COMPONENTS,
  DISASSEMBLY_STEPS,
  type CanComponentId,
  type DisassemblyStep,
} from "@/config/can-specifications";
import { CanHotspotBeacon } from "./CanHotspotBeacon";

/**
 * Which presentation state each component belongs to. Every beacon inherits
 * the exact settle transform of its own illustration so it stays locked to
 * the artwork — no independent drift.
 */
const COMPONENT_TRANSFORMS: Record<CanComponentId, string> = {
  "outer-shell": "shell",
  "lid-assembly": "shell",
  "insulation-layer": "insulationPu",
  "inner-vessel": "vessel",
  "pcm-columns": "columns",
  "base-structure": "base",
};

export function CanHotspotOverlay({
  stepData,
  currentStep,
  physicalTransforms,
  stepWeights,
  selectedComponentId,
  onSelectComponent,
  className,
}: {
  stepData: DisassemblyStep;
  currentStep: number;
  physicalTransforms: Record<string, string>;
  /** Per-state dominance 0..1 from the stage (same timeline as the artwork).
   *  Beacons fade with their own illustration instead of popping on step change. */
  stepWeights?: number[];
  selectedComponentId: CanComponentId | null;
  onSelectComponent: (id: CanComponentId) => void;
  className?: string;
}) {
  const artKey = stepData.imageSrc.replace("/assets/can/", "");
  const art = CAN_ART_DIMS[artKey] ?? { w: 896, h: 1200 };

  return (
    <div className={cn("pointer-events-auto absolute inset-0 z-10", className)}>
      {/* Artwork frame — mirrors the layer <img> box (p-6 inset) + object-contain
          letterboxing (aspect 0.7467) so (u, v) fractions map exactly onto the render. */}
      <div
        className="pointer-events-none absolute top-6 left-0 right-0 mx-auto"
        style={{
          height: "calc(100% - 3rem)",
          width: `calc((100% - 3rem) * ${art.w / art.h})`,
        }}
      >
        {DISASSEMBLY_STEPS.map((step, s) => {
          // Dominance-driven fade: outgoing beacons leave with their
          // illustration, incoming arrive with theirs. Hidden groups stay
          // mounted but invisible and non-interactive — no pop, no remount.
          const weight = stepWeights?.[s] ?? (s === currentStep ? 1 : 0);
          const isDominant = s === currentStep;
          return (
            <div
              key={step.step}
              aria-hidden={!isDominant}
              data-hotspot-group={s}
              data-active={isDominant}
              className="absolute inset-0"
              style={{
                opacity: weight,
                visibility: weight < 0.02 ? "hidden" : "visible",
                pointerEvents: isDominant && weight >= 0.02 ? "auto" : "none",
              }}
            >
              {step.activeHotspotIds.map((id) => {
                const anchor = CAN_COMPONENTS[id]?.hotspots[s];
                if (!anchor) return null;
                const transform =
                  s === 4 ? "none" : (physicalTransforms[COMPONENT_TRANSFORMS[id]] ?? "none");
                return (
                  <div
                    key={id}
                    // Pure transform carrier: must never intercept taps. Each
                    // full-frame wrapper is a stacking context (transform), so
                    // without this the LAST wrapper in DOM order swallows every
                    // real tap and only the last beacon per state is clickable.
                    // Buttons re-enable hit-testing via pointer-events-auto.
                    className="pointer-events-none absolute inset-0 will-change-transform"
                    style={{ transform }}
                  >
                    <CanHotspotBeacon
                      componentId={id}
                      label={anchor.label}
                      u={anchor.u}
                      v={anchor.v}
                      {...(anchor.labelPosition ? { labelPosition: anchor.labelPosition } : {})}
                      isSelected={selectedComponentId === id}
                      onClick={onSelectComponent}
                    />
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}
