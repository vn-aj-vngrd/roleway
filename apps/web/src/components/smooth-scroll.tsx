"use client";

import { ReactLenis } from "lenis/react";
import type { ReactNode } from "react";

export function SmoothScroll({ children }: { children: ReactNode }) {
  return <ReactLenis root options={{ duration: 0.9, smoothWheel: true, anchors: true }}>{children}</ReactLenis>;
}
