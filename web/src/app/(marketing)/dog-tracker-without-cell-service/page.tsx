import type { Metadata } from "next";
import Link from "next/link";
import { competitors, leashline } from "@/lib/competitors";
import Breadcrumbs from "@/components/marketing/Breadcrumbs";
import FAQAccordion from "@/components/marketing/FAQAccordion";
import CTABanner from "@/components/marketing/CTABanner";
import { JsonLd, faqJsonLd } from "@/lib/structured-data";

export const metadata: Metadata = {
  title: "Dog GPS Tracker Without Cell Service",
  description:
    "Track your dog without cell service. Leashline uses LoRa radio for 1–5+ miles of range in rural areas, forests, and mountains — no cell towers needed.",
  openGraph: {
    title: "Dog Tracker Without Cell Service | Leashline",
    description:
      "LoRa radio tracking for dogs. Works in rural areas, forests, and mountains where cellular trackers fail. 1–5+ miles of range, zero dead zones.",
  },
  alternates: { canonical: "/dog-tracker-without-cell-service" },
};

const faqItems = [
  {
    question: "How far does LoRa reach without cell service?",
    answer:
      "LoRa typically reaches 1–5+ miles depending on terrain. Open fields and hilltops give the best range (3–5+ miles). Forests and valleys reduce range to 1–2 miles. Even in worst-case terrain, LoRa outperforms cellular in areas without towers.",
  },
  {
    question: "Does Leashline work completely offline?",
    answer:
      "The collar-to-hub radio link works without any internet. However, to receive alerts on your phone, the hub needs internet access — either through home WiFi (for the stationary hub) or your phone's data (for the mobile BLE hub). The key difference is that only the hub needs internet, not the collar.",
  },
  {
    question: "What about Bluetooth trackers like AirTag?",
    answer:
      "AirTags and Tile trackers use Bluetooth with a crowdsourced network — they only work when another iPhone or Tile user is nearby. In rural areas with few people, they're essentially useless for finding a lost dog. LoRa provides direct, dedicated range without depending on strangers.",
  },
  {
    question: "Can I use this for hiking and camping?",
    answer:
      "Yes. Use a BLE-capable hub (like the RAK WisMesh Pocket) paired with the Meshtastic app on your phone. The hub receives LoRa signals from the collar and bridges them through your phone to the cloud. Your phone's data connection handles the internet side.",
  },
  {
    question: "What if my dog goes beyond LoRa range?",
    answer:
      "Leashline is designed as an escape detection system — it alerts you the moment your dog crosses a geofence boundary, when they're still nearby and recoverable. The goal is catching escapes early, not tracking a dog across the state.",
  },
];

export default function NoCellServicePage() {
  return (
    <>
      <JsonLd data={faqJsonLd(faqItems)} />
      <section className="bg-gradient-to-b from-blue-50 to-white py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <Breadcrumbs
            items={[
              { name: "Home", href: "/" },
              { name: "Dog Tracker Without Cell Service", href: "/dog-tracker-without-cell-service" },
            ]}
          />
          <h1 className="mt-6 text-4xl font-extrabold text-gray-900 tracking-tight">
            Dog GPS Tracker Without Cell Service
          </h1>
          <p className="mt-4 text-lg text-gray-600 max-w-2xl">
            Cellular dog trackers stop working when cell coverage drops. In rural areas, forests, mountains, and campgrounds — exactly where dogs are most likely to escape — they go silent. Leashline uses LoRa radio instead.
          </p>
        </div>
      </section>

      <section className="py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">The Dead Zone Problem</h2>
          <p className="text-gray-600 mb-6">
            If you live on a rural property, camp in national forests, hike mountain trails, or visit dog parks in valleys — you&apos;ve likely experienced cellular dead zones. That&apos;s where every mainstream dog GPS tracker fails.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {[
              { title: "Rural homesteads", desc: "Farms and acreage outside cell tower range" },
              { title: "Hiking trails", desc: "Mountain paths and forest corridors" },
              { title: "Camping and cabins", desc: "Remote campgrounds and off-grid properties" },
              { title: "Valleys and hollows", desc: "Terrain that blocks cell signals" },
            ].map((item) => (
              <div key={item.title} className="p-5 rounded-xl border border-gray-200 bg-white">
                <h3 className="font-semibold text-gray-900">{item.title}</h3>
                <p className="mt-1 text-sm text-gray-600">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">How LoRa Works</h2>
          <p className="text-gray-600 mb-6">
            LoRa (Long Range) is a radio protocol designed for small data over long distances. Think of it like a smart walkie-talkie: your dog&apos;s collar transmits GPS coordinates over radio directly to your base station. No cell towers, no WiFi, no intermediaries.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
            <div className="text-center p-6 bg-white rounded-xl border border-gray-200">
              <div className="text-3xl mb-2">📡</div>
              <div className="font-semibold text-gray-900">Direct Radio</div>
              <p className="mt-1 text-sm text-gray-500">Collar broadcasts directly to your base station — no towers needed</p>
            </div>
            <div className="text-center p-6 bg-white rounded-xl border border-gray-200">
              <div className="text-3xl mb-2">🏔️</div>
              <div className="font-semibold text-gray-900">1–5+ Miles</div>
              <p className="mt-1 text-sm text-gray-500">Works across varied terrain — forests, hills, open fields</p>
            </div>
            <div className="text-center p-6 bg-white rounded-xl border border-gray-200">
              <div className="text-3xl mb-2">🔋</div>
              <div className="font-semibold text-gray-900">Low Power</div>
              <p className="mt-1 text-sm text-gray-500">Uses a fraction of cellular power — days of battery life</p>
            </div>
          </div>
        </div>
      </section>

      <section className="py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Range Comparison</h2>
          <div className="overflow-x-auto -mx-4 sm:mx-0">
            <table className="w-full text-sm border-collapse min-w-[500px]">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="py-3 px-3 text-left font-medium text-gray-500">Tracker</th>
                  <th className="py-3 px-3 text-center font-medium text-gray-500">Technology</th>
                  <th className="py-3 px-3 text-center font-medium text-gray-500">Range</th>
                  <th className="py-3 px-3 text-center font-medium text-gray-500">Cell Required</th>
                </tr>
              </thead>
              <tbody>
                {[leashline, ...competitors].map((c) => (
                  <tr key={c.slug} className={`border-b border-gray-100 ${c.slug === "leashline" ? "bg-blue-50" : ""}`}>
                    <td className={`py-3 px-3 font-medium ${c.slug === "leashline" ? "text-blue-900" : "text-gray-900"}`}>{c.name}</td>
                    <td className="py-3 px-3 text-center text-gray-600 capitalize">{c.technology}</td>
                    <td className="py-3 px-3 text-center text-gray-600">{c.range}</td>
                    <td className="py-3 px-3 text-center">
                      <span className={c.cellRequired ? "text-red-500" : "text-green-600"}>
                        {c.cellRequired ? "Yes" : "No"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="py-16 bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Use Cases</h2>
          <div className="space-y-6">
            <div>
              <h3 className="font-semibold text-gray-900">Rural Homestead</h3>
              <p className="mt-1 text-gray-600">
                Place the WiFi hub in your house. It receives LoRa signals from the collar across your property — fenced yard, pasture, barn. Draw polygon geofences around your actual fence lines and get alerts instantly if your dog crosses them.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Hiking and Trail Running</h3>
              <p className="mt-1 text-gray-600">
                Carry a BLE hub in your pack. Set a circular zone around your position or draw a zone around the trailhead area. If your off-leash dog wanders too far, you&apos;ll know immediately.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Camping</h3>
              <p className="mt-1 text-gray-600">
                Set up the hub at your campsite and draw a geofence around the campground. Your dog can roam freely within the zone, and you get an alert if they head toward the road or into the woods.
              </p>
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
          <Link href="/no-subscription-dog-tracker" className="text-blue-600 hover:text-blue-800 transition-colors">No subscription dog tracker →</Link>
          <Link href="/how-it-works" className="text-blue-600 hover:text-blue-800 transition-colors">How it works →</Link>
        </div>
      </section>

      <CTABanner />
    </>
  );
}
