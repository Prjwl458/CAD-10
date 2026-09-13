import { useState } from "react";
import { Ruler, Maximize2, ArrowUpRight } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { CAN_DIMENSIONS, CAN_COMPONENTS } from "@/config/can-specifications";
import { Card, SectionTitle } from "@/components/ui-kit";
import { cn } from "@/lib/utils";

export function CanBlueprint({ className }: { className?: string }) {
  const [isZoomed, setIsZoomed] = useState(false);

  return (
    <Card className={cn("border-border p-5 sm:p-6", className)}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <SectionTitle
          title="Engineering Drawing & Design Reference"
          subtitle="Orthographic reference drawing and primary dimensions for the CAD-10 milk storage can"
        />
        <span className="numeric inline-flex items-center gap-1.5 rounded border border-border bg-surface px-2 py-0.5 text-xs text-muted-foreground">
          <Ruler className="h-3 w-3 text-primary" /> Reference: CAD10-DWG-001
        </span>
      </div>

      {/* Blueprint Image Viewer & Dimensions */}
      <div className="mt-5 grid gap-6 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
        {/* Drawing Container */}
        <div className="relative overflow-hidden rounded-xl border border-border bg-surface p-3">
          <div className="relative aspect-[4/3] w-full overflow-hidden rounded-lg bg-background/50">
            <img
              src="/assets/can/reference/can-engineering-drawing.jpeg"
              alt="CAD-10 Engineering Drawing"
              className={cn(
                "h-full w-full object-contain transition-transform duration-200",
                isZoomed ? "scale-150 cursor-zoom-out" : "scale-100 cursor-zoom-in",
              )}
              onClick={() => setIsZoomed(!isZoomed)}
            />
          </div>

          <div className="mt-2.5 flex items-center justify-between text-xs text-muted-foreground">
            <span>Elevation and section views</span>
            <button
              type="button"
              onClick={() => setIsZoomed(!isZoomed)}
              className="inline-flex items-center gap-1 text-primary hover:underline"
            >
              <Maximize2 className="h-3 w-3" />
              {isZoomed ? "Standard View" : "Inspect"}
            </button>
          </div>
        </div>

        {/* Established Dimensions */}
        <div className="space-y-3">
          <div className="rounded-xl border border-border bg-surface p-3.5">
            <span className="text-[10px] font-normal uppercase tracking-wider text-muted-foreground/70">
              Overall Height
            </span>
            <p className="numeric mt-0.5 text-2xl font-semibold text-foreground">
              {CAN_DIMENSIONS.overallHeightMm}{" "}
              <span className="text-xs font-normal text-muted-foreground">mm</span>
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">Base plane to top aperture.</p>
          </div>

          <div className="rounded-xl border border-border bg-surface p-3.5">
            <span className="text-[10px] font-normal uppercase tracking-wider text-muted-foreground/70">
              Main Diameter
            </span>
            <p className="numeric mt-0.5 text-2xl font-semibold text-foreground">
              {CAN_DIMENSIONS.mainDiameterMm}{" "}
              <span className="text-xs font-normal text-muted-foreground">mm</span>
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Outer cylindrical casing diameter.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2.5 text-xs">
            <div className="rounded-xl border border-border bg-surface p-3">
              <span className="text-[10px] font-normal uppercase tracking-wider text-muted-foreground/70">
                Layers
              </span>
              <p className="numeric mt-0.5 text-lg font-semibold text-foreground">
                {CAN_DIMENSIONS.layersCount} Concentric
              </p>
              <p className="text-[11px] text-muted-foreground">HDPE / PU / Stainless</p>
            </div>

            <div className="rounded-xl border border-border bg-surface p-3">
              <span className="text-[10px] font-normal uppercase tracking-wider text-muted-foreground/70">
                Internal Columns
              </span>
              <p className="numeric mt-0.5 text-lg font-semibold text-foreground">
                {CAN_DIMENSIONS.columnsCount} Columns
              </p>
              <p className="text-[11px] text-muted-foreground">90° equidistant spacing</p>
            </div>
          </div>
        </div>
      </div>

      {/* Bill of Materials (BOM) Table */}
      <div className="mt-7 border-t border-border pt-5">
        <h4 className="text-sm font-semibold text-foreground">Sub-Assembly Bill of Materials</h4>
        <p className="text-xs text-muted-foreground">
          Core physical components based on design documentation
        </p>

        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[560px] text-left text-xs">
            <thead className="border-b border-border text-[10px] font-normal uppercase tracking-wider text-muted-foreground/70">
              <tr>
                <th className="py-2 pr-3">Subsystem</th>
                <th className="py-2 px-3">Material</th>
                <th className="py-2 px-3">Dimensions</th>
                <th className="py-2 pl-3">Design Role</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {Object.values(CAN_COMPONENTS).map((comp) => (
                <tr key={comp.id}>
                  <td className="py-2.5 pr-3 font-medium text-foreground">{comp.name}</td>
                  <td className="py-2.5 px-3 text-muted-foreground">{comp.material}</td>
                  <td className="numeric py-2.5 px-3 text-foreground">{comp.dimensions}</td>
                  <td className="py-2.5 pl-3 text-muted-foreground">{comp.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Cross-links */}
      <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
        <span className="text-xs text-muted-foreground">
          CAD-10 Design Reference · Physical Prototype
        </span>
        <div className="flex items-center gap-2">
          <Link
            to="/maintenance"
            className="inline-flex h-8 items-center gap-1 rounded-lg border border-border bg-surface px-3 text-xs font-medium hover:bg-secondary"
          >
            Maintenance Checklist <ArrowUpRight className="h-3 w-3" />
          </Link>
          <Link
            to="/pcm"
            className="inline-flex h-8 items-center gap-1 rounded-lg bg-primary px-3 text-xs font-medium text-primary-foreground hover:bg-primary/90"
          >
            PCM Status <ArrowUpRight className="h-3 w-3" />
          </Link>
        </div>
      </div>
    </Card>
  );
}
