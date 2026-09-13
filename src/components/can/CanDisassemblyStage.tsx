import { useMemo } from "react";
import {
  DISASSEMBLY_STEPS,
  type CanComponentId,
  type DisassemblyStep,
} from "@/config/can-specifications";
import { CanHotspotOverlay } from "./CanHotspotOverlay";
import { cn } from "@/lib/utils";

const clamp01 = (x: number) => Math.max(0, Math.min(1, x));

export function CanDisassemblyStage({
  currentStep,
  scrollProgress = 0,
  selectedComponentId,
  onSelectComponent,
  className,
}: {
  currentStep: number;
  scrollProgress?: number;
  selectedComponentId: CanComponentId | null;
  onSelectComponent: (id: CanComponentId) => void;
  className?: string;
}) {
  const activeStepData: DisassemblyStep = DISASSEMBLY_STEPS[currentStep] ?? DISASSEMBLY_STEPS[0];

  /**
   * Continuous physical keyframe interpolation bound directly to scrollProgress (0..1).
   * All layers remain mounted continuously in the DOM; positions and opacities are updated
   * continuously via smoothstep and cubic easing functions to ensure true 1:1 physical motion.
   */
  const { physicalTransforms, layerOpacities } = useMemo(() => {
    const p = clamp01(scrollProgress);

    // Smoothstep for smooth C1 continuous transitions
    const smoothstep = (edge0: number, edge1: number, x: number) => {
      const t = clamp01((x - edge0) / (edge1 - edge0));
      return t * t * (3 - 2 * t);
    };

    const easeInOutCubic = (t: number) =>
      t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

    const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

    // Continuous opacity envelopes across disassembly stages
    const assembledOpacity = 1 - smoothstep(0.10, 0.22, p);

    const shellIn = smoothstep(0.08, 0.20, p);
    const shellOut = 1 - smoothstep(0.34, 0.44, p);
    const shellOpacity = shellIn * shellOut;

    const puIn = smoothstep(0.25, 0.38, p);
    const puOut = 1 - smoothstep(0.58, 0.68, p);
    const puOpacity = puIn * puOut;

    const vesselIn = smoothstep(0.50, 0.64, p);
    const vesselOut = 1 - smoothstep(0.78, 0.88, p);
    const vesselOpacity = vesselIn * vesselOut;

    const explodedOpacity = smoothstep(0.78, 0.90, p);

    const opacities = {
      assembled: assembledOpacity,
      shell: shellOpacity,
      pu: puOpacity,
      vessel: vesselOpacity,
      exploded: explodedOpacity,
    };

    // Continuous 1:1 physical displacement keyframes
    const shellLiftProgress = clamp01((p - 0.10) / 0.28);
    const shellLift = easeInOutCubic(shellLiftProgress) * 140;

    const puEmergeProgress = clamp01((p - 0.22) / 0.20);
    const puEmerge = (1 - easeOutCubic(puEmergeProgress)) * 10;
    const puLiftProgress = clamp01((p - 0.44) / 0.22);
    const puLift = easeInOutCubic(puLiftProgress) * 110;
    const puTotalY = puEmerge - puLift;

    const vesselLiftProgress = clamp01((p - 0.52) / 0.20);
    const vesselLift = easeInOutCubic(vesselLiftProgress) * 10;

    const expProgress = clamp01((p - 0.78) / 0.20);
    const expScale = 0.95 + 0.05 * easeOutCubic(expProgress);
    const expOffset = (1 - easeOutCubic(expProgress)) * 14;

    const shellScale = (1 - 0.03 * (1 - shellOpacity)).toFixed(4);

    const transforms = {
      shell: `translate3d(0, ${(-shellLift).toFixed(2)}px, 0) scale3d(${shellScale}, ${shellScale}, 1)`,
      insulationPu: `translate3d(0, ${puTotalY.toFixed(2)}px, 0)`,
      vessel: `translate3d(0, ${vesselLift.toFixed(2)}px, 0)`,
      columns: `translate3d(0, ${vesselLift.toFixed(2)}px, 0)`,
      exploded: `translate3d(0, ${expOffset.toFixed(2)}px, 0) scale3d(${expScale.toFixed(4)}, ${expScale.toFixed(4)}, 1)`,
      base: "translate3d(0, 0, 0)",
    };

    return { physicalTransforms: transforms, layerOpacities: opacities };
  }, [scrollProgress]);

  return (
    <div
      className={cn(
        "relative flex flex-col items-center justify-center overflow-visible rounded-2xl border border-border bg-card shadow-xs max-w-full",
        className,
      )}
    >
      {/* Main Visual Viewport — continuous 1:1 scroll scrubbing without element unmounting */}
      <div className="relative flex aspect-square max-h-[min(46vh,420px)] w-full max-w-[480px] items-center justify-center self-center p-4 sm:max-h-none sm:p-8">
        {/* Stage 00 — Assembled render */}
        <div
          style={{
            opacity: layerOpacities.assembled,
            pointerEvents: layerOpacities.assembled > 0.05 ? "auto" : "none",
          }}
          className="absolute inset-0 flex items-center justify-center p-6 transition-opacity duration-75 will-change-[transform,opacity]"
        >
          <img
            src="/assets/can/assembled/can-assembled.png"
            alt="CAD-10 Assembled Can"
            className="max-h-full max-w-full object-contain mix-blend-multiply"
            loading="eager"
          />
        </div>

        {/* Stage 03 — Stainless Steel Inner Vessel */}
        <div
          style={{
            opacity: layerOpacities.vessel,
            transform: physicalTransforms.vessel,
            pointerEvents: layerOpacities.vessel > 0.05 ? "auto" : "none",
          }}
          className="absolute inset-0 flex items-center justify-center p-6 transition-opacity duration-75 will-change-[transform,opacity]"
        >
          <img
            src="/assets/can/layers/can-inner-container-edited.png"
            alt="CAD-10 Inner Container with 4 Columns"
            className="max-h-full max-w-full object-contain mix-blend-multiply"
            loading="eager"
          />
        </div>

        {/* Stage 02 — PU Foam Insulation Core */}
        <div
          style={{
            opacity: layerOpacities.pu,
            transform: physicalTransforms.insulationPu,
            pointerEvents: layerOpacities.pu > 0.05 ? "auto" : "none",
          }}
          className="absolute inset-0 flex items-center justify-center p-6 transition-opacity duration-75 will-change-[transform,opacity]"
        >
          <img
            src="/assets/can/layers/can-insulation-pu.png"
            alt="CAD-10 Polyurethane Insulation Core"
            className="max-h-full max-w-full object-contain mix-blend-multiply"
            loading="eager"
          />
        </div>

        {/* Stage 01 — HDPE Outer Shell */}
        <div
          style={{
            opacity: layerOpacities.shell,
            transform: physicalTransforms.shell,
            pointerEvents: layerOpacities.shell > 0.05 ? "auto" : "none",
          }}
          className="absolute inset-0 flex items-center justify-center p-6 transition-opacity duration-75 will-change-[transform,opacity]"
        >
          <img
            src="/assets/can/layers/can-assembled.png"
            alt="CAD-10 Outer HDPE Shell"
            className="max-h-full max-w-full object-contain mix-blend-multiply"
            loading="eager"
          />
        </div>

        {/* Stage 04 — Complete Exploded Assembly */}
        <div
          style={{
            opacity: layerOpacities.exploded,
            transform: physicalTransforms.exploded,
            transformOrigin: "50% 90%",
            pointerEvents: layerOpacities.exploded > 0.05 ? "auto" : "none",
          }}
          className="absolute inset-0 flex items-center justify-center p-6 transition-opacity duration-75 will-change-[transform,opacity]"
        >
          <img
            src="/assets/can/exploded/can-exploded.png"
            alt="CAD-10 Full Exploded Configuration"
            className="max-h-full max-w-full object-contain mix-blend-multiply"
            loading="eager"
          />
        </div>

        {/* Interactive Hotspot Inspection Markers */}
        <CanHotspotOverlay
          stepData={activeStepData}
          currentStep={currentStep}
          physicalTransforms={physicalTransforms}
          selectedComponentId={selectedComponentId}
          onSelectComponent={onSelectComponent}
        />
      </div>
    </div>
  );
}
