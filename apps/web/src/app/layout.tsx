import { GeistMono } from "geist/font/mono";
import { GeistSans } from "geist/font/sans";
import type { Metadata, Viewport } from "next";
import { PwaRegister } from "@/components/pwa-register";
import { SmoothScroll } from "@/components/smooth-scroll";
import "./globals.css";

export const viewport: Viewport = {
  colorScheme: "light dark",
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#111111" },
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
    <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable}`} suppressHydrationWarning>
      <head>
        <script
          id="roleway-theme-init"
          dangerouslySetInnerHTML={{ __html: `try{const saved=localStorage.getItem("roleway-theme");const system=window.matchMedia("(prefers-color-scheme: dark)").matches;document.documentElement.dataset.theme=saved==="light"||saved==="dark"?saved:(system?"dark":"light")}catch{document.documentElement.dataset.theme="light"}` }}
        />
      </head>
      <body>
        <script
          id="roleway-design-contract"
          type="application/json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify({
            thesis: "Roleway tells one continuous product story from scattered job-search fragments to a controlled opportunity workflow; it refuses feature-card marketing and empty productivity claims.",
            ownWorld: "Geist typography, pure neutral canvases, Waypoint Blue as the only saturated voice, precise hairlines, full-fidelity HTML product scenes, and one tactile next-action slip.",
            story: "The visitor recognizes the fragmentation problem, sees the review-to-decision loop, explores the complete workspace and optional Assist, then starts a search.",
            firstViewport: "A 72px navigation leads into an 88px product thesis, one-line subtitle, and paired actions; below, one edge-to-edge opportunity workspace fills a softly lit product stage while a blue next-action slip crosses its lower edge.",
            form: "Linear-paced product narrative inside the selected architectural working-pin-up world; seed 165e5825, explicitly pinned by the user to linear.app as the quality and pacing reference.",
            finish: "unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance",
          }) }}
        />
        <PwaRegister /><SmoothScroll><a className="skip-link" href="#main-content">Skip to main content</a>{children}</SmoothScroll>
      </body>
    </html>
  );
}
