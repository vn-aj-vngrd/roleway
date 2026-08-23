import "@fontsource-variable/inter";
import "@fontsource-variable/jetbrains-mono";
import type { Metadata, Viewport } from "next";
import { PwaRegister } from "@/components/pwa-register";
import { SmoothScroll } from "@/components/smooth-scroll";
import "./globals.css";

export const viewport: Viewport = {
  colorScheme: "light dark",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f7f7f5" },
    { media: "(prefers-color-scheme: dark)", color: "#202020" },
  ],
};

export const metadata: Metadata = {
  applicationName: "Roleway",
  title: { default: "Roleway", template: "%s · Roleway" },
  description: "Track jobs, applications, tasks, interviews, and follow-ups in one place.",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/icons/roleway-192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Roleway",
  },
  formatDetection: { telephone: false },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <script
          id="roleway-design-contract"
          type="application/json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify({
            thesis: "A serious job search should feel like a personal workspace, not a dashboard assembled from cards.",
            ownWorld: "Warm-stone navigation, a paper-white work island, graphite type, quiet neutral selection, and Roleway blue reserved for action and progress.",
            story: "The user enters through Today, sees the next decision, and moves through jobs, preparation, applications, and interviews without losing context.",
            firstViewport: "A flat persistent sidebar supports one dominant white work surface; the title, next action, and active records lead in that order.",
            form: "Current Notion workspace grammar with Linear interaction density and Apple finish; notion-canon-2026-08.",
            finish: "unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance",
          }) }}
        />
        <PwaRegister /><SmoothScroll><a className="skip-link" href="#main-content">Skip to main content</a>{children}</SmoothScroll>
      </body>
    </html>
  );
}
