/**
 * Centralised engineering specifications for the CAD-10 Milk Storage Can.
 * Strictly adheres to authoritative engineering drawing/design data:
 * - Overall height: 420 mm
 * - Main diameter: 280 mm
 * - Neck diameter: As per design
 * - 3-layer construction (HDPE outer wall, PU foam insulation, Food-grade stainless steel inner container)
 * - Four internal semi-circular / D-shaped hollow columns (90° spacing, ~350 mm H, ~50 mm W)
 * - Unspecified dimensions: "As per design"
 */

export type CanComponentId =
  | "outer-shell"
  | "insulation-layer"
  | "inner-vessel"
  | "pcm-columns"
  | "lid-assembly"
  | "base-structure";

export type CanComponentSpec = {
  id: CanComponentId;
  name: string;
  material: string;
  dimensions: string;
  wallThickness: string;
  description: string;
  specifications: { label: string; value: string }[];
  /** Hotspot anchors as fractions (0..1) of the layer artwork:
   *  u = fraction across artwork width, v = fraction down artwork height.
   *  Anchored in artwork space so letterboxing/padding/transforms are handled
   *  deterministically by the stage overlay. */
  hotspots: Partial<
    Record<number, { u: number; v: number; label: string; labelPosition?: "above" | "below" }>
  >;
};

export type DisassemblyStep = {
  step: number;
  stageNumber: string; // e.g. "01"
  label: string;
  componentTitle: string;
  material: string;
  description: string;
  specifications: { label: string; value: string }[];
  imageSrc: string;
  activeHotspotIds: CanComponentId[];
};

/**
 * Authoritative scroll-progress definition for the 5 Can disassembly states
 * (Assembled Can → Outer Shell → Thermal Barrier → Inner Container & Columns
 * → Exploded Assembly).
 *
 * Each entry holds the state BOUNDARY (the progress value at which the
 * dominant step flips) together with that handoff's cross-dissolve WINDOW
 * (a ±0.03 hold around the boundary, during which the outgoing illustration
 * dissolves into the incoming one). Values are intentionally literal: the
 * window edges are NOT recomputed from the boundary because two of them
 * differ by 1 ulp from boundary ± 0.03 in floating point, and this table
 * preserves the exact shipped values.
 *
 * Consumers: currentStep derivation (can.tsx) counts boundaries at or below
 * the scroll progress; the stage (CanDisassemblyStage) eases each window.
 * Stepper landing positions (stepTargets in can.tsx) are deliberately NOT
 * part of this table — they are rest positions inside each state's hold,
 * a different semantic from boundaries.
 */
export const CAN_STAGE_TRANSITIONS = [
  { boundary: 0.18, windowFrom: 0.15, windowTo: 0.21 },
  { boundary: 0.4, windowFrom: 0.37, windowTo: 0.43 },
  { boundary: 0.62, windowFrom: 0.59, windowTo: 0.65 },
  { boundary: 0.82, windowFrom: 0.79, windowTo: 0.85 },
] as const;

/**
 * Native pixel dimensions of the supplied CAN layer renders (896×1200, aspect 0.7467).
 * Used to mirror the <img object-contain> geometry so hotspot anchors expressed as
 * artwork fractions (u, v) map deterministically onto the rendered artwork at any
 * stage size — accounting for letterboxing, stage padding and responsive resizing.
 */
export const CAN_ART_DIMS: Record<string, { w: number; h: number }> = {
  "assembled/can-assembled.png": { w: 896, h: 1200 },
  "layers/can-assembled.png": { w: 896, h: 1200 },
  "layers/can-insulation-pu.png": { w: 896, h: 1200 },
  "layers/can-inner-container-edited.png": { w: 896, h: 1200 },
  "exploded/can-exploded.png": { w: 896, h: 1200 },
};

export const CAN_COMPONENTS: Record<CanComponentId, CanComponentSpec> = {
  "outer-shell": {
    id: "outer-shell",
    name: "Outer Shell",
    material: "HDPE",
    dimensions: "Ø 280 mm × H 420 mm",
    wallThickness: "As per design",
    description:
      "Rigid protective outer wall providing structural enclosure and environmental durability.",
    specifications: [
      { label: "Material", value: "HDPE" },
      { label: "Outer Diameter", value: "280 mm" },
      { label: "Overall Height", value: "420 mm" },
      { label: "Wall Thickness", value: "As per design" },
    ],
    hotspots: {
      0: { u: 0.5, v: 0.5, label: "Outer Shell" },
      1: { u: 0.5, v: 0.5, label: "Outer Shell" },
      4: { u: 0.5, v: 0.24, label: "Outer Shell" },
    },
  },
  "insulation-layer": {
    id: "insulation-layer",
    name: "Thermal Insulation Layer",
    material: "PU Foam",
    dimensions: "Annular cavity",
    wallThickness: "As per design",
    description:
      "Thermal insulation layer positioned between the outer HDPE shell and inner food-grade stainless-steel container.",
    specifications: [
      { label: "Material", value: "PU Foam" },
      { label: "Layer Position", value: "Intermediate wall" },
      { label: "Core Thickness", value: "As per design" },
    ],
    hotspots: {
      2: { u: 0.5, v: 0.5, label: "Insulation Layer" },
      4: { u: 0.5, v: 0.52, label: "Insulation Layer" },
    },
  },
  "inner-vessel": {
    id: "inner-vessel",
    name: "Inner Container",
    material: "Food-grade stainless steel",
    dimensions: "Inner chamber as per design",
    wallThickness: "As per design",
    description:
      "Primary sanitary milk storage container with integrated internal column housings.",
    specifications: [
      { label: "Material", value: "Food-grade stainless steel" },
      { label: "Wall Thickness", value: "As per design" },
    ],
    hotspots: {
      3: { u: 0.5, v: 0.5, label: "Inner Container" },
      4: { u: 0.6, v: 0.56, label: "Inner Container" },
    },
  },
  "pcm-columns": {
    id: "pcm-columns",
    name: "Four Internal Columns",
    material: "Integrated with inner container",
    dimensions: "~50 mm width × ~350 mm height",
    wallThickness: "As per design",
    description:
      "Four hollow semi-circular columns positioned at 90° intervals around the inner container for Phase Change Material placement.",
    specifications: [
      { label: "Quantity", value: "4 Columns" },
      { label: "Spacing", value: "90° equidistant" },
      { label: "Cross-Section", value: "Semi-circular / D-shaped" },
      { label: "Approx. Height", value: "~350 mm" },
      { label: "Approx. Width", value: "~50 mm" },
    ],
    hotspots: {
      3: { u: 0.741, v: 0.256, label: "PCM Column Port", labelPosition: "above" },
      4: { u: 0.64, v: 0.465, label: "Internal Columns" },
    },
  },
  "lid-assembly": {
    id: "lid-assembly",
    name: "Top Lid Assembly",
    material: "As per design",
    dimensions: "Neck diameter as per design",
    wallThickness: "As per design",
    description: "Upper closure sealing the container aperture during storage and transit.",
    specifications: [{ label: "Neck Fit", value: "As per design" }],
    hotspots: {
      0: { u: 0.5, v: 0.135, label: "Top Lid" },
      1: { u: 0.5, v: 0.135, label: "Top Lid" },
      4: { u: 0.5, v: 0.09, label: "Top Lid" },
    },
  },
  "base-structure": {
    id: "base-structure",
    name: "Base Structure",
    material: "HDPE",
    dimensions: "Ø 280 mm base boundary",
    wallThickness: "As per design",
    description: "Bottom support structure of the cylindrical container.",
    specifications: [
      { label: "Material", value: "HDPE" },
      { label: "Base Diameter", value: "280 mm" },
    ],
    hotspots: {
      0: { u: 0.5, v: 0.735, label: "Base Structure" },
      4: { u: 0.5, v: 0.615, label: "Base Structure" },
    },
  },
};

export const DISASSEMBLY_STEPS: DisassemblyStep[] = [
  {
    step: 0,
    stageNumber: "00",
    label: "Assembled Can",
    componentTitle: "Full Assembly",
    material: "Complete 3-Layer Structure",
    description:
      "Complete cylindrical storage can in assembled state. Height 420 mm, diameter 280 mm.",
    specifications: [
      { label: "Overall Height", value: "420 mm" },
      { label: "Main Diameter", value: "280 mm" },
      { label: "Neck Diameter", value: "As per design" },
      { label: "Construction", value: "3 concentric layers" },
    ],
    imageSrc: "/assets/can/assembled/can-assembled.png",
    activeHotspotIds: ["outer-shell", "lid-assembly", "base-structure"],
  },
  {
    step: 1,
    stageNumber: "01",
    label: "Outer Shell",
    componentTitle: "HDPE Outer Wall",
    material: "HDPE",
    description: "Rigid HDPE outer wall providing structural protection and exterior enclosure.",
    specifications: [
      { label: "Material", value: "HDPE" },
      { label: "Outer Diameter", value: "280 mm" },
      { label: "Overall Height", value: "420 mm" },
      { label: "Wall Thickness", value: "As per design" },
    ],
    imageSrc: "/assets/can/layers/can-assembled.png",
    activeHotspotIds: ["outer-shell", "lid-assembly"],
  },
  {
    step: 2,
    stageNumber: "02",
    label: "Thermal Barrier",
    componentTitle: "Double Insulation",
    material: "PU Foam",
    description:
      "Intermediate double-insulation core forming an annular thermal insulation barrier.",
    specifications: [
      { label: "Material", value: "PU Foam" },
      { label: "Layer Position", value: "Intermediate layer" },
      { label: "Core Thickness", value: "As per design" },
    ],
    imageSrc: "/assets/can/layers/can-insulation-pu.png",
    activeHotspotIds: ["insulation-layer"],
  },
  {
    step: 3,
    stageNumber: "03",
    label: "Inner Container & Columns",
    componentTitle: "Stainless Steel Chamber & 4 Columns",
    material: "Food-grade stainless steel",
    description:
      "Sanitary inner container with four integrated semi-circular hollow columns spaced at 90° for Phase Change Material.",
    specifications: [
      { label: "Inner Vessel", value: "Food-grade stainless steel" },
      { label: "Columns", value: "4 hollow columns" },
      { label: "Column Spacing", value: "90° equidistant" },
      { label: "Column Dimensions", value: "~50 mm W × ~350 mm H" },
    ],
    imageSrc: "/assets/can/layers/can-inner-container-edited.png",
    activeHotspotIds: ["inner-vessel", "pcm-columns"],
  },
  {
    step: 4,
    stageNumber: "04",
    label: "Exploded Assembly",
    componentTitle: "Full Exploded Configuration",
    material: "3-Layer Architecture",
    description:
      "Exploded view displaying the relationship between the outer HDPE shell, double insulation, inner container, and four columns.",
    specifications: [
      { label: "Outer Layer", value: "HDPE shell" },
      { label: "Thermal Layer", value: "PU foam" },
      { label: "Inner Layer", value: "Food-grade stainless steel" },
      { label: "Internal Columns", value: "4 semi-circular hollow columns" },
    ],
    imageSrc: "/assets/can/exploded/can-exploded.png",
    activeHotspotIds: [
      "outer-shell",
      "insulation-layer",
      "inner-vessel",
      "pcm-columns",
      "lid-assembly",
      "base-structure",
    ],
  },
];
