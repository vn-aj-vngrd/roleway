"use client";

import { useEffect } from "react";

export function LandingMotion() {
  useEffect(() => {
    document.querySelectorAll<HTMLElement>("[data-reveal]").forEach((item) => { item.dataset.visible = "true"; });
    document.documentElement.classList.add("rw-motion-ready");
    return () => document.documentElement.classList.remove("rw-motion-ready");
  }, []);

  return null;
}
