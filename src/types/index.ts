export type StatusLevel = "GOOD" | "MONITOR" | "INSPECT";

export type PcmRecord = {
  pcmId: string;
  tagUid?: string;
  batchId?: string;
  manufacturingDate?: string;
  installationDate?: string;
  currentCycle: number;
  validatedCycleLimit: number;
  lastUsedDate?: string;
  lastRechargeDate?: string;
  lastKnownCondition?: string;
  notes?: string;
  /** set when a cycle is in progress */
  activeCycleStartedAt?: string;
  createdAt: string;
};

export type CoolingRecord = {
  recordId: string;
  date: string;
  milkBatchId: string;
  pcmId: string;
  pcmCycle: number;
  quantity: number;
  initialTemperature: number;
  finalTemperature: number;
  targetTemperature: number;
  ambientTemperature: number;
  expectedCoolingTime: number;
  actualCoolingTime: number;
  performance: StatusLevel;
};

export type MaintenanceRecord = {
  id: string;
  date: string;
  type: string;
  description: string;
  status: "completed" | "pending";
};

export type ServiceRequest = {
  id: string;
  date: string;
  category: string;
  description: string;
  status: "open" | "closed";
};

export type AppSettings = {
  demoMode: boolean;
};

export type ActiveSession = {
  batchId: string;
  pcmId: string;
  pcmCycle: number;
  quantity: number;
  initialTemperature: number;
  targetTemperature: number;
  ambientTemperature: number;
  startTime: string;
  expectedCoolingTime: number;
};
