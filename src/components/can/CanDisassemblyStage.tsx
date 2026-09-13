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
   * Continuous physical separation driven directly by scroll progress (0..1).
   * Stage ranges & milestones:
   * 00 Assembled:       0.00 - 0.16 (stepTarget: 0.05) — Grounded monolithic storage can
   * 01 Outer Shell:     0.16 - 0.38 (stepTarget: 0.26) — Outer HDPE shell glides vertically upward off core
   * 02 Thermal Barrier: 0.38 - 0.60 (stepTarget: 0.48) — PU insulation core revealed; then lifts up off inner vessel
   * 03 Inner Vessel:    0.60 - 0.82 (stepTarget: 0.70) — Stainless steel container & 4 PCM columns revealed & grounded
   * 04 Exploded View:   0.82 - 1.00 (stepTarget: 0.94) — Coaxial expansion into complete exploded configuration
   */
  const { physicalTransforms, layerOpacities } = useMemo(() => {
    const p = clamp01(scrollProgress);

    // Smoothstep: C1 continuous S-curve with zero derivative at endpoints
    const smoothstep = (edge0: number, edge1: number, x: number) => {
      const t = clamp01((x - edge0) / (edge1 - edge0));
      return t * t * (3 - 2 * t);
    };

    // Cubic ease-in-out for organic physical acceleration & deceleration
    const easeInOutCubic = (t: number) =>
      t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

    // Ease-out cubic for settling
    const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

    // Smooth C1 Opacity Envelopes
    const assembledOpacity = 1 - smoothstep(0.12, 0.18, p);

    const shellIn = smoothstep(0.12, 0.18, p);
    const shellOut = 1 - smoothstep(0.30, 0.38, p);
    const shellOpacity = shellIn * shellOut;

    const puIn = smoothstep(0.14, 0.24, p);
    const puOut = 1 - smoothstep(0.54, 0.64, p);
    const puOpacity = puIn * puOut;

    const vesselIn = smoothstep(0.48, 0.58, p);
    const vesselOut = 1 - smoothstep(0.80, 0.88, p);
    const vesselOpacity = vesselIn * vesselOut;

    const explodedOpacity = smoothstep(0.80, 0.88, p);

    const opacities = {
      assembled: assembledOpacity,
      shell: shellOpacity,
      pu: puOpacity,
      vessel: vesselOpacity,
      exploded: explodedOpacity,
    };

    // Continuous 3D spatial transforms
    const shellLiftProgress = clamp01((p - 0.12) / 0.30);
    const shellLift = easeInOutCubic(shellLiftProgress) * 130;

    const puEmergeProgress = clamp01((p - 0.18) / 0.18);
    const puEmerge = (1 - easeOutCubic(puEmergeProgress)) * 8;
    const puBlend = smoothstep(0.36, 0.48, p);
    const puEmergeAdjusted = puEmerge * (1 - puBlend);

    const puLiftProgress = clamp01((p - 0.48) / 0.16);
    const puLift = easeInOutCubic(puLiftProgress) * 90;
    const puTotalY = puEmergeAdjusted - puLift;

    const vesselPreStartProgress = clamp01((p - 0.36) / 0.12);
    const vesselPreStart = easeInOutCubic(vesselPreStartProgress) * 5;

    const expProgress = clamp01((p - 0.80) / 0.12);
    const expScale = 0.96 + 0.04 * easeOutCubic(expProgress);
    const expOffset = (1 - easeOutCubic(expProgress)) * 12;

    const shellScale = (1 - 0.04 * (1 - shellOpacity)).toFixed(4);

    const transforms = {
      shell: `translate3d(0, ${-shellLift.toFixed(2)}px, 0) scale3d(${shellScale}, ${shellScale}, 1)`,
      insulationPu: `translate3d(0, ${puTotalY.toFixed(2)}px, 0)`,
      vessel: `translate3d(0, ${vesselPreStart.toFixed(2)}px, 0)`,
      columns: `translate3d(0, ${vesselPreStart.toFixed(2)}px, 0)`,
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
      {/* Main Visual Viewport — continuous scroll-driven layered disassembly */}
      <div className="relative flex aspect-square max-h-[min(46vh,420px)] w-full max-w-[480px] items-center justify-center self-center p-4 sm:max-h-none sm:p-8">
        {/* Stage 00 — Assembled render */}
        {layerOpacities.assembled > 0 && (
          <div
            style={{ opacity: layerOpacities.assembled }}
            className="pointer-events-none absolute inset-0 flex items-center justify-center p-6 will-change-[transform,opacity]"
          >
            <img
              src="/assets/can/assembled/can-assembled.png"
              alt="CAD-10 Assembled Can"
              className="max-h-full max-w-full object-contain mix-blend-multiply"
              loading="eager"
            />
          </div>
        )}

        {/* Stage 03 — Stainless Steel Inner Vessel */}
        {layerOpacities.vessel > 0 && (
          <div
            style={{
              opacity: layerOpacities.vessel,
              transform: physicalTransforms.vessel,
            }}
            className="pointer-events-none absolute inset-0 flex items-center justify-center p-6 will-change-[transform,opacity]"
          >
            <img
              src="/assets/can/layers/can-inner-container-edited.png"
              alt="CAD-10 Inner Container with 4 Columns"
              className="max-h-full max-w-full object-contain mix-blend-multiply"
              loading="eager"
            />
          </div>
        )}

        {/* Stage 02 — PU Foam Insulation Core */}
        {layerOpacities.pu > 0 && (
          <div
            style={{
              opacity: layerOpacities.pu,
              transform: physicalTransforms.insulationPu,
            }}
            className="pointer-events-none absolute inset-0 flex items-center justify-center p-6 will-change-[transform,opacity]"
          >
            <img
              src="/assets/can/layers/can-insulation-pu.png"
              alt="CAD-10 Polyurethane Insulation Core"
              className="max-h-full max-w-full object-contain mix-blend-multiply"
              loading="eager"
            />
          </div>
        )}

        {/* Stage 01 — HDPE Outer Shell */}
        {layerOpacities.shell > 0 && (
          <div
            style={{
              opacity: layerOpacities.shell,
              transform: physicalTransforms.shell,
            }}
            className="pointer-events-none absolute inset-0 flex items-center justify-center p-6 will-change-[transform,opacity]"
          >
            <img
              src="/assets/can/layers/can-assembled.png"
              alt="CAD-10 Outer HDPE Shell"
              className="max-h-full max-w-full object-contain mix-blend-multiply"
              loading="eager"
            />
          </div>
        )}

        {/* Stage 04 — Complete Exploded Assembly */}
        {layerOpacities.exploded > 0 && (
          <div
            style={{
              opacity: layerOpacities.exploded,
              transform: physicalTransforms.exploded,
              transformOrigin: "50% 90%",
            }}
            className="pointer-events-none absolute inset-0 flex items-center justify-center p-6 will-change-[transform,opacity]"
          >
            <img
              src="/assets/can/exploded/can-exploded.png"
              alt="CAD-10 Full Exploded Configuration"
              className="max-h-full max-w-full object-contain mix-blend-multiply"
              loading="eager"
            />
          </div>
        )}

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
