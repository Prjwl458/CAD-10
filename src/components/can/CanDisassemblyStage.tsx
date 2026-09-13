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
   * Continuous physical keyframe interpolation with high-friction deceleration.
   * Remaps scroll progress approaching 1.0 using a quintic ease-out curve (1 - (1 - t)^5)
   * so all layer velocities glide smoothly into their final resting positions without snapping.
   */
  const { physicalTransforms, layerOpacities } = useMemo(() => {
    const p = clamp01(scrollProgress);

    // Continuous smoothstep (Hermite C1 interpolation)
    const smoothstep = (edge0: number, edge1: number, x: number) => {
      const t = clamp01((x - edge0) / (edge1 - edge0));
      return t * t * (3 - 2 * t);
    };

    const easeInOutCubic = (t: number) =>
      t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

    const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

    // Quintic Ease-Out for ultra-smooth physical glide as p -> 1.0
    const easeOutQuint = (t: number) => 1 - Math.pow(1 - t, 5);

    // Balanced opacity envelopes ensuring steady visual mass across [0.0, 1.0]
    // 1. Assembled stage (0.00 -> 0.22)
    const assembledOpacity = 1 - smoothstep(0.06, 0.22, p);

    // 2. Outer shell stage (0.12 -> 0.50)
    const shellIn = smoothstep(0.08, 0.22, p);
    const shellOut = 1 - smoothstep(0.42, 0.54, p);
    const shellOpacity = shellIn * shellOut;

    // 3. PU insulation stage (0.38 -> 0.76)
    const puIn = smoothstep(0.36, 0.48, p);
    const puOut = 1 - smoothstep(0.68, 0.78, p);
    const puOpacity = puIn * puOut;

    // 4. Inner vessel stage (0.60 -> 0.92)
    const vesselIn = smoothstep(0.58, 0.72, p);
    const vesselOut = 1 - smoothstep(0.86, 0.94, p);
    const vesselOpacity = vesselIn * vesselOut;

    // 5. Complete exploded stage (0.72 -> 1.00) with gentle arrival
    const explodedOpacity = smoothstep(0.72, 0.90, p);

    const opacities = {
      assembled: assembledOpacity,
      shell: shellOpacity,
      pu: puOpacity,
      vessel: vesselOpacity,
      exploded: explodedOpacity,
    };

    // Deterministic multi-axis 3D spatial transformations
    // Outer Shell
    const shellLiftProgress = smoothstep(0.10, 0.48, p);
    const shellLiftY = easeInOutCubic(shellLiftProgress) * -170;
    const shellLiftZ = easeInOutCubic(shellLiftProgress) * 30;
    const shellScale = (1.0 - 0.03 * (1.0 - shellOpacity)).toFixed(4);

    // PU Core
    const puEmergeProgress = smoothstep(0.22, 0.44, p);
    const puEmergeY = (1 - easeOutCubic(puEmergeProgress)) * 14;
    const puLiftProgress = smoothstep(0.42, 0.74, p);
    const puLiftY = easeInOutCubic(puLiftProgress) * -130;
    const puTotalY = puEmergeY + puLiftY;
    const puZ = easeInOutCubic(puLiftProgress) * 12;

    // Stainless Inner Vessel
    const vesselLiftProgress = smoothstep(0.58, 0.88, p);
    const vesselLiftY = easeInOutCubic(vesselLiftProgress) * -20;
    const vesselZ = easeInOutCubic(vesselLiftProgress) * -12;

    // Exploded View — High-friction quintic ease-out deceleration into final rest position
    const expRawProgress = smoothstep(0.72, 1.00, p);
    const expEased = easeOutQuint(expRawProgress);
    const expScale = 0.94 + 0.06 * expEased;
    const expOffsetY = (1 - expEased) * 20;
    const expOffsetZ = expEased * 10;

    const transforms = {
      shell: `translate3d(0px, ${shellLiftY.toFixed(2)}px, ${shellLiftZ.toFixed(2)}px) scale3d(${shellScale}, ${shellScale}, 1)`,
      insulationPu: `translate3d(0px, ${puTotalY.toFixed(2)}px, ${puZ.toFixed(2)}px)`,
      vessel: `translate3d(0px, ${vesselLiftY.toFixed(2)}px, ${vesselZ.toFixed(2)}px)`,
      columns: `translate3d(0px, ${vesselLiftY.toFixed(2)}px, ${vesselZ.toFixed(2)}px)`,
      exploded: `translate3d(0px, ${expOffsetY.toFixed(2)}px, ${expOffsetZ.toFixed(2)}px) scale3d(${expScale.toFixed(4)}, ${expScale.toFixed(4)}, 1)`,
      base: "translate3d(0px, 0px, 0px)",
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
      {/* Main Visual Viewport with 3D perspective for realistic depth separation */}
      <div
        className="relative flex aspect-square max-h-[min(46vh,420px)] w-full max-w-[480px] items-center justify-center self-center p-4 sm:max-h-none sm:p-8"
        style={{ perspective: "1000px", transformStyle: "preserve-3d" }}
      >
        {/* Stage 00 — Assembled render */}
        <div
          style={{
            opacity: layerOpacities.assembled,
            pointerEvents: layerOpacities.assembled > 0.05 ? "auto" : "none",
          }}
          className="absolute inset-0 flex items-center justify-center p-6 will-change-[transform,opacity]"
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
          className="absolute inset-0 flex items-center justify-center p-6 will-change-[transform,opacity]"
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
          className="absolute inset-0 flex items-center justify-center p-6 will-change-[transform,opacity]"
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
          className="absolute inset-0 flex items-center justify-center p-6 will-change-[transform,opacity]"
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
          className="absolute inset-0 flex items-center justify-center p-6 will-change-[transform,opacity]"
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
