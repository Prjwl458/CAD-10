import { store } from "./storage";
import type { CoolingRecord, MaintenanceRecord, MilkBatch, PcmRecord } from "@/types";
import { comparePredictedVsActual } from "@/calculations";

const DUPLICATE_WINDOW_MS = 2 * 60 * 1000;

export type WorkflowResult = { ok: boolean; message: string };

export function startPcmCycle(pcmId: string): WorkflowResult {
  const pcm = store.getPcm(pcmId);
  if (!pcm) return { ok: false, message: `No PCM record found for ${pcmId}.` };
  if (pcm.activeCycleStartedAt) {
    return { ok: false, message: "A cycle is already in progress for this PCM pack." };
  }
  if (pcm.lastUsedDate && Date.now() - new Date(pcm.lastUsedDate).getTime() < DUPLICATE_WINDOW_MS) {
    return {
      ok: false,
      message:
        "This PCM pack was just used. Wait a moment before starting another cycle — taps alone do not count as cycles.",
    };
  }
  store.upsertPcm({ ...pcm, activeCycleStartedAt: new Date().toISOString() });
  return {
    ok: true,
    message: "PCM usage started. Confirm completion after recharging to count the cycle.",
  };
}

export function completePcmCycle(
  pcmId: string,
  opts: { recharged: boolean; condition?: string; notes?: string },
): WorkflowResult {
  const pcm = store.getPcm(pcmId);
  if (!pcm) return { ok: false, message: `No PCM record found for ${pcmId}.` };
  if (!pcm.activeCycleStartedAt) {
    return { ok: false, message: "No cycle is in progress. Start a cycle before completing it." };
  }
  const now = new Date().toISOString();
  const updated: PcmRecord = {
    ...pcm,
    currentCycle: pcm.currentCycle + 1,
    lastUsedDate: now,
    lastRechargeDate: opts.recharged ? now : pcm.lastRechargeDate,
    lastKnownCondition: opts.condition || pcm.lastKnownCondition,
    notes: opts.notes ?? pcm.notes,
    activeCycleStartedAt: undefined,
  };
  store.upsertPcm(updated);
  return {
    ok: true,
    message: `Cycle completed. ${updated.pcmId} is now at cycle ${updated.currentCycle}.`,
  };
}

export function registerPcm(
  pcmId: string,
  validatedCycleLimit: number,
  tagUid?: string,
): WorkflowResult {
  const clean = pcmId.trim().toUpperCase();
  if (!/^PCM-[A-Z0-9-]+$/.test(clean)) {
    return { ok: false, message: "PCM ID must look like PCM-CAD10-001." };
  }
  if (store.getPcm(clean))
    return { ok: false, message: "A PCM record with this ID already exists." };
  const now = new Date().toISOString();
  store.upsertPcm({
    pcmId: clean,
    tagUid,
    currentCycle: 0,
    validatedCycleLimit,
    installationDate: now,
    createdAt: now,
  });
  return { ok: true, message: `${clean} registered.` };
}

export function finishChillingSession(finalTemperature: number): WorkflowResult {
  const session = store.getSession();
  if (!session) return { ok: false, message: "No chilling session is running." };
  const end = new Date();
  const actual = Math.max(
    1,
    Math.round((end.getTime() - new Date(session.startTime).getTime()) / 60000),
  );
  const { performance } = comparePredictedVsActual(session.expectedCoolingTime, actual);

  const batch: MilkBatch = {
    batchId: session.batchId,
    quantity: session.quantity,
    initialTemperature: session.initialTemperature,
    targetTemperature: session.targetTemperature,
    finalTemperature,
    ambientTemperature: session.ambientTemperature,
    startTime: session.startTime,
    endTime: end.toISOString(),
    coolingTime: actual,
    pcmId: session.pcmId,
    pcmCycle: session.pcmCycle,
  };
  store.addBatch(batch);

  const record: CoolingRecord = {
    recordId: `CR-${Date.now()}`,
    date: end.toISOString(),
    milkBatchId: session.batchId,
    pcmId: session.pcmId,
    pcmCycle: session.pcmCycle,
    quantity: session.quantity,
    initialTemperature: session.initialTemperature,
    finalTemperature,
    targetTemperature: session.targetTemperature,
    ambientTemperature: session.ambientTemperature,
    expectedCoolingTime: session.expectedCoolingTime,
    actualCoolingTime: actual,
    performance,
  };
  store.addCoolingRecord(record);
  store.setSession(null);
  return {
    ok: true,
    message: `Cooling recorded: ${actual} min (expected ${session.expectedCoolingTime} min).`,
  };
}

export function addMaintenance(type: string, description: string): MaintenanceRecord {
  const record: MaintenanceRecord = {
    id: `MR-${Date.now()}`,
    date: new Date().toISOString(),
    type,
    description,
    status: "completed",
  };
  store.addMaintenance(record);
  return record;
}

export function nextBatchId(): string {
  const count = store.getBatches().length + 1047;
  return `MB-${count + 1}`;
}
