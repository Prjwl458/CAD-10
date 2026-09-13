/** Translation-ready string table. English today; add locales here. */
export const en = {
  appName: "CAD-10",
  tagline: "PCM-Based Milk Chilling Can",
  nav: {
    dashboard: "Dashboard",
    pcm: "CAD Scan",
    can: "Can Specs",
    maintenance: "Maintenance",
    help: "Help",
    team: "Our Team",
  },
  status: { GOOD: "GOOD", MONITOR: "MONITOR", INSPECT: "INSPECT / REPLACE" },
  demoBadge: "DEMO DATA",
  tapScan: "SCAN PCM",
} as const;

export type Dictionary = typeof en;
const dictionaries: Record<string, Dictionary> = { en };
export type Locale = keyof typeof dictionaries;

export function t(locale: Locale = "en"): Dictionary {
  return dictionaries[locale] ?? en;
}
