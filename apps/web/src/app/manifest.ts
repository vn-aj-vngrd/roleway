import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Roleway — Job Search Tracker",
    short_name: "Roleway",
    description: "Track jobs, applications, tasks, interviews, and follow-ups in one place.",
    start_url: "/today",
    scope: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#0069e1",
    orientation: "any",
    categories: ["productivity", "business"],
    icons: [
      { src: "/icons/roleway-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/roleway-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/roleway-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Today", short_name: "Today", description: "See what needs your attention", url: "/today" },
      { name: "Pipeline", short_name: "Pipeline", description: "Open your application pipeline", url: "/opportunities" },
      { name: "Add a job", short_name: "Add job", description: "Save a job to review", url: "/jobs?create=true" },
    ],
  };
}
