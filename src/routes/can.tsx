import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useRef, useCallback } from "react";
import { AppShell } from "@/components/AppShell";
import {
  DISASSEMBLY_STEPS,
  CAN_STAGE_TRANSITIONS,
  type CanComponentId,
} from "@/config/can-specifications";
import { CanDisassemblyStage } from "@/components/can/CanDisassemblyStage";
import { CanInspector } from "@/components/can/CanInspector";
import { CanLeaderLine } from "@/components/can/CanLeaderLine";
import { CanStepController } from "@/components/can/CanStepController";
import { CanStageNavigator } from "@/components/can/CanStageNavigator";

export const Route = createFileRoute("/can")({
  head: () => ({
    meta: [
      { title: "Can Specifications — CAD-10" },
      {
        name: "description",
        content:
          "Engineering product disassembly for the CAD-10 milk storage can. 420 mm height, 280 mm diameter, 3-layer construction, and 4 internal columns.",
      },
    ],
  }),
  component: CanPage,
});

function CanPage() {
  const [scrollProgress, setScrollProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState(0);
  const [selectedComponentId, setSelectedComponentId] = useState<CanComponentId | null>(null);

  const scrollTrackRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number>(0);
  const trackBoundsRef = useRef<{ top: number; height: number }>({ top: 0, height: 0 });
  const pendingProgressRef = useRef<number>(0);

  // Update cached geometry on resize to avoid reading DOM properties inside high-frequency scroll events
  const updateTrackBounds = useCallback(() => {
    if (!scrollTrackRef.current) return;
    const rect = scrollTrackRef.current.getBoundingClientRect();
    const scrollTop = window.scrollY || window.pageYOffset;
    trackBoundsRef.current = {
      top: rect.top + scrollTop,
      height: rect.height,
    };
  }, []);

  useEffect(() => {
    updateTrackBounds();
    window.addEventListener("resize", updateTrackBounds, { passive: true });
    window.addEventListener("orientationchange", updateTrackBounds, { passive: true });

    return () => {
      window.removeEventListener("resize", updateTrackBounds);
      window.removeEventListener("orientationchange", updateTrackBounds);
    };
  }, [updateTrackBounds]);

  // Derive active stage indicator smoothly from continuous scroll progress.
  // The dominant step is the count of stage boundaries at or below the
  // progress (CAN_STAGE_TRANSITIONS is the single source for boundaries).
  useEffect(() => {
    let step = 0;
    for (const transition of CAN_STAGE_TRANSITIONS) {
      if (scrollProgress < transition.boundary) break;
      step += 1;
    }

    setCurrentStep(step);
  }, [scrollProgress]);

  // Render the scroll position itself. A requestAnimationFrame only coalesces
  // browser events into one paint; it must not make the can chase scrolling.
  const commitPendingProgress = useCallback(() => {
    rafRef.current = 0;
    setScrollProgress(pendingProgressRef.current);
  }, []);

  const handleScroll = useCallback(() => {
    const { top, height } = trackBoundsRef.current;
    const windowHeight = window.innerHeight;
    const totalScrollable = height - windowHeight;

    if (totalScrollable <= 0) return;

    const currentScrolled = window.scrollY - top;
    const rawProgress = Math.max(0, Math.min(1, currentScrolled / totalScrollable));

    pendingProgressRef.current = rawProgress;

    if (!rafRef.current) {
      rafRef.current = requestAnimationFrame(commitPendingProgress);
    }
  }, [commitPendingProgress]);

  useEffect(() => {
    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();

    return () => {
      window.removeEventListener("scroll", handleScroll);
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = 0;
      }
    };
  }, [handleScroll]);

  // Smooth scroll to stage milestone.
  // These are rest positions inside each state's hold (start/end for the
  // first/last state), deliberately distinct from the stage BOUNDARIES in
  // CAN_STAGE_TRANSITIONS — so they stay local here rather than being
  // derived from boundaries.
  // Stable across renders (refs + memoized geometry only): consumers such
  // as the autoplay interval can safely depend on it without resetting.
  const scrollToStep = useCallback(
    (stepIndex: number) => {
      if (!scrollTrackRef.current) return;
      updateTrackBounds();
      const { top, height } = trackBoundsRef.current;
      const totalScrollable = height - window.innerHeight;

      const stepTargets = [0.0, 0.28, 0.52, 0.74, 1.0];
      const targetRatio = stepTargets[stepIndex] ?? 0;
      const targetScrollY = top + targetRatio * totalScrollable;

      window.scrollTo({
        top: targetScrollY,
        behavior: "smooth",
      });
    },
    [updateTrackBounds],
  );

  const handleSelectComponent = (id: CanComponentId) => {
    setSelectedComponentId((prev) => (prev === id ? null : id));
  };

  // Shared stage-change path for the stepper and the mobile stage shortcut:
  // smooth-scroll to the stage milestone and let scroll (the source of truth)
  // drive the animation; a selection belongs to its step, so release it.
  // Memoized so the autoplay interval (which depends on this callback) is
  // not torn down by unrelated renders — only by genuine step changes,
  // which the interval effect already tracks via currentStep.
  const goToStep = useCallback(
    (stepIndex: number) => {
      scrollToStep(stepIndex);
      setSelectedComponentId(null);
    },
    [scrollToStep],
  );

  // Single coordination seam: a selection belongs to its narrative step.
  // Crossing into a new dominant step (wheel, scrubber, stepper, or keyboard
  // all funnel through currentStep) gracefully releases inspection so the
  // inspector never shows one state's component over another state's
  // illustration. Tiny scrolls within a step never touch selection.
  const prevStepRef = useRef<number>(currentStep);
  useEffect(() => {
    if (prevStepRef.current === currentStep) return;
    prevStepRef.current = currentStep;
    setSelectedComponentId((prev) => (prev === null ? prev : null));
  }, [currentStep]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") {
        scrollToStep(Math.min(DISASSEMBLY_STEPS.length - 1, currentStep + 1));
      } else if (e.key === "ArrowLeft") {
        scrollToStep(Math.max(0, currentStep - 1));
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [currentStep, scrollToStep]);

  const activeStepData = DISASSEMBLY_STEPS[currentStep] ?? DISASSEMBLY_STEPS[0]!;

  return (
    <AppShell
      title="Can Specifications"
      subtitle="Engineering architecture and physical disassembly"
    >
      {/* Disassembly Experience */}
      <div className="mt-4">
        {/* Stepper Controller */}
        <CanStepController currentStep={currentStep} onStepChange={goToStep} />

        <p className="mt-3 px-1 text-[11px] text-muted-foreground">
          Scroll down to disassemble layers
        </p>

        {/* Tall Scroll Track — height is the pacing budget: the same 0→1
              timeline stretches over more scroll distance, so each state gets
              a calm inspection hold. Mobile stays shorter to avoid fatigue. */}
        <div
          ref={scrollTrackRef}
          data-can-track
          className="relative mt-3 min-h-[380vh] sm:min-h-[450vh] lg:min-h-[620vh]"
        >
          <div className="sticky top-16 z-10 flex flex-col gap-2.5 sm:top-20">
            <div className="relative overflow-hidden rounded-2xl border border-border bg-card shadow-xs lg:grid lg:grid-cols-[1.15fr_0.85fr]">
              {/* LEFT Column: Visual Canvas + Hotspots + Integrated Scrubber */}
              <div className="flex flex-col justify-between">
                <CanDisassemblyStage
                  className="rounded-none border-0 bg-transparent shadow-none"
                  currentStep={currentStep}
                  scrollProgress={scrollProgress}
                  selectedComponentId={selectedComponentId}
                  onSelectComponent={handleSelectComponent}
                />

                {/* Scrubber slider integrated at bottom of LEFT column */}
                <div className="border-t border-border/60 bg-surface/50 p-2.5">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-muted-foreground">Scrub Assembly</span>
                    <span className="numeric text-muted-foreground">
                      {Math.round(scrollProgress * 100)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.001"
                    value={scrollProgress}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      pendingProgressRef.current = val;
                      setScrollProgress(val);
                      if (scrollTrackRef.current) {
                        updateTrackBounds();
                        const { top, height } = trackBoundsRef.current;
                        const totalScrollable = height - window.innerHeight;
                        window.scrollTo({
                          top: top + val * totalScrollable,
                          behavior: "auto",
                        });
                      }
                    }}
                    className="mt-1.5 h-1.5 w-full cursor-ew-resize accent-[var(--primary)]"
                    aria-label="Disassembly scrubber"
                  />
                </div>
              </div>

              {/* RIGHT Column: ONE compact contextual information panel */}
              <div
                className={`${selectedComponentId ? "pointer-events-auto" : "pointer-events-none"} absolute inset-x-2 bottom-2 z-30 max-h-[52vh] overflow-y-auto sm:max-h-[60vh] lg:relative lg:inset-auto lg:z-auto lg:flex lg:h-full lg:max-h-none lg:flex-col lg:overflow-visible lg:border-l lg:border-border`}
              >
                <CanInspector
                  className={
                    selectedComponentId
                      ? "mx-auto w-full max-w-md lg:h-full lg:max-w-none"
                      : "mx-auto w-full max-w-md lg:h-full lg:max-w-none lg:rounded-none lg:border-0 lg:shadow-none"
                  }
                  activeStepData={activeStepData}
                  selectedId={selectedComponentId}
                  onClose={() => setSelectedComponentId(null)}
                />
              </div>

              {/* Vector Leader Line Connector */}
              <CanLeaderLine selectedId={selectedComponentId} activeStepData={activeStepData} />
            </div>
          </div>
        </div>
      </div>

      {/* Mobile-only stage shortcut — unmounted while inspecting so it can
          never cover the docked inspector sheet. */}
      {selectedComponentId ? null : (
        <CanStageNavigator currentStep={currentStep} onStepChange={goToStep} />
      )}
    </AppShell>
  );
}
