"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export function LandingProductNavigation({ items }: { items: readonly { id: string; label: string }[] }) {
  const row = useRef<HTMLElement>(null);
  const [edges, setEdges] = useState({ overflow: false, left: false, right: false });

  function updateEdges() {
    const node = row.current;
    if (!node) return;
    setEdges({
      overflow: node.scrollWidth > node.clientWidth + 1,
      left: node.scrollLeft > 1,
      right: node.scrollLeft + node.clientWidth < node.scrollWidth - 1,
    });
  }

  useEffect(() => {
    const node = row.current;
    if (!node) return;
    const observer = new ResizeObserver(updateEdges);
    observer.observe(node);
    updateEdges();
    return () => observer.disconnect();
  }, []);

  function scroll(direction: number) {
    const node = row.current;
    if (!node) return;
    node.scrollBy({
      left: direction * node.clientWidth * 0.75,
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth",
    });
  }

  return (
    <div className="rw-product-navigation">
      {edges.overflow && <Button className="rw-product-scroll" size="icon-sm" variant="ghost" aria-label="Scroll product pages left" disabled={!edges.left} onClick={() => scroll(-1)}><ChevronLeft /></Button>}
      <nav ref={row} onScroll={updateEdges} className="rw-product-page-index" aria-label="Product pages">
        {items.map((item) => <a href={`#${item.id}`} key={item.id}>{item.label}</a>)}
      </nav>
      {edges.overflow && <Button className="rw-product-scroll" size="icon-sm" variant="ghost" aria-label="Scroll product pages right" disabled={!edges.right} onClick={() => scroll(1)}><ChevronRight /></Button>}
    </div>
  );
}
