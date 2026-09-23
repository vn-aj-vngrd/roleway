import type { MetadataRoute } from "next";

const siteUrl = "https://roleway.vanajvanguardia.tech";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: ["/", "/privacy"],
      disallow: [
        "/admin", "/agent", "/api", "/auth", "/contacts", "/documents",
        "/forgot-password", "/home", "/inbox", "/insights", "/interview",
        "/login", "/notifications", "/onboarding", "/opportunities",
        "/reset-password", "/searches", "/settings", "/signup", "/today",
      ],
    },
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl,
  };
}
