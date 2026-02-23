import type { Metadata } from "next";
import Link from "next/link";
import AuthHeroCTA from "@/components/AuthHeroCTA";
import FeatureHighlight from "@/components/marketing/FeatureHighlight";
import FAQAccordion from "@/components/marketing/FAQAccordion";
import { JsonLd, softwareAppJsonLd, faqJsonLd, productJsonLd } from "@/lib/structured-data";

export const metadata: Metadata = {
  title: "Leashline | Dog Escape Detection — No Cell, No Subscription",
  description:
    "Real-time dog escape detection using LoRa radio tracking and smart geofencing. Miles of range, no cell coverage needed, no monthly fees. Get instant alerts when your dog leaves their safe zone.",
  openGraph: {
    title: "Leashline | Dog Escape Detection",
    description:
      "LoRa radio dog tracking with smart geofencing. No cell service, no subscriptions. Instant escape alerts.",
    type: "website",
  },
  alternates: { canonical: "/" },
};

const faqItems = [
  {
    question: "What is LoRa and why is it better than cellular for dog tracking?",
    answer:
      "LoRa (Long Range) is a radio technology that sends data over miles without cell towers. Unlike cellular trackers that fail in rural areas and require monthly subscriptions, LoRa works everywhere within range and has no recurring costs.",
  },
  {
    question: "What hardware do I need?",
    answer:
      "A LoRa GPS tracker collar (like the Spec5 Trace, ~$40–50) and a base station hub (like the Heltec WiFi LoRa 32, ~$20–30). Both use the open Meshtastic ecosystem — no proprietary lock-in.",
  },
  {
    question: "Is there really no monthly fee?",
    answer:
      "Really. Cellular trackers charge subscriptions because each device needs a SIM card and data plan. Leashline uses LoRa radio — no SIM, no carrier, no fee. The software is free and open source, the hardware is a one-time purchase.",
  },
  {
    question: "How far does the tracking range go?",
    answer:
      "LoRa reaches 1–5+ miles depending on terrain. Open areas give the best range; forests and hills reduce it. This covers your property and surrounding area — designed to catch escapes early while your dog is still nearby.",
  },
  {
    question: "Can I track multiple dogs?",
    answer:
      "Yes. Add multiple LoRa collars and track them all on one map. Each dog gets independent geofences and alerts. You can also invite family members to share your pack.",
  },
];

export default function LandingPage() {
  return (
    <>
      <JsonLd data={softwareAppJsonLd()} />
      <JsonLd data={productJsonLd()} />
      <JsonLd data={faqJsonLd(faqItems)} />

      {/* Hero */}
      <section className="bg-gradient-to-b from-blue-50 to-white py-20 sm:py-28">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl sm:text-5xl font-extrabold text-gray-900 tracking-tight">
            Never lose sight of your dog
          </h1>
          <p className="mt-6 text-lg sm:text-xl text-gray-600 max-w-2xl mx-auto">
            LoRa radio tracking with smart geofencing gives you instant escape
            alerts — miles of range, no cell coverage needed, no monthly fees.
          </p>
          <AuthHeroCTA />
          <Link
            href="/how-it-works"
            className="mt-4 inline-block text-sm text-blue-600 hover:text-blue-800 transition-colors"
          >
            See how it works →
          </Link>
        </div>
      </section>

      {/* Problem statement */}
      <section className="py-16 border-b border-gray-100">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-2xl sm:text-3xl font-bold text-gray-900">
            Cell-based trackers fail when you need them most
          </p>
          <p className="mt-4 text-gray-600">
            Rural properties, hiking trails, campgrounds, mountain cabins — the places where dogs are most likely to escape are the same places where cellular coverage drops. And you&apos;re still paying $5–13/month for the privilege.
          </p>
        </div>
      </section>

      {/* Key differentiators */}
      <section className="py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
            <Link href="/dog-tracker-without-cell-service" className="block text-center p-8 rounded-2xl border-2 border-gray-200 hover:border-blue-200 hover:shadow-md transition-all">
              <div className="text-4xl mb-4">📡</div>
              <h3 className="text-xl font-bold text-gray-900">No Cell Service Needed</h3>
              <p className="mt-3 text-gray-600">
                LoRa radio works independently of cell towers. 1–5+ miles of range in rural areas, forests, and mountains.
              </p>
            </Link>
            <Link href="/no-subscription-dog-tracker" className="block text-center p-8 rounded-2xl border-2 border-gray-200 hover:border-blue-200 hover:shadow-md transition-all">
              <div className="text-4xl mb-4">💰</div>
              <h3 className="text-xl font-bold text-gray-900">No Monthly Fees</h3>
              <p className="mt-3 text-gray-600">
                Free software, open hardware. No SIM card, no data plan, no subscription. One-time hardware cost, forever.
              </p>
            </Link>
            <Link href="/how-it-works" className="block text-center p-8 rounded-2xl border-2 border-gray-200 hover:border-blue-200 hover:shadow-md transition-all">
              <div className="text-4xl mb-4">🏔️</div>
              <h3 className="text-xl font-bold text-gray-900">Miles of Range</h3>
              <p className="mt-3 text-gray-600">
                1–5+ miles depending on terrain. Direct radio link — no dead zones, no coverage gaps.
              </p>
            </Link>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-gray-900 text-center">
            How it works
          </h2>
          <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                num: "1",
                title: "Attach the collar",
                desc: "Clip a lightweight LoRa GPS tracker to your dog's collar. It broadcasts location over radio — no SIM card or subscription.",
              },
              {
                num: "2",
                title: "Set up geofences",
                desc: "Draw custom polygon safe zones on the map — your yard, a park, a campsite. Leashline watches the boundaries for you.",
              },
              {
                num: "3",
                title: "Get instant alerts",
                desc: "The moment your dog leaves a safe zone, you get a push notification with their live location on the map.",
              },
            ].map((step, i) => (
              <div key={step.num} className="relative text-center">
                {i > 0 && (
                  <div className="hidden md:block absolute -left-4 top-5 w-8 border-t-2 border-dashed border-gray-300" />
                )}
                <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center text-lg font-bold mx-auto">
                  {step.num}
                </div>
                <h3 className="mt-4 text-lg font-semibold text-gray-900">{step.title}</h3>
                <p className="mt-2 text-sm text-gray-600">{step.desc}</p>
              </div>
            ))}
          </div>
          <div className="mt-10 text-center">
            <Link href="/how-it-works" className="text-sm text-blue-600 hover:text-blue-800 transition-colors">
              Learn more about how it works →
            </Link>
          </div>
        </div>
      </section>

      {/* Open source + beta */}
      <section className="py-16">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-6">
            Open source. Built in the open.
          </h2>
          <p className="text-gray-600 mb-6">
            Leashline is fully open source — the software, the detection algorithms, everything. No black boxes, no vendor lock-in. Built on the open Meshtastic ecosystem with off-the-shelf LoRa hardware.
          </p>
          <p className="text-gray-600 mb-8">
            We&apos;re in <span className="font-semibold text-gray-900">early beta</span> and actively looking for dog owners, tinkerers, and contributors who want to help build something better than the subscription-based status quo.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="https://github.com/zgazak/leashline"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 text-base font-medium text-gray-900 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
              </svg>
              View on GitHub
            </a>
            <Link
              href="/compare"
              className="inline-flex items-center justify-center px-6 py-3 text-base font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
            >
              Compare to other trackers
            </Link>
          </div>
        </div>
      </section>

      {/* Feature grid */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-gray-900 text-center mb-10">
            Everything you need to keep your dogs safe
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            <FeatureHighlight
              icon="📡"
              title="LoRa Radio"
              description="Miles of range on unlicensed frequencies. No cell towers, no SIM, no dead zones."
              href="/dog-tracker-without-cell-service"
            />
            <FeatureHighlight
              icon="🗺️"
              title="Smart Geofencing"
              description="Draw custom polygon safe zones. Get alerts the moment a boundary is crossed."
              href="/how-it-works"
            />
            <FeatureHighlight
              icon="⚡"
              title="Real-Time Alerts"
              description="Instant push notifications and live map updates. Know within seconds."
            />
            <FeatureHighlight
              icon="🐾"
              title="Multi-Dog"
              description="Track your whole pack. Each dog gets independent geofences and alerts."
            />
            <FeatureHighlight
              icon="👥"
              title="Multi-User Packs"
              description="Invite family members. Everyone gets real-time alerts and a shared map."
            />
            <FeatureHighlight
              icon="🔓"
              title="100% Open Source"
              description="Software and algorithms are open source on GitHub. Built on the open Meshtastic ecosystem."
              href="https://github.com/zgazak/leashline"
            />
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-16">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-gray-900 text-center mb-10">
            Frequently asked questions
          </h2>
          <FAQAccordion items={faqItems} />
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-gradient-to-b from-white to-blue-50">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-gray-900">
            We&apos;re building this in the open
          </h2>
          <p className="mt-4 text-gray-600">
            Leashline is in early beta. We&apos;re looking for dog owners, Meshtastic tinkerers, and anyone tired of subscription trackers to join the ride. Free and open source — no credit card, no catch.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/sign-up"
              className="inline-flex items-center justify-center px-6 py-3 text-base font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Join the Beta
            </Link>
            <a
              href="https://github.com/zgazak/leashline"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 text-base font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
              </svg>
              Star on GitHub
            </a>
          </div>
        </div>
      </section>
    </>
  );
}
