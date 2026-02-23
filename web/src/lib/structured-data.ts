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
    sameAs: [],
  };
}

export function webSiteJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "Leashline",
    url: BASE_URL,
    description:
      "Dog escape detection using LoRa radio tracking and smart geofencing. No cell service, no subscriptions.",
    publisher: {
      "@type": "Organization",
      name: "Leashline",
      url: BASE_URL,
    },
  };
}

export function productJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: "Leashline Dog Escape Detection System",
    description:
      "Real-time dog escape detection using LoRa radio tracking and smart geofencing. Works without cell service. No monthly fees.",
    brand: {
      "@type": "Brand",
      name: "Leashline",
    },
    category: "Pet GPS Trackers",
    url: BASE_URL,
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
      description:
        "Free software. Hardware sold separately (~$50–80 one-time cost for LoRa GPS collar and base station).",
      availability: "https://schema.org/InStock",
    },
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
