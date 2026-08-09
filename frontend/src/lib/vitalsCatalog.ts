import type { VitalMetricDef, VitalPanel } from "@/data/types"

export const PANEL_LABELS: Record<VitalPanel, string> = {
  sugar: "Blood Sugar",
  lipid: "Lipid Profile",
  cbc: "CBC",
  vitamins: "Vitamins",
  iron: "Iron Studies",
  kidney: "Kidney (KFT)",
  electrolytes: "Electrolytes & Minerals",
  liver: "Liver (LFT)",
  thyroid: "Thyroid",
}

export const PANEL_ORDER: VitalPanel[] = [
  "sugar",
  "lipid",
  "cbc",
  "vitamins",
  "iron",
  "kidney",
  "electrolytes",
  "liver",
  "thyroid",
]

// Core 11 metrics come from the user's own Notion tracker — ranges kept verbatim.
// Extended metrics cover standard Indian full-body-panel labs (Thyrocare/Dr Lal/Healthians style).
export const VITALS_CATALOG: VitalMetricDef[] = [
  // --- Blood Sugar ---
  { key: "fasting-glucose", label: "Blood Glucose (Fasting)", shortLabel: "Glucose", unit: "mg/dL", range: { low: 70, high: 100 }, panel: "sugar", core: true },
  { key: "hba1c", label: "HbA1c", unit: "%", range: { low: 4.0, high: 5.6 }, panel: "sugar" },
  { key: "pp-glucose", label: "Blood Glucose (PP)", shortLabel: "Glucose (PP)", unit: "mg/dL", range: { low: 70, high: 140 }, panel: "sugar" },

  // --- Lipid Profile ---
  { key: "total-cholesterol", label: "Cholesterol (Total)", shortLabel: "Cholesterol", unit: "mg/dL", range: { high: 200 }, panel: "lipid", core: true },
  { key: "hdl-ldl-ratio", label: "HDL / LDL Ratio", shortLabel: "HDL/LDL", unit: "", range: { low: 0.4 }, panel: "lipid", core: true, decimals: 2 },
  { key: "ldl", label: "LDL Cholesterol", shortLabel: "LDL", unit: "mg/dL", range: { high: 100 }, panel: "lipid" },
  { key: "hdl", label: "HDL Cholesterol", shortLabel: "HDL", unit: "mg/dL", range: { low: 40 }, panel: "lipid" },
  { key: "vldl", label: "VLDL Cholesterol", shortLabel: "VLDL", unit: "mg/dL", range: { low: 5, high: 40 }, panel: "lipid" },
  { key: "triglycerides", label: "Triglycerides", unit: "mg/dL", range: { high: 150 }, panel: "lipid" },
  { key: "chol-hdl-ratio", label: "Cholesterol / HDL Ratio", shortLabel: "Chol/HDL", unit: "", range: { high: 4.5 }, panel: "lipid", decimals: 2 },

  // --- CBC ---
  { key: "hemoglobin", label: "Hemoglobin", unit: "g/dL", range: { low: 13, high: 17 }, panel: "cbc", core: true },
  { key: "rbc", label: "RBC Count", unit: "mill/µL", range: { low: 4.5, high: 5.5 }, panel: "cbc" },
  { key: "wbc", label: "WBC Count", unit: "/µL", range: { low: 4000, high: 11000 }, panel: "cbc", decimals: 0 },
  { key: "platelets", label: "Platelet Count", unit: "lakh/µL", range: { low: 1.5, high: 4.5 }, panel: "cbc" },
  { key: "hematocrit", label: "Hematocrit (PCV)", shortLabel: "PCV", unit: "%", range: { low: 40, high: 50 }, panel: "cbc" },
  { key: "esr", label: "ESR", unit: "mm/hr", range: { high: 15 }, panel: "cbc", decimals: 0 },

  // --- Vitamins ---
  { key: "vitamin-d", label: "Vitamin D (25-OH)", shortLabel: "Vitamin D", unit: "ng/mL", range: { low: 30, high: 100 }, panel: "vitamins", core: true },
  { key: "vitamin-b12", label: "Vitamin B-12", unit: "pg/mL", range: { low: 211, high: 911 }, panel: "vitamins", core: true, decimals: 0 },

  // --- Iron Studies ---
  { key: "iron", label: "Iron (Serum)", unit: "µg/dL", range: { low: 65, high: 175 }, panel: "iron", core: true },
  { key: "ferritin", label: "Ferritin", unit: "ng/mL", range: { low: 30, high: 400 }, panel: "iron" },
  { key: "tibc", label: "TIBC", unit: "µg/dL", range: { low: 250, high: 450 }, panel: "iron" },

  // --- Kidney (KFT) ---
  { key: "uric-acid", label: "Uric Acid", unit: "mg/dL", range: { low: 4.2, high: 7.2 }, panel: "kidney", core: true },
  { key: "creatinine", label: "Creatinine", unit: "mg/dL", range: { low: 0.7, high: 1.3 }, panel: "kidney", decimals: 2 },
  { key: "urea", label: "Urea", unit: "mg/dL", range: { low: 15, high: 40 }, panel: "kidney" },
  { key: "egfr", label: "eGFR", unit: "mL/min", range: { low: 90 }, panel: "kidney", decimals: 0 },

  // --- Electrolytes & Minerals ---
  { key: "sodium", label: "Sodium", unit: "mmol/L", range: { low: 136, high: 145 }, panel: "electrolytes", core: true },
  { key: "potassium", label: "Potassium", unit: "mmol/L", range: { low: 3.5, high: 5.1 }, panel: "electrolytes", core: true, decimals: 2 },
  { key: "chloride", label: "Chloride", unit: "mmol/L", range: { low: 98, high: 107 }, panel: "electrolytes", core: true },
  { key: "calcium", label: "Calcium", unit: "mg/dL", range: { low: 8.5, high: 10.5 }, panel: "electrolytes" },

  // --- Liver (LFT) ---
  { key: "sgpt-alt", label: "SGPT (ALT)", shortLabel: "SGPT", unit: "U/L", range: { high: 45 }, panel: "liver", decimals: 0 },
  { key: "sgot-ast", label: "SGOT (AST)", shortLabel: "SGOT", unit: "U/L", range: { high: 40 }, panel: "liver", decimals: 0 },
  { key: "alp", label: "Alkaline Phosphatase", shortLabel: "ALP", unit: "U/L", range: { low: 40, high: 130 }, panel: "liver", decimals: 0 },
  { key: "ggt", label: "GGT", unit: "U/L", range: { high: 55 }, panel: "liver", decimals: 0 },
  { key: "total-bilirubin", label: "Bilirubin (Total)", shortLabel: "Bilirubin", unit: "mg/dL", range: { low: 0.2, high: 1.2 }, panel: "liver", decimals: 2 },

  // --- Thyroid ---
  { key: "tsh", label: "TSH", unit: "mIU/L", range: { low: 0.4, high: 4.5 }, panel: "thyroid", decimals: 2 },
  { key: "t3", label: "T3 (Total)", shortLabel: "T3", unit: "ng/dL", range: { low: 80, high: 200 }, panel: "thyroid", decimals: 0 },
  { key: "t4", label: "T4 (Total)", shortLabel: "T4", unit: "µg/dL", range: { low: 5.1, high: 14.1 }, panel: "thyroid" },
]

const CATALOG_BY_KEY = new Map(VITALS_CATALOG.map((m) => [m.key, m]))

export function metricByKey(key: string): VitalMetricDef | undefined {
  return CATALOG_BY_KEY.get(key)
}

export const CORE_METRICS = VITALS_CATALOG.filter((m) => m.core)

export function metricsByPanel(panel: VitalPanel): VitalMetricDef[] {
  return VITALS_CATALOG.filter((m) => m.panel === panel)
}
