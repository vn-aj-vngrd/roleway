"use client";

import { useEffect, useRef, useState } from "react";
import { Navigation, Pause, Play, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

const examples = [
  {
    label: "Next steps",
    messages: [
      { author: "You", text: "What should I focus on today?" },
      {
        author: "Agent",
        text: "Your Northstar interview is tomorrow. Choose two project examples first, then review the follow-up task for Fieldwork.",
      },
      { author: "You", text: "Help me prepare for Northstar." },
      {
        author: "Agent",
        text: "Start with a project where you made a difficult technical trade-off. What did you choose, and why? We can shape your answer together.",
      },
    ],
  },
  {
    label: "Create a Workspace",
    messages: [
      { author: "You", text: "Create a Workspace for my next job search." },
      { author: "Agent", text: "What would you like to call it?" },
      { author: "You", text: "Product engineering." },
      { author: "Agent", text: "What is the main goal of this search?" },
      {
        author: "You",
        text: "Find a remote TypeScript role with product ownership.",
      },
      {
        author: "Agent",
        text: "Ready for your review: Product engineering, focused on a remote TypeScript role with product ownership. Approve the proposal in Agent to create your Workspace.",
      },
    ],
  },
  {
    label: "Create a task",
    messages: [
      {
        author: "You",
        text: "Add a task to prepare two project examples for Northstar.",
      },
      {
        author: "Agent",
        text: "When should this be due? You can leave it without a date.",
      },
      { author: "You", text: "No due date for now." },
      {
        author: "Agent",
        text: "Ready for your review: Prepare two project examples, linked to your Northstar Opportunity, with no due date. Approve the proposal in Agent to save it.",
      },
    ],
  },
] as const;

export function LandingAgentDemo() {
  const root = useRef<HTMLElement>(null);
  const transcript = useRef<HTMLDivElement>(null);
  const [selected, setSelected] = useState(0);
  // Show useful content before hydration and for reduced-motion readers.
  const [shown, setShown] = useState<number>(examples[0].messages.length);
  const [playing, setPlaying] = useState(false);
  const [visible, setVisible] = useState(false);
  const [pageVisible, setPageVisible] = useState(true);
  const [reduced, setReduced] = useState(true);
  const example = examples[selected] ?? examples[0];
  const complete = shown >= example.messages.length;

  useEffect(() => {
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const syncPreference = () => {
      setReduced(preference.matches);
      if (preference.matches) {
        setPlaying(false);
        setShown(Number.MAX_SAFE_INTEGER);
      }
    };
    const syncVisibility = () => setPageVisible(!document.hidden);
    syncPreference();
    syncVisibility();
    let started = false;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry) return;
        setVisible(entry.isIntersecting);
        if (entry.isIntersecting && !started) {
          started = true;
          if (!preference.matches) {
            setShown(0);
            setPlaying(true);
          }
        }
      },
      { threshold: 0 },
    );
    if (root.current) observer.observe(root.current);
    preference.addEventListener("change", syncPreference);
    document.addEventListener("visibilitychange", syncVisibility);
    return () => {
      observer.disconnect();
      preference.removeEventListener("change", syncPreference);
      document.removeEventListener("visibilitychange", syncVisibility);
    };
  }, []);

  useEffect(() => {
    if (!playing || complete || reduced || !visible || !pageVisible) return;
    const timer = window.setTimeout(
      () => setShown((count) => count + 1),
      shown === 0 ? 600 : 1700,
    );
    return () => window.clearTimeout(timer);
  }, [playing, complete, reduced, visible, pageVisible, shown]);

  useEffect(() => {
    if (transcript.current)
      transcript.current.scrollTop =
        shown === 0 ? 0 : transcript.current.scrollHeight;
  }, [shown, selected]);

  function choose(index: number) {
    const next = examples[index];
    if (!next) return;
    setSelected(index);
    setShown(reduced ? next.messages.length : 0);
    setPlaying(!reduced);
  }

  return (
    <figure
      ref={root}
      className="rw-agent-demo"
      aria-label="Agent sample conversation"
    >
      <header className="rw-agent-demo-header">
        <span>
          <Navigation aria-hidden="true" /> {example.label}
        </span>
        <div>
          <Button
            variant="ghost"
            size="icon"
            className="rw-agent-demo-control"
            aria-label={
              complete
                ? "Replay sample"
                : playing
                  ? "Pause sample"
                  : "Resume sample"
            }
            onClick={() =>
              complete ? choose(selected) : setPlaying((value) => !value)
            }
          >
            {complete ? <RotateCcw /> : playing ? <Pause /> : <Play />}
          </Button>
        </div>
      </header>
      <div
        ref={transcript}
        className="rw-agent-demo-transcript"
        tabIndex={0}
        role="region"
        aria-label="Sample messages"
        aria-live="off"
      >
        <p className="rw-agent-demo-date">Today · Sample conversation</p>
        {example.messages.slice(0, shown).map((message, index) => (
          <div
            key={`${selected}-${index}`}
            className={`rw-agent-demo-message ${message.author === "You" ? "is-user" : "is-agent"}`}
          >
            <span>
              {message.author === "Agent" && <Navigation aria-hidden="true" />}
              {message.author}
            </span>
            <p>{message.text}</p>
          </div>
        ))}
        {!complete && (
          <p className="rw-agent-demo-typing">
            {playing
              ? `${example.messages[shown]?.author ?? "Agent"} is typing`
              : "Sample paused"}
            <span
              aria-hidden="true"
              className={playing && visible && pageVisible ? "is-playing" : ""}
            >
              •••
            </span>
          </p>
        )}
      </div>
      <div
        className="rw-agent-demo-options"
        role="group"
        aria-label="Choose a sample conversation"
      >
        {examples.map((item, index) => (
          <Button
            key={item.label}
            variant="ghost"
            aria-pressed={selected === index}
            onClick={() => choose(index)}
          >
            {item.label}
          </Button>
        ))}
      </div>
      <figcaption>
        Illustrative conversations · No AI calls or changes to your account
      </figcaption>
    </figure>
  );
}
