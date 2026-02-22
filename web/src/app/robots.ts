import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/dashboard", "/join", "/api/"],
    },
    sitemap: "https://leashline.io/sitemap.xml",
  };
}
