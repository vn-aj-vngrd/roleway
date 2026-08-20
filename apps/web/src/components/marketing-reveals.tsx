"use client";

import { useEffect } from "react";

export function MarketingReveals() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    document.documentElement.classList.add("reveal-ready");
    const elements = Array.from(document.querySelectorAll<HTMLElement>("[data-reveal]"));
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) if (entry.isIntersecting) { entry.target.classList.add("is-revealed"); observer.unobserve(entry.target); }
    }, { rootMargin: "0px 0px -10%", threshold: 0.08 });
    elements.forEach((element) => observer.observe(element));
    return () => { observer.disconnect(); document.documentElement.classList.remove("reveal-ready"); };
  }, []);
  return null;
}
