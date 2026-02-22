import type { Metadata } from "next";
import Link from "next/link";
import { competitors, leashline, totalCost } from "@/lib/competitors";
import Breadcrumbs from "@/components/marketing/Breadcrumbs";
import FAQAccordion from "@/components/marketing/FAQAccordion";
import CTABanner from "@/components/marketing/CTABanner";

export const metadata: Metadata = {
  title: "No Subscription Dog GPS Tracker",
  description:
    "Leashline is a dog GPS tracker with no monthly fees. LoRa radio tracking eliminates the need for cellular subscriptions. One-time hardware cost, free software forever.",
  openGraph: {
    title: "No Subscription Dog Tracker | Leashline",
    description:
      "Stop paying monthly fees for dog tracking. Leashline uses LoRa radio — no cell plan, no SIM card, no subscription. Ever.",
  },
};

const faqItems = [
  {
    question: "Why do other dog trackers require subscriptions?",
    answer:
      "Most dog GPS trackers use cellular (LTE) networks to transmit location data. Each device needs a SIM card and a cellular data plan, which the manufacturer passes on as a monthly or annual subscription fee.",
  },
  {
    question: "How does Leashline avoid subscriptions?",
    answer:
      "Leashline uses LoRa radio instead of cellular. LoRa transmits data over unlicensed radio frequencies directly to your base station — no SIM card, no cellular data plan, no middleman charging monthly fees.",
  },
  {
    question: "Is the software really free?",
    answer:
      "Yes. The Leashline web app is completely free. You provide your own LoRa hardware (a GPS collar tracker and base station hub), and the software handles the rest — geofencing, escape detection, and real-time alerts.",
  },
  {
    question: "What hardware do I need to buy?",
    answer:
      "A Meshtastic-compatible LoRa GPS tracker for the collar (like the Spec5 Trace, ~$40–50) and a WiFi or BLE base station hub (like the Heltec WiFi LoRa 32, ~$20–30). Total one-time cost: roughly $50–80.",
  },
  {
    question: "Are there any hidden fees?",
    answer:
      "No. No subscription, no premium tiers, no in-app purchases. The only cost is the LoRa hardware, which you buy once.",
  },
];

function CostRow({ name, y1, y2, y3, highlight }: { name: string; y1: string; y2: string; y3: string; highlight?: boolean }) {
  const cls = highlight ? "bg-blue-50 font-medium" : "";
  return (
    <tr className="border-b border-gray-100">
      <td className={`py-3 px-3 font-medium text-gray-900 ${cls}`}>{name}</td>
      <td className={`py-3 px-3 text-center ${cls}`}>{y1}</td>
      <td className={`py-3 px-3 text-center ${cls}`}>{y2}</td>
      <td className={`py-3 px-3 text-center ${cls}`}>{y3}</td>
    </tr>
  );
}

export default function NoSubscriptionPage() {
  return (
    <>
      <section className="bg-gradient-to-b from-blue-50 to-white py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <Breadcrumbs
            items={[
              { name: "Home", href: "/" },
              { name: "No Subscription Dog Tracker", href: "/no-subscription-dog-tracker" },
            ]}
          />
          <h1 className="mt-6 text-4xl font-extrabold text-gray-900 tracking-tight">
            Dog GPS Tracker — No Monthly Fee
          </h1>
          <p className="mt-4 text-lg text-gray-600 max-w-2xl">
            Every major dog GPS tracker charges a monthly subscription for cellular service. Leashline doesn&apos;t use cellular at all — LoRa radio means one-time hardware cost and free software. Forever.
          </p>
        </div>
      </section>

      <section className="py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">The Subscription Trap</h2>
          <p className="text-gray-600 mb-6">
            Dog tracker subscriptions look small — $5, $8, $13 a month. But they never stop. Over the life of a dog, you&apos;ll pay hundreds or thousands in recurring fees for the privilege of using hardware you already bought.
          </p>

          <div className="overflow-x-auto -mx-4 sm:mx-0">
            <table className="w-full text-sm border-collapse min-w-[500px]">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="py-3 px-3 text-left font-medium text-gray-500">Tracker</th>
                  <th className="py-3 px-3 text-center font-medium text-gray-500">1 Year</th>
                  <th className="py-3 px-3 text-center font-medium text-gray-500">2 Years</th>
                  <th className="py-3 px-3 text-center font-medium text-gray-500">3 Years</th>
                </tr>
              </thead>
              <tbody>
                <CostRow
                  name="Leashline"
                  y1={`$${totalCost(leashline, 1)?.total ?? "50–80"}`}
                  y2={`$${totalCost(leashline, 2)?.total ?? "50–80"}`}
                  y3={`$${totalCost(leashline, 3)?.total ?? "50–80"}`}
                  highlight
                />
                {competitors.map((c) => {
                  const c1 = totalCost(c, 1);
                  const c2 = totalCost(c, 2);
                  const c3 = totalCost(c, 3);
                  return (
                    <CostRow
                      key={c.slug}
                      name={c.name}
                      y1={c1 ? `$${c1.total}` : "—"}
                      y2={c2 ? `$${c2.total}` : "—"}
                      y3={c3 ? `$${c3.total}` : "—"}
                    />
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="py-16 bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">How LoRa Eliminates Subscriptions</h2>
          <p className="text-gray-600 mb-6">
            The reason cellular trackers charge subscriptions is simple: each device has a SIM card that uses a cellular data plan. The manufacturer pays the carrier, and you pay the manufacturer. Every month, forever.
          </p>
          <p className="text-gray-600 mb-6">
            Leashline uses LoRa (Long Range) radio instead. LoRa transmits data over unlicensed radio frequencies — the same way a walkie-talkie works. Your dog&apos;s collar broadcasts its GPS position directly to your base station. No SIM card. No carrier. No data plan. No middleman.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mt-8">
            <div className="text-center p-6 bg-white rounded-xl border border-gray-200">
              <div className="text-3xl mb-2">📡</div>
              <div className="font-semibold text-gray-900">No SIM Card</div>
              <p className="mt-1 text-sm text-gray-500">LoRa uses unlicensed radio — no cellular hardware needed</p>
            </div>
            <div className="text-center p-6 bg-white rounded-xl border border-gray-200">
              <div className="text-3xl mb-2">💸</div>
              <div className="font-semibold text-gray-900">No Data Plan</div>
              <p className="mt-1 text-sm text-gray-500">Direct radio to your base station — no carrier fees</p>
            </div>
            <div className="text-center p-6 bg-white rounded-xl border border-gray-200">
              <div className="text-3xl mb-2">♾️</div>
              <div className="font-semibold text-gray-900">Free Forever</div>
              <p className="mt-1 text-sm text-gray-500">One-time hardware cost, free software, no recurring fees</p>
            </div>
          </div>
        </div>
      </section>

      <section className="py-16">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-8">Frequently Asked Questions</h2>
          <FAQAccordion items={faqItems} />
        </div>
      </section>

      <section className="py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-wrap gap-4 text-sm">
          <Link href="/compare" className="text-blue-600 hover:text-blue-800 transition-colors">Compare all trackers →</Link>
          <Link href="/dog-tracker-without-cell-service" className="text-blue-600 hover:text-blue-800 transition-colors">Dog tracker without cell service →</Link>
          <Link href="/how-it-works" className="text-blue-600 hover:text-blue-800 transition-colors">How it works →</Link>
        </div>
      </section>

      <CTABanner />
    </>
  );
}
