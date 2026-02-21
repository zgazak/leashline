import type { Metadata } from "next";
import Link from "next/link";
import { competitors } from "@/lib/competitors";
import Breadcrumbs from "@/components/marketing/Breadcrumbs";
import ComparisonTable from "@/components/marketing/ComparisonTable";
import FeatureHighlight from "@/components/marketing/FeatureHighlight";
import FAQAccordion from "@/components/marketing/FAQAccordion";
import CTABanner from "@/components/marketing/CTABanner";

const fi = competitors.find((c) => c.slug === "fi")!;

export const metadata: Metadata = {
  title: "Leashline vs Fi Dog Collar",
  description:
    "Compare Leashline to the Fi Smart Dog Collar. LoRa radio tracking with no subscription vs Fi's cellular GPS with $99/year fee. See which is better for rural areas.",
  openGraph: {
    title: "Leashline vs Fi | Dog GPS Tracker Comparison",
    description:
      "Fi needs cell towers and a $99/year subscription. Leashline uses LoRa radio — miles of range, zero dead zones, zero monthly fees.",
  },
};

const faqItems = [
  {
    question: "Is Leashline more reliable than Fi in rural areas?",
    answer:
      "Yes. Fi relies on LTE cellular towers, which means it has significant dead zones in rural areas, forests, and mountains. Leashline uses LoRa radio, which works independently of cell infrastructure and provides 1–5+ miles of range in exactly the areas where Fi fails.",
  },
  {
    question: "How does cost compare between Leashline and Fi?",
    answer:
      "Fi costs $149 for the collar plus $99/year for the subscription — that's $446 over 3 years. Leashline hardware costs around $50–80, and the software is completely free with no subscription. Over 3 years, you save $300+.",
  },
  {
    question: "Does Fi work without a subscription?",
    answer:
      "No. Fi requires an active subscription for GPS tracking and escape alerts. Without paying the monthly or annual fee, the collar becomes a basic activity tracker only.",
  },
  {
    question: "Can Leashline track my dog nationwide like Fi?",
    answer:
      "Leashline is designed for proximity-based tracking within 1–5+ miles of your base station — perfect for home, property, hiking, and camping. Fi's cellular range is wider but fails in areas without cell coverage, which is often exactly where escapes happen.",
  },
];

export default function VsFiPage() {
  return (
    <>
      <section className="bg-gradient-to-b from-blue-50 to-white py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <Breadcrumbs
            items={[
              { name: "Home", href: "/" },
              { name: "Compare", href: "/compare" },
              { name: "vs Fi", href: "/compare/vs-fi" },
            ]}
          />
          <h1 className="mt-6 text-4xl font-extrabold text-gray-900 tracking-tight">
            Leashline vs Fi Smart Dog Collar
          </h1>
          <p className="mt-4 text-lg text-gray-600 max-w-2xl">
            Fi is a popular cellular GPS collar, but it requires a $99/year subscription and fails when cell coverage drops. Leashline uses LoRa radio — no cell towers, no dead zones, no recurring fees.
          </p>
        </div>
      </section>

      <section className="py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-8">Side-by-Side</h2>
          <ComparisonTable competitors={[fi]} />
        </div>
      </section>

      <section className="py-16 bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-8">Key Differences</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <FeatureHighlight
              icon="📡"
              title="No Dead Zones"
              description="Fi relies on LTE cell towers. In rural areas, forests, and mountains, it simply stops working. Leashline's LoRa radio works independently — 1–5+ miles of range regardless of cell coverage."
            />
            <FeatureHighlight
              icon="💰"
              title="No Subscription Trap"
              description="Fi charges $99/year on top of the $149 collar — that's $446 over 3 years. Leashline is a one-time hardware purchase with free software."
            />
            <FeatureHighlight
              icon="🗺️"
              title="Custom Polygon Geofences"
              description="Fi only supports circular geofences. Leashline lets you draw custom polygon zones that match your actual fence line or property boundary."
            />
            <FeatureHighlight
              icon="🔓"
              title="Open Ecosystem"
              description="Fi locks you into their proprietary collar. Leashline uses the open Meshtastic ecosystem — use any compatible LoRa hardware."
            />
          </div>
        </div>
      </section>

      <section className="py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Fi&apos;s Cellular Dead Zone Problem
          </h2>
          <p className="text-gray-600 mb-4">
            The core issue with cellular dog trackers: they stop working when you leave coverage areas. For dog owners in rural properties, cabins, hiking trails, and campgrounds, this means losing tracking exactly when their dog is most at risk.
          </p>
          <p className="text-gray-600">
            LoRa radio doesn&apos;t depend on any infrastructure. The signal travels directly from your dog&apos;s collar to your base station. Terrain affects range, but there are no &quot;dead zones&quot; — if you&apos;re within radio range, it works.
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
            {competitors.filter((c) => c.slug !== "fi").map((c) => (
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
