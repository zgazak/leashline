import type { Metadata } from "next";
import Link from "next/link";
import { competitors } from "@/lib/competitors";
import Breadcrumbs from "@/components/marketing/Breadcrumbs";
import ComparisonTable from "@/components/marketing/ComparisonTable";
import FeatureHighlight from "@/components/marketing/FeatureHighlight";
import FAQAccordion from "@/components/marketing/FAQAccordion";
import CTABanner from "@/components/marketing/CTABanner";
import { JsonLd, faqJsonLd } from "@/lib/structured-data";

const tractive = competitors.find((c) => c.slug === "tractive")!;

export const metadata: Metadata = {
  title: "Leashline vs Tractive Dog GPS Tracker",
  description:
    "Compare Leashline to Tractive GPS dog tracker. LoRa radio vs cellular LTE — see how range, reliability, and total cost compare across different terrain.",
  openGraph: {
    title: "Leashline vs Tractive | Dog GPS Tracker Comparison",
    description:
      "Tractive uses cellular LTE with a $5–8/month subscription. Leashline uses LoRa radio with zero monthly fees and better rural coverage.",
  },
  alternates: { canonical: "/compare/vs-tractive" },
};

const faqItems = [
  {
    question: "Is Tractive cheaper than Leashline?",
    answer:
      "Tractive's hardware is similarly priced ($50–70 vs $50–80), but Tractive requires a $5–8/month subscription. Over 2 years, Tractive costs $170–262 while Leashline stays at $50–80. Leashline is cheaper long-term.",
  },
  {
    question: "Does Tractive work in rural areas?",
    answer:
      "Tractive uses LTE cellular, so it depends on cell tower coverage. In rural areas, forests, and mountains, coverage can be spotty or nonexistent. Leashline's LoRa radio works independently of cell infrastructure.",
  },
  {
    question: "What about Tractive's live tracking mode?",
    answer:
      "Tractive offers a live tracking mode that updates every 2–3 seconds, but it drains the battery much faster (hours instead of days). Leashline provides regular position updates over LoRa without the severe battery penalty.",
  },
  {
    question: "Does Tractive support custom geofences?",
    answer:
      "Tractive only supports circular geofences. Leashline supports custom polygon zones, letting you trace your actual fence line or property boundary for more accurate alerts.",
  },
];

export default function VsActivePage() {
  return (
    <>
      <JsonLd data={faqJsonLd(faqItems)} />
      <section className="bg-gradient-to-b from-blue-50 to-white py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <Breadcrumbs
            items={[
              { name: "Home", href: "/" },
              { name: "Compare", href: "/compare" },
              { name: "vs Tractive", href: "/compare/vs-tractive" },
            ]}
          />
          <h1 className="mt-6 text-4xl font-extrabold text-gray-900 tracking-tight">
            Leashline vs Tractive GPS Tracker
          </h1>
          <p className="mt-4 text-lg text-gray-600 max-w-2xl">
            Tractive is one of the more affordable cellular trackers, but it still requires a monthly subscription and relies on LTE coverage. Leashline uses LoRa radio for reliable tracking without cell dependency or recurring fees.
          </p>
        </div>
      </section>

      <section className="py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-8">Side-by-Side</h2>
          <ComparisonTable competitors={[tractive]} />
        </div>
      </section>

      <section className="py-16 bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-8">Key Differences</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <FeatureHighlight
              icon="📡"
              title="LoRa vs LTE"
              description="Tractive uses cellular LTE, which fails in rural and wilderness areas. Leashline's LoRa radio provides 1–5+ miles of range without any cell infrastructure."
            />
            <FeatureHighlight
              icon="💰"
              title="No Hidden Costs"
              description="Tractive's low hardware price ($50–70) is deceptive — add $5–8/month in perpetuity. Leashline is a one-time purchase with free software."
            />
            <FeatureHighlight
              icon="🔋"
              title="Better Battery Efficiency"
              description="Tractive's live mode drains the battery in hours. Leashline's LoRa radio uses a fraction of the power, lasting days between charges."
            />
            <FeatureHighlight
              icon="🗺️"
              title="Polygon Geofences"
              description="Tractive only offers circular zones. Leashline supports custom polygon boundaries that match real property lines and fence shapes."
            />
          </div>
        </div>
      </section>

      <section className="py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Range and Reliability in Varied Terrain
          </h2>
          <p className="text-gray-600 mb-4">
            Tractive advertises &quot;worldwide coverage&quot; but that only holds where LTE towers exist. Step into a forest, a valley, or a rural property, and coverage drops. Your tracker might show a location from 10 minutes ago — or nothing at all.
          </p>
          <p className="text-gray-600">
            LoRa radio doesn&apos;t depend on towers. The signal travels directly between your dog&apos;s collar and your base station. Hills and trees reduce range (1–2 miles in dense terrain, 5+ in open areas), but there are no total blackout zones. You always know if your dog is in range.
          </p>
        </div>
      </section>

      <section className="py-16 bg-gray-50">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-8">FAQ</h2>
          <FAQAccordion items={faqItems} />
        </div>
      </section>

      <section className="py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-sm text-gray-500 mb-3">Other comparisons:</p>
          <div className="flex flex-wrap gap-3">
            {competitors.filter((c) => c.slug !== "tractive").map((c) => (
              <Link
                key={c.slug}
                href={`/compare/vs-${c.slug}`}
                className="text-sm text-blue-600 hover:text-blue-800 transition-colors"
              >
                vs {c.name} →
              </Link>
            ))}
          </div>
        </div>
      </section>

      <CTABanner />
    </>
  );
}
