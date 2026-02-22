// Competitor data — last verified February 2026

export interface Competitor {
  name: string;
  slug: string;
  technology: "cellular" | "lora" | "bluetooth" | "mixed";
  hardwareCost: string;
  monthlyCost: string | null;
  annualCost: string | null;
  range: string;
  cellRequired: boolean;
  subscription: boolean;
  multiDog: boolean;
  geofencing: string;
  openEcosystem: boolean;
  batteryLife: string;
  tagline: string;
  prosVsLeashline: string[];
  consVsLeashline: string[];
}

export const leashline: Competitor = {
  name: "Leashline",
  slug: "leashline",
  technology: "lora",
  hardwareCost: "~$50–80",
  monthlyCost: null,
  annualCost: null,
  range: "1–5+ miles",
  cellRequired: false,
  subscription: false,
  multiDog: true,
  geofencing: "Custom polygon zones",
  openEcosystem: true,
  batteryLife: "Days",
  tagline: "LoRa dog tracking with zero subscriptions",
  prosVsLeashline: [],
  consVsLeashline: [],
};

export const competitors: Competitor[] = [
  {
    name: "Fi",
    slug: "fi",
    technology: "cellular",
    hardwareCost: "$149",
    monthlyCost: "$8.25",
    annualCost: "$99",
    range: "Unlimited (with cell)",
    cellRequired: true,
    subscription: true,
    multiDog: true,
    geofencing: "Circular zones",
    openEcosystem: false,
    batteryLife: "Up to 3 months",
    tagline: "GPS + LTE smart collar",
    prosVsLeashline: [
      "Nationwide range via cellular",
      "Long battery life",
      "Sleek integrated collar design",
    ],
    consVsLeashline: [
      "Requires $99/yr subscription",
      "Dead zones in rural areas",
      "Only circular geofences",
      "Proprietary hardware lock-in",
    ],
  },
  {
    name: "Halo",
    slug: "halo",
    technology: "cellular",
    hardwareCost: "$599+",
    monthlyCost: "$10–20",
    annualCost: "$120–240",
    range: "Unlimited (with cell)",
    cellRequired: true,
    subscription: true,
    multiDog: false,
    geofencing: "Custom polygon + training",
    openEcosystem: false,
    batteryLife: "~20 hours",
    tagline: "GPS fence + training collar",
    prosVsLeashline: [
      "Built-in training feedback",
      "Polygon geofencing",
      "Cesar Millan branded training content",
    ],
    consVsLeashline: [
      "Extremely expensive ($599+ upfront)",
      "Monthly subscription required",
      "Short battery life (~20 hours)",
      "Single-dog only",
      "Requires cellular coverage",
    ],
  },
  {
    name: "Whistle",
    slug: "whistle",
    technology: "cellular",
    hardwareCost: "$70–130",
    monthlyCost: "$8–13",
    annualCost: "$96–156",
    range: "Unlimited (with cell)",
    cellRequired: true,
    subscription: true,
    multiDog: true,
    geofencing: "Circular zones",
    openEcosystem: false,
    batteryLife: "Up to 20 days",
    tagline: "GPS + health monitoring",
    prosVsLeashline: [
      "Health and activity monitoring",
      "Nationwide cellular range",
      "Established brand",
    ],
    consVsLeashline: [
      "Requires monthly subscription ($8–13/mo)",
      "No coverage without cell signal",
      "Only circular geofences",
      "Proprietary hardware",
    ],
  },
  {
    name: "Tractive",
    slug: "tractive",
    technology: "cellular",
    hardwareCost: "$50–70",
    monthlyCost: "$5–8",
    annualCost: "$60–96",
    range: "Unlimited (with cell)",
    cellRequired: true,
    subscription: true,
    multiDog: true,
    geofencing: "Circular zones",
    openEcosystem: false,
    batteryLife: "2–5 days",
    tagline: "Affordable GPS tracker",
    prosVsLeashline: [
      "Low hardware cost",
      "Worldwide cellular coverage",
      "Activity and wellness tracking",
    ],
    consVsLeashline: [
      "Requires subscription ($5–8/mo)",
      "Unreliable in areas with poor cell coverage",
      "Short battery in live mode",
      "Only circular geofences",
    ],
  },
];

export const allTrackers = [leashline, ...competitors];

/** Calculate total cost of ownership over N years */
export function totalCost(
  c: Competitor,
  years: number,
): { hardware: number; subscription: number; total: number } | null {
  const hw = parseFloat(c.hardwareCost.replace(/[^0-9.]/g, ""));
  if (isNaN(hw)) return null;
  const annual = c.annualCost
    ? parseFloat(c.annualCost.replace(/[^0-9.]/g, ""))
    : 0;
  const sub = annual * years;
  return { hardware: hw, subscription: sub, total: hw + sub };
}
