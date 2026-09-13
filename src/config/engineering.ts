/**
 * Centralised engineering configuration for CAD-10.
 *
 * IMPORTANT: values marked PLACEHOLDER are NOT experimentally validated.
 * They must be replaced with measured values from the physical prototype.
 */

export type EngineeringConfig = {
  /** kJ/(kg·K) — milk specific heat (typical literature value) */
  milkSpecificHeat: number;
  /** kg/m3 — milk density */
  milkDensity: number;
  /** kJ/kg — PCM latent heat of fusion (PLACEHOLDER, supplier/experimental) */
  pcmLatentHeat: number;
  /** °C — PCM melting/phase-change temperature (PLACEHOLDER) */
  pcmMeltingTemperature: number;
  /** kJ/(kg·K) — PCM specific heat, solid phase (PLACEHOLDER) */
  pcmSpecificHeatSolid: number;
  /** kJ/(kg·K) — PCM specific heat, liquid phase (PLACEHOLDER) */
  pcmSpecificHeatLiquid: number;
  /** kg/m3 — PCM density (PLACEHOLDER) */
  pcmDensity: number;
  /** °C — typical PCM temperature after recharge/refreeze (PLACEHOLDER) */
  pcmInitialTemperature: number;
  /** W/(m2·K) — overall heat transfer coefficient milk <-> PCM (PLACEHOLDER) */
  heatTransferCoefficient: number;
  /** m2 — effective heat transfer area of the PCM pack (PLACEHOLDER) */
  effectiveHeatTransferArea: number;
  /** W/(m2·K) — overall heat gain coefficient through the insulated wall (PLACEHOLDER) */
  insulationUValue: number;
  /** m2 — external can surface area exposed to ambient (PLACEHOLDER) */
  canExternalArea: number;
  /** dimensionless — design/safety factor applied to PCM sizing */
  designFactor: number;
  /** dimensionless — fraction of PCM latent heat usable in practice (PLACEHOLDER) */
  pcmEfficiencyFactor: number;
  /** dimensionless — experimental calibration factor on predicted cooling time */
  coolingTimeCalibrationFactor: number;
  /** cycles — experimentally validated PCM cycle limit (PLACEHOLDER) */
  validatedPcmCycleLimit: number;
  /** fraction of the cycle limit at which PCM status becomes MONITOR */
  pcmMonitorThreshold: number;
  /** uses — can usage count before service inspection is suggested (PLACEHOLDER) */
  canServiceUsageLimit: number;
  /** days — cleaning is overdue after this many days without a record */
  cleaningIntervalDays: number;
  /** °C — default target milk temperature */
  targetMilkTemperature: number;
  /** hours — reference holding time used in the spoilage-risk estimate */
  spoilageReferenceHours: number;
};

export const DEFAULT_ENGINEERING_CONFIG: EngineeringConfig = {
  milkSpecificHeat: 3.93,
  milkDensity: 1030,
  pcmLatentHeat: 320,
  pcmMeltingTemperature: -2,
  pcmSpecificHeatSolid: 2.0,
  pcmSpecificHeatLiquid: 4.0,
  pcmDensity: 1000,
  pcmInitialTemperature: -12,
  heatTransferCoefficient: 120,
  effectiveHeatTransferArea: 0.35,
  insulationUValue: 0.8,
  canExternalArea: 0.9,
  designFactor: 1.25,
  pcmEfficiencyFactor: 0.85,
  coolingTimeCalibrationFactor: 1.0,
  validatedPcmCycleLimit: 1000,
  pcmMonitorThreshold: 0.8,
  canServiceUsageLimit: 500,
  cleaningIntervalDays: 1,
  targetMilkTemperature: 4,
  spoilageReferenceHours: 4,
};

export const CONFIG_NOTES: Record<string, string> = {
  pcmLatentHeat: "Placeholder — replace with supplier datasheet or DSC measurement.",
  heatTransferCoefficient: "Placeholder — determine from cooling-curve experiments.",
  validatedPcmCycleLimit: "Placeholder — set from thermal cycling tests.",
};
