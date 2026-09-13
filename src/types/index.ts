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

export type MilkBatch = {
  batchId: string;
  quantity: number;
  initialTemperature: number;
  targetTemperature: number;
  finalTemperature?: number;
  ambientTemperature: number;
  startTime: string;
  endTime?: string;
  coolingTime?: number;
  pcmId: string;
  pcmCycle: number;
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

export type CalibrationRecord = {
  id: string;
  date: string;
  milkQuantity: number;
  initialTemperature: number;
  finalTemperature: number;
  targetTemperature: number;
  ambientTemperature: number;
  pcmMass: number;
  pcmInitialTemperature: number;
  pcmCondition: string;
  pcmCycle: number;
  actualCoolingTime: number;
  predictedCoolingTime: number;
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
  milkPricePerLitre: number;
  researchMode: boolean;
};

export type SensorReading = {
  deviceId: string;
  milkTemperature: number;
  ambientTemperature: number;
  pcmTemperature: number;
  timestamp: string;
  batteryLevel: number;
  source: "demo" | "sensor";
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
