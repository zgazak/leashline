import type { ReactNode } from "react";
import { createElement } from "react";

const BASE_URL = "https://leashline.io";

/** Renders a JSON-LD script tag */
export function JsonLd({ data }: { data: Record<string, unknown> }): ReactNode {
  return createElement("script", {
    type: "application/ld+json",
    dangerouslySetInnerHTML: { __html: JSON.stringify(data) },
  });
}

export function organizationJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Leashline",
    url: BASE_URL,
    logo: `${BASE_URL}/icon-512.png`,
    description:
      "Real-time dog escape detection using LoRa radio tracking and smart geofencing.",
  };
}

export function softwareAppJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "Leashline",
    applicationCategory: "LifestyleApplication",
    operatingSystem: "Web",
    url: BASE_URL,
    description:
      "LoRa-based dog escape detection with smart geofencing. No cell service or subscriptions required.",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
      description: "Free software — bring your own LoRa hardware",
    },
  };
}

export function faqJsonLd(items: { question: string; answer: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
  };
}

export function breadcrumbJsonLd(
  items: { name: string; href: string }[],
) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      item: `${BASE_URL}${item.href}`,
    })),
  };
}
