import { GeistMono } from "geist/font/mono";
import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { PwaRegister } from "@/components/pwa-register";
import { SmoothScroll } from "@/components/smooth-scroll";
import "./globals.css";
import "./workspace.css";
import { TooltipProvider } from "@/components/ui/tooltip";

const Inter = localFont({
  src: "./fonts/inter-variable.ttf",
  variable: "--font-inter",
  display: "swap",
  weight: "100 900",
});

export const viewport: Viewport = {
  colorScheme: "light dark",
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#111111" },
  ],
};

export const metadata: Metadata = {
  metadataBase: new URL("https://roleway.vanajvanguardia.tech"),
  applicationName: "Roleway",
  title: { default: "Roleway", template: "%s · Roleway" },
  description: "Run a focused job search with Jobs, Opportunities, applications, interviews, and every Next Action in one place.",
  creator: "Roleway",
  publisher: "Roleway",
  category: "productivity",
  keywords: ["job search tracker", "application tracker", "interview preparation", "job search workspace", "opportunity tracker"],
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
    <html lang="en" className={`${Inter.variable} ${GeistMono.variable}`} suppressHydrationWarning>
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
            thesis: "Roleway separates distinct workspaces, then turns each serious opportunity into a controlled workflow; it refuses one giant global tracker, feature-card marketing, and empty productivity claims.",
            ownWorld: "Geist typography, pure neutral canvases, Waypoint Blue as the only saturated voice, precise hairlines, full-fidelity HTML product scenes, and one tactile next-action slip.",
            story: "The visitor recognizes the fragmentation problem, understands separate Workspaces, sees the review-to-decision loop and complete Opportunity context, then opens a workspace.",
            firstViewport: "A 72px navigation leads into the thesis ‘One workspace for every focused job search,’ a concise subtitle, and paired actions; below, one edge-to-edge Workspace-scoped Opportunities view fills the stage while a blue next-action slip crosses its lower edge.",
            form: "Linear-paced product narrative inside the selected architectural working-pin-up world; seed 165e5825, explicitly pinned by the user to linear.app as the quality and pacing reference.",
            finish: "unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance",
          }) }}
        />
        <TooltipProvider><PwaRegister /><SmoothScroll><a className="skip-link" href="#main-content">Skip to main content</a>{children}</SmoothScroll></TooltipProvider>
      </body>
    </html>
  );
}
