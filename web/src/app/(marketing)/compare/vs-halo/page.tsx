import type { Metadata } from "next";
import Link from "next/link";
import { competitors } from "@/lib/competitors";
import Breadcrumbs from "@/components/marketing/Breadcrumbs";
import ComparisonTable from "@/components/marketing/ComparisonTable";
import FeatureHighlight from "@/components/marketing/FeatureHighlight";
import FAQAccordion from "@/components/marketing/FAQAccordion";
import CTABanner from "@/components/marketing/CTABanner";

const halo = competitors.find((c) => c.slug === "halo")!;

export const metadata: Metadata = {
  title: "Leashline vs Halo Dog Collar",
  description:
    "Compare Leashline to the Halo collar. $50–80 one-time vs $599+ plus monthly fees. See how affordable LoRa tracking compares to Halo's premium GPS fence.",
  openGraph: {
    title: "Leashline vs Halo | Dog GPS Tracker Comparison",
    description:
      "Halo costs $599+ plus $10–20/month. Leashline costs $50–80 with zero subscriptions. Both offer polygon geofencing.",
  },
};

const faqItems = [
  {
    question: "Is Halo worth the high price?",
    answer:
      "Halo includes built-in training feedback (vibration/tone when approaching boundaries), which some owners value. But at $599+ for hardware plus $10–20/month, the cost adds up fast. If you primarily need escape detection and alerts, Leashline provides that at a fraction of the price.",
  },
  {
    question: "Does Leashline have training features like Halo?",
    answer:
      "No. Leashline focuses on escape detection and alerts, not training. If you need the boundary training feedback that Halo provides, it may be a better fit. But if you just need to know when your dog escapes, Leashline is significantly more affordable.",
  },
  {
    question: "How does battery life compare?",
    answer:
      "Halo's battery lasts about 20 hours — you need to charge it almost daily. Leashline's LoRa trackers last days between charges because LoRa uses far less power than cellular radios.",
  },
  {
    question: "Can both track multiple dogs?",
    answer:
      "Leashline supports multiple dogs on one account with independent geofences and alerts. Halo requires a separate collar ($599+) and subscription for each dog.",
  },
];

export default function VsHaloPage() {
  return (
    <>
      <section className="bg-gradient-to-b from-blue-50 to-white py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <Breadcrumbs
            items={[
              { name: "Home", href: "/" },
              { name: "Compare", href: "/compare" },
              { name: "vs Halo", href: "/compare/vs-halo" },
            ]}
          />
          <h1 className="mt-6 text-4xl font-extrabold text-gray-900 tracking-tight">
            Leashline vs Halo Dog Collar
          </h1>
          <p className="mt-4 text-lg text-gray-600 max-w-2xl">
            Halo is the most expensive dog tracker on the market at $599+ plus monthly fees. Leashline delivers escape detection and custom geofencing for a fraction of the cost — no subscription required.
          </p>
        </div>
      </section>

      <section className="py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-8">Side-by-Side</h2>
          <ComparisonTable competitors={[halo]} />
        </div>
      </section>

      <section className="py-16 bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-8">Key Differences</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <FeatureHighlight
              icon="💰"
              title="Dramatically Lower Cost"
              description="Halo: $599+ collar, $10–20/month subscription. Over 3 years that's $960+. Leashline: ~$50–80 hardware, $0/month. Over 3 years: $50–80."
            />
            <FeatureHighlight
              icon="🔋"
              title="Days vs Hours of Battery"
              description="Halo lasts ~20 hours — daily charging required. Leashline's LoRa trackers last days on a charge because radio uses a fraction of cellular power."
            />
            <FeatureHighlight
              icon="🐾"
              title="True Multi-Dog Support"
              description="Track multiple dogs on one Leashline account. Halo requires a separate $599+ collar and subscription per dog."
            />
            <FeatureHighlight
              icon="📡"
              title="No Cell Dependency"
              description="Halo needs cellular coverage to work. Leashline uses LoRa radio — works in rural areas, forests, and anywhere cell service drops."
            />
          </div>
        </div>
      </section>

      <section className="py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            The Cost Difference
          </h2>
          <p className="text-gray-600 mb-4">
            Halo is positioned as a premium product with training features built in. If boundary training feedback is critical to you, Halo offers that. But for pure escape detection and tracking, the math doesn&apos;t add up.
          </p>
          <div className="rounded-xl border border-gray-200 bg-white p-6 mt-6">
            <div className="grid grid-cols-3 gap-4 text-center text-sm">
              <div />
              <div className="font-semibold text-gray-900">Halo</div>
              <div className="font-semibold text-blue-900 bg-blue-50 rounded-lg py-1">Leashline</div>
              <div className="text-left font-medium text-gray-700">Hardware</div>
              <div className="text-gray-600">$599+</div>
              <div className="bg-blue-50 rounded-lg py-1 font-medium">~$50–80</div>
              <div className="text-left font-medium text-gray-700">Year 1</div>
              <div className="text-gray-600">$719–839</div>
              <div className="bg-blue-50 rounded-lg py-1 font-medium">$50–80</div>
              <div className="text-left font-medium text-gray-700">Year 3</div>
              <div className="text-gray-600">$959–1,319</div>
              <div className="bg-blue-50 rounded-lg py-1 font-medium">$50–80</div>
            </div>
          </div>
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
            {competitors.filter((c) => c.slug !== "halo").map((c) => (
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
