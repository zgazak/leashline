import Link from "next/link";

interface Props {
  heading?: string;
  subheading?: string;
  buttonText?: string;
  href?: string;
}

export default function CTABanner({
  heading = "Ready to track without subscriptions?",
  subheading = "Join the early access beta. Free software — bring your own LoRa hardware.",
  buttonText = "Get Early Access",
  href = "/sign-up",
}: Props) {
  return (
    <section className="py-20 bg-gradient-to-b from-white to-blue-50">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <h2 className="text-3xl font-bold text-gray-900">{heading}</h2>
        <p className="mt-4 text-gray-600">{subheading}</p>
        <Link
          href={href}
          className="mt-8 inline-flex items-center justify-center px-6 py-3 text-base font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
        >
          {buttonText}
        </Link>
      </div>
    </section>
  );
}
