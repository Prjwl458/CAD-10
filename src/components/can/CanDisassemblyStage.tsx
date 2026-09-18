import { useMemo } from "react";
import {
  CAN_STAGE_TRANSITIONS,
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
  const activeStepData: DisassemblyStep = DISASSEMBLY_STEPS[currentStep] ?? DISASSEMBLY_STEPS[0]!;

  /**
   * Art-directed state sequence (NOT a physical disassembly).
   *
   * Current behavior replaced: the previous model slid PNG layers apart with
   * large X/Y offsets, which read as objects flying around. The assets are
   * illustrations/engineering renders, so the stage now presents ONE dominant
   * illustration at a time and dissolves between states like a premium
   * product/engineering presentation changing viewpoints.
   *
   * Why the old feel was wrong: independent per-layer envelopes meant up to
   * three opaque images stacked together, with movement as the primary cue.
   * Here opacity is the handoff cue, supported only by a ±1.6% scale breath
   * and a ≤5px midpoint blur. Zero translation, zero rotation, zero 3D.
   *
   * State -> asset mapping (existing renders only):
   *   0 HERO/ASSEMBLED  -> assembled/can-assembled.png
   *   1 OUTER SHELL     -> layers/can-assembled.png
   *   2 INSULATION      -> layers/can-insulation-pu.png
   *   3 VESSEL+COLUMNS  -> layers/can-inner-container-edited.png (carries both
   *                        the inner-container and column-structure beats; the
   *                        column story is told via its two hotspots)
   *   4 EXPLODED        -> exploded/can-exploded.png
   *
   * p in [0,1] is the only driver (fully reversible, no jumps). Transition
   * windows are centered on the existing step thresholds in can.tsx
   * (0.18/0.40/0.62/0.82) so inspector text and hotspot-set swaps land
   * mid-dissolve, coordinated with the visual handoff. Windows are disjoint,
   * so at most two illustrations are ever partially visible and exactly one
   * dominates outside transitions.
   */
  const { physicalTransforms, layerOpacities, layerBlurs, stepWeights } = useMemo(() => {
    const p = clamp01(scrollProgress);

    // Single easing primitive (Hermite, applied once per ramp — never stacked).
    const ss = (a: number, b: number, x: number) => {
      const t = clamp01((x - a) / (b - a));
      return t * t * (3 - 2 * t);
    };

    // Handoff windows come from the authoritative stage table
    // (CAN_STAGE_TRANSITIONS): short 6% dissolves centered on the step
    // thresholds, leaving ~14-16% calm holds per state. Transitions are NOT
    // slowed — holds are longer, handoffs stay crisp.
    const WINDOWS = CAN_STAGE_TRANSITIONS.map((transition) => ({
      a: transition.windowFrom,
      b: transition.windowTo,
    }));

    // --- Dominance (exactly one state at 1.0 outside windows) ---
    const t = WINDOWS.map((w) => ss(w.a, w.b, p));
    const weights = [
      1 - t[0]!,
      t[0]! * (1 - t[1]!),
      t[1]! * (1 - t[2]!),
      t[2]! * (1 - t[3]!),
      t[3]!,
    ];

    const opacities = {
      assembled: weights[0]!,
      shell: weights[1]!,
      pu: weights[2]!,
      vessel: weights[3]!,
      exploded: weights[4]!,
    };

    // --- Settle (scale breath + midpoint blur, no translation) ---
    // Entering: 0.984 -> 1.0 with 5px -> 0px blur. Holding: 1.0, sharp.
    // Leaving: 1.0 -> 1.016 with 0px -> 5px blur. State 0 starts settled,
    // state 4 never leaves.
    const inT = [1, t[0]!, t[1]!, t[2]!, t[3]!];
    const outT = [t[0]!, t[1]!, t[2]!, t[3]!, 0];
    const scales = inT.map((enter, i) => 0.984 + 0.016 * enter + 0.016 * outT[i]!);
    const blurs = inT.map((enter, i) => (1 - enter) * 5 + outT[i]! * 5);

    const scale3d = (s: number) => {
      const v = s.toFixed(4);
      return `scale3d(${v}, ${v}, 1)`;
    };

    // Keys preserved for CanHotspotOverlay (shell/insulationPu/vessel/columns/
    // exploded/base). Columns share the vessel artwork, so they inherit the
    // vessel settle exactly.
    const transforms = {
      shell: scale3d(scales[1]!),
      insulationPu: scale3d(scales[2]!),
      vessel: scale3d(scales[3]!),
      columns: scale3d(scales[3]!),
      exploded: scale3d(scales[4]!),
      base: "none",
    };

    const blurFor = {
      assembled: blurs[0]!,
      shell: blurs[1]!,
      pu: blurs[2]!,
      vessel: blurs[3]!,
      exploded: blurs[4]!,
    };

    return {
      physicalTransforms: transforms,
      layerOpacities: opacities,
      layerBlurs: blurFor,
      stepWeights: weights,
    };
  }, [scrollProgress]);

  return (
    <div
      className={cn(
        "relative flex flex-col items-center justify-center overflow-visible rounded-2xl border border-border bg-card shadow-xs max-w-full",
        className,
      )}
    >
      {/* Presentation viewport: one dominant illustration at a time */}
      <div className="relative flex aspect-square max-h-[min(46vh,420px)] w-full max-w-[480px] items-center justify-center self-center p-4 sm:max-h-none sm:p-8">
        {/* Stage 00 — Assembled render */}
        <div
          style={{
            opacity: layerOpacities.assembled,
            transform: "scale3d(1, 1, 1)",
            filter: `blur(${layerBlurs.assembled.toFixed(2)}px)`,
            pointerEvents: layerOpacities.assembled > 0.05 ? "auto" : "none",
          }}
          className="absolute inset-0 flex items-center justify-center p-6 will-change-[transform,opacity,filter]"
        >
          <img
            src="/assets/can/assembled/can-assembled.png"
            alt="CAD-10 Assembled Can"
            className="max-h-full max-w-full object-contain mix-blend-multiply"
            loading="eager"
            decoding="async"
            fetchPriority="high"
          />
        </div>

        {/* Stage 03 — Stainless Steel Inner Vessel */}
        <div
          style={{
            opacity: layerOpacities.vessel,
            transform: physicalTransforms.vessel,
            filter: `blur(${layerBlurs.vessel.toFixed(2)}px)`,
            pointerEvents: layerOpacities.vessel > 0.05 ? "auto" : "none",
          }}
          className="absolute inset-0 flex items-center justify-center p-6 will-change-[transform,opacity,filter]"
        >
          <img
            src="/assets/can/layers/can-inner-container-edited.png"
            alt="CAD-10 Inner Container with 4 Columns"
            className="max-h-full max-w-full object-contain mix-blend-multiply"
            loading="eager"
            decoding="async"
            fetchPriority="low"
          />
        </div>

        {/* Stage 02 — PU Foam Insulation Core */}
        <div
          style={{
            opacity: layerOpacities.pu,
            transform: physicalTransforms.insulationPu,
            filter: `blur(${layerBlurs.pu.toFixed(2)}px)`,
            pointerEvents: layerOpacities.pu > 0.05 ? "auto" : "none",
          }}
          className="absolute inset-0 flex items-center justify-center p-6 will-change-[transform,opacity,filter]"
        >
          <img
            src="/assets/can/layers/can-insulation-pu.png"
            alt="CAD-10 Double Insulation Core"
            className="max-h-full max-w-full object-contain mix-blend-multiply"
            loading="eager"
            decoding="async"
            fetchPriority="low"
          />
        </div>

        {/* Stage 01 — HDPE Outer Shell */}
        <div
          style={{
            opacity: layerOpacities.shell,
            transform: physicalTransforms.shell,
            filter: `blur(${layerBlurs.shell.toFixed(2)}px)`,
            pointerEvents: layerOpacities.shell > 0.05 ? "auto" : "none",
          }}
          className="absolute inset-0 flex items-center justify-center p-6 will-change-[transform,opacity,filter]"
        >
          <img
            src="/assets/can/layers/can-assembled.png"
            alt="CAD-10 Outer HDPE Shell"
            className="max-h-full max-w-full object-contain mix-blend-multiply"
            loading="eager"
            decoding="async"
            fetchPriority="low"
          />
        </div>

        {/* Stage 04 — Complete Exploded Assembly */}
        <div
          style={{
            opacity: layerOpacities.exploded,
            transform: physicalTransforms.exploded,
            transformOrigin: "50% 50%",
            filter: `blur(${layerBlurs.exploded.toFixed(2)}px)`,
            pointerEvents: layerOpacities.exploded > 0.05 ? "auto" : "none",
          }}
          className="absolute inset-0 flex items-center justify-center p-6 will-change-[transform,opacity,filter]"
        >
          <img
            src="/assets/can/exploded/can-exploded.png"
            alt="CAD-10 Full Exploded Configuration"
            className="max-h-full max-w-full object-contain mix-blend-multiply"
            loading="eager"
            decoding="async"
            fetchPriority="low"
          />
        </div>

        {/* Interactive Hotspot Inspection Markers */}
        <CanHotspotOverlay
          stepData={activeStepData}
          currentStep={currentStep}
          physicalTransforms={physicalTransforms}
          stepWeights={stepWeights}
          selectedComponentId={selectedComponentId}
          onSelectComponent={onSelectComponent}
        />
      </div>
    </div>
  );
}
