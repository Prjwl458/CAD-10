import { Link } from "@tanstack/react-router";
import { ScanLine } from "lucide-react";
import type { PcmRecord } from "@/types";
import { calculatePcmCycleStatus } from "@/calculations";
import { useConfig } from "@/hooks/useStore";
import { Card, StatusPill, formatDate } from "./ui-kit";

export function PcmCycleCard({ pcm }: { pcm: PcmRecord }) {
  const cfg = useConfig();
  const { status, ratio, message } = calculatePcmCycleStatus(
    pcm.currentCycle,
    pcm.validatedCycleLimit,
    cfg,
  );
  const pct = Math.min(ratio * 100, 100);

  return (
    <Card className="relative flex flex-col justify-between overflow-hidden">
      <div>
        <div className="flex items-center justify-between gap-3 border-b border-border/60 pb-3">
          <div>
            <p className="text-sm font-semibold text-foreground">PCM pack</p>
            <p className="numeric text-xs font-medium text-muted-foreground">{pcm.pcmId}</p>
          </div>
          <StatusPill status={status} />
        </div>

        <div className="mt-4 text-center">
          <p className="numeric text-4xl font-bold text-primary sm:text-5xl">
            {pcm.currentCycle}
            {/* Display-only denominator; the underlying validated limit is unchanged. */}
            <span className="text-xl font-medium text-muted-foreground sm:text-2xl"> / 999</span>
          </p>
          <p className="mt-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            PCM cycles
          </p>
        </div>

        <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-muted">
          <div
            className={
              status === "GOOD"
                ? "h-full rounded-full bg-success"
                : status === "MONITOR"
                  ? "h-full rounded-full bg-warning"
                  : "h-full rounded-full bg-critical"
            }
            style={{ width: `${pct}%` }}
          />
        </div>

        <div className="mt-3.5 grid grid-cols-2 gap-3 rounded-xl border border-border/60 bg-surface/30 p-3 text-sm">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Last recharge
            </p>
            <p className="numeric mt-0.5 text-sm font-medium text-foreground">
              {formatDate(pcm.lastRechargeDate)}
            </p>
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Last used
            </p>
            <p className="numeric mt-0.5 text-sm font-medium text-foreground">
              {formatDate(pcm.lastUsedDate)}
            </p>
          </div>
        </div>

        <p className="mt-3.5 text-xs leading-relaxed text-muted-foreground">
          Estimated service status based on validated cycle limits. {message}
        </p>
      </div>

      <Link
        to="/pcm"
        search={{ pcmId: pcm.pcmId }}
        className="mt-4 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary text-sm font-semibold tracking-wide text-primary-foreground transition-colors hover:bg-primary/90"
      >
        <ScanLine className="h-5 w-5" /> CAD Scan
      </Link>
    </Card>
  );
}
