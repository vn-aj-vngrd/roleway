"use client";

import {
  BriefcaseBusiness,
  CalendarClock,
  ChartNoAxesColumnIncreasing,
  Check,
  Navigation,
  Target,
} from "lucide-react";
import { useRef, useState } from "react";
import { SelectField } from "@/components/form-controls";
import { SubmitButton } from "@/components/submit-button";
import { Button } from "@/components/ui/button";
import { completeOnboarding } from "./actions";

const steps = ["Profile", "Workspace", "Ready"] as const;

const featureGroups = [
  {
    icon: BriefcaseBusiness,
    title: "Capture and decide",
    body: "Save Jobs to Inbox first, then promote only the serious ones to Opportunities.",
    features: "Inbox · Opportunities",
  },
  {
    icon: Target,
    title: "Always know the next move",
    body: "Home orders due work while every active Opportunity carries one clear Next Action.",
    features: "Home · Tasks · Next Actions",
  },
  {
    icon: CalendarClock,
    title: "Prepare with the full record",
    body: "Keep interviews, people, approved documents, and application history attached to the right Opportunity.",
    features: "Interviews · Contacts · Documents",
  },
  {
    icon: ChartNoAxesColumnIncreasing,
    title: "See what your activity supports",
    body: "Insights and notifications work across Workspaces without mixing their records.",
    features: "Insights · Notifications",
  },
  {
    icon: Navigation,
    title: "Use Agent on your terms",
    body: "Connect your own provider for grounded drafts and internal changes that always require your approval.",
    features: "Agent · Reviewable approvals",
  },
] as const;

export function OnboardingWizard({ email }: { email: string }) {
  const [step, setStep] = useState(0);
  const formRef = useRef<HTMLFormElement>(null);

  const continueForward = () => {
    const panel = formRef.current?.querySelector<HTMLElement>(
      `[data-step="${step}"]`,
    );
    const fields =
      panel?.querySelectorAll<HTMLInputElement | HTMLSelectElement>(
        "input, select",
      ) ?? [];
    for (const field of fields) {
      if (!field.reportValidity()) return;
    }
    setStep((current) => Math.min(current + 1, steps.length - 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <form
      ref={formRef}
      action={completeOnboarding}
      className="onboarding-form wizard-form"
    >
      <div
        className="wizard-progress"
        aria-label={`Step ${step + 1} of ${steps.length}`}
      >
        {steps.map((label, index) => (
          <div
            className={`wizard-progress-item ${index <= step ? "active" : ""}`}
            aria-current={index === step ? "step" : undefined}
            key={label}
          >
            <span>{index < step ? <Check /> : index + 1}</span>
            <b>{label}</b>
          </div>
        ))}
      </div>

      <section className="wizard-panel" data-step="0" hidden={step !== 0}>
        <div className="onboarding-copy">
          <div className="wizard-time">About 2 minutes</div>
          <h1>Start with the direction you are taking.</h1>
          <p>
            Roleway keeps your account context separate from the focused
            Workspaces where you run each job search.
          </p>
        </div>
        <div className="form-section">
          <div className="onboarding-section-heading">
            <h2>Your account</h2>
            <p>
              This is private and editable later. Agent only uses facts you
              choose to record.
            </p>
          </div>
          <div className="field-grid">
            <div className="field">
              <label htmlFor="fullName">Full name</label>
              <input
                className="input"
                id="fullName"
                name="fullName"
                required
                autoComplete="name"
              />
            </div>
            <div className="field">
              <label htmlFor="headline">Professional headline</label>
              <input
                className="input"
                id="headline"
                name="headline"
                required
                placeholder="Product-minded full-stack engineer"
              />
            </div>
          </div>
          <p className="field-note">Signed in as {email}</p>
        </div>
      </section>

      <section className="wizard-panel" data-step="1" hidden={step !== 1}>
        <div className="onboarding-copy">
          <div className="wizard-time">One focused search</div>
          <h1>Create your first Workspace.</h1>
          <p>
            A Workspace gives one role direction its own Jobs, Opportunities,
            people, documents, interviews, and strategy.
          </p>
        </div>
        <div className="form-section">
          <div className="onboarding-section-heading">
            <h2>Search direction</h2>
            <p>Start broad enough to be useful. Refine the details later.</p>
          </div>
          <div className="field-grid">
            <div className="field">
              <label htmlFor="projectName">Workspace name</label>
              <input
                className="input"
                id="projectName"
                name="projectName"
                required
                defaultValue="My job search"
                placeholder="Remote product engineering"
              />
              <span className="field-hint">
                A name that distinguishes this direction from another search.
              </span>
            </div>
            <div className="field">
              <label htmlFor="targetTitles">Target role</label>
              <input
                className="input"
                id="targetTitles"
                name="targetTitles"
                required
                placeholder="Product Engineer"
              />
              <span className="field-hint">
                Separate multiple related roles with commas.
              </span>
            </div>
            <div className="field">
              <label htmlFor="locations">Preferred locations</label>
              <input
                className="input"
                id="locations"
                name="locations"
                placeholder="Remote, New York, London"
              />
            </div>
            <div className="field">
              <label htmlFor="remotePreference">Work arrangement</label>
              <SelectField
                id="remotePreference"
                name="remotePreference"
                defaultValue="flexible"
                ariaLabel="Work arrangement"
                options={[
                  { value: "flexible", label: "Flexible" },
                  { value: "preferred", label: "Remote preferred" },
                  { value: "required", label: "Remote required" },
                ]}
              />
            </div>
          </div>
        </div>
      </section>

      <section className="wizard-panel" data-step="2" hidden={step !== 2}>
        <div className="onboarding-copy onboarding-ready-copy">
          <div className="wizard-time">
            Your Workspace is ready to take shape
          </div>
          <h1>One system from discovery to outcome.</h1>
          <p>
            You will get a short guided tour inside the app. Here is the model
            it will walk you through.
          </p>
        </div>
        <div className="workflow-preview onboarding-feature-preview">
          {featureGroups.map(({ icon: Icon, title, body, features }) => (
            <div key={title}>
              <span>
                <Icon aria-hidden="true" />
              </span>
              <div>
                <strong>{title}</strong>
                <p>{body}</p>
                <small>{features}</small>
              </div>
            </div>
          ))}
        </div>
        <div className="tour-preview-note">
          <strong>You remain in control.</strong>
          <span>
            Core tracking works without AI. Roleway never submits applications
            or contacts employers for you.
          </span>
        </div>
      </section>

      <input type="hidden" name="summary" value="" />
      <input type="hidden" name="technologies" value="" />
      <input type="hidden" name="minimumCompensation" value="" />
      <input type="hidden" name="currency" value="USD" />

      <div className="onboarding-actions wizard-actions">
        {step > 0 ? (
          <Button
            className="button ghost"
            variant="ghost"
            type="button"
            onClick={() => setStep((current) => Math.max(0, current - 1))}
          >
            Back
          </Button>
        ) : (
          <span className="muted small">
            Private by default · Editable later
          </span>
        )}
        {step < steps.length - 1 ? (
          <Button
            className="button primary"
            type="button"
            onClick={continueForward}
          >
            Continue
          </Button>
        ) : (
          <SubmitButton pendingLabel="Creating Workspace…">
            Create Workspace and start tour
          </SubmitButton>
        )}
      </div>
    </form>
  );
}
