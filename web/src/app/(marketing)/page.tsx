import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Leashline | Dog Escape Detection",
  description:
    "Real-time dog escape detection using LoRa radio tracking and smart geofencing. Get instant alerts when your dog leaves their safe zone — no cell coverage needed.",
  openGraph: {
    title: "Leashline | Dog Escape Detection",
    description:
      "Real-time dog escape detection using LoRa radio tracking and smart geofencing.",
    type: "website",
  },
};

export default function LandingPage() {
  return (
    <>
      {/* Hero */}
      <section className="bg-gradient-to-b from-blue-50 to-white py-20 sm:py-28">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl sm:text-5xl font-extrabold text-gray-900 tracking-tight">
            Never lose sight of your dog
          </h1>
          <p className="mt-6 text-lg sm:text-xl text-gray-600 max-w-2xl mx-auto">
            LoRa radio tracking with smart geofencing gives you instant escape
            alerts — miles of range, no cell coverage needed.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/sign-up"
              className="inline-flex items-center justify-center px-6 py-3 text-base font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Get Started
            </Link>
            <Link
              href="/sign-in"
              className="inline-flex items-center justify-center px-6 py-3 text-base font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Sign In
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-gray-900 text-center">
            Built for peace of mind
          </h2>
          <p className="mt-4 text-gray-600 text-center max-w-2xl mx-auto">
            Everything you need to keep your dogs safe, whether you&apos;re home
            or on the trail.
          </p>
          <div className="mt-16 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            <FeatureCard
              icon="📡"
              title="LoRa Radio Tracking"
              description="Miles of range with no cellular plan. Works in rural areas, parks, and anywhere your adventures take you."
            />
            <FeatureCard
              icon="🗺️"
              title="Smart Geofencing"
              description="Draw custom safe zones on the map. Get alerts the moment your dog crosses a boundary."
            />
            <FeatureCard
              icon="⚡"
              title="Real-Time Alerts"
              description="Instant push notifications and live streaming updates. Know within seconds when something is wrong."
            />
            <FeatureCard
              icon="🐾"
              title="Multi-Dog Support"
              description="Track your whole pack on one map. Each dog gets their own geofences and alert settings."
            />
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-gray-900 text-center">
            How it works
          </h2>
          <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-12">
            <Step
              number="1"
              title="Attach the collar"
              description="Clip a lightweight LoRa GPS tracker to your dog's collar. It broadcasts location over radio — no SIM card or subscription."
            />
            <Step
              number="2"
              title="Set up geofences"
              description="Draw safe zones on the map — your yard, a park, a campsite. Leashline watches the boundaries for you."
            />
            <Step
              number="3"
              title="Get instant alerts"
              description="The moment your dog leaves a safe zone, you get an alert on your phone with their live location."
            />
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-gray-900">
            Ready to keep your dogs safe?
          </h2>
          <p className="mt-4 text-gray-600">
            Set up in minutes. No monthly fees for the software — just bring
            your own LoRa hardware.
          </p>
          <Link
            href="/sign-up"
            className="mt-8 inline-flex items-center justify-center px-6 py-3 text-base font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Get Started Free
          </Link>
        </div>
      </section>
    </>
  );
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: string;
  title: string;
  description: string;
}) {
  return (
    <div className="text-center">
      <div className="text-4xl mb-4">{icon}</div>
      <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
      <p className="mt-2 text-sm text-gray-600">{description}</p>
    </div>
  );
}

function Step({
  number,
  title,
  description,
}: {
  number: string;
  title: string;
  description: string;
}) {
  return (
    <div className="text-center">
      <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center text-lg font-bold mx-auto">
        {number}
      </div>
      <h3 className="mt-4 text-lg font-semibold text-gray-900">{title}</h3>
      <p className="mt-2 text-sm text-gray-600">{description}</p>
    </div>
  );
}
