import { store } from "./storage";
import type { MaintenanceRecord, PcmRecord } from "@/types";

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
  };
  // Optional fields are assigned only when defined: with
  // exactOptionalPropertyTypes an absent property must stay absent rather
  // than being set to undefined. Read semantics are unchanged (both read
  // back as undefined) and JSON persistence drops undefined keys either way.
  const lastRechargeDate = opts.recharged ? now : pcm.lastRechargeDate;
  if (lastRechargeDate !== undefined) updated.lastRechargeDate = lastRechargeDate;
  const lastKnownCondition = opts.condition || pcm.lastKnownCondition;
  if (lastKnownCondition !== undefined) updated.lastKnownCondition = lastKnownCondition;
  const notes = opts.notes ?? pcm.notes;
  if (notes !== undefined) updated.notes = notes;
  delete updated.activeCycleStartedAt;
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
    currentCycle: 0,
    validatedCycleLimit,
    installationDate: now,
    createdAt: now,
    ...(tagUid !== undefined ? { tagUid } : {}),
  });
  return { ok: true, message: `${clean} registered.` };
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
