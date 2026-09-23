import type { MetadataRoute } from "next";

const siteUrl = "https://roleway.vanajvanguardia.tech";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: siteUrl, lastModified: new Date("2026-09-01"), changeFrequency: "weekly", priority: 1 },
    { url: `${siteUrl}/privacy`, lastModified: new Date("2026-09-01"), changeFrequency: "yearly", priority: 0.3 },
  ];
}
