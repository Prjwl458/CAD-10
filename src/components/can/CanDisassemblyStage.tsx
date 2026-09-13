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
   * Continuous physical keyframe interpolation with proportional translate3d(x, y, z) spatial offsets.
   * Component layers separate at relative physical velocities with realistic spatial visual depth.
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

    // Continuous 1:1 physical displacement keyframes with relative velocities & Z-depth
    // 1. Outer Shell: Lifts vertically at high velocity (v = 1.4x) with forward Z-offset
    const shellLiftProgress = clamp01((p - 0.10) / 0.28);
    const shellLiftY = easeInOutCubic(shellLiftProgress) * -160;
    const shellLiftZ = easeInOutCubic(shellLiftProgress) * 25; // slightly closer to viewer
    const shellScale = (1 - 0.02 * (1 - shellOpacity)).toFixed(4);

    // 2. Polyurethane Insulation Core: Medium relative velocity (v = 1.0x) with intermediate Z-offset
    const puEmergeProgress = clamp01((p - 0.22) / 0.20);
    const puEmergeY = (1 - easeOutCubic(puEmergeProgress)) * 12;
    const puLiftProgress = clamp01((p - 0.44) / 0.22);
    const puLiftY = easeInOutCubic(puLiftProgress) * -120;
    const puTotalY = puEmergeY + puLiftY;
    const puZ = easeInOutCubic(puLiftProgress) * 10;

    // 3. Stainless Inner Vessel & PCM Sleeve: Stable base anchor velocity (v = 0.3x)
    const vesselLiftProgress = clamp01((p - 0.52) / 0.20);
    const vesselLiftY = easeInOutCubic(vesselLiftProgress) * -15;
    const vesselZ = easeInOutCubic(vesselLiftProgress) * -10;

    // 4. Complete Exploded Assembly: Multi-axis 3D spatial fan-out
    const expProgress = clamp01((p - 0.78) / 0.20);
    const expScale = 0.95 + 0.05 * easeOutCubic(expProgress);
    const expOffsetY = (1 - easeOutCubic(expProgress)) * 16;
    const expOffsetZ = easeOutCubic(expProgress) * 5;

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
