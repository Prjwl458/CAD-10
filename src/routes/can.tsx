import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect, useRef, useCallback } from "react";
import { Layers, Cylinder } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Card } from "@/components/ui-kit";
import {
  CAN_DIMENSIONS,
  DISASSEMBLY_STEPS,
  type CanComponentId,
} from "@/config/can-specifications";
import { CanDisassemblyStage } from "@/components/can/CanDisassemblyStage";
import { CanInspector } from "@/components/can/CanInspector";
import { CanLeaderLine } from "@/components/can/CanLeaderLine";
import { CanStepController } from "@/components/can/CanStepController";
import { CanBlueprint } from "@/components/can/CanBlueprint";
import { cn } from "@/lib/utils";

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
  const [activeTab, setActiveTab] = useState<"disassembly" | "blueprint">("disassembly");

  const scrollTrackRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number>(0);

  // Derive active stage from continuous scroll progress
  useEffect(() => {
    let step = 0;
    if (scrollProgress >= 0.82) step = 4;
    else if (scrollProgress >= 0.6) step = 3;
    else if (scrollProgress >= 0.38) step = 2;
    else if (scrollProgress >= 0.16) step = 1;
    else step = 0;

    setCurrentStep((prevStep) => {
      if (prevStep !== step) {
        setSelectedComponentId(null);
      }
      return step;
    });
  }, [scrollProgress]);

  // Passive scroll listener bound to the scroll track with RAF throttle
  const handleScroll = useCallback(() => {
    if (!scrollTrackRef.current || activeTab !== "disassembly") return;
    if (rafRef.current) return;

    rafRef.current = window.requestAnimationFrame(() => {
      rafRef.current = 0;
      if (!scrollTrackRef.current) return;
      const rect = scrollTrackRef.current.getBoundingClientRect();
      const totalScrollable = rect.height - window.innerHeight;
      if (totalScrollable <= 0) return;

      const currentScrolled = -rect.top;
      const progress = Math.max(0, Math.min(1, currentScrolled / totalScrollable));
      setScrollProgress(Number(progress.toFixed(4)));
    });
  }, [activeTab]);

  useEffect(() => {
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", handleScroll);
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = 0;
      }
    };
  }, [handleScroll]);

  // Scroll smoothly to stage milestone using custom animation (easeInOutCubic)
  const scrollToStep = (stepIndex: number) => {
    if (!scrollTrackRef.current) return;
    const rect = scrollTrackRef.current.getBoundingClientRect();
    const currentScrollY = window.scrollY || window.pageYOffset;
    const trackTop = rect.top + currentScrollY;
    const totalScrollable = rect.height - window.innerHeight;

    const stepTargets = [0.05, 0.26, 0.48, 0.7, 0.94];
    const targetRatio = stepTargets[stepIndex] ?? 0;
    const targetScrollY = trackTop + targetRatio * totalScrollable;

    // Custom smooth scroll using requestAnimationFrame (easeInOutCubic)
    const duration = 650; // ms
    const startY = window.scrollY || window.pageYOffset;
    const startTime = performance.now();
    const animate = (time: number) => {
      const elapsed = time - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const ease =
        progress < 0.5
          ? 4 * progress * progress * progress
          : 1 - Math.pow(-2 * progress + 2, 3) / 2; // easeInOutCubic
      const currentY = startY + (targetScrollY - startY) * ease;
      window.scrollTo(0, currentY);
      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };
    requestAnimationFrame(animate);
  };

  const handleSelectComponent = (id: CanComponentId) => {
    setSelectedComponentId(id);
  };

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
  }, [currentStep]);

  const activeStepData = DISASSEMBLY_STEPS[currentStep] ?? DISASSEMBLY_STEPS[0]!;

  return (
    <AppShell
      title="Can Specifications"
      subtitle="Engineering architecture and physical disassembly"
    >
      {/* Overview Card */}
      <Card className="border-border p-5 sm:p-6">
        <div className="max-w-2xl">
          <h2 className="text-base font-semibold text-foreground sm:text-lg">
            CAD-10 Physical Construction
          </h2>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            A 3-layer cylindrical milk storage can featuring an HDPE outer wall, polyurethane foam
            insulation, and a food-grade stainless-steel inner container with four integrated hollow
            columns spaced at 90° for Phase Change Material.
          </p>
        </div>

        {/* Primary Established Dimensions */}
        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <div className="rounded-lg border border-border bg-surface p-2.5">
            <span className="text-[10px] font-normal uppercase tracking-wider text-muted-foreground/70">
              Overall Height
            </span>
            <p className="numeric mt-0.5 text-lg font-semibold text-foreground">
              {CAN_DIMENSIONS.overallHeightMm}{" "}
              <span className="text-xs font-normal text-muted-foreground">mm</span>
            </p>
          </div>

          <div className="rounded-lg border border-border bg-surface p-2.5">
            <span className="text-[10px] font-normal uppercase tracking-wider text-muted-foreground/70">
              Main Diameter
            </span>
            <p className="numeric mt-0.5 text-lg font-semibold text-foreground">
              {CAN_DIMENSIONS.mainDiameterMm}{" "}
              <span className="text-xs font-normal text-muted-foreground">mm</span>
            </p>
          </div>

          <div className="rounded-lg border border-border bg-surface p-2.5">
            <span className="text-[10px] font-normal uppercase tracking-wider text-muted-foreground/70">
              Construction
            </span>
            <p className="numeric mt-0.5 text-lg font-semibold text-foreground">
              {CAN_DIMENSIONS.layersCount}{" "}
              <span className="text-xs font-normal text-muted-foreground">Layers</span>
            </p>
          </div>

          <div className="rounded-lg border border-border bg-surface p-2.5">
            <span className="text-[10px] font-normal uppercase tracking-wider text-muted-foreground/70">
              Internal Columns
            </span>
            <p className="numeric mt-0.5 text-lg font-semibold text-foreground">
              {CAN_DIMENSIONS.columnsCount}{" "}
              <span className="text-xs font-normal text-muted-foreground">Hollow</span>
            </p>
          </div>
        </div>

        {/* Mode Switcher */}
        <div className="mt-4 flex items-center gap-2 border-t border-border/70 pt-3">
          <button
            type="button"
            onClick={() => setActiveTab("disassembly")}
            className={cn(
              "inline-flex h-8 items-center gap-1.5 rounded-lg px-3 text-xs font-medium transition-colors",
              activeTab === "disassembly"
                ? "bg-primary text-primary-foreground shadow-xs"
                : "border border-border bg-surface text-muted-foreground hover:bg-secondary hover:text-foreground",
            )}
          >
            <Layers className="h-3.5 w-3.5" />
            Disassembly View
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("blueprint")}
            className={cn(
              "inline-flex h-8 items-center gap-1.5 rounded-lg px-3 text-xs font-medium transition-colors",
              activeTab === "blueprint"
                ? "bg-primary text-primary-foreground shadow-xs"
                : "border border-border bg-surface text-muted-foreground hover:bg-secondary hover:text-foreground",
            )}
          >
            <Cylinder className="h-3.5 w-3.5" />
            Drawing &amp; BOM
          </button>
        </div>
      </Card>

      {/* Disassembly Experience */}
      {activeTab === "disassembly" ? (
        <div className="mt-6">
          {/* Stepper Controller */}
          <CanStepController
            currentStep={currentStep}
            onStepChange={(step) => {
              scrollToStep(step);
              setSelectedComponentId(null);
            }}
          />

          <p className="mt-3 px-1 text-[11px] text-muted-foreground">
            Scroll down to disassemble layers
          </p>

          {/* Tall Scroll Track */}
          <div ref={scrollTrackRef} className="relative mt-3 min-h-[420vh]">
            {/* Sticky instrument. Two-part composition on desktop (Can canvas +
                one information panel); on mobile the information surface docks
                over the lower edge of the Can instead of stacking beneath it,
                so the experience never grows into a column of cards. */}
            <div className="sticky top-20 z-10 flex flex-col gap-2.5">
              {/* ONE instrument frame. The Can canvas and its information panel
                  are two parts of a single bordered surface — divided, not
                  separated by a gap — so the disassembly reads as one
                  composition rather than a diagram sitting beside a card.
                  The stage keeps its own markup; only its outer chrome is
                  dropped here so the shared frame provides it. */}
              {/* ONE unified instrument card frame.
                  LEFT: Can visualization + hotspots + scrubber slider.
                  RIGHT: ONE compact contextual information panel. */}
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
                      step="0.01"
                      value={scrollProgress}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        setScrollProgress(val);
                        if (scrollTrackRef.current) {
                          const rect = scrollTrackRef.current.getBoundingClientRect();
                          const currentScrollY = window.scrollY || window.pageYOffset;
                          const trackTop = rect.top + currentScrollY;
                          const totalScrollable = rect.height - window.innerHeight;
                          window.scrollTo({
                            top: trackTop + val * totalScrollable,
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
                <div className="pointer-events-none absolute inset-x-2 bottom-2 z-30 lg:relative lg:inset-auto lg:z-auto lg:flex lg:h-full lg:flex-col lg:border-l lg:border-border">
                  <CanInspector
                    className="mx-auto w-full max-w-md lg:h-full lg:max-w-none lg:rounded-none lg:border-0 lg:shadow-none"
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
      ) : (
        <div className="mt-6">
          <CanBlueprint />
        </div>
      )}

      {/* Cross-Link Footer */}
      <Card className="mt-8 flex flex-wrap items-center justify-between gap-3 p-4">
        <span className="text-xs text-muted-foreground">
          CAD-10 Engineering Documentation · Stage B
        </span>
        <div className="flex flex-wrap gap-2">
          <Link
            to="/team"
            className="inline-flex h-8 items-center rounded-lg border border-border bg-surface px-3 text-xs font-medium hover:bg-secondary"
          >
            Our Team
          </Link>
          <Link
            to="/maintenance"
            className="inline-flex h-8 items-center rounded-lg border border-border bg-surface px-3 text-xs font-medium hover:bg-secondary"
          >
            Maintenance
          </Link>
          <Link
            to="/pcm"
            className="inline-flex h-8 items-center rounded-lg bg-primary px-3 text-xs font-medium text-primary-foreground hover:bg-primary/90"
          >
            PCM Status
          </Link>
        </div>
      </Card>
    </AppShell>
  );
}
