import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ScanLine, Plus } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { PcmCycleCard } from "@/components/PcmCycleCard";
import {
  Button,
  Card,
  Field,
  Note,
  Row,
  SectionTitle,
  StatusPill,
  formatDate,
  formatDateTime,
} from "@/components/ui-kit";
import { isScanSupported, scanOnce } from "@/services/scan";
import { store } from "@/services/storage";
import { completePcmCycle, registerPcm, startPcmCycle } from "@/services/workflow";
import { useConfig, useCoolingRecords, usePcmRecords } from "@/hooks/useStore";
import { calculatePcmCycleStatus } from "@/calculations";

export const Route = createFileRoute("/pcm")({
  validateSearch: (search: Record<string, unknown>) => ({
    pcmId: typeof search.pcmId === "string" ? search.pcmId : undefined,
  }),
  head: () => ({
    meta: [
      { title: "CAD Scan PCM Tracking — CAD-10" },
      {
        name: "description",
        content:
          "Scan a tagged PCM pack to identify it, start a usage cycle and monitor validated PCM cycle life.",
      },
      { property: "og:title", content: "CAD Scan PCM cycle tracking — CAD-10" },
      {
        property: "og:description",
        content:
          "Identify PCM packs by scan, track cycles and monitor estimated PCM service status.",
      },
    ],
  }),
  component: PcmPage,
});

function PcmPage() {
  const { pcmId: searchPcmId } = Route.useSearch();
  const cfg = useConfig();
  const pcmRecords = usePcmRecords();
  const coolingRecords = useCoolingRecords();

  const [selectedId, setSelectedId] = useState<string | undefined>(searchPcmId);
  const [manualId, setManualId] = useState("");
  const [message, setMessage] = useState<{ tone: "ok" | "err"; text: string } | null>(null);
  const [scanning, setScanning] = useState(false);
  const [scanSupported, setScanSupported] = useState<boolean | null>(null);
  const [newId, setNewId] = useState("");
  const [showRegister, setShowRegister] = useState(false);

  useEffect(() => setScanSupported(isScanSupported()), []);
  useEffect(() => {
    if (searchPcmId) setSelectedId(searchPcmId);
  }, [searchPcmId]);

  const selected = useMemo(
    () => pcmRecords.find((p) => p.pcmId === selectedId) ?? pcmRecords[0],
    [pcmRecords, selectedId],
  );

  const history = useMemo(
    () => coolingRecords.filter((r) => r.pcmId === selected?.pcmId),
    [coolingRecords, selected?.pcmId],
  );

  async function handleScan() {
    setMessage(null);
    setScanning(true);
    try {
      const result = await scanOnce();
      const id = result.pcmId;
      if (!id) {
        setMessage({
          tone: "err",
          text: "Tag detected but it does not contain a PCM ID. Enter the PCM ID manually.",
        });
        return;
      }
      const record = store.getPcm(id);
      if (!record) {
        setManualId(id);
        setMessage({
          tone: "err",
          text: `Tagged PCM detected (${id}) but no record exists yet. Register it below.`,
        });
        return;
      }
      setSelectedId(record.pcmId);
      setMessage({
        tone: "ok",
        text: `Tagged PCM detected — ${record.pcmId} identified. Scanning does not count as a cycle.`,
      });
    } catch (err) {
      setMessage({ tone: "err", text: (err as Error).message });
    } finally {
      setScanning(false);
    }
  }

  function handleManual() {
    const record = store.getPcm(manualId);
    if (!record) {
      setMessage({
        tone: "err",
        text: `No PCM record found for "${manualId}". Check the ID or register it below.`,
      });
      return;
    }
    setSelectedId(record.pcmId);
    setMessage({ tone: "ok", text: `${record.pcmId} identified.` });
  }

  const cycleStatus = selected
    ? calculatePcmCycleStatus(selected.currentCycle, selected.validatedCycleLimit, cfg)
    : null;

  return (
    <AppShell
      title="CAD Scan"
      subtitle="Identify a PCM pack, then start or complete its usage cycle"
    >
      <Card className="border-primary/30 bg-accent/40">
        <SectionTitle
          title="Scan the PCM pack"
          subtitle="Hold your phone against the tag on the PCM pouch."
        />
        <Button
          onClick={handleScan}
          disabled={scanning || scanSupported === false}
          className="w-full text-base"
        >
          <ScanLine className="h-5 w-5" /> {scanning ? "Waiting for tag…" : "SCAN PCM"}
        </Button>

        {scanSupported === false ? (
          <div className="mt-3">
            <Note tone="warning">
              Tag scanning is not supported on this device. Enter the PCM ID manually below.
            </Note>
          </div>
        ) : null}

        <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-end">
          <div className="flex-1">
            <Field
              label="Enter PCM ID manually"
              placeholder="PCM-CAD10-001"
              value={manualId}
              onChange={(e) => setManualId(e.target.value)}
              autoCapitalize="characters"
            />
          </div>
          <Button variant="secondary" onClick={handleManual} className="sm:w-32">
            Open record
          </Button>
        </div>

        {message ? (
          <p
            className={
              message.tone === "ok"
                ? "mt-3 text-sm font-medium text-success"
                : "mt-3 text-sm font-medium text-critical"
            }
          >
            {message.text}
          </p>
        ) : null}
      </Card>

      {selected ? (
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <PcmCycleCard pcm={selected} />

          <Card>
            <SectionTitle title="PCM record" />
            <Row label="PCM ID" value={selected.pcmId} />
            <Row label="Tag UID" value={selected.tagUid ?? "—"} />
            <Row label="Batch" value={selected.batchId ?? "—"} />
            <Row label="Manufactured" value={formatDate(selected.manufacturingDate)} />
            <Row label="Installed" value={formatDate(selected.installationDate)} />
            <Row label="Current cycle" value={selected.currentCycle} />
            <Row label="Validated cycle limit" value={selected.validatedCycleLimit} />
            <Row label="Last recharge" value={formatDate(selected.lastRechargeDate)} />
            <Row label="Last used" value={formatDate(selected.lastUsedDate)} />
            <Row label="Last known condition" value={selected.lastKnownCondition ?? "—"} />
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {cycleStatus ? <StatusPill status={cycleStatus.status} /> : null}
              {selected.activeCycleStartedAt ? (
                <span className="min-w-0 break-words text-xs font-medium text-primary">
                  Cycle in progress since {formatDateTime(selected.activeCycleStartedAt)}
                </span>
              ) : null}
            </div>
          </Card>
        </div>
      ) : null}

      {selected ? (
        <Card className="mt-4">
          <SectionTitle
            title="Cycle workflow"
            subtitle="Tapping only identifies the pack. A cycle is counted after you confirm completion."
          />
          <div className="numeric mb-4 rounded-xl bg-muted px-3 py-2 text-xs leading-relaxed text-muted-foreground sm:overflow-x-auto sm:whitespace-nowrap">
            Scan tag → identify PCM → start usage → chilling → recharge / refreeze → confirm → cycle
            +1
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button
              className="flex-1"
              disabled={!!selected.activeCycleStartedAt}
              onClick={() => {
                const res = startPcmCycle(selected.pcmId);
                setMessage({ tone: res.ok ? "ok" : "err", text: res.message });
              }}
            >
              Start cycle
            </Button>
            <Button
              variant="success"
              className="flex-1"
              disabled={!selected.activeCycleStartedAt}
              onClick={() => {
                const res = completePcmCycle(selected.pcmId, {
                  recharged: true,
                  condition: "Recharged / refrozen",
                });
                setMessage({ tone: res.ok ? "ok" : "err", text: res.message });
              }}
            >
              Complete cycle (recharged)
            </Button>
          </div>
        </Card>
      ) : null}

      {selected ? (
        <Card className="mt-4">
          <SectionTitle
            title="PCM history"
            subtitle={`${history.length} recorded chilling run(s) for ${selected.pcmId}`}
          />
          {history.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No chilling runs recorded for this PCM pack yet.
            </p>
          ) : (
            <ol className="relative ml-3 border-l border-border pl-5">
              {history.map((r) => (
                <li key={r.recordId} className="relative pb-5 last:pb-0">
                  <span className="absolute -left-[27px] top-1.5 h-2.5 w-2.5 rounded-full bg-primary" />
                  <p className="numeric text-sm font-semibold">Cycle {r.pcmCycle}</p>
                  <p className="text-xs text-muted-foreground">{formatDateTime(r.date)}</p>
                  <p className="numeric mt-1 text-sm">
                    Milk batch: {r.milkBatchId} · {r.quantity} L · {r.initialTemperature} °C →{" "}
                    {r.finalTemperature} °C · {r.actualCoolingTime} min
                  </p>
                </li>
              ))}
            </ol>
          )}
        </Card>
      ) : null}

      <Card className="mt-4">
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3 sm:flex sm:items-center sm:justify-between">
          <SectionTitle
            title="PCM packs"
            subtitle="All registered packs in this device's records"
          />
          <Button variant="ghost" onClick={() => setShowRegister((s) => !s)}>
            <Plus className="h-4 w-4" /> Register
          </Button>
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          {pcmRecords.map((p) => {
            const st = calculatePcmCycleStatus(p.currentCycle, p.validatedCycleLimit, cfg);
            return (
              <button
                key={p.pcmId}
                onClick={() => setSelectedId(p.pcmId)}
                className={
                  "flex min-w-0 items-center justify-between gap-2 rounded-xl border px-3 py-3 text-left " +
                  (p.pcmId === selected?.pcmId
                    ? "border-primary bg-accent/50"
                    : "border-border bg-surface")
                }
              >
                <span className="min-w-0">
                  <span className="numeric block truncate text-sm font-semibold">{p.pcmId}</span>
                  <span className="numeric text-xs text-muted-foreground">
                    {p.currentCycle} / {p.validatedCycleLimit} cycles
                  </span>
                </span>
                <span className="shrink-0">
                  <StatusPill status={st.status} />
                </span>
              </button>
            );
          })}
        </div>

        {showRegister ? (
          <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-end">
            <div className="flex-1">
              <Field
                label="New PCM ID"
                placeholder="PCM-CAD10-003"
                value={newId}
                onChange={(e) => setNewId(e.target.value)}
              />
            </div>
            <Button
              variant="secondary"
              className="sm:w-32"
              onClick={() => {
                const res = registerPcm(newId, cfg.validatedPcmCycleLimit);
                setMessage({ tone: res.ok ? "ok" : "err", text: res.message });
                if (res.ok) {
                  setSelectedId(newId.trim().toUpperCase());
                  setNewId("");
                }
              }}
            >
              Register
            </Button>
          </div>
        ) : null}
      </Card>
    </AppShell>
  );
}
