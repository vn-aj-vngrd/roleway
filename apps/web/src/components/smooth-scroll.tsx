"use client";

import { ReactLenis } from "lenis/react";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

export function SmoothScroll({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  if (pathname !== "/") return children;
  return <ReactLenis root options={{ duration: 0.9, smoothWheel: true, anchors: true }}>{children}</ReactLenis>;
}
