import { useEffect, useRef } from "react";
import {
  CAN_COMPONENTS,
  type CanComponentId,
  type DisassemblyStep,
} from "@/config/can-specifications";

/**
 * Subtle leader line from the inspected hotspot to the information panel.
 *
 * It is deliberately additive: it reads the rendered position of the selected
 * beacon (which already carries its layer's transform) and draws toward the
 * panel. It does not participate in the hotspot coordinate system or the
 * disassembly transforms in any way, so the anchoring stays exactly as it was.
 *
 * Only the SELECTED hotspot ever has a connector, and the line only exists
 * while something is inspected — during the scroll-driven disassembly there is
 * nothing extra on screen. Desktop only: on mobile the sheet covers the
 * hotspot it describes, so a connector there would point at nothing.
 */
export function CanLeaderLine({
  selectedId,
  activeStepData,
}: {
  selectedId: CanComponentId | null;
  activeStepData?: DisassemblyStep;
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  const pathRef = useRef<SVGPathElement>(null);
  const startRef = useRef<SVGCircleElement>(null);
  const endRef = useRef<SVGCircleElement>(null);

  const step = activeStepData?.step ?? 0;

  useEffect(() => {
    if (!selectedId) return;
    let raf = 0;

    const clear = () => {
      pathRef.current?.setAttribute("d", "");
    };

    const draw = () => {
      const svg = svgRef.current;
      const frame = svg?.parentElement as HTMLElement | null;
      if (!svg || !frame) return;
      // Not rendered at this breakpoint (mobile uses the docked sheet instead).
      if (svg.getClientRects().length === 0) {
        clear();
        return;
      }

      // The beacon is located by the exact aria-label it renders from config,
      // scoped to the DOMINANT hotspot group. A global querySelector could
      // return a hidden duplicate beacon from another always-mounted state.
      const label = CAN_COMPONENTS[selectedId]?.hotspots[step]?.label;
      const beacon = label
        ? (document.querySelector<HTMLElement>(
            `div[data-active="true"] button[aria-label="Inspect ${label}"]`,
          ) ?? document.querySelector<HTMLElement>(`button[aria-label="Inspect ${label}"]`))
        : null;
      const panel = document.querySelector<HTMLElement>('[aria-live="polite"]');
      if (!beacon || !panel || panel.getClientRects().length === 0) {
        clear();
        return;
      }

      const fr = frame.getBoundingClientRect();
      const br = beacon.getBoundingClientRect();
      const pr = panel.getBoundingClientRect();
      if (!fr.width || !fr.height || !br.width) {
        clear();
        return;
      }

      const x1 = br.left + br.width / 2 - fr.left;
      const y1 = br.top + br.height / 2 - fr.top;
      const x2 = pr.left - fr.left - 6;
      const dx = x2 - x1;
      if (dx < 24) {
        clear();
        return;
      }
      // Aim at the panel's own vertical extent so the line never points at
      // empty space beside a short panel.
      const top = pr.top - fr.top + 16;
      const bottom = pr.bottom - fr.top - 16;
      const y2 = Math.max(top, Math.min(y1, Math.max(top, bottom)));

      svg.setAttribute("viewBox", `0 0 ${fr.width} ${fr.height}`);
      pathRef.current?.setAttribute(
        "d",
        `M ${x1} ${y1} C ${x1 + dx * 0.45} ${y1} ${x2 - dx * 0.45} ${y2} ${x2} ${y2}`,
      );
      startRef.current?.setAttribute("cx", `${x1}`);
      startRef.current?.setAttribute("cy", `${y1}`);
      endRef.current?.setAttribute("cx", `${x2}`);
      endRef.current?.setAttribute("cy", `${y2}`);
    };

    const schedule = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        draw();
      });
    };

    schedule();
    // Settle passes: the selected layer may still be animating when clicked.
    const settle = window.setTimeout(schedule, 80);
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    return () => {
      window.clearTimeout(settle);
      if (raf) cancelAnimationFrame(raf);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
    };
  }, [selectedId, step]);

  if (!selectedId) return null;

  return (
    <svg
      ref={svgRef}
      aria-hidden="true"
      data-leader-line="true"
      preserveAspectRatio="none"
      className="pointer-events-none absolute inset-0 z-[25] hidden h-full w-full lg:block"
    >
      <path
        ref={pathRef}
        className="fill-none stroke-primary/35"
        strokeWidth={1}
        strokeLinecap="round"
      />
      {/* Parked off-canvas until the first measurement lands. */}
      <circle ref={startRef} cx={-10} cy={-10} r={2.5} className="fill-primary/60" />
      <circle ref={endRef} cx={-10} cy={-10} r={2} className="fill-primary/45" />
    </svg>
  );
}
