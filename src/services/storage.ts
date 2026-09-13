/**
 * Storage abstraction. LocalStorage today; swap this single module for a
 * Supabase / Firebase / REST implementation without touching the UI.
 */
import type {
  ActiveSession,
  AppSettings,
  CalibrationRecord,
  CoolingRecord,
  MaintenanceRecord,
  MilkBatch,
  PcmRecord,
  ServiceRequest,
} from "@/types";
import { DEFAULT_ENGINEERING_CONFIG, type EngineeringConfig } from "@/config/engineering";

const PREFIX = "cad10:";
const LEGACY_PCM_CYCLE_LIMIT = 100;

const KEYS = {
  pcm: PREFIX + "pcm",
  batches: PREFIX + "batches",
  cooling: PREFIX + "cooling",
  maintenance: PREFIX + "maintenance",
  calibration: PREFIX + "calibration",
  service: PREFIX + "service",
  settings: PREFIX + "settings",
  config: PREFIX + "config",
  session: PREFIX + "session",
} as const;

const isBrowser = () => typeof window !== "undefined" && typeof localStorage !== "undefined";

function read<T>(key: string, fallback: T): T {
  if (!isBrowser()) return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write<T>(key: string, value: T) {
  if (!isBrowser()) return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
    window.dispatchEvent(new CustomEvent("cad10:storage"));
  } catch {
    /* quota or private mode — ignore */
  }
}

export const DEFAULT_SETTINGS: AppSettings = {
  demoMode: true,
  milkPricePerLitre: 0,
  researchMode: false,
};

function migratePcmCycleLimit(limit: number): number {
  return limit === LEGACY_PCM_CYCLE_LIMIT
    ? DEFAULT_ENGINEERING_CONFIG.validatedPcmCycleLimit
    : limit;
}

function migratePcmRecord(record: PcmRecord): PcmRecord {
  if (record.tagUid) return record;
  const legacyTagUid = Object.entries(record as Record<string, unknown>).find(
    ([key, value]) =>
      key !== "tagUid" &&
      typeof value === "string" &&
      /^(?:[0-9a-f]{2}:){5,7}[0-9a-f]{2}$/i.test(value),
  );
  if (!legacyTagUid) return record;

  const migrated = { ...record, tagUid: legacyTagUid[1] } as PcmRecord & Record<string, unknown>;
  delete migrated[legacyTagUid[0]];
  return migrated;
}

function seedPcm(): PcmRecord[] {
  const today = new Date();
  const iso = (d: Date) => d.toISOString();
  const daysAgo = (n: number) => iso(new Date(today.getTime() - n * 86400000));
  return [
    {
      pcmId: "PCM-CAD10-001",
      tagUid: "04:A2:1B:9C:5D:60:80",
      batchId: "PCM-BATCH-2026-A",
      manufacturingDate: daysAgo(210),
      installationDate: daysAgo(180),
      currentCycle: 47,
      validatedCycleLimit: DEFAULT_ENGINEERING_CONFIG.validatedPcmCycleLimit,
      lastUsedDate: daysAgo(1),
      lastRechargeDate: daysAgo(2),
      lastKnownCondition: "Fully frozen, no leakage observed",
      notes: "Demo record seeded for the prototype.",
      createdAt: daysAgo(180),
    },
    {
      pcmId: "PCM-CAD10-002",
      tagUid: "04:B7:33:11:A0:21:80",
      batchId: "PCM-BATCH-2026-A",
      manufacturingDate: daysAgo(210),
      installationDate: daysAgo(90),
      currentCycle: 84,
      validatedCycleLimit: DEFAULT_ENGINEERING_CONFIG.validatedPcmCycleLimit,
      lastUsedDate: daysAgo(4),
      lastRechargeDate: daysAgo(5),
      lastKnownCondition: "Slight surface deformation of pouch",
      createdAt: daysAgo(90),
    },
  ];
}

export const store = {
  // ---- PCM ----
  getPcmRecords(): PcmRecord[] {
    const existing = read<PcmRecord[] | null>(KEYS.pcm, null);
    if (existing && existing.length) {
      const migrated = existing.map((record) =>
        migratePcmRecord({
          ...record,
          validatedCycleLimit: migratePcmCycleLimit(record.validatedCycleLimit),
        }),
      );
      if (
        migrated.some(
          (record, index) =>
            record.validatedCycleLimit !== existing[index]?.validatedCycleLimit ||
            record.tagUid !== existing[index]?.tagUid,
        )
      ) {
        write(KEYS.pcm, migrated);
      }
      return migrated;
    }
    const seeded = seedPcm();
    write(KEYS.pcm, seeded);
    return seeded;
  },
  savePcmRecords(records: PcmRecord[]) {
    write(KEYS.pcm, records);
  },
  getPcm(pcmId: string): PcmRecord | undefined {
    const id = pcmId.trim().toUpperCase();
    return store
      .getPcmRecords()
      .find((p) => p.pcmId.toUpperCase() === id || p.tagUid?.toUpperCase() === id);
  },
  upsertPcm(record: PcmRecord) {
    const records = store.getPcmRecords();
    const i = records.findIndex((p) => p.pcmId === record.pcmId);
    if (i >= 0) records[i] = record;
    else records.push(record);
    write(KEYS.pcm, records);
  },

  // ---- Milk batches ----
  getBatches: () => read<MilkBatch[]>(KEYS.batches, []),
  addBatch(batch: MilkBatch) {
    write(KEYS.batches, [batch, ...store.getBatches()]);
  },
  updateBatch(batch: MilkBatch) {
    write(
      KEYS.batches,
      store.getBatches().map((b) => (b.batchId === batch.batchId ? batch : b)),
    );
  },

  // ---- Cooling records ----
  getCoolingRecords: () => read<CoolingRecord[]>(KEYS.cooling, []),
  addCoolingRecord(record: CoolingRecord) {
    write(KEYS.cooling, [record, ...store.getCoolingRecords()]);
  },

  // ---- Maintenance ----
  getMaintenance: () => read<MaintenanceRecord[]>(KEYS.maintenance, []),
  addMaintenance(record: MaintenanceRecord) {
    write(KEYS.maintenance, [record, ...store.getMaintenance()]);
  },

  // ---- Calibration ----
  getCalibration: () => read<CalibrationRecord[]>(KEYS.calibration, []),
  addCalibration(record: CalibrationRecord) {
    write(KEYS.calibration, [record, ...store.getCalibration()]);
  },

  // ---- Service requests ----
  getServiceRequests: () => read<ServiceRequest[]>(KEYS.service, []),
  addServiceRequest(record: ServiceRequest) {
    write(KEYS.service, [record, ...store.getServiceRequests()]);
  },
  closeServiceRequest(id: string) {
    write(
      KEYS.service,
      store
        .getServiceRequests()
        .map((r) => (r.id === id ? { ...r, status: "closed" as const } : r)),
    );
  },

  // ---- Settings & config ----
  getSettings: (): AppSettings => ({
    ...DEFAULT_SETTINGS,
    ...read<Partial<AppSettings>>(KEYS.settings, {}),
  }),
  saveSettings(settings: AppSettings) {
    write(KEYS.settings, settings);
  },
  getConfig: (): EngineeringConfig => {
    const config = {
      ...DEFAULT_ENGINEERING_CONFIG,
      ...read<Partial<EngineeringConfig>>(KEYS.config, {}),
    };
    const migratedLimit = migratePcmCycleLimit(config.validatedPcmCycleLimit);
    if (migratedLimit !== config.validatedPcmCycleLimit) {
      const migrated = { ...config, validatedPcmCycleLimit: migratedLimit };
      write(KEYS.config, migrated);
      return migrated;
    }
    return config;
  },
  saveConfig(config: EngineeringConfig) {
    write(KEYS.config, config);
  },

  // ---- Active chilling session ----
  getSession: () => read<ActiveSession | null>(KEYS.session, null),
  setSession(session: ActiveSession | null) {
    write(KEYS.session, session);
  },
};

export function subscribe(cb: () => void) {
  if (!isBrowser()) return () => {};
  window.addEventListener("cad10:storage", cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener("cad10:storage", cb);
    window.removeEventListener("storage", cb);
  };
}
