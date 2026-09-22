"use client";

import { useEffect, useId, useState } from "react";
import { Tooltip, TooltipContent } from "@/components/ui/tooltip";

/** Keep legacy data-tooltip controls on the same portal as composed tooltips. */
export function AttributeTooltips() {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const id = useId();

  useEffect(() => {
    let showTimer: ReturnType<typeof setTimeout> | undefined;
    let hideTimer: ReturnType<typeof setTimeout> | undefined;
    let visibleTarget: HTMLElement | null = null;
    let target: HTMLElement | null = null;
    const clearShow = () => { clearTimeout(showTimer); showTimer = undefined; };
    const clearHide = () => { clearTimeout(hideTimer); hideTimer = undefined; };
    const close = () => { clearShow(); clearHide(); target = null; visibleTarget = null; setAnchor(null); };
    const eligible = (element: HTMLElement) => {
      if (!element.isConnected || element.matches(':disabled, [aria-disabled="true"], [aria-expanded="true"]')) return false;
      // Expanded navigation already has visible labels.
      if (element.closest('.sidebar') && !element.closest('[data-sidebar="compact"]') && element.matches('.nav-link, .sidebar-search-project-button, .sidebar-profile')) return false;
      return Boolean(element.dataset.tooltip);
    };
    const show = (event: Event) => {
      if (event instanceof PointerEvent && event.pointerType !== "mouse") return;
      const element = event.target instanceof Element ? event.target.closest<HTMLElement>("[data-tooltip]") : null;
      if (!element || !eligible(element)) return;
      if (event.type === "focusin" && !element.matches(":focus-visible")) return;
      clearHide();
      if (element !== target) {
        close();
        target = element;
      }
      // Moving between an icon and its button must not cancel the reveal timer.
      if (showTimer !== undefined || visibleTarget === element) return;
      showTimer = setTimeout(() => {
        showTimer = undefined;
        if (eligible(element)) { visibleTarget = element; setAnchor(element); }
      }, 350);
    };
    const leave = (event: Event) => {
      const next = (event as FocusEvent | PointerEvent).relatedTarget;
      if (next instanceof Node && (target?.contains(next) || document.getElementById(id)?.contains(next))) return;
      const source = event.target;
      if (!(source instanceof Node) || !(target?.contains(source) || document.getElementById(id)?.contains(source))) return;
      clearShow();
      clearHide();
      hideTimer = setTimeout(close, 100);
    };
    const key = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (document.getElementById(id)) { event.preventDefault(); event.stopPropagation(); }
      close();
    };
    const keep = (event: PointerEvent) => {
      if (event.target instanceof Element && event.target.closest(`#${CSS.escape(id)}`)) clearHide();
    };
    document.addEventListener("pointerover", show);
    document.addEventListener("pointerover", keep);
    document.addEventListener("pointerout", leave);
    document.addEventListener("focusin", show);
    document.addEventListener("focusout", leave);
    document.addEventListener("pointerdown", close, true);
    document.addEventListener("keydown", key, true);
    document.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    return () => {
      clearShow();
      clearHide();
      document.removeEventListener("pointerover", show);
      document.removeEventListener("pointerover", keep);
      document.removeEventListener("pointerout", leave);
      document.removeEventListener("focusin", show);
      document.removeEventListener("focusout", leave);
      document.removeEventListener("pointerdown", close, true);
      document.removeEventListener("keydown", key, true);
      document.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
    };
  }, [id]);

  useEffect(() => {
    if (!anchor) return;
    const previous = anchor.getAttribute("aria-describedby");
    anchor.setAttribute("aria-describedby", [previous, id].filter(Boolean).join(" "));
    return () => {
      const remaining = anchor.getAttribute("aria-describedby")?.split(/\s+/).filter(value => value !== id).join(" ");
      if (remaining) anchor.setAttribute("aria-describedby", remaining);
      else anchor.removeAttribute("aria-describedby");
    };
  }, [anchor, id]);

  return (
    <Tooltip open={Boolean(anchor)}>
      {anchor ? (
        <TooltipContent id={id} role="tooltip" anchor={anchor} side={anchor.closest('.sidebar') ? "right" : "top"}>
          {anchor.dataset.tooltip}
        </TooltipContent>
      ) : null}
    </Tooltip>
  );
}
