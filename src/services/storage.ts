/**
 * Storage abstraction. LocalStorage today; swap this single module for a
 * Supabase / Firebase / REST implementation without touching the UI.
 */
import type {
  ActiveSession,
  AppSettings,
  CoolingRecord,
  MaintenanceRecord,
  PcmRecord,
  ServiceRequest,
} from "@/types";
import { DEFAULT_ENGINEERING_CONFIG, type EngineeringConfig } from "@/config/engineering";

const PREFIX = "cad10:";
const LEGACY_PCM_CYCLE_LIMIT = 100;

const KEYS = {
  pcm: PREFIX + "pcm",
  cooling: PREFIX + "cooling",
  maintenance: PREFIX + "maintenance",
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

/**
 * Narrowing for parsed JSON: only a non-null object can carry record fields.
 * Arrays are checked separately with Array.isArray at each read site.
 */
function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export const DEFAULT_SETTINGS: AppSettings = {
  demoMode: true,
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
    // Valid JSON with the wrong shape (e.g. a string, which also has a
    // .length, or an object) must fall back instead of crashing on .map.
    // Items must be objects with a string pcmId: getPcm calls
    // pcmId.toUpperCase(), which throws on missing IDs.
    const stored = read<unknown>(KEYS.pcm, null);
    const existing = Array.isArray(stored)
      ? stored.filter(
          (record): record is PcmRecord => isObject(record) && typeof record["pcmId"] === "string",
        )
      : [];
    if (existing.length) {
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

  // ---- Cooling records ----
  // Non-object items (e.g. null) are dropped: readers access record fields
  // directly, which throws on null. Missing fields on plain objects stay
  // undefined and are already handled by the UI formatters.
  getCoolingRecords: (): CoolingRecord[] => {
    const stored = read<unknown>(KEYS.cooling, []);
    return Array.isArray(stored)
      ? stored.filter((record): record is CoolingRecord => isObject(record))
      : [];
  },

  // ---- Maintenance ----
  getMaintenance: (): MaintenanceRecord[] => {
    const stored = read<unknown>(KEYS.maintenance, []);
    return Array.isArray(stored)
      ? stored.filter((record): record is MaintenanceRecord => isObject(record))
      : [];
  },
  addMaintenance(record: MaintenanceRecord) {
    write(KEYS.maintenance, [record, ...store.getMaintenance()]);
  },

  // ---- Service requests ----
  getServiceRequests: (): ServiceRequest[] => {
    const stored = read<unknown>(KEYS.service, []);
    return Array.isArray(stored)
      ? stored.filter((record): record is ServiceRequest => isObject(record))
      : [];
  },
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
  getSettings: (): AppSettings => {
    // Only a JSON object can carry settings; anything else keeps defaults.
    const stored = read<unknown>(KEYS.settings, null);
    return { ...DEFAULT_SETTINGS, ...(isObject(stored) ? stored : {}) };
  },
  saveSettings(settings: AppSettings) {
    write(KEYS.settings, settings);
  },
  getConfig: (): EngineeringConfig => {
    // Only a JSON object can carry config overrides; anything else keeps
    // defaults before the legacy-limit migration below runs unchanged.
    const stored = read<unknown>(KEYS.config, null);
    const config = {
      ...DEFAULT_ENGINEERING_CONFIG,
      ...(isObject(stored) ? stored : {}),
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
