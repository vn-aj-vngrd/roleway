"use client";

import { useEffect } from "react";

const revealGroups = [
  [".landing-hero-intro > *", "hero"],
  [".landing-product-stage", "stage"],
  [".landing-thesis > p, .landing-thesis > h2, .landing-principles article", "copy"],
  [".landing-product-section > header > *, .landing-explorer", "copy"],
  [".landing-workflow > header > *, .landing-chapter-copy > *, .landing-chapter .story-scene", "copy"],
  [".landing-final > *", "copy"],
] as const;

export function MarketingReveals() {
  useEffect(() => {
    const root = document.documentElement;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const elements: HTMLElement[] = [];

    for (const [selector, kind] of revealGroups) {
      document.querySelectorAll<HTMLElement>(selector).forEach((element, index) => {
        element.dataset.motion = kind;
        element.style.setProperty("--motion-order", String(index));
        elements.push(element);
      });
    }

    if (reducedMotion) {
      elements.forEach((element) => element.classList.add("is-revealed"));
      return;
    }

    root.classList.add("landing-motion-ready");
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        entry.target.classList.add("is-revealed");
        observer.unobserve(entry.target);
      }
    }, { rootMargin: "0px 0px -8%", threshold: 0.08 });

    elements.forEach((element) => observer.observe(element));

    let frame = 0;
    const updateProgress = () => {
      frame = 0;
      const scrollable = Math.max(document.documentElement.scrollHeight - window.innerHeight, 1);
      const progress = Math.min(1, Math.max(0, window.scrollY / scrollable));
      root.style.setProperty("--landing-hero-shift", `${Math.min(progress * 34, 34)}px`);
    };
    const onScroll = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(updateProgress);
    };

    updateProgress();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", onScroll);
      if (frame) window.cancelAnimationFrame(frame);
      root.classList.remove("landing-motion-ready");
      root.style.removeProperty("--landing-hero-shift");
    };
  }, []);

  return null;
}
