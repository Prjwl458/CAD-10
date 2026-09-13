import { createFileRoute, Link } from "@tanstack/react-router";
import { ScanLine, Cylinder, Wrench, BookOpen, type LucideIcon } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { PcmCycleCard } from "@/components/PcmCycleCard";
import { Card, Metric, Note, Row, StatusPill, formatDateTime } from "@/components/ui-kit";
import { useSensors } from "@/hooks/useSensors";
import {
  useConfig,
  useCoolingRecords,
  useMaintenance,
  usePcmRecords,
  useServiceRequests,
  useSession,
} from "@/hooks/useStore";
import { calculateCanCondition, calculateSpoilageRisk } from "@/calculations";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — CAD-10 PCM Milk Chilling Can" },
      {
        name: "description",
        content:
          "Live CAD-10 status: milk and ambient temperature, PCM cycle, cooling status and estimated spoilage risk.",
      },
      { property: "og:title", content: "CAD-10 Dashboard" },
      {
        property: "og:description",
        content: "Milk temperature, PCM cycle and cooling performance of your CAD-10 chilling can.",
      },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const cfg = useConfig();
  const pcmRecords = usePcmRecords();
  const records = useCoolingRecords();
  const session = useSession();
  const maintenance = useMaintenance();
  const services = useServiceRequests();
  const { reading, isDemo } = useSensors();

  const activePcm = pcmRecords.find((p) => p.pcmId === session?.pcmId) ?? pcmRecords[0];
  const latest = records[0];

  const milk = reading?.milkTemperature;
  const target = session?.targetTemperature ?? cfg.targetMilkTemperature;
  const hoursSinceMilking = session
    ? (Date.now() - new Date(session.startTime).getTime()) / 3600000
    : 0.5;
  const risk = calculateSpoilageRisk(
    { currentTemp: milk ?? target, targetTemp: target, hoursSinceMilking },
    cfg,
  );

  const lastCleaning = maintenance.find((m) => m.type === "Cleaning");
  const canCondition = calculateCanCondition({
    usageCount: records.length,
    daysSinceCleaning: lastCleaning
      ? Math.floor((Date.now() - new Date(lastCleaning.date).getTime()) / 86400000)
      : null,
    openIssues: services.filter((s) => s.status === "open").length,
    cfg,
  });

  return (
    <AppShell
      title="CAD-10 Status"
      subtitle={
        session ? `Chilling ${session.batchId} in progress` : "Idle — no chilling cycle running"
      }
    >
      {/* Upper Grid: Live Telemetry & PCM Cycle */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="flex flex-col justify-between">
          <div>
            <div className="grid grid-cols-2 gap-3 sm:gap-4">
              <Metric
                label="Milk temperature"
                value={milk !== undefined ? milk.toFixed(1) : "—"}
                unit="°C"
                tone="cold"
                hint={isDemo ? "Simulated feed — no sensor connected" : "Awaiting sensor data"}
              />
              <Metric
                label="Ambient"
                value={reading ? reading.ambientTemperature.toFixed(1) : "—"}
                unit="°C"
                tone="warm"
              />
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3 border-t border-border/60 pt-3">
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                  Cooling status
                </p>
                <p className="mt-1 text-sm font-semibold">
                  {session
                    ? milk !== undefined && milk <= session.targetTemperature
                      ? "Target reached"
                      : "Chilling"
                    : "Not chilling"}
                </p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                  Estimated spoilage risk
                </p>
                <p className="mt-1 text-sm font-semibold">{risk.value}</p>
              </div>
            </div>
          </div>
          <div className="mt-4">
            <Note>
              Estimated cooling/spoilage risk based on configured parameters. No milk quality or
              safety testing is performed.
            </Note>
          </div>
        </Card>

        {activePcm ? <PcmCycleCard pcm={activePcm} /> : null}
      </div>

      {/* Lower Grid: Latest Performance & Can Condition */}
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card className="flex flex-col justify-between">
          <div>
            <p className="text-sm font-semibold">Latest cooling performance</p>
            {latest ? (
              <div className="mt-2">
                <Row label="Recorded" value={formatDateTime(latest.date)} />
                <Row label="Expected" value={`${latest.expectedCoolingTime} min`} />
                <Row label="Actual" value={`${latest.actualCoolingTime} min`} />
                <Row
                  label="Milk"
                  value={`${latest.quantity} L · ${latest.initialTemperature} → ${latest.finalTemperature} °C`}
                />
                <div className="mt-3">
                  <StatusPill
                    status={latest.performance}
                    label={latest.performance === "GOOD" ? "GOOD" : latest.performance}
                  />
                </div>
              </div>
            ) : (
              <p className="mt-2 text-sm text-muted-foreground">No chilling cycle recorded yet.</p>
            )}
          </div>
        </Card>

        <Card className="flex flex-col justify-between">
          <div>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-semibold">Can condition</p>
              <StatusPill
                status={canCondition.status}
                label={canCondition.status === "INSPECT" ? "SERVICE REQUIRED" : canCondition.status}
              />
            </div>
            <ul className="mt-3 space-y-1.5 text-sm text-muted-foreground">
              {canCondition.reasons.map((r) => (
                <li key={r}>• {r}</li>
              ))}
            </ul>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            Estimated service status based on usage and maintenance history.
          </p>
        </Card>
      </div>

      {/* Action Links: Responsive 2-column on mobile, 4-column on desktop */}
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <QuickLink to="/pcm" icon={ScanLine} label="Open CAD Scan" />
        <QuickLink to="/can" icon={Cylinder} label="Can specs" />
        <QuickLink to="/maintenance" icon={Wrench} label="Maintenance" />
        <QuickLink to="/help" icon={BookOpen} label="Help book" />
      </div>
    </AppShell>
  );
}

function QuickLink({ to, icon: Icon, label }: { to: string; icon: LucideIcon; label: string }) {
  return (
    <Link
      to={to}
      className="flex min-h-12 items-center gap-2.5 rounded-2xl border border-border bg-card p-3 text-xs font-semibold transition-colors hover:bg-secondary sm:min-h-14 sm:gap-3 sm:p-4 sm:text-sm"
    >
      <Icon className="h-5 w-5 shrink-0 text-primary" />
      <span className="truncate">{label}</span>
    </Link>
  );
}
