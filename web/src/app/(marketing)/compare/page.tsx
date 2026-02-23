import type { Metadata } from "next";
import Link from "next/link";
import { competitors } from "@/lib/competitors";
import Breadcrumbs from "@/components/marketing/Breadcrumbs";
import ComparisonTable from "@/components/marketing/ComparisonTable";
import FAQAccordion from "@/components/marketing/FAQAccordion";
import CTABanner from "@/components/marketing/CTABanner";
import { JsonLd, faqJsonLd } from "@/lib/structured-data";

export const metadata: Metadata = {
  title: "Compare Dog GPS Trackers",
  description:
    "Compare Leashline to Fi, Halo, Whistle, and Tractive. See how LoRa tracking stacks up against cellular GPS dog trackers on cost, range, and features.",
  openGraph: {
    title: "Dog GPS Tracker Comparison | Leashline vs Fi, Halo, Whistle, Tractive",
    description:
      "Side-by-side comparison of dog GPS trackers. LoRa vs cellular — cost, range, subscriptions, and more.",
  },
  alternates: { canonical: "/compare" },
};

const faqItems = [
  {
    question: "Why doesn't Leashline use cellular like other trackers?",
    answer:
      "Cellular trackers depend on cell towers, which means dead zones in rural areas, forests, and mountains — exactly where dogs are most likely to escape. LoRa radio works independently of cell infrastructure, providing miles of range without coverage gaps or monthly fees.",
  },
  {
    question: "Is LoRa range really comparable to cellular?",
    answer:
      "For dog tracking, yes. LoRa reaches 1–5+ miles depending on terrain, which covers your property and surrounding area. Cellular has \"unlimited\" range in theory, but in practice it fails in rural areas and wilderness. LoRa works exactly where you need it.",
  },
  {
    question: "What's the catch with no subscription?",
    answer:
      "There's no catch. Cellular trackers need subscriptions to pay for their SIM cards and data plans. Leashline uses LoRa radio — no SIM card, no cellular data, so no recurring cost. The software is free and the hardware is a one-time purchase.",
  },
  {
    question: "Can I switch from another tracker to Leashline?",
    answer:
      "Yes. You'll need Meshtastic-compatible LoRa hardware (a GPS collar tracker and a base station hub). The Leashline app is free to use — just create an account and set up your geofences.",
  },
];

export default function ComparePage() {
  return (
    <>
      <JsonLd data={faqJsonLd(faqItems)} />
      <section className="bg-gradient-to-b from-blue-50 to-white py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <Breadcrumbs items={[{ name: "Home", href: "/" }, { name: "Compare", href: "/compare" }]} />
          <h1 className="mt-6 text-4xl font-extrabold text-gray-900 tracking-tight">
            Dog GPS Tracker Comparison
          </h1>
          <p className="mt-4 text-lg text-gray-600 max-w-2xl">
            Most dog GPS trackers rely on cellular networks — meaning monthly subscriptions, dead zones in rural areas, and vendor lock-in. Leashline takes a different approach with LoRa radio: miles of range, no cell coverage needed, and zero recurring fees.
          </p>
        </div>
      </section>

      <section className="py-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-8">Full Comparison</h2>
          <ComparisonTable competitors={competitors} />
        </div>
      </section>

      <section className="py-16 bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-8">Head-to-Head Comparisons</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {competitors.map((c) => (
              <Link
                key={c.slug}
                href={`/compare/vs-${c.slug}`}
                className="block rounded-xl border border-gray-200 bg-white p-6 hover:border-blue-200 hover:shadow-sm transition-all"
              >
                <h3 className="text-lg font-semibold text-gray-900">
                  Leashline vs {c.name}
                </h3>
                <p className="mt-2 text-sm text-gray-600">{c.tagline}</p>
                <p className="mt-3 text-sm text-blue-600 font-medium">
                  See comparison →
                </p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-8">Frequently Asked Questions</h2>
          <FAQAccordion items={faqItems} />
        </div>
      </section>

      <CTABanner />
    </>
  );
}
