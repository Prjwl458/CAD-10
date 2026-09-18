import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { PcmCycleCard } from "@/components/PcmCycleCard";
import { Card, Row, StatusPill, formatDateTime } from "@/components/ui-kit";
import {
  useConfig,
  useCoolingRecords,
  useMaintenance,
  usePcmRecords,
  useServiceRequests,
  useSession,
} from "@/hooks/useStore";
import { calculateCanCondition } from "@/calculations";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — CAD-10 PCM Milk Chilling Can" },
      {
        name: "description",
        content:
          "Live CAD-10 status: PCM cycle tracking, latest cooling performance and can condition.",
      },
      { property: "og:title", content: "CAD-10 Dashboard" },
      {
        property: "og:description",
        content:
          "PCM cycle status, cooling performance and can condition for your CAD-10 chilling can.",
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

  const activePcm = pcmRecords.find((p) => p.pcmId === session?.pcmId) ?? pcmRecords[0];
  const latest = records[0];

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
        session ? (
          <>
            Chilling <span className="break-all">{session.batchId}</span> in progress
          </>
        ) : (
          "Idle — no chilling cycle running"
        )
      }
    >
      {/* Active PCM Cycle */}
      {activePcm ? <PcmCycleCard pcm={activePcm} /> : null}

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
    </AppShell>
  );
}
