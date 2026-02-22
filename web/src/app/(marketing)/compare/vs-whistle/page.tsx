import type { Metadata } from "next";
import Link from "next/link";
import { competitors } from "@/lib/competitors";
import Breadcrumbs from "@/components/marketing/Breadcrumbs";
import ComparisonTable from "@/components/marketing/ComparisonTable";
import FeatureHighlight from "@/components/marketing/FeatureHighlight";
import FAQAccordion from "@/components/marketing/FAQAccordion";
import CTABanner from "@/components/marketing/CTABanner";

const whistle = competitors.find((c) => c.slug === "whistle")!;

export const metadata: Metadata = {
  title: "Leashline vs Whistle Dog GPS Tracker",
  description:
    "Compare Leashline to Whistle GPS dog tracker. No subscription LoRa tracking vs Whistle's $8–13/month cellular plan. Which saves you more?",
  openGraph: {
    title: "Leashline vs Whistle | Dog GPS Tracker Comparison",
    description:
      "Whistle charges $8–13/month on top of hardware costs. Leashline uses LoRa radio with zero monthly fees.",
  },
};

const faqItems = [
  {
    question: "Does Whistle work without a subscription?",
    answer:
      "No. Whistle requires an active cellular subscription for GPS tracking. Without the subscription, the device can only track basic activity like steps — no location tracking or escape alerts.",
  },
  {
    question: "Does Leashline offer health monitoring like Whistle?",
    answer:
      "No. Leashline focuses on escape detection and location tracking. Whistle includes activity and health monitoring (calories, rest, scratching). If health tracking is your primary need, Whistle may be better. For escape detection without recurring costs, Leashline wins.",
  },
  {
    question: "How much does Whistle cost over 3 years?",
    answer:
      "Whistle hardware runs $70–130, plus $8–13/month for the subscription. Over 3 years: $358–598 total. Leashline: $50–80 once, forever. You save $280–520.",
  },
  {
    question: "Which is better for rural properties?",
    answer:
      "Leashline. Whistle relies on cellular coverage, which is spotty or nonexistent in many rural areas. Leashline's LoRa radio provides 1–5+ miles of range without any cellular infrastructure.",
  },
];

export default function VsWhistlePage() {
  return (
    <>
      <section className="bg-gradient-to-b from-blue-50 to-white py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <Breadcrumbs
            items={[
              { name: "Home", href: "/" },
              { name: "Compare", href: "/compare" },
              { name: "vs Whistle", href: "/compare/vs-whistle" },
            ]}
          />
          <h1 className="mt-6 text-4xl font-extrabold text-gray-900 tracking-tight">
            Leashline vs Whistle GPS Tracker
          </h1>
          <p className="mt-4 text-lg text-gray-600 max-w-2xl">
            Whistle is a well-known cellular GPS tracker with health monitoring. But at $8–13/month with mandatory subscription, those fees add up. Leashline provides escape detection with zero recurring costs.
          </p>
        </div>
      </section>

      <section className="py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-8">Side-by-Side</h2>
          <ComparisonTable competitors={[whistle]} />
        </div>
      </section>

      <section className="py-16 bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-8">Key Differences</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <FeatureHighlight
              icon="💰"
              title="No Monthly Fees"
              description="Whistle charges $8–13/month for cellular service. Leashline uses LoRa radio — no SIM card, no data plan, no subscription."
            />
            <FeatureHighlight
              icon="📡"
              title="Works Without Cell Service"
              description="Whistle goes silent in areas without cell coverage. Leashline's LoRa radio works independently, providing reliable tracking in rural and wilderness areas."
            />
            <FeatureHighlight
              icon="🗺️"
              title="Polygon Geofences"
              description="Whistle only supports circular safe zones. Leashline lets you draw custom polygon boundaries that match your actual property lines."
            />
            <FeatureHighlight
              icon="🔓"
              title="Open Hardware"
              description="Whistle locks you into their proprietary device. Leashline works with any Meshtastic-compatible LoRa hardware."
            />
          </div>
        </div>
      </section>

      <section className="py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            The Subscription Trap
          </h2>
          <p className="text-gray-600 mb-4">
            Whistle&apos;s pricing looks reasonable at first — $70–130 for the device. But the $8–13/month subscription is mandatory for GPS tracking. Cancel it, and you lose location tracking entirely.
          </p>
          <p className="text-gray-600">
            Over the life of a dog, those subscriptions add up to hundreds of dollars. Leashline eliminates this entirely by using LoRa radio instead of cellular networks. One-time hardware cost, free software, forever.
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
            {competitors.filter((c) => c.slug !== "whistle").map((c) => (
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
