import type { Metadata } from "next";
import Breadcrumbs from "@/components/marketing/Breadcrumbs";
import FeatureHighlight from "@/components/marketing/FeatureHighlight";
import FAQAccordion from "@/components/marketing/FAQAccordion";
import CTABanner from "@/components/marketing/CTABanner";
import { JsonLd, faqJsonLd } from "@/lib/structured-data";

export const metadata: Metadata = {
  title: "How It Works",
  description:
    "Learn how Leashline uses LoRa radio tracking and smart geofencing to detect dog escapes in real time — no cell service or subscriptions needed.",
  openGraph: {
    title: "How Leashline Works | LoRa Dog Tracking",
    description:
      "GPS collar broadcasts over LoRa radio to a base station hub, which sends alerts to your phone. Miles of range, no cellular required.",
  },
  alternates: { canonical: "/how-it-works" },
};

const faqItems = [
  {
    question: "What is LoRa and how is it different from cellular?",
    answer:
      "LoRa (Long Range) is a radio technology that sends small data packets over miles without cell towers or WiFi. It uses unlicensed radio frequencies, so there's no SIM card and no monthly bill. It works in rural areas, forests, and anywhere cellular fails.",
  },
  {
    question: "What hardware do I need?",
    answer:
      "A LoRa GPS tracker collar (like the Spec5 Trace) and a base station hub (like the Heltec WiFi LoRa 32). The collar broadcasts GPS over LoRa, and the hub relays it to Leashline over WiFi. Leashline uses the open Meshtastic ecosystem — you can use any compatible device.",
  },
  {
    question: "How far does the signal reach?",
    answer:
      "LoRa can reach 1–5+ miles depending on terrain and obstacles. Line of sight gives the best range. In hilly or forested areas you may get 1–2 miles, while open terrain can reach 5+ miles.",
  },
  {
    question: "Can I use this while hiking or camping?",
    answer:
      "Yes. For mobile use, pair a BLE-capable hub (like the RAK WisMesh Pocket) with the Meshtastic app on your phone. It bridges LoRa traffic to the cloud over your phone's connection.",
  },
  {
    question: "Is there a monthly fee?",
    answer:
      "No. Leashline software is free. You just provide your own LoRa hardware. There's no cellular plan because the system doesn't use cell networks.",
  },
];

export default function HowItWorksPage() {
  return (
    <>
      <JsonLd data={faqJsonLd(faqItems)} />
      <section className="bg-gradient-to-b from-blue-50 to-white py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <Breadcrumbs items={[{ name: "Home", href: "/" }, { name: "How It Works", href: "/how-it-works" }]} />
          <h1 className="mt-6 text-4xl font-extrabold text-gray-900 tracking-tight">
            How Leashline Works
          </h1>
          <p className="mt-4 text-lg text-gray-600 max-w-2xl">
            A lightweight GPS collar, a base station, and smart software. No cell towers, no subscriptions, no dead zones.
          </p>
        </div>
      </section>

      {/* System overview */}
      <section className="py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-gray-900">System Overview</h2>
          <div className="mt-8 flex flex-col md:flex-row items-center gap-4 text-center text-sm">
            {[
              { label: "GPS Collar", icon: "📡", desc: "Broadcasts location over LoRa" },
              { label: "Base Station", icon: "🏠", desc: "Receives LoRa, relays via WiFi" },
              { label: "Leashline Cloud", icon: "☁️", desc: "Runs detection algorithms" },
              { label: "Your Phone", icon: "📱", desc: "Real-time alerts & live map" },
            ].map((step, i) => (
              <div key={step.label} className="flex items-center gap-4">
                {i > 0 && <span className="hidden md:block text-2xl text-gray-300">→</span>}
                <div className="bg-white rounded-xl border border-gray-200 p-6 w-44">
                  <div className="text-3xl mb-2">{step.icon}</div>
                  <div className="font-semibold text-gray-900">{step.label}</div>
                  <div className="mt-1 text-gray-500">{step.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Sections */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">The GPS Collar</h2>
            <p className="mt-4 text-gray-600">
              Your dog wears a small LoRa GPS tracker that broadcasts its location over radio every few seconds. It uses the Meshtastic protocol on unlicensed frequencies — no SIM card, no cellular plan, no subscription. The tracker is lightweight, waterproof, and lasts days on a single charge.
            </p>
          </div>

          <div>
            <h2 className="text-2xl font-bold text-gray-900">The Base Station</h2>
            <p className="mt-4 text-gray-600">
              At home, a WiFi hub (like the Heltec WiFi LoRa 32) receives LoRa packets and relays them to the Leashline cloud over your WiFi. For mobile use — hiking, camping, dog parks — a BLE hub bridges traffic through the Meshtastic app on your phone. Both publish to the same cloud endpoint, so your experience is seamless.
            </p>
          </div>

          <div>
            <h2 className="text-2xl font-bold text-gray-900">Smart Geofencing</h2>
            <p className="mt-4 text-gray-600">
              Draw custom polygon safe zones on the map — your yard, a park, a campsite. Unlike circular geofences used by most trackers, polygon zones let you trace the exact boundary of a fence line, property edge, or trail. Leashline continuously evaluates your dog&apos;s position against these zones and detects crossings in real time.
            </p>
          </div>

          <div>
            <h2 className="text-2xl font-bold text-gray-900">Real-Time Alerts</h2>
            <p className="mt-4 text-gray-600">
              The moment your dog crosses a geofence boundary, Leashline sends you a push notification and streams live updates to the map. The detection engine uses multiple signals — boundary proximity, motion patterns, and position coherence — to minimize false alarms while catching real escapes fast.
            </p>
          </div>

          <div>
            <h2 className="text-2xl font-bold text-gray-900">Multi-Dog Packs</h2>
            <p className="mt-4 text-gray-600">
              Track multiple dogs on one map with independent geofences and alerts for each. Invite family members to your pack so everyone gets alerts. All users in a pack share the same real-time view.
            </p>
          </div>

          <div>
            <h2 className="text-2xl font-bold text-gray-900">Compatible Hardware</h2>
            <p className="mt-4 text-gray-600">
              Leashline is built on the open Meshtastic ecosystem. Any Meshtastic-compatible LoRa device with GPS works as a collar tracker, and any Meshtastic device with WiFi or BLE works as a hub. You&apos;re not locked into proprietary hardware — bring your own devices or build your own.
            </p>
          </div>
        </div>
      </section>

      {/* Feature highlights */}
      <section className="py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <FeatureHighlight
              icon="📡"
              title="LoRa Radio"
              description="Miles of range on unlicensed radio frequencies. No cell towers, no SIM, no dead zones."
              href="/dog-tracker-without-cell-service"
            />
            <FeatureHighlight
              icon="💰"
              title="Zero Subscriptions"
              description="Free software, open hardware. No monthly fees ever."
              href="/no-subscription-dog-tracker"
            />
            <FeatureHighlight
              icon="🗺️"
              title="Custom Geofences"
              description="Draw polygon zones that match real boundaries — not just circles on a map."
            />
            <FeatureHighlight
              icon="👥"
              title="Multi-User Packs"
              description="Invite family members to share real-time tracking and alerts."
            />
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-8">Frequently Asked Questions</h2>
          <FAQAccordion items={faqItems} />
        </div>
      </section>

      <CTABanner />
    </>
  );
}
