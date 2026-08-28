"use client";

import { Check } from "lucide-react";
import { useRef, useState } from "react";
import { SubmitButton } from "@/components/submit-button";
import { completeOnboarding } from "./actions";

const steps = ["Profile", "Workspace"] as const;

export function OnboardingWizard({ email }: { email: string }) {
  const [step, setStep] = useState(0);
  const formRef = useRef<HTMLFormElement>(null);

  const continueToWorkspace = () => {
    const panel = formRef.current?.querySelector<HTMLElement>('[data-step="0"]');
    const fields = panel?.querySelectorAll<HTMLInputElement>("input") ?? [];
    for (const field of fields) {
      if (!field.reportValidity()) return;
    }
    setStep(1);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <form ref={formRef} action={completeOnboarding} className="onboarding-form wizard-form">
      <div className="wizard-progress" aria-label={`Step ${step + 1} of ${steps.length}`}>
        {steps.map((label, index) => <div className={`wizard-progress-item ${index <= step ? "active" : ""}`} key={label}><span>{index < step ? <Check /> : index + 1}</span><b>{label}</b></div>)}
      </div>

      <section className="wizard-panel" data-step="0" hidden={step !== 0}>
        <div className="onboarding-copy"><div className="wizard-time">About 1 minute</div><h1>Start with your direction</h1><p>Add only enough context to create a private Workspace. You can complete your Career Profile later.</p></div>
        <div className="form-section"><h2>Your profile</h2><p>This identifies your private account and gives your Workspace a useful starting point.</p><div className="field-grid"><div className="field"><label htmlFor="fullName">Full name</label><input className="input" id="fullName" name="fullName" required autoComplete="name" /></div><div className="field"><label htmlFor="headline">Professional headline</label><input className="input" id="headline" name="headline" required placeholder="Product-minded full-stack engineer" /></div></div><p className="field-note">Signed in as {email}</p></div>
      </section>

      <section className="wizard-panel" data-step="1" hidden={step !== 1}>
        <div className="onboarding-copy"><h1>Name the search you are running</h1><p>One Workspace keeps one target and its Jobs, Opportunities, documents, people, and results together.</p></div>
        <div className="form-section"><h2>First Workspace</h2><p>You will add a real Job next. Preferences such as location and compensation can wait until they help a decision.</p><div className="field"><label htmlFor="projectName">Workspace name</label><input className="input" id="projectName" name="projectName" required defaultValue="My job search" placeholder="Remote product engineering" /><span className="field-hint">Use a name that distinguishes this direction from another search.</span></div><div className="field"><label htmlFor="targetTitles">Target role</label><input className="input" id="targetTitles" name="targetTitles" required placeholder="Product Engineer" /><span className="field-hint">You can add more roles and detailed preferences later.</span></div></div>
      </section>

      <input type="hidden" name="summary" value="" />
      <input type="hidden" name="technologies" value="" />
      <input type="hidden" name="remotePreference" value="flexible" />
      <input type="hidden" name="locations" value="" />
      <input type="hidden" name="minimumCompensation" value="" />
      <input type="hidden" name="currency" value="USD" />

      <div className="onboarding-actions wizard-actions">
        {step > 0 ? <button className="button ghost" type="button" onClick={() => setStep(0)}>Back</button> : <span className="muted small">Private by default · Editable later</span>}
        {step === 0 ? <button className="button primary" type="button" onClick={continueToWorkspace}>Continue</button> : <SubmitButton pendingLabel="Creating Workspace…">Create Workspace and add a Job</SubmitButton>}
      </div>
    </form>
  );
}
