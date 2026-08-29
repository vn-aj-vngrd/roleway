"use client";

import { ArrowLeft, ArrowRight, X } from "lucide-react";
import { useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useTransition,
  type CSSProperties,
} from "react";
import { completeTour } from "@/app/(app)/tour-actions";
import { Button } from "@/components/ui/button";

const steps = [
  {
    targets: ["workspace", "more"],
    eyebrow: "Workspace",
    title: "Keep each search focused",
    body: "A Workspace holds one role direction, its strategy, and every related record. Create another when the target or approach genuinely changes.",
  },
  {
    targets: ["home"],
    eyebrow: "Home",
    title: "Start with what needs attention",
    body: "Home combines Jobs waiting for review, due tasks, Next Actions, follow-ups, and interviews into one ordered Workspace briefing.",
  },
  {
    targets: ["inbox"],
    eyebrow: "Inbox",
    title: "Review Jobs before tracking them",
    body: "Capture a listing without committing to it. Track, defer, or dismiss it only after you decide whether it deserves active work.",
  },
  {
    targets: ["opportunities"],
    eyebrow: "Opportunities",
    title: "Run every serious role from one record",
    body: "The default List keeps stage, priority, due work, and the single Next Action visible. Switch to Board for stage work; open the dossier for applications, notes, and history.",
  },
  {
    targets: ["interviews", "more"],
    eyebrow: "Interviews",
    title: "Turn every conversation into a plan",
    body: "Schedule interview events with participants, questions, preparation tasks, notes, and outcomes attached to the right Opportunity.",
  },
  {
    targets: ["contacts", "more"],
    eyebrow: "Contacts",
    title: "Remember the people and the follow-up",
    body: "Keep recruiters, hiring managers, interviewers, and referrals connected to their Workspace or Opportunity with a clear follow-up date.",
  },
  {
    targets: ["documents", "more"],
    eyebrow: "Documents",
    title: "Keep drafts and approved work explicit",
    body: "Resumes, answers, messages, and research notes retain their Opportunity context, status, and version history.",
  },
  {
    targets: ["agent", "more"],
    eyebrow: "Agent",
    title: "Ask across your search—on your terms",
    body: "Connect your own AI provider for grounded answers and drafts. Every proposed internal change shows its destination and waits for your approval.",
  },
  {
    targets: ["insights", "more"],
    eyebrow: "Insights",
    title: "Learn only from activity you recorded",
    body: "Review account-wide momentum, source outcomes, and conversion rates. Roleway waits for a meaningful sample instead of inventing confidence.",
  },
  {
    targets: ["notifications", "more"],
    eyebrow: "Notifications",
    title: "Important changes stay collected",
    body: "Interview reminders, due work, and Opportunity changes are grouped across Workspaces and remain individually actionable.",
  },
  {
    targets: ["account", "more"],
    eyebrow: "Settings",
    title: "Make Roleway yours without losing control",
    body: "Finish your profile, tune notifications and appearance, manage Workspaces and AI providers, export your data, or return here to replay this tour.",
  },
  {
    targets: ["commands"],
    eyebrow: "Search and capture",
    title: "Find anything. Capture the next Job.",
    body: "Use search to jump to records and commands. The create control saves a Job to the active Workspace whenever you find one worth reviewing.",
  },
] as const;

type TourPosition = CSSProperties & { "--tour-progress"?: string };

export function ProductTour({ open }: { open: boolean }) {
  const [visible, setVisible] = useState(open);
  const [step, setStep] = useState(0);
  const [position, setPosition] = useState<TourPosition>({
    right: 22,
    bottom: 22,
    "--tour-progress": `${100 / steps.length}%`,
  });
  const [pending, startTransition] = useTransition();
  const cardRef = useRef<HTMLElement>(null);
  const primaryRef = useRef<HTMLButtonElement>(null);
  const router = useRouter();
  const current = steps[step] ?? steps[0];

  const finish = useCallback(
    (goToJobs: boolean) => {
      startTransition(async () => {
        await completeTour();
        setVisible(false);
        if (goToJobs) router.push("/inbox?create=true&welcome=true");
        else router.refresh();
      });
    },
    [router],
  );

  const placeCard = useCallback(
    (target: HTMLElement | null) => {
      const card = cardRef.current;
      if (!card || !target) {
        setPosition({
          right: 22,
          bottom: 22,
          "--tour-progress": `${((step + 1) / steps.length) * 100}%`,
        });
        return;
      }

      const targetRect = target.getBoundingClientRect();
      const sidebarRect = target.closest(".sidebar")?.getBoundingClientRect();
      const horizontalRect = sidebarRect ?? targetRect;
      const cardRect = card.getBoundingClientRect();
      const margin = 16;
      const gap = 14;
      let left: number;
      let top: number;

      if (window.innerWidth <= 760) {
        left = Math.max(margin, (window.innerWidth - cardRect.width) / 2);
        top = Math.max(margin, targetRect.top - cardRect.height - gap);
      } else {
        const fitsRight =
          horizontalRect.right + gap + cardRect.width <=
          window.innerWidth - margin;
        left = fitsRight
          ? horizontalRect.right + gap
          : Math.max(margin, horizontalRect.left - cardRect.width - gap);
        top = Math.min(
          window.innerHeight - cardRect.height - margin,
          Math.max(
            margin,
            targetRect.top + targetRect.height / 2 - cardRect.height / 2,
          ),
        );
      }

      setPosition({
        left,
        top,
        right: "auto",
        bottom: "auto",
        "--tour-progress": `${((step + 1) / steps.length) * 100}%`,
      });
    },
    [step],
  );

  useEffect(() => {
    if (!visible) return;
    let target: HTMLElement | null = null;
    const activateTarget = () => {
      target?.classList.remove("tour-target");
      const candidates = current.targets.flatMap((targetName) =>
        Array.from(
          document.querySelectorAll<HTMLElement>(`[data-tour="${targetName}"]`),
        ),
      );
      target =
        candidates.find((element) => element.getClientRects().length > 0) ??
        null;
      target?.scrollIntoView({ block: "nearest" });
      target?.classList.add("tour-target");
      placeCard(target);
    };

    const frame = requestAnimationFrame(() => {
      activateTarget();
      primaryRef.current?.focus();
    });
    window.addEventListener("resize", activateTarget);

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", activateTarget);
      target?.classList.remove("tour-target");
    };
  }, [current.targets, placeCard, visible]);

  useEffect(() => {
    if (!visible) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") finish(false);
      if (event.key === "ArrowLeft" && step > 0) setStep((value) => value - 1);
      if (event.key === "ArrowRight" && step < steps.length - 1)
        setStep((value) => value + 1);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [finish, step, visible]);

  if (!visible) return null;
  const final = step === steps.length - 1;

  return (
    <div className="tour-layer">
      <div className="tour-scrim" />
      <section
        ref={cardRef}
        className="tour-card"
        style={position}
        role="dialog"
        aria-modal="true"
        aria-labelledby="tour-title"
        aria-describedby="tour-body"
      >
        <div className="tour-progress-track" aria-hidden="true">
          <span />
        </div>
        <header>
          <span className="tour-step-label">{current.eyebrow}</span>
          <span className="mono">
            {step + 1} / {steps.length}
          </span>
          <button
            className="icon-button"
            data-tooltip="Skip tour"
            onClick={() => finish(false)}
            aria-label="Skip product tour"
          >
            <X aria-hidden="true" />
          </button>
        </header>
        <h2 id="tour-title">{current.title}</h2>
        <p id="tour-body">{current.body}</p>
        <footer>
          <div>
            {step > 0 ? (
              <Button
                className="button ghost"
                variant="ghost"
                onClick={() => setStep((value) => value - 1)}
                disabled={pending}
              >
                <ArrowLeft aria-hidden="true" />
                Back
              </Button>
            ) : (
              <Button
                className="button ghost"
                variant="ghost"
                onClick={() => finish(false)}
                disabled={pending}
              >
                Skip tour
              </Button>
            )}
          </div>
          <Button
            ref={primaryRef}
            className="button primary"
            onClick={() =>
              final ? finish(true) : setStep((value) => value + 1)
            }
            disabled={pending}
          >
            {final ? "Add my first Job" : "Next"}
            <ArrowRight aria-hidden="true" />
          </Button>
        </footer>
      </section>
    </div>
  );
}
