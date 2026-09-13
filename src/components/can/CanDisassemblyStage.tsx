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

  /** Continuous physical keyframe interpolation. */
  const { physicalTransforms, layerOpacities } = useMemo(() => {
    const p = clamp01(scrollProgress);

    // Continuous smoothstep (Hermite C1 interpolation)
    const smoothstep = (edge0: number, edge1: number, x: number) => {
      const t = clamp01((x - edge0) / (edge1 - edge0));
      return t * t * (3 - 2 * t);
    };

    const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

    // Components stay mounted throughout. Their visibility overlaps their
    // movement, preventing an invisible layer from arriving late in view.
    const assembledOpacity = 1 - smoothstep(0.04, 0.18, p);

    const shellIn = smoothstep(0.04, 0.18, p);
    const shellOut = 1 - smoothstep(0.52, 0.7, p);
    const shellOpacity = easeOutCubic(shellIn) * easeOutCubic(shellOut);

    const puIn = smoothstep(0.18, 0.36, p);
    const puOut = 1 - smoothstep(0.72, 0.88, p);
    const puOpacity = easeOutCubic(puIn) * easeOutCubic(puOut);

    const vesselIn = smoothstep(0.32, 0.5, p);
    const vesselOut = 1 - smoothstep(0.84, 0.96, p);
    const vesselOpacity = easeOutCubic(vesselIn) * easeOutCubic(vesselOut);

    const explodedOpacity = easeOutCubic(smoothstep(0.82, 0.98, p));

    const opacities = {
      assembled: assembledOpacity,
      shell: shellOpacity,
      pu: puOpacity,
      vessel: vesselOpacity,
      exploded: explodedOpacity,
    };

    // Restrained component offsets preserve a stable centre of mass.  The
    // layers separate around the can rather than reading as full-height panels
    // travelling up the viewport.
    // Outer Shell
    const shellLiftProgress = smoothstep(0.08, 0.5, p);
    const shellLiftX = easeOutCubic(shellLiftProgress) * -10;
    const shellLiftY = easeOutCubic(shellLiftProgress) * -48;
    const shellLiftZ = easeOutCubic(shellLiftProgress) * 12;
    const shellRotation = easeOutCubic(shellLiftProgress) * -0.8;
    const shellScale = (1.0 - 0.03 * (1.0 - shellOpacity)).toFixed(4);

    // PU Core
    const puEmergeProgress = smoothstep(0.18, 0.42, p);
    const puEmergeY = (1 - easeOutCubic(puEmergeProgress)) * 6;
    const puLiftProgress = smoothstep(0.38, 0.76, p);
    const puLiftX = easeOutCubic(puLiftProgress) * 8; // eased lateral movement
    const puLiftY = easeOutCubic(puLiftProgress) * -26;
    const puTotalY = puEmergeY + puLiftY;
    const puZ = easeOutCubic(puLiftProgress) * 8;
    const puRotation = easeOutCubic(puLiftProgress) * 0.275; // reduced rotation

    // Stainless Inner Vessel
    const vesselLiftProgress = smoothstep(0.32, 0.88, p);
    const vesselLiftX = easeOutCubic(vesselLiftProgress) * 3;
    const vesselLiftY = easeOutCubic(vesselLiftProgress) * 8;
    const vesselZ = easeOutCubic(vesselLiftProgress) * -4;
    const vesselRotation = easeOutCubic(vesselLiftProgress) * -0.15; // reduced rotation

    // The final artwork takes over with the same C1 interpolation used by the
    // physical layers, avoiding an over-eased final approach or visible snap.
    const expProgress = smoothstep(0.82, 1.0, p);
    const expProgressEased = easeOutCubic(expProgress);
    const expScale = 0.94 + 0.06 * expProgressEased; // use eased progress for scale
    const expOffsetY = (1 - expProgressEased) * 20;
    const expOffsetZ = expProgressEased * 10;

    const transforms = {
      shell: `translate3d(${shellLiftX.toFixed(2)}px, ${shellLiftY.toFixed(2)}px, ${shellLiftZ.toFixed(2)}px) rotateZ(${shellRotation.toFixed(2)}deg) scale3d(${shellScale}, ${shellScale}, 1)`,
      insulationPu: `translate3d(${puLiftX.toFixed(2)}px, ${puTotalY.toFixed(2)}px, ${puZ.toFixed(2)}px) rotateZ(${puRotation.toFixed(2)}deg)`,
      vessel: `translate3d(${vesselLiftX.toFixed(2)}px, ${vesselLiftY.toFixed(2)}px, ${vesselZ.toFixed(2)}px) rotateZ(${vesselRotation.toFixed(2)}deg)`,
      columns: `translate3d(${vesselLiftX.toFixed(2)}px, ${vesselLiftY.toFixed(2)}px, ${vesselZ.toFixed(2)}px) rotateZ(${vesselRotation.toFixed(2)}deg)`,
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
