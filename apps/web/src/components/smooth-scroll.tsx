"use client";

import { ReactLenis } from "lenis/react";
import { usePathname } from "next/navigation";
import { type ReactNode, useSyncExternalStore } from "react";

const reducedMotionQuery = "(prefers-reduced-motion: reduce)";

function subscribeToReducedMotion(onChange: () => void) {
  const media = window.matchMedia(reducedMotionQuery);
  media.addEventListener("change", onChange);
  return () => media.removeEventListener("change", onChange);
}

function getReducedMotionPreference() {
  return window.matchMedia(reducedMotionQuery).matches;
}

export function SmoothScroll({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const prefersReducedMotion = useSyncExternalStore(
    subscribeToReducedMotion,
    getReducedMotionPreference,
    () => false,
  );

  if (pathname !== "/" || prefersReducedMotion) return children;

  return (
    <ReactLenis
      root
      options={{ duration: 0.9, smoothWheel: true, anchors: true }}
    >
      {children}
    </ReactLenis>
  );
}
