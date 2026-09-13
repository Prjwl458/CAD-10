import { cn } from "@/lib/utils";
import {
  CAN_ART_DIMS,
  CAN_COMPONENTS,
  type CanComponentId,
  type DisassemblyStep,
} from "@/config/can-specifications";
import { CanHotspotBeacon } from "./CanHotspotBeacon";

/**
 * Which physical layer each component belongs to. Every beacon inherits the
 * exact transform of its own layer so it stays locked to the artwork while
 * the scroll-driven separation plays — shell beacons rise with the shell,
 * vessel beacons settle with the vessel, etc.
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
  selectedComponentId,
  onSelectComponent,
  className,
}: {
  stepData: DisassemblyStep;
  currentStep: number;
  physicalTransforms: Record<string, string>;
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
        {stepData.activeHotspotIds.map((id) => {
          const anchor = CAN_COMPONENTS[id]?.hotspots[currentStep];
          if (!anchor) return null;
          const transform =
            currentStep === 4 ? "none" : (physicalTransforms[COMPONENT_TRANSFORMS[id]] ?? "none");
          return (
            <div key={id} className="absolute inset-0 will-change-transform" style={{ transform }}>
              <CanHotspotBeacon
                componentId={id}
                label={anchor.label}
                u={anchor.u}
                v={anchor.v}
                labelPosition={anchor.labelPosition}
                isSelected={selectedComponentId === id}
                onClick={onSelectComponent}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
