"use client";

import type { ComponentPropsWithoutRef } from "react";

function disablePreviewActions(node: HTMLDivElement | null) {
  if (!node) return;
  // Keep sample controls unfocusable and inactive, while allowing native scrolling
  // on their containing tab rows. The server-rendered preview starts fully inert.
  node.querySelectorAll<HTMLElement>("a, button, input, select, textarea, [tabindex]").forEach((control) => {
    control.inert = true;
  });
  node.inert = false;
}

export function LandingPreviewContent(props: ComponentPropsWithoutRef<"div">) {
  return <div {...props} aria-hidden="true" inert ref={disablePreviewActions} />;
}
