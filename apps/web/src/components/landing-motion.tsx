"use client";

import { useLayoutEffect } from "react";

const REVEAL_SELECTOR = "[data-reveal]";

export function LandingMotion() {
  useLayoutEffect(() => {
    const root = document.documentElement;
    const items = Array.from(
      document.querySelectorAll<HTMLElement>(REVEAL_SELECTOR),
    );
    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    root.classList.add("rw-motion-ready");

    if (prefersReducedMotion || !("IntersectionObserver" in window)) {
      items.forEach((item) => {
        item.dataset.visible = "true";
      });
      return () => root.classList.remove("rw-motion-ready");
    }

    const reveal = (item: HTMLElement) => {
      item.dataset.visible = "true";
      observer.unobserve(item);
    };
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) reveal(entry.target as HTMLElement);
        });
      },
      { rootMargin: "0px 0px -12%", threshold: 0.08 },
    );

    const initiallyVisible = new Set(
      items.filter((item) => {
        const bounds = item.getBoundingClientRect();
        return bounds.top < window.innerHeight * 0.88 && bounds.bottom > 0;
      }),
    );

    items.forEach((item) => {
      if (!initiallyVisible.has(item)) observer.observe(item);
    });

    // If a reveal target starts in view, hold it through one painted frame.
    // Observing it immediately can reveal it before the browser paints the
    // transition's start state.
    let revealFrame = 0;
    const paintFrame = window.requestAnimationFrame(() => {
      revealFrame = window.requestAnimationFrame(() => {
        initiallyVisible.forEach(reveal);
      });
    });

    return () => {
      window.cancelAnimationFrame(paintFrame);
      window.cancelAnimationFrame(revealFrame);
      observer.disconnect();
      root.classList.remove("rw-motion-ready");
    };
  }, []);

  return null;
}
