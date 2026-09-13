import type { EngineeringConfig } from "@/config/engineering";
import type { StatusLevel } from "@/types";

export type CalcResult<T = number> = {
  value: T;
  unit: string;
  inputs: Record<string, number | string>;
  assumptions: string[];
  warnings: string[];
};

/** Sensible cooling load of the milk: Q = m * Cp * dT (kJ) */
export function calculateCoolingLoad(
  milkQuantityLitres: number,
  initialTemp: number,
  targetTemp: number,
  cfg: EngineeringConfig,
): CalcResult {
  const warnings: string[] = [];
  if (milkQuantityLitres <= 0) warnings.push("Enter a milk quantity greater than 0 L.");
  if (targetTemp >= initialTemp)
    warnings.push("Target temperature must be below the initial milk temperature.");

  const mass = (milkQuantityLitres / 1000) * cfg.milkDensity; // kg
  const dT = Math.max(initialTemp - targetTemp, 0);
  const q = mass * cfg.milkSpecificHeat * dT;

  return {
    value: q,
    unit: "kJ",
    inputs: { milkQuantityLitres, initialTemp, targetTemp, milkSpecificHeat: cfg.milkSpecificHeat },
    assumptions: [
      `Milk density ${cfg.milkDensity} kg/m³, specific heat ${cfg.milkSpecificHeat} kJ/(kg·K).`,
      "Heat gain through the can wall during cooling is not included in this load.",
    ],
    warnings,
  };
}

/** PCM mass required to absorb the milk cooling load (kg) */
export function calculateRequiredPCM(
  coolingLoadKJ: number,
  cfg: EngineeringConfig,
  pcmInitialTemp = cfg.pcmInitialTemperature,
  finalPcmTemp = cfg.targetMilkTemperature,
): CalcResult {
  const warnings: string[] = [];
  const sensibleSolid =
    Math.max(cfg.pcmMeltingTemperature - pcmInitialTemp, 0) * cfg.pcmSpecificHeatSolid;
  const latent = cfg.pcmLatentHeat * cfg.pcmEfficiencyFactor;
  const sensibleLiquid =
    Math.max(finalPcmTemp - cfg.pcmMeltingTemperature, 0) * cfg.pcmSpecificHeatLiquid;
  const capacityPerKg = sensibleSolid + latent + sensibleLiquid; // kJ/kg

  if (capacityPerKg <= 0)
    warnings.push("PCM cooling capacity is zero — check PCM parameters in the configuration.");

  const base = capacityPerKg > 0 ? coolingLoadKJ / capacityPerKg : 0;
  const withFactor = base * cfg.designFactor;

  return {
    value: withFactor,
    unit: "kg",
    inputs: {
      coolingLoadKJ,
      capacityPerKg,
      designFactor: cfg.designFactor,
      pcmEfficiencyFactor: cfg.pcmEfficiencyFactor,
    },
    assumptions: [
      `PCM capacity per kg = sensible (solid) ${sensibleSolid.toFixed(1)} + usable latent ${latent.toFixed(1)} + sensible (liquid) ${sensibleLiquid.toFixed(1)} kJ/kg.`,
      `Design factor ${cfg.designFactor} applied.`,
      "Engineering estimate — must be validated experimentally.",
    ],
    warnings,
  };
}

/**
 * Cooling-time estimate from a lumped-capacitance heat-transfer model.
 * Milk is treated as a well-mixed mass exchanging heat with the PCM at its
 * phase-change temperature, plus a heat gain from ambient through the wall.
 */
export function calculateEstimatedCoolingTime(
  args: {
    milkQuantityLitres: number;
    initialTemp: number;
    targetTemp: number;
    ambientTemp: number;
    pcmMass: number;
  },
  cfg: EngineeringConfig,
): CalcResult {
  const warnings: string[] = [];
  const { milkQuantityLitres, initialTemp, targetTemp, ambientTemp, pcmMass } = args;
  if (milkQuantityLitres <= 0) warnings.push("Enter a milk quantity greater than 0 L.");
  if (pcmMass <= 0) warnings.push("Enter a PCM mass greater than 0 kg.");
  if (targetTemp >= initialTemp)
    warnings.push("Target temperature must be below the initial milk temperature.");

  const mass = (milkQuantityLitres / 1000) * cfg.milkDensity; // kg
  const C = mass * cfg.milkSpecificHeat * 1000; // J/K
  const UAp = cfg.heatTransferCoefficient * cfg.effectiveHeatTransferArea; // W/K to PCM
  const UAa = cfg.insulationUValue * cfg.canExternalArea; // W/K from ambient
  const Tp = cfg.pcmMeltingTemperature;

  // dT/dt = -(UAp (T - Tp) - UAa (Tamb - T)) / C
  // Equilibrium temperature the can can reach:
  const Teq = (UAp * Tp + UAa * ambientTemp) / (UAp + UAa);

  let minutes = 0;
  let reachable = true;
  if (C > 0 && UAp + UAa > 0 && initialTemp > targetTemp) {
    if (targetTemp <= Teq) {
      reachable = false;
      warnings.push(
        `With these parameters the model does not reach ${targetTemp} °C — the estimated floor temperature is ${Teq.toFixed(1)} °C. Increase PCM contact area or improve insulation.`,
      );
    } else {
      const tau = C / (UAp + UAa); // s
      const seconds = tau * Math.log((initialTemp - Teq) / (targetTemp - Teq));
      minutes = (seconds / 60) * cfg.coolingTimeCalibrationFactor;
    }
  }

  // Check that the available PCM can actually absorb the load
  const load = calculateCoolingLoad(milkQuantityLitres, initialTemp, targetTemp, cfg).value;
  const required = calculateRequiredPCM(load, cfg).value;
  if (pcmMass > 0 && required > pcmMass) {
    warnings.push(
      `Available PCM (${pcmMass.toFixed(1)} kg) is below the estimated requirement (${required.toFixed(1)} kg) — the target may not be reached.`,
    );
  }

  return {
    value: reachable ? minutes : 0,
    unit: "min",
    inputs: { ...args, calibrationFactor: cfg.coolingTimeCalibrationFactor },
    assumptions: [
      "Lumped-capacitance model: well-mixed milk, PCM held at its phase-change temperature.",
      `UA to PCM ${UAp.toFixed(1)} W/K, UA to ambient ${UAa.toFixed(2)} W/K.`,
      `Experimental calibration factor ${cfg.coolingTimeCalibrationFactor}.`,
      "Estimated value — actual performance depends on ambient conditions, PCM condition, milk quantity, heat-transfer characteristics and can configuration.",
    ],
    warnings,
  };
}

export type SpoilageRisk = "Low" | "Moderate" | "High";

/** Heuristic spoilage-risk estimate based on temperature history and elapsed time. */
export function calculateSpoilageRisk(
  args: {
    currentTemp: number;
    targetTemp: number;
    hoursSinceMilking: number;
  },
  cfg: EngineeringConfig,
): CalcResult<SpoilageRisk> {
  const { currentTemp, targetTemp, hoursSinceMilking } = args;
  // Degree-hours above the target temperature, normalised.
  const excess = Math.max(currentTemp - targetTemp, 0);
  const index = (excess * Math.max(hoursSinceMilking, 0)) / cfg.spoilageReferenceHours;

  let value: SpoilageRisk = "Low";
  if (index > 12) value = "High";
  else if (index > 4) value = "Moderate";

  return {
    value,
    unit: "",
    inputs: { ...args, index: Number(index.toFixed(2)) },
    assumptions: [
      "Estimated cooling/spoilage risk from accumulated degree-hours above the target temperature.",
      "This is an estimate based on configured parameters — it is not a milk quality or safety test.",
    ],
    warnings: [
      "No laboratory milk testing is performed. Never treat this indicator as proof of milk safety.",
    ],
  };
}

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

export function calculateMilkLoss(quantitySpoiled: number, pricePerLitre: number): CalcResult {
  const warnings: string[] = [];
  if (quantitySpoiled < 0) warnings.push("Spoiled quantity cannot be negative.");
  if (pricePerLitre <= 0) warnings.push("Enter your actual milk value per litre.");
  return {
    value: Math.max(quantitySpoiled, 0) * Math.max(pricePerLitre, 0),
    unit: "₹",
    inputs: { quantitySpoiled, pricePerLitre },
    assumptions: ["Estimate based on the milk value you entered."],
    warnings,
  };
}

export function comparePredictedVsActual(
  predicted: number,
  actual: number,
): { difference: number; accuracy: number; performance: StatusLevel } {
  const difference = actual - predicted;
  const accuracy = predicted > 0 ? Math.max(0, 100 - (Math.abs(difference) / predicted) * 100) : 0;
  let performance: StatusLevel = "GOOD";
  if (predicted > 0) {
    const ratio = actual / predicted;
    if (ratio > 1.25) performance = "INSPECT";
    else if (ratio > 1.1) performance = "MONITOR";
  }
  return { difference, accuracy, performance };
}
