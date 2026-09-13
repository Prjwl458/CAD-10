import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import {
  Button,
  Card,
  Field,
  Note,
  Row,
  SectionTitle,
  StatusPill,
  formatDateTime,
} from "@/components/ui-kit";
import { useConfig, useCoolingRecords, useMaintenance, useServiceRequests } from "@/hooks/useStore";
import { store } from "@/services/storage";
import { addMaintenance } from "@/services/workflow";
import { calculateCanCondition } from "@/calculations";

export const Route = createFileRoute("/maintenance")({
  head: () => ({
    meta: [
      { title: "Cleaning & Maintenance — CAD-10" },
      {
        name: "description",
        content:
          "Cleaning checklist, maintenance inspections, can condition status and service requests for the CAD-10 milk chilling can.",
      },
      { property: "og:title", content: "CAD-10 cleaning & maintenance" },
      {
        property: "og:description",
        content:
          "Track cleaning after every batch, inspect seals, insulation, PCM pack and tag, and report service issues.",
      },
    ],
  }),
  component: MaintenancePage,
});

const CLEANING_STEPS = [
  "Drain remaining milk and rinse the can with clean lukewarm water.",
  "Wash the inside with a dairy-approved detergent and a soft brush.",
  "Clean the lid, gasket and PCM holder separately.",
  "Rinse with clean water until no detergent remains.",
  "Invert the can and let it air-dry completely before the next batch.",
];

const MAINTENANCE_CHECKS = [
  "Inspect lid seals and gasket for cracks",
  "Check insulation for damp patches or damage",
  "Check PCM pack for leakage or swelling",
  "Check the can body for dents or leakage",
  "Check the tag is readable and firmly attached",
  "Check sensors and wiring, if installed",
];

const ISSUE_CATEGORIES = [
  "Leakage",
  "Damaged can",
  "Insulation problem",
  "PCM problem",
  "Tag scanning problem",
  "Temperature sensor problem",
  "Other",
];

function MaintenancePage() {
  const cfg = useConfig();
  const maintenance = useMaintenance();
  const services = useServiceRequests();
  const records = useCoolingRecords();

  const [checked, setChecked] = useState<string[]>([]);
  const [category, setCategory] = useState(ISSUE_CATEGORIES[0]);
  const [description, setDescription] = useState("");
  const [msg, setMsg] = useState<string | null>(null);

  const lastCleaning = maintenance.find((m) => m.type === "Cleaning");
  const condition = calculateCanCondition({
    usageCount: records.length,
    daysSinceCleaning: lastCleaning
      ? Math.floor((Date.now() - new Date(lastCleaning.date).getTime()) / 86400000)
      : null,
    openIssues: services.filter((s) => s.status === "open").length,
    cfg,
  });

  function submitIssue() {
    const text = description.trim();
    if (text.length < 5) {
      setMsg("Describe the issue in at least 5 characters.");
      return;
    }
    if (text.length > 1000) {
      setMsg("Keep the description under 1000 characters.");
      return;
    }
    store.addServiceRequest({
      id: `SR-${Date.now()}`,
      date: new Date().toISOString(),
      category,
      description: text,
      status: "open",
    });
    setDescription("");
    setMsg("Service request saved on this device.");
  }

  return (
    <AppShell
      title="Maintenance"
      subtitle="Cleaning, inspections, can condition and service requests"
    >
      <Card>
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3 sm:flex sm:items-center sm:justify-between">
          <SectionTitle
            title="Can condition"
            subtitle={`${records.length} recorded chilling run(s)`}
          />
          <StatusPill
            status={condition.status}
            label={condition.status === "INSPECT" ? "SERVICE REQUIRED" : condition.status}
          />
        </div>
        <ul className="space-y-1.5 text-sm text-muted-foreground">
          {condition.reasons.map((r) => (
            <li key={r}>• {r}</li>
          ))}
        </ul>
        <div className="mt-3">
          <Note>
            Estimated service status based on usage and maintenance history. Thresholds are
            configurable engineering placeholders, not a measured remaining lifetime.
          </Note>
        </div>
      </Card>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card>
          <SectionTitle title="Cleaning — after every milk batch" />
          <ol className="space-y-2 text-sm">
            {CLEANING_STEPS.map((step, i) => (
              <li key={step} className="flex gap-2">
                <span className="numeric text-muted-foreground">{i + 1}.</span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
          <div className="mt-3">
            <Note tone="warning">
              Never store milk in a can that has not dried completely. Do not use abrasive tools on
              the inner surface.
            </Note>
          </div>
          <Button
            className="mt-4 w-full"
            onClick={() => {
              addMaintenance("Cleaning", "Cleaning completed after milk batch");
              setMsg("Cleaning recorded.");
            }}
          >
            <CheckCircle2 className="h-4 w-4" /> Mark cleaning as completed
          </Button>
          <p className="mt-2 text-xs text-muted-foreground">
            Last cleaning: {lastCleaning ? formatDateTime(lastCleaning.date) : "no record yet"}
          </p>
        </Card>

        <Card>
          <SectionTitle
            title="Maintenance checklist"
            subtitle="Recommended before every collection day"
          />
          <div className="space-y-2">
            {MAINTENANCE_CHECKS.map((item) => (
              <label
                key={item}
                className="flex min-h-11 items-center gap-3 rounded-xl border border-border px-3 text-sm"
              >
                <input
                  type="checkbox"
                  checked={checked.includes(item)}
                  onChange={(e) =>
                    setChecked((c) =>
                      e.target.checked ? [...c, item] : c.filter((x) => x !== item),
                    )
                  }
                  className="h-5 w-5 accent-[var(--primary)]"
                />
                {item}
              </label>
            ))}
          </div>
          <Button
            variant="success"
            className="mt-4 w-full"
            disabled={checked.length === 0}
            onClick={() => {
              addMaintenance("Inspection", `Checked: ${checked.join("; ")}`);
              setChecked([]);
              setMsg("Inspection recorded.");
            }}
          >
            Mark selected checks as completed
          </Button>
        </Card>
      </div>

      <Card className="mt-4">
        <SectionTitle
          title="Report a service issue"
          subtitle="Stored on this device for the prototype."
        />
        <label className="block">
          <span className="text-sm font-medium">Issue</span>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="mt-1.5 min-h-11 w-full rounded-xl border border-input bg-surface px-3 text-base"
          >
            {ISSUE_CATEGORIES.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </label>
        <label className="mt-3 block">
          <span className="text-sm font-medium">Description</span>
          <textarea
            value={description}
            maxLength={1000}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            placeholder="Describe what you observed and when it started."
            className="mt-1.5 w-full rounded-xl border border-input bg-surface p-3 text-base"
          />
        </label>
        <Button className="mt-3 w-full sm:w-48" onClick={submitIssue}>
          Submit request
        </Button>
        {msg ? <p className="mt-3 text-sm font-medium text-success">{msg}</p> : null}

        {services.length ? (
          <div className="mt-5">
            <p className="text-sm font-semibold">Requests</p>
            {services.map((s) => (
              <div key={s.id} className="mt-2 rounded-xl border border-border p-3">
                <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
                  <p className="min-w-0 break-words text-sm font-semibold">{s.category}</p>
                  <span className="numeric text-right text-xs text-muted-foreground">
                    {formatDateTime(s.date)}
                  </span>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">{s.description}</p>
                {s.status === "open" ? (
                  <Button
                    variant="secondary"
                    className="mt-2 h-9 min-h-9"
                    onClick={() => store.closeServiceRequest(s.id)}
                  >
                    Mark resolved
                  </Button>
                ) : (
                  <p className="mt-2 text-xs font-medium text-success">Resolved</p>
                )}
              </div>
            ))}
          </div>
        ) : null}
      </Card>

      <Card className="mt-4">
        <SectionTitle title="Maintenance history" />
        {maintenance.length === 0 ? (
          <p className="text-sm text-muted-foreground">No maintenance records yet.</p>
        ) : (
          maintenance
            .slice(0, 20)
            .map((m) => (
              <Row
                key={m.id}
                label={`${m.type} — ${m.description}`}
                value={formatDateTime(m.date)}
              />
            ))
        )}
      </Card>
    </AppShell>
  );
}
