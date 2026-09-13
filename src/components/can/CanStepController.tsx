import { useEffect, useState } from "react";
import { Play, Pause, ChevronLeft, ChevronRight, RotateCcw } from "lucide-react";
import { DISASSEMBLY_STEPS } from "@/config/can-specifications";
import { cn } from "@/lib/utils";

export function CanStepController({
  currentStep,
  onStepChange,
  className,
}: {
  currentStep: number;
  onStepChange: (step: number) => void;
  className?: string;
}) {
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    if (!isPlaying) return;
    const timer = setInterval(() => {
      onStepChange((currentStep + 1) % DISASSEMBLY_STEPS.length);
    }, 3800);
    return () => clearInterval(timer);
  }, [isPlaying, currentStep, onStepChange]);

  const canGoPrev = currentStep > 0;
  const canGoNext = currentStep < DISASSEMBLY_STEPS.length - 1;

  return (
    <div className={cn("rounded-xl border border-border bg-card p-3 shadow-xs", className)}>
      {/* Controls Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => {
              setIsPlaying(false);
              onStepChange(0);
            }}
            title="Reset to Assembled"
            className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-border bg-surface text-muted-foreground hover:bg-secondary hover:text-foreground"
          >
            <RotateCcw className="h-3 w-3" />
          </button>
        </div>

        {/* Step Indicator */}
        <div className="numeric flex items-center gap-1 text-xs text-muted-foreground">
          <span>Stage</span>
          <span className="font-semibold text-foreground">{currentStep + 1}</span>
          <span>/</span>
          <span className="text-muted-foreground">{DISASSEMBLY_STEPS.length}</span>
        </div>

        {/* Previous / Next Stepper */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            disabled={!canGoPrev}
            onClick={() => {
              setIsPlaying(false);
              onStepChange(Math.max(0, currentStep - 1));
            }}
            aria-label="Previous stage"
            className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-border bg-surface text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground disabled:opacity-40"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            disabled={!canGoNext}
            onClick={() => {
              setIsPlaying(false);
              onStepChange(Math.min(DISASSEMBLY_STEPS.length - 1, currentStep + 1));
            }}
            aria-label="Next stage"
            className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-border bg-surface text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground disabled:opacity-40"
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Segmented Stepper Tabs */}
      <div className="mt-2.5 grid grid-cols-5 gap-1 rounded-lg border border-border bg-surface p-1">
        {DISASSEMBLY_STEPS.map((step) => {
          const isActive = step.step === currentStep;
          return (
            <button
              key={step.step}
              type="button"
              onClick={() => {
                setIsPlaying(false);
                onStepChange(step.step);
              }}
              className={cn(
                "group flex min-h-10 flex-col items-center justify-center rounded-md px-1 py-1 text-center transition-all",
                isActive
                  ? "bg-primary text-primary-foreground shadow-xs font-medium"
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground",
              )}
            >
              <span className="numeric text-[10px] opacity-75">{step.stageNumber}</span>
              <span className="truncate text-[11px] leading-tight">{step.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
