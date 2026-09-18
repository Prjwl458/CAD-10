import type { EngineeringConfig } from "@/config/engineering";
import type { StatusLevel } from "@/types";

export function calculatePcmCycleStatus(
  currentCycle: number,
  limit: number,
  cfg: EngineeringConfig,
): { status: StatusLevel; ratio: number; message: string } {
  const ratio = limit > 0 ? currentCycle / limit : 0;
  if (ratio >= 1)
    return {
      status: "INSPECT",
      ratio,
      message: "PCM has reached the configured validated cycle limit. Inspect or replace.",
    };
  if (ratio >= cfg.pcmMonitorThreshold)
    return {
      status: "MONITOR",
      ratio,
      message: "PCM is approaching the configured validated cycle limit.",
    };
  return { status: "GOOD", ratio, message: "PCM is within the validated cycle range." };
}

export function calculateCanCondition(args: {
  usageCount: number;
  daysSinceCleaning: number | null;
  openIssues: number;
  cfg: EngineeringConfig;
}): { status: StatusLevel; reasons: string[] } {
  const { usageCount, daysSinceCleaning, openIssues, cfg } = args;
  const reasons: string[] = [];
  let status: StatusLevel = "GOOD";

  if (openIssues > 0) {
    status = "INSPECT";
    reasons.push(`${openIssues} open service issue(s) reported.`);
  }
  if (usageCount >= cfg.canServiceUsageLimit) {
    status = "INSPECT";
    reasons.push("Usage count has reached the configured service threshold.");
  } else if (usageCount >= cfg.canServiceUsageLimit * 0.8) {
    if (status === "GOOD") status = "MONITOR";
    reasons.push("Usage count is approaching the configured service threshold.");
  }
  if (daysSinceCleaning === null) {
    if (status === "GOOD") status = "MONITOR";
    reasons.push("No cleaning record found.");
  } else if (daysSinceCleaning > cfg.cleaningIntervalDays) {
    if (status === "GOOD") status = "MONITOR";
    reasons.push(`Last cleaning was ${daysSinceCleaning} day(s) ago.`);
  }
  if (reasons.length === 0)
    reasons.push("Usage, cleaning and maintenance records are within configured thresholds.");
  return { status, reasons };
}
