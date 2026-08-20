import "@fontsource-variable/instrument-sans";
import "@fontsource-variable/jetbrains-mono";
import type { Metadata, Viewport } from "next";
import { PwaRegister } from "@/components/pwa-register";
import { SmoothScroll } from "@/components/smooth-scroll";
import "./globals.css";

export const viewport: Viewport = {
  colorScheme: "light dark",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#11151d" },
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
      <body><PwaRegister /><SmoothScroll><a className="skip-link" href="#main-content">Skip to main content</a>{children}</SmoothScroll></body>
    </html>
  );
}
